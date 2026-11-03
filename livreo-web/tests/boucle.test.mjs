import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lireConfig } from "../lib/serveur/config.mjs";
import { ouvrirBase } from "../lib/serveur/db.mjs";
import { creerContexte } from "../lib/serveur/contexte.mjs";
import { analyserParRegles } from "../lib/serveur/regles.mjs";
import {
  articleSuivant, deciderDoute, deciderPaiement, demarrerLive, etat,
  expirerDelais, recevoir, reprendre, traiterEnAttente,
} from "../lib/serveur/boucle.mjs";

const T0 = Date.parse("2026-11-03T16:00:00.000Z");
const MINUTE = 60_000;

function horloge() {
  let t = T0;
  return { maintenant: () => new Date(t), avancer: (ms) => (t += ms) };
}

function faussesApi({ panneGraph = 0, capture = null, panneMuse = false } = {}) {
  const envois = [];
  let pannes = panneGraph;
  const graph = {
    actif: true,
    envois,
    async reponsePrivee(commentaireId, texte) {
      if (pannes-- > 0) throw new Error("Graph API 500 : panne simulée");
      envois.push({ type: "privee", vers: commentaireId, texte });
      return { recipient_id: `psid-${commentaireId}`, message_id: `m-${envois.length}` };
    },
    async message(psid, texte) {
      envois.push({ type: "message", vers: psid, texte });
      return { recipient_id: psid, message_id: `m-${envois.length}` };
    },
  };
  const muse = {
    actif: true,
    async comprendreCommentaire({ texte }) {
      if (panneMuse) throw new Error("Meta Model API 503");
      return { ...analyserParRegles(texte), source: "muse" };
    },
    async lireCapture() {
      return capture ?? { est_paiement: true, montant: 35000, reference: "REF123", heure: null, confiance: 0.9 };
    },
  };
  return { graph, muse };
}

function contexte(options = {}, chemin = ":memory:") {
  const h = horloge();
  const { graph, muse } = faussesApi(options);
  const ctx = creerContexte({
    config: { ...lireConfig({}), delaiPaiementMin: 30, nomPage: "Chez Nirina", ...options.config },
    db: ouvrirBase(chemin),
    graph,
    muse,
    maintenant: h.maintenant,
  });
  return { ctx, h, graph };
}

const commentaire = (id, auteur, texte, secondes) => ({
  id,
  type: "commentaire",
  cree_le: new Date(T0 + secondes * 1000).toISOString(),
  donnees: { objet_id: null, texte, auteur_id: `u-${auteur}`, auteur_nom: auteur },
});

function ouvrirLive(ctx) {
  demarrerLive(ctx);
  articleSuivant(ctx, { ref: "R12", nom: "Robe bleue wax", prix: 35000 });
}

test("le premier JP gagne et reçoit son récap, les suivants attendent, un doublon ne compte pas", async () => {
  const { ctx, graph } = contexte();
  ouvrirLive(ctx);
  recevoir(ctx, [
    commentaire("c1", "Faniry Rakoto", "jp", 5),
    commentaire("c2", "Hanta Ravelo", "JP !!", 6),
    commentaire("c3", "Faniry Rakoto", "jp jp", 7),
    commentaire("c4", "Rado Andria", "salama", 8),
  ]);
  await traiterEnAttente(ctx);

  const e = etat(ctx);
  assert.equal(e.gagnante.nom, "Faniry Rakoto");
  assert.equal(e.gagnante.statut, "contactee");
  assert.deepEqual(e.attente.map((a) => a.nom), ["Hanta Ravelo"]);
  assert.equal(graph.envois.length, 1);
  assert.equal(graph.envois[0].vers, "c1");
  assert.match(graph.envois[0].texte, /Robe bleue wax/);
  assert.match(graph.envois[0].texte, /Chez Nirina/);
});

test("un JP daté de la seconde du clic « Article suivant » va au nouvel article", async () => {
  const { ctx, h } = contexte();
  demarrerLive(ctx);
  h.avancer(415);
  articleSuivant(ctx, { ref: "R12", nom: "Robe bleue wax", prix: 35000 });
  recevoir(ctx, [commentaire("c1", "Faniry Rakoto", "jp", 0)]);
  await traiterEnAttente(ctx);
  assert.equal(etat(ctx).gagnante?.nom, "Faniry Rakoto");
});

test("décalage du direct : un JP juste après le changement vise encore l'article d'avant", async () => {
  const { ctx, h } = contexte({ config: { decalageDirectS: 10 } });
  ouvrirLive(ctx);
  h.avancer(60_000);
  articleSuivant(ctx, { ref: "R13", nom: "Robe rouge", prix: 35000 });
  recevoir(ctx, [
    commentaire("c1", "Faniry Rakoto", "jp", 65),
    commentaire("c2", "Hanta Ravelo", "jp", 75),
  ]);
  await traiterEnAttente(ctx);
  const articles = ctx.db
    .prepare("SELECT c.auteur_nom, a.ref FROM commentaires c JOIN articles a ON a.id = c.article_id ORDER BY c.cree_le")
    .all()
    .map((l) => `${l.auteur_nom}:${l.ref}`);
  assert.deepEqual(articles, ["Faniry Rakoto:R12", "Hanta Ravelo:R13"]);
});

test("une livraison de webhook reçue deux fois n'est traitée qu'une fois", async () => {
  const { ctx, graph } = contexte();
  ouvrirLive(ctx);
  assert.equal(recevoir(ctx, [commentaire("c1", "Faniry Rakoto", "jp", 5)]), 1);
  assert.equal(recevoir(ctx, [commentaire("c1", "Faniry Rakoto", "jp", 5)]), 0);
  await traiterEnAttente(ctx);
  await traiterEnAttente(ctx);
  assert.equal(graph.envois.length, 1);
});

test("délai dépassé : l'article passe à la suivante, qui reçoit son propre récap", async () => {
  const { ctx, h, graph } = contexte();
  ouvrirLive(ctx);
  recevoir(ctx, [commentaire("c1", "Faniry Rakoto", "jp", 5), commentaire("c2", "Hanta Ravelo", "jp", 6)]);
  await traiterEnAttente(ctx);

  h.avancer(29 * MINUTE);
  assert.equal(await expirerDelais(ctx), 0);
  h.avancer(2 * MINUTE);
  assert.equal(await expirerDelais(ctx), 1);

  const e = etat(ctx);
  assert.equal(e.gagnante.nom, "Hanta Ravelo");
  assert.deepEqual(graph.envois.map((x) => x.vers), ["c1", "c2"]);
});

test("paiement : la capture est lue, l'écart signalé, et rien n'est payé sans la vendeuse", async () => {
  const { ctx, h, graph } = contexte({ capture: { est_paiement: true, montant: 30000, reference: "AB12", heure: null, confiance: 0.9 } });
  ouvrirLive(ctx);
  recevoir(ctx, [commentaire("c1", "Faniry Rakoto", "jp", 5)]);
  await traiterEnAttente(ctx);

  recevoir(ctx, [{
    id: "msg1",
    type: "message",
    cree_le: new Date(T0 + 60_000).toISOString(),
    donnees: { psid: "psid-c1", texte: "", image_url: "https://exemple.test/capture.jpg" },
  }]);
  await traiterEnAttente(ctx);

  let e = etat(ctx);
  assert.equal(e.gagnante.statut, "a_confirmer");
  assert.equal(e.paiements.length, 1);
  assert.match(e.paiements[0].ecart, /au lieu de/);

  // Une capture en attente de décision n'expire pas.
  h.avancer(45 * MINUTE);
  await expirerDelais(ctx);
  assert.equal(etat(ctx).gagnante.statut, "a_confirmer");

  await deciderPaiement(ctx, e.paiements[0].id, true);
  e = etat(ctx);
  assert.equal(e.gagnante.statut, "payee");
  assert.equal(e.compteurs.payees, 1);
  assert.equal(graph.envois.at(-1).vers, "psid-c1");
  assert.match(graph.envois.at(-1).texte, /Paiement reçu/);
});

test("doute : « jp ve ? » attend la vendeuse, puis devient une réservation sur un oui", async () => {
  const { ctx, graph } = contexte();
  ouvrirLive(ctx);
  recevoir(ctx, [commentaire("c1", "Mialy Rasoa", "jp ve ?", 5)]);
  await traiterEnAttente(ctx);

  let e = etat(ctx);
  assert.equal(e.doutes.length, 1);
  assert.equal(e.gagnante, null);
  assert.equal(graph.envois.length, 0);

  await deciderDoute(ctx, e.doutes[0].id, true);
  e = etat(ctx);
  assert.equal(e.doutes.length, 0);
  assert.equal(e.gagnante.nom, "Mialy Rasoa");
  assert.equal(graph.envois.length, 1);
});

test("la base refuse deux gagnantes actives sur le même article", () => {
  const { ctx } = contexte();
  ouvrirLive(ctx);
  const db = ctx.db;
  for (const id of ["c1", "c2"]) {
    db.prepare("INSERT INTO commentaires (fb_id, texte, cree_le) VALUES (?, 'jp', ?)").run(id, new Date(T0).toISOString());
  }
  db.prepare("INSERT INTO reservations (article_id, commentaire_id, statut) VALUES (1, 'c1', 'contactee')").run();
  assert.throws(
    () => db.prepare("INSERT INTO reservations (article_id, commentaire_id, statut) VALUES (1, 'c2', 'contactee')").run(),
    /UNIQUE/,
  );
});

test("redémarrage : les délais et les envois survivent, rien n'est oublié ni renvoyé", async () => {
  const dossier = mkdtempSync(join(tmpdir(), "livreo-"));
  const chemin = join(dossier, "livreo.db");
  try {
    const avant = contexte({}, chemin);
    ouvrirLive(avant.ctx);
    recevoir(avant.ctx, [commentaire("c1", "Faniry Rakoto", "jp", 5), commentaire("c2", "Hanta Ravelo", "jp", 6)]);
    await traiterEnAttente(avant.ctx);
    avant.ctx.db.close();

    const apres = contexte({}, chemin);
    await reprendre(apres.ctx);
    assert.equal(apres.graph.envois.length, 0);

    apres.h.avancer(31 * MINUTE);
    await expirerDelais(apres.ctx);
    assert.equal(etat(apres.ctx).gagnante.nom, "Hanta Ravelo");
    assert.deepEqual(apres.graph.envois.map((x) => x.vers), ["c2"]);
    apres.ctx.db.close();
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test("panne de Muse Spark : le parseur de secours prend le relais", async () => {
  const { ctx } = contexte({ panneMuse: true });
  ouvrirLive(ctx);
  recevoir(ctx, [commentaire("c1", "Faniry Rakoto", "jp", 5)]);
  await traiterEnAttente(ctx);
  assert.equal(etat(ctx).gagnante.nom, "Faniry Rakoto");
  const source = ctx.db.prepare("SELECT source FROM commentaires WHERE fb_id = 'c1'").get().source;
  assert.equal(source, "regles");
});

test("panne de la Graph API : le récap est retenté sans doublon", async () => {
  const { ctx, graph } = contexte({ panneGraph: 1 });
  ouvrirLive(ctx);
  recevoir(ctx, [commentaire("c1", "Faniry Rakoto", "jp", 5)]);
  await traiterEnAttente(ctx);
  assert.equal(graph.envois.length, 0);

  await reprendre(ctx);
  await reprendre(ctx);
  assert.equal(graph.envois.length, 1);
  assert.equal(etat(ctx).gagnante.statut, "contactee");
});
