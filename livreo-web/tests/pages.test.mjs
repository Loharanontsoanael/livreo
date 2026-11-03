import { test } from "node:test";
import assert from "node:assert/strict";
import { lireConfig } from "../lib/serveur/config.mjs";
import { ouvrirBase } from "../lib/serveur/db.mjs";
import { creerContexte } from "../lib/serveur/contexte.mjs";
import { creerCoffre } from "../lib/serveur/coffre.mjs";
import { analyserParRegles } from "../lib/serveur/regles.mjs";
import { identifier } from "../lib/serveur/http.mjs";
import {
  COOKIE_SESSION, choisirPage, fermerSession, finaliserConnexion, lireSession, ouvrirSession, pagesDe,
} from "../lib/serveur/connexion.mjs";
import {
  articleSuivant, deciderDoute, deciderPaiement, demarrerLive, enregistrerNumero, etat, recevoir, terminerLive, traiterEnAttente,
} from "../lib/serveur/boucle.mjs";

const T0 = Date.parse("2026-11-03T16:00:00.000Z");

function contexte(config = {}) {
  let t = T0;
  const envois = [];
  const abonnements = [];
  const graph = {
    actif: true,
    envois,
    abonnements,
    async reponsePrivee(commentaireId, texte) {
      envois.push({ vers: commentaireId, texte });
      return { recipient_id: `psid-${commentaireId}` };
    },
    async message(psid, texte) {
      envois.push({ vers: psid, texte });
      return { recipient_id: psid };
    },
    async abonner() {
      abonnements.push(true);
      return { success: true };
    },
  };
  const muse = {
    actif: true,
    async comprendreCommentaire({ texte }) {
      return { ...analyserParRegles(texte), source: "muse" };
    },
  };
  const ctx = creerContexte({
    config: { ...lireConfig({}), appId: "app", appSecret: "secret", cleChiffrement: "secret", ...config },
    db: ouvrirBase(":memory:"),
    graph,
    muse,
    maintenant: () => new Date(t),
  });
  return { ctx, graph, avancer: (ms) => (t += ms) };
}

function ajouterPage(ctx, id, nom) {
  ctx.db.prepare("INSERT OR IGNORE INTO vendeuses (id, fb_id, nom, cree_le) VALUES (1, 'u1', 'Nirina', ?)").run(new Date(T0).toISOString());
  ctx.db
    .prepare("INSERT INTO pages (id, vendeuse_id, nom, jeton, maj_le) VALUES (?, 1, ?, ?, ?)")
    .run(id, nom, ctx.coffre.chiffrer(`jeton-${id}`), new Date(T0).toISOString());
}

const jp = (id, pageId, auteur, secondes) => ({
  id,
  page_id: pageId,
  type: "commentaire",
  cree_le: new Date(T0 + secondes * 1000).toISOString(),
  donnees: { objet_id: null, texte: "jp", auteur_id: `u-${auteur}`, auteur_nom: auteur },
});

test("deux boutiques en live en même temps : chaque JP reste chez sa Page", async () => {
  const { ctx, graph } = contexte();
  ajouterPage(ctx, "PA", "Pretty Shop");
  ajouterPage(ctx, "PB", "Idea Art");
  demarrerLive(ctx, { pageId: "PA" });
  demarrerLive(ctx, { pageId: "PB" });
  articleSuivant(ctx, { ref: "R1", nom: "Robe bleue", prix: 35000, pageId: "PA" });
  articleSuivant(ctx, { ref: "R1", nom: "Tableau", prix: 90000, pageId: "PB" });

  recevoir(ctx, [jp("c1", "PA", "Faniry Rakoto", 5), jp("c2", "PB", "Hanta Ravelo", 6)]);
  await traiterEnAttente(ctx);

  assert.equal(etat(ctx, "PA").gagnante.nom, "Faniry Rakoto");
  assert.equal(etat(ctx, "PB").gagnante.nom, "Hanta Ravelo");
  assert.equal(etat(ctx, "PA").article.nom, "Robe bleue");
  // Le récap porte le nom de la bonne boutique.
  assert.match(graph.envois.find((e) => e.vers === "c1").texte, /live de Pretty Shop/);
  assert.match(graph.envois.find((e) => e.vers === "c2").texte, /live de Idea Art/);
});

test("démarrer ou terminer le live d'une Page ne touche pas celui d'une autre", () => {
  const { ctx } = contexte();
  demarrerLive(ctx, { pageId: "PA" });
  articleSuivant(ctx, { ref: "R1", nom: "Robe", prix: 1000, pageId: "PA" });
  demarrerLive(ctx, { pageId: "PB" });
  assert.equal(etat(ctx, "PA").article.ref, "R1");
  assert.equal(etat(ctx, "PB").live !== null, true);
  assert.equal(etat(ctx, "PC").live, null);
});

test("une vendeuse ne peut pas trancher un doute d'une autre Page", async () => {
  const { ctx } = contexte();
  demarrerLive(ctx, { pageId: "PA" });
  articleSuivant(ctx, { ref: "R1", nom: "Robe", prix: 1000, pageId: "PA" });
  recevoir(ctx, [{ ...jp("c1", "PA", "Mialy Rasoa", 5), donnees: { texte: "jp ve ?", auteur_id: "u-m", auteur_nom: "Mialy Rasoa" } }]);
  await traiterEnAttente(ctx);
  const doute = etat(ctx, "PA").doutes[0];
  await assert.rejects(() => deciderDoute(ctx, doute.id, true, "PB"), /n'existe pas/);
  await deciderDoute(ctx, doute.id, true, "PA");
  assert.equal(etat(ctx, "PA").gagnante.nom, "Mialy Rasoa");
});

test("coffre : un jeton chiffré se relit, falsifié ou avec une autre clé il ne se relit pas", () => {
  const coffre = creerCoffre("secret-a");
  const paquet = coffre.chiffrer("EAAJETONDEPAGE");
  assert.doesNotMatch(paquet, /EAAJETONDEPAGE/);
  assert.equal(coffre.dechiffrer(paquet), "EAAJETONDEPAGE");
  const morceaux = paquet.split(".");
  morceaux[3] = Buffer.from("autre chose").toString("base64url");
  assert.equal(coffre.dechiffrer(morceaux.join(".")), null);
  assert.equal(creerCoffre("secret-b").dechiffrer(paquet), null);
});

test("session : seule l'empreinte est gardée, elle expire et se ferme", () => {
  const { ctx, avancer } = contexte();
  ajouterPage(ctx, "PA", "Pretty Shop");
  const { cle } = ouvrirSession(ctx, 1);
  assert.equal(ctx.db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE cle = ?").get(cle).n, 0);
  assert.equal(lireSession(ctx, cle).vendeuse_id, 1);
  assert.equal(lireSession(ctx, "inventee"), null);
  fermerSession(ctx, cle);
  assert.equal(lireSession(ctx, cle), null);

  const autre = ouvrirSession(ctx, 1).cle;
  avancer(31 * 86_400_000);
  assert.equal(lireSession(ctx, autre), null);
});

test("connexion Facebook : les Pages sont rangées chiffrées, la Page choisie est abonnée", async () => {
  const { ctx, graph } = contexte();
  const appels = [];
  const faux = async (url) => {
    const u = new URL(url);
    appels.push(u.pathname);
    const corps = u.pathname.endsWith("/oauth/access_token")
      ? { access_token: u.searchParams.get("code") ? "court" : "long" }
      : u.pathname.endsWith("/me")
        ? { id: "u1", name: "Nirina Rabe" }
        : u.pathname.endsWith("/me/permissions")
          ? { data: [{ permission: "pages_show_list", status: "granted" }, { permission: "pages_messaging", status: "granted" }] }
          : { data: [{ id: "PA", name: "Pretty Shop", category: "Boutique", access_token: "EAAPAGEA", picture: { data: { url: "https://x/a.jpg" } } }] };
    return new Response(JSON.stringify(corps), { status: 200 });
  };
  const { vendeuseId, pages, manquantes } = await finaliserConnexion(ctx, { code: "abc", retour: "https://livreo.test/retour" }, faux);
  assert.equal(pages, 1);
  assert.deepEqual(manquantes, ["pages_read_engagement", "pages_read_user_content", "pages_manage_metadata"]);
  const stocke = ctx.db.prepare("SELECT jeton FROM pages WHERE id = 'PA'").get().jeton;
  assert.doesNotMatch(stocke, /EAAPAGEA/);
  assert.equal(ctx.coffre.dechiffrer(stocke), "EAAPAGEA");
  assert.deepEqual(pagesDe(ctx, vendeuseId).map((p) => p.nom), ["Pretty Shop"]);

  const { cle } = ouvrirSession(ctx, vendeuseId);
  const session = lireSession(ctx, cle);
  assert.equal((await choisirPage(ctx, session, "inconnue")).statut, 404);
  const { page } = await choisirPage(ctx, session, "PA");
  assert.equal(page.nom, "Pretty Shop");
  assert.equal(graph.abonnements.length, 1);
  assert.equal(lireSession(ctx, cle).page_id, "PA");
});

test("identifier : la session prime, le secours ne vaut qu'hors production ou avec la clé", () => {
  const requete = ({ cookie, entete, url = "https://livreo.test/api/live" } = {}) => ({
    url,
    headers: new Headers(entete ? { authorization: entete } : {}),
    cookies: { get: (nom) => (nom === COOKIE_SESSION && cookie ? { value: cookie } : undefined) },
  });

  const dev = contexte({ pageId: "PSECOURS" });
  ajouterPage(dev.ctx, "PA", "Pretty Shop");
  const { cle } = ouvrirSession(dev.ctx, 1);
  dev.ctx.db.prepare("UPDATE sessions SET page_id = 'PA'").run();
  assert.equal(identifier(requete({ cookie: cle }), dev.ctx).pageId, "PA");
  assert.equal(identifier(requete(), dev.ctx).pageId, "PSECOURS");

  const prod = contexte({ production: true, cleVendeuse: "cle-secrete" });
  assert.equal(identifier(requete(), prod.ctx).status, 401);
  assert.equal(identifier(requete({ entete: "Bearer mauvaise" }), prod.ctx).status, 401);
  assert.equal(identifier(requete({ entete: "Bearer cle-secrete" }), prod.ctx).vendeuseId, null);
});

test("numéro Mobile Money : propre à chaque Page, écrit dans le récap, refusé s'il est invalide", async () => {
  const { ctx, graph } = contexte();
  ajouterPage(ctx, "PA", "Pretty Shop");
  assert.throws(() => enregistrerNumero(ctx, "PA", "abc"), /ne ressemble pas/);
  assert.equal(enregistrerNumero(ctx, "PA", " 034  12 345 67 "), "034 12 345 67");
  demarrerLive(ctx, { pageId: "PA" });
  articleSuivant(ctx, { ref: "R1", nom: "Robe", prix: 35000, pageId: "PA" });
  demarrerLive(ctx, { pageId: "PB" });
  articleSuivant(ctx, { ref: "R1", nom: "Tableau", prix: 9000, pageId: "PB" });
  recevoir(ctx, [jp("c1", "PA", "Faniry Rakoto", 5), jp("c2", "PB", "Hanta Ravelo", 6)]);
  await traiterEnAttente(ctx);
  assert.match(graph.envois.find((e) => e.vers === "c1").texte, /Mobile Money au 034 12 345 67/);
  assert.doesNotMatch(graph.envois.find((e) => e.vers === "c2").texte, /034 12 345 67/);
});

test("une capture arrivée après la fin du live reste à valider, et se valide", async () => {
  const { ctx } = contexte();
  demarrerLive(ctx, { pageId: "PA" });
  articleSuivant(ctx, { ref: "R1", nom: "Robe", prix: 35000, pageId: "PA" });
  recevoir(ctx, [jp("c1", "PA", "Faniry Rakoto", 5)]);
  await traiterEnAttente(ctx);
  terminerLive(ctx, "PA");

  ctx.muse.lireCapture = async () => ({ est_paiement: true, montant: 35000, reference: "X1", heure: null, confiance: 0.9 });
  recevoir(ctx, [{
    id: "m1", page_id: "PA", type: "message", cree_le: new Date(T0 + 600_000).toISOString(),
    donnees: { psid: "psid-c1", texte: "", image_url: "https://x/capture.jpg" },
  }]);
  await traiterEnAttente(ctx);

  const e = etat(ctx, "PA");
  assert.equal(e.live, null);
  assert.equal(e.paiements.length, 1);
  assert.equal(etat(ctx, "PB").paiements.length, 0);
  await deciderPaiement(ctx, e.paiements[0].id, true, "PA");
  assert.equal(etat(ctx, "PA").paiements.length, 0);
});
