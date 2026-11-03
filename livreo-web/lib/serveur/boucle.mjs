import { transaction } from "./db.mjs";
import { analyserParRegles } from "./regles.mjs";

// La boucle du MVP : commentaire → réservation → récap → paiement confirmé,
// avec le passage à la suivante quand le délai expire. Chaque étape écrit en
// base avant d'agir, pour qu'un redémarrage reprenne là où on s'était arrêté.

export class ErreurMetier extends Error {
  constructor(statut, message) {
    super(message);
    this.statut = statut;
  }
}

const ACTIVES = "('contactee', 'a_confirmer', 'payee')";
const iso = (date) => date.toISOString();
// Facebook date les commentaires à la seconde : les bornes des articles aussi,
// sinon un JP posté dans la seconde du clic tomberait avant l'ouverture.
const isoSeconde = (date) => new Date(Math.floor(date.getTime() / 1000) * 1000).toISOString();
const formatAr = (montant) => `${new Intl.NumberFormat("fr-FR").format(montant)} Ar`;

function heureMadagascar(isoDate) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Indian/Antananarivo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

const un = (ctx, sql, ...p) => ctx.db.prepare(sql).get(...p) ?? null;
const tous = (ctx, sql, ...p) => ctx.db.prepare(sql).all(...p);
const executer = (ctx, sql, ...p) => ctx.db.prepare(sql).run(...p);

export function journal(ctx, type, details = {}) {
  executer(ctx, "INSERT INTO journal (quand, type, details) VALUES (?, ?, ?)", iso(ctx.maintenant()), type, JSON.stringify(details));
}

function signaler(ctx) {
  ctx.bus?.emit("change");
}

function liveActif(ctx) {
  return un(ctx, "SELECT * FROM lives WHERE termine_le IS NULL ORDER BY id DESC LIMIT 1");
}

/* ---------- Réception : on enregistre d'abord, on traite ensuite ---------- */

export function recevoir(ctx, entrants) {
  const recu = iso(ctx.maintenant());
  let nouveaux = 0;
  for (const e of entrants) {
    const r = executer(
      ctx,
      "INSERT OR IGNORE INTO entrants (id, type, donnees, cree_le, recu_le) VALUES (?, ?, ?, ?, ?)",
      e.id, e.type, JSON.stringify(e.donnees), e.cree_le, recu,
    );
    nouveaux += Number(r.changes);
  }
  return nouveaux;
}

export async function traiterEnAttente(ctx, limite = 100) {
  if (ctx.traitementEnCours) {
    ctx.relancerTraitement = true;
    return 0;
  }
  ctx.traitementEnCours = true;
  let traites = 0;
  try {
    do {
      ctx.relancerTraitement = false;
      const lot = tous(ctx, "SELECT * FROM entrants WHERE traite_le IS NULL AND essais < 5 ORDER BY cree_le LIMIT ?", limite);
      for (const ligne of lot) {
        const entrant = { ...ligne, donnees: JSON.parse(ligne.donnees) };
        try {
          if (entrant.type === "commentaire") await traiterCommentaire(ctx, entrant);
          else if (entrant.type === "message") await traiterMessage(ctx, entrant);
          executer(ctx, "UPDATE entrants SET traite_le = ?, erreur = NULL WHERE id = ?", iso(ctx.maintenant()), entrant.id);
          traites += 1;
        } catch (erreur) {
          const message = String(erreur?.message ?? erreur);
          executer(ctx, "UPDATE entrants SET essais = essais + 1, erreur = ? WHERE id = ?", message, entrant.id);
          journal(ctx, "erreur_traitement", { id: entrant.id, erreur: message });
        }
      }
    } while (ctx.relancerTraitement);
  } finally {
    ctx.traitementEnCours = false;
  }
  if (traites) signaler(ctx);
  return traites;
}

/* ---------- Commentaires → réservations ---------- */

function articleAuMoment(ctx, liveId, creeLe) {
  const quand = iso(new Date(Date.parse(creeLe) - ctx.config.decalageDirectS * 1000));
  return un(
    ctx,
    "SELECT * FROM articles WHERE live_id = ? AND ouvert_le <= ? AND (ferme_le IS NULL OR ferme_le > ?) ORDER BY ouvert_le DESC LIMIT 1",
    liveId, quand, quand,
  );
}

async function analyser(ctx, texte, article) {
  const regles = analyserParRegles(texte);
  if (!ctx.muse?.actif) return regles;
  try {
    const modele = await ctx.muse.comprendreCommentaire({ texte, article });
    return { ...modele, jp: regles.jp };
  } catch (erreur) {
    journal(ctx, "muse_indisponible", { erreur: String(erreur?.message ?? erreur) });
    return regles;
  }
}

function creerReservation(ctx, commentaire) {
  if (commentaire.auteur_id) {
    const deja = un(ctx, "SELECT id FROM reservations WHERE article_id = ? AND auteur_id = ?", commentaire.article_id, commentaire.auteur_id);
    if (deja) {
      journal(ctx, "jp_en_double", { commentaire: commentaire.fb_id, reservation: deja.id });
      return;
    }
  }
  executer(
    ctx,
    "INSERT OR IGNORE INTO reservations (article_id, commentaire_id, auteur_id, auteur_nom, statut) VALUES (?, ?, ?, ?, 'attente')",
    commentaire.article_id, commentaire.fb_id, commentaire.auteur_id, commentaire.auteur_nom,
  );
}

async function traiterCommentaire(ctx, entrant) {
  if (un(ctx, "SELECT 1 AS ok FROM commentaires WHERE fb_id = ?", entrant.id)) return;
  const d = entrant.donnees;
  const live = liveActif(ctx);

  // Les webhooks de la Page couvrent toutes ses publications : on ne garde
  // que celle du live en cours quand elle est connue.
  if (live?.objet_fb_id && d.objet_id && d.objet_id !== live.objet_fb_id && !d.objet_id.endsWith(`_${live.objet_fb_id}`)) return;

  let article = live ? articleAuMoment(ctx, live.id, entrant.cree_le) : null;
  const analyse = await analyser(ctx, d.texte, article);
  if (live && analyse.article_ref) {
    const cite = un(ctx, "SELECT * FROM articles WHERE live_id = ? AND ref = ?", live.id, String(analyse.article_ref).toUpperCase());
    if (cite) article = cite;
  }

  const commentaire = {
    fb_id: entrant.id,
    live_id: live?.id ?? null,
    article_id: article?.id ?? null,
    auteur_id: d.auteur_id ?? null,
    auteur_nom: d.auteur_nom ?? null,
  };
  const sur = analyse.intention === "achat" && analyse.confiance >= ctx.config.seuilConfiance;
  const douteux = (analyse.intention === "achat" && !sur) || (analyse.intention !== "achat" && analyse.jp);

  transaction(ctx.db, () => {
    executer(
      ctx,
      `INSERT INTO commentaires (fb_id, live_id, article_id, auteur_id, auteur_nom, texte, cree_le, intention, taille, confiance, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      commentaire.fb_id, commentaire.live_id, commentaire.article_id, commentaire.auteur_id, commentaire.auteur_nom,
      d.texte ?? "", entrant.cree_le, analyse.intention, analyse.taille ?? null, analyse.confiance, analyse.source,
    );
    if (!live || (!sur && !douteux)) return;
    if (!article) {
      journal(ctx, "jp_sans_article", { commentaire: entrant.id });
      return;
    }
    if (douteux) executer(ctx, "INSERT OR IGNORE INTO doutes (commentaire_id) VALUES (?)", entrant.id);
    else creerReservation(ctx, commentaire);
  });

  if (sur && article) await servirArticle(ctx, article.id);
}

/* ---------- Gagnante, récap, délai ---------- */

async function servirArticle(ctx, articleId) {
  if (un(ctx, `SELECT 1 AS ok FROM reservations WHERE article_id = ? AND statut IN ${ACTIVES}`, articleId)) return;
  const suivante = un(
    ctx,
    `SELECT r.id FROM reservations r JOIN commentaires c ON c.fb_id = r.commentaire_id
     WHERE r.article_id = ? AND r.statut = 'attente' ORDER BY c.cree_le LIMIT 1`,
    articleId,
  );
  if (suivante) await contacter(ctx, suivante.id);
}

async function contacter(ctx, reservationId) {
  const maintenant = ctx.maintenant();
  const delai = new Date(maintenant.getTime() + ctx.config.delaiPaiementMin * 60_000);
  let changes = 0;
  try {
    changes = Number(
      executer(
        ctx,
        "UPDATE reservations SET statut = 'contactee', contactee_le = ?, delai_le = ? WHERE id = ? AND statut = 'attente'",
        iso(maintenant), iso(delai), reservationId,
      ).changes,
    );
  } catch (erreur) {
    // L'index unique a refusé une deuxième gagnante : quelqu'un d'autre est déjà servie.
    if (/UNIQUE/i.test(String(erreur?.message))) return false;
    throw erreur;
  }
  if (!changes) return false;
  journal(ctx, "gagnante", { reservation: reservationId });
  await envoyerRecap(ctx, reservationId);
  signaler(ctx);
  return true;
}

function texteRecap(ctx, resa) {
  const prenom = (resa.auteur_nom ?? "").split(" ")[0];
  const paiement = ctx.config.numeroPaiement ? `par Mobile Money au ${ctx.config.numeroPaiement}` : "par Mobile Money";
  return `Salama${prenom ? ` ${prenom}` : ""} ! Vous avez gagné « ${resa.nom} » (${resa.ref}) à ${formatAr(resa.prix)} sur le live de ${ctx.config.nomPage}. Pour le garder, payez ${paiement} avant ${heureMadagascar(resa.delai_le)}, puis envoyez la capture ici. Misaotra !`;
}

async function envoyerRecap(ctx, reservationId) {
  const resa = un(
    ctx,
    "SELECT r.*, a.nom, a.ref, a.prix FROM reservations r JOIN articles a ON a.id = r.article_id WHERE r.id = ?",
    reservationId,
  );
  const texte = texteRecap(ctx, resa);
  const reponse = await envoyer(ctx, {
    cle: `recap:${resa.id}`,
    destinataire: resa.commentaire_id,
    psidSimule: `simule-${resa.auteur_id ?? resa.commentaire_id}`,
    texte,
    envoi: () => ctx.graph.reponsePrivee(resa.commentaire_id, texte),
  });
  if (reponse?.recipient_id) executer(ctx, "UPDATE reservations SET psid = ? WHERE id = ?", reponse.recipient_id, resa.id);
}

// Chaque envoi a une clé : il ne part qu'une fois, même après un redémarrage.
// Sans jeton de Page, ou pour un rejeu, l'envoi est simulé et journalisé.
async function envoyer(ctx, { cle, destinataire, psidSimule, texte, envoi }) {
  const deja = un(ctx, "SELECT * FROM envois WHERE cle = ?", cle);
  if (deja && deja.statut !== "erreur") return JSON.parse(deja.reponse ?? "null");

  const simuler = !ctx.graph?.actif || /^(rejeu|simule)-/.test(destinataire);
  let statut;
  let reponse;
  if (simuler) {
    statut = "simule";
    reponse = { recipient_id: psidSimule ?? destinataire, message_id: `simule-${cle}` };
  } else {
    try {
      reponse = await envoi();
      statut = "envoye";
    } catch (erreur) {
      statut = "erreur";
      reponse = { erreur: String(erreur?.message ?? erreur) };
      journal(ctx, "envoi_echoue", { cle, erreur: reponse.erreur });
    }
  }
  executer(
    ctx,
    `INSERT INTO envois (cle, destinataire, texte, statut, reponse, cree_le) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(cle) DO UPDATE SET statut = excluded.statut, reponse = excluded.reponse, essais = envois.essais + 1`,
    cle, destinataire, texte, statut, JSON.stringify(reponse), iso(ctx.maintenant()),
  );
  return statut === "erreur" ? null : reponse;
}

export async function expirerDelais(ctx) {
  const echues = tous(ctx, "SELECT id, article_id FROM reservations WHERE statut = 'contactee' AND delai_le <= ?", iso(ctx.maintenant()));
  for (const resa of echues) {
    const r = executer(ctx, "UPDATE reservations SET statut = 'expiree' WHERE id = ? AND statut = 'contactee'", resa.id);
    if (!Number(r.changes)) continue;
    journal(ctx, "delai_depasse", { reservation: resa.id });
    await servirArticle(ctx, resa.article_id);
  }
  if (echues.length) signaler(ctx);
  return echues.length;
}

// Après un redémarrage ou une panne réseau : on sert les articles restés sans
// gagnante et on retente les récaps qui n'étaient pas partis.
export async function reprendre(ctx) {
  for (const { article_id } of tous(ctx, "SELECT DISTINCT article_id FROM reservations WHERE statut = 'attente'")) {
    await servirArticle(ctx, article_id);
  }
  const echecs = tous(
    ctx,
    `SELECT r.id FROM reservations r JOIN envois e ON e.cle = 'recap:' || r.id
     WHERE r.statut = 'contactee' AND e.statut = 'erreur' AND e.essais < 3`,
  );
  for (const { id } of echecs) await envoyerRecap(ctx, id);
}

export async function entretenir(ctx) {
  if (ctx.entretienEnCours) return;
  ctx.entretienEnCours = true;
  try {
    await traiterEnAttente(ctx);
    await expirerDelais(ctx);
    await reprendre(ctx);
  } finally {
    ctx.entretienEnCours = false;
  }
}

/* ---------- Paiements ---------- */

async function traiterMessage(ctx, entrant) {
  const d = entrant.donnees;
  if (!d.psid) return;
  const resa = un(
    ctx,
    `SELECT r.*, a.prix FROM reservations r JOIN articles a ON a.id = r.article_id
     WHERE r.psid = ? AND r.statut IN ('contactee', 'a_confirmer') ORDER BY r.contactee_le DESC LIMIT 1`,
    d.psid,
  );
  if (!resa) {
    journal(ctx, "message_sans_commande", { message: entrant.id });
    return;
  }
  if (!d.image_url) {
    journal(ctx, "message_texte", { reservation: resa.id, message: entrant.id });
    return;
  }
  if (un(ctx, "SELECT 1 AS ok FROM paiements WHERE message_id = ?", entrant.id)) return;

  let lecture = null;
  if (ctx.muse?.actif) {
    try {
      lecture = await ctx.muse.lireCapture({ imageUrl: d.image_url, prixAttendu: resa.prix });
    } catch (erreur) {
      journal(ctx, "muse_indisponible", { erreur: String(erreur?.message ?? erreur) });
    }
  }
  let ecart = null;
  if (!lecture) ecart = "Lecture automatique indisponible : vérifiez la capture à l'œil.";
  else if (!lecture.est_paiement) ecart = "Ce n'est pas une confirmation de paiement.";
  else if (lecture.montant == null) ecart = "Montant illisible.";
  else if (lecture.montant !== resa.prix) ecart = `Montant ${formatAr(lecture.montant)} au lieu de ${formatAr(resa.prix)}.`;

  transaction(ctx.db, () => {
    executer(
      ctx,
      "INSERT INTO paiements (reservation_id, message_id, image_url, montant, reference, heure, ecart) VALUES (?, ?, ?, ?, ?, ?, ?)",
      resa.id, entrant.id, d.image_url, lecture?.montant ?? null, lecture?.reference ?? null, lecture?.heure ?? null, ecart,
    );
    executer(ctx, "UPDATE reservations SET statut = 'a_confirmer' WHERE id = ? AND statut = 'contactee'", resa.id);
  });
}

// La commande n'est « payée » qu'après la décision de la vendeuse.
export async function deciderPaiement(ctx, paiementId, confirme) {
  const p = un(
    ctx,
    `SELECT p.id, p.reservation_id, r.psid, r.delai_le, a.nom FROM paiements p
     JOIN reservations r ON r.id = p.reservation_id JOIN articles a ON a.id = r.article_id
     WHERE p.id = ? AND p.statut = 'a_confirmer'`,
    paiementId,
  );
  if (!p) throw new ErreurMetier(404, "Ce paiement n'existe pas ou a déjà été traité.");
  const maintenant = iso(ctx.maintenant());

  transaction(ctx.db, () => {
    executer(ctx, "UPDATE paiements SET statut = ?, decide_le = ? WHERE id = ?", confirme ? "confirme" : "refuse", maintenant, p.id);
    if (confirme) executer(ctx, "UPDATE reservations SET statut = 'payee', payee_le = ? WHERE id = ?", maintenant, p.reservation_id);
    else executer(ctx, "UPDATE reservations SET statut = 'contactee' WHERE id = ? AND statut = 'a_confirmer'", p.reservation_id);
  });
  journal(ctx, confirme ? "paiement_confirme" : "paiement_refuse", { paiement: p.id });

  if (p.psid) {
    const texte = confirme
      ? `Paiement reçu pour « ${p.nom} », misaotra ! Nous revenons vers vous pour la livraison.`
      : `Nous n'avons pas pu valider votre paiement pour « ${p.nom} ». Vous pouvez renvoyer une capture avant ${heureMadagascar(p.delai_le)}.`;
    await envoyer(ctx, {
      cle: confirme ? `merci:${p.reservation_id}` : `refus:${p.id}`,
      destinataire: p.psid,
      texte,
      envoi: () => ctx.graph.message(p.psid, texte),
    });
  }
  signaler(ctx);
}

/* ---------- Doutes : l'IA hésite, la vendeuse tranche ---------- */

export async function deciderDoute(ctx, douteId, oui) {
  const doute = un(
    ctx,
    `SELECT d.id, c.fb_id, c.article_id, c.auteur_id, c.auteur_nom FROM doutes d
     JOIN commentaires c ON c.fb_id = d.commentaire_id WHERE d.id = ? AND d.statut = 'ouvert'`,
    douteId,
  );
  if (!doute) throw new ErreurMetier(404, "Ce doute n'existe pas ou a déjà été tranché.");
  transaction(ctx.db, () => {
    executer(ctx, "UPDATE doutes SET statut = ?, decide_le = ? WHERE id = ?", oui ? "oui" : "non", iso(ctx.maintenant()), doute.id);
    if (oui && doute.article_id) creerReservation(ctx, doute);
  });
  if (oui && doute.article_id) await servirArticle(ctx, doute.article_id);
  signaler(ctx);
}

/* ---------- Le live et ses articles ---------- */

export function demarrerLive(ctx, { objetFbId = null } = {}) {
  const maintenant = isoSeconde(ctx.maintenant());
  const id = transaction(ctx.db, () => {
    executer(ctx, "UPDATE articles SET ferme_le = ? WHERE ferme_le IS NULL", maintenant);
    executer(ctx, "UPDATE lives SET termine_le = ? WHERE termine_le IS NULL", maintenant);
    return Number(executer(ctx, "INSERT INTO lives (objet_fb_id, demarre_le) VALUES (?, ?)", objetFbId, maintenant).lastInsertRowid);
  });
  journal(ctx, "live_demarre", { live: id, objet: objetFbId });
  signaler(ctx);
  return id;
}

export function terminerLive(ctx) {
  const maintenant = isoSeconde(ctx.maintenant());
  transaction(ctx.db, () => {
    executer(ctx, "UPDATE articles SET ferme_le = ? WHERE ferme_le IS NULL", maintenant);
    executer(ctx, "UPDATE lives SET termine_le = ? WHERE termine_le IS NULL", maintenant);
  });
  journal(ctx, "live_termine");
  signaler(ctx);
}

export function articleSuivant(ctx, { ref, nom, prix }) {
  const reference = String(ref ?? "").trim().toUpperCase();
  const libelle = String(nom ?? "").trim();
  const montant = Number(prix);
  if (!reference || !libelle || !Number.isInteger(montant) || montant <= 0) {
    throw new ErreurMetier(400, "Il faut une référence, un nom et un prix entier en ariary.");
  }
  const live = liveActif(ctx);
  if (!live) throw new ErreurMetier(409, "Aucun live en cours.");
  const maintenant = isoSeconde(ctx.maintenant());
  try {
    transaction(ctx.db, () => {
      executer(ctx, "UPDATE articles SET ferme_le = ? WHERE live_id = ? AND ferme_le IS NULL", maintenant, live.id);
      executer(ctx, "INSERT INTO articles (live_id, ref, nom, prix, ouvert_le) VALUES (?, ?, ?, ?, ?)", live.id, reference, libelle, montant, maintenant);
    });
  } catch (erreur) {
    if (/UNIQUE/i.test(String(erreur?.message))) throw new ErreurMetier(409, `L'article ${reference} est déjà passé dans ce live.`);
    throw erreur;
  }
  signaler(ctx);
}

/* ---------- Ce que voit l'écran Direct ---------- */

export function etat(ctx) {
  const live = liveActif(ctx);
  if (!live) return { live: null, article: null, gagnante: null, attente: [], doutes: [], paiements: [], compteurs: { jp: 0, payees: 0 } };

  // jp : une acheteuse compte une fois par article, quel que soit le sort de sa réservation.
  const article = un(
    ctx,
    `SELECT a.id, a.ref, a.nom, a.prix, (SELECT COUNT(*) FROM reservations r WHERE r.article_id = a.id) AS jp
     FROM articles a WHERE a.live_id = ? AND a.ferme_le IS NULL ORDER BY a.ouvert_le DESC LIMIT 1`,
    live.id,
  );
  const gagnante = article
    ? un(ctx, `SELECT id AS reservation_id, auteur_nom AS nom, statut, delai_le FROM reservations WHERE article_id = ? AND statut IN ${ACTIVES}`, article.id)
    : null;
  const attente = article
    ? tous(
        ctx,
        `SELECT r.id AS reservation_id, r.auteur_nom AS nom, c.cree_le FROM reservations r
         JOIN commentaires c ON c.fb_id = r.commentaire_id WHERE r.article_id = ? AND r.statut = 'attente' ORDER BY c.cree_le`,
        article.id,
      )
    : [];
  const doutes = tous(
    ctx,
    `SELECT d.id, c.texte, c.auteur_nom AS nom, c.cree_le, a.ref FROM doutes d
     JOIN commentaires c ON c.fb_id = d.commentaire_id LEFT JOIN articles a ON a.id = c.article_id
     WHERE d.statut = 'ouvert' AND c.live_id = ? ORDER BY c.cree_le`,
    live.id,
  );
  const paiements = tous(
    ctx,
    `SELECT p.id, p.reservation_id, r.auteur_nom AS nom, a.ref, a.nom AS article, a.prix, p.montant, p.reference, p.ecart, p.image_url
     FROM paiements p JOIN reservations r ON r.id = p.reservation_id JOIN articles a ON a.id = r.article_id
     WHERE p.statut = 'a_confirmer' AND a.live_id = ? ORDER BY p.id`,
    live.id,
  );
  const compteurs = un(
    ctx,
    `SELECT COUNT(*) AS jp, SUM(CASE WHEN r.statut = 'payee' THEN 1 ELSE 0 END) AS payees
     FROM reservations r JOIN articles a ON a.id = r.article_id WHERE a.live_id = ?`,
    live.id,
  );
  return {
    live: { id: live.id, demarre_le: live.demarre_le, objet_fb_id: live.objet_fb_id },
    article,
    gagnante,
    attente,
    doutes,
    paiements,
    compteurs: { jp: compteurs?.jp ?? 0, payees: compteurs?.payees ?? 0 },
  };
}
