import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
import { lireConfig } from "./config.mjs";
import { ouvrirBase } from "./db.mjs";
import { creerGraph } from "./graph.mjs";
import { creerMuse } from "./muse.mjs";
import { creerCoffre } from "./coffre.mjs";
import { traiterEnAttente } from "./boucle.mjs";

// Le contexte réunit la base, les deux API et l'horloge. Les tests en
// construisent un avec des doubles ; l'app utilise le singleton ci-dessous.
// Un double « graph » passé ici sert pour toutes les Pages.
export function creerContexte({ config = lireConfig(), db, graph, muse, maintenant = () => new Date() } = {}) {
  const bus = new EventEmitter();
  bus.setMaxListeners(100);
  const base = db ?? ouvrirBase(config.cheminBase);
  const coffre = creerCoffre(config.cleChiffrement);
  const cache = new Map();

  // Le client Graph d'une Page : son jeton vient de la base (Page connectée
  // par sa vendeuse), ou de l'environnement pour la Page de secours.
  function graphPour(pageId = config.pageId) {
    if (graph) return graph;
    const ligne = pageId ? base.prepare("SELECT jeton FROM pages WHERE id = ?").get(pageId) : null;
    const jeton = ligne ? coffre.dechiffrer(ligne.jeton) ?? "" : pageId === config.pageId ? config.pageToken : "";
    const cle = `${pageId}:${createHash("sha256").update(jeton).digest("hex")}`;
    if (!cache.has(cle)) {
      cache.set(cle, creerGraph({ version: config.graphVersion, pageId, pageToken: jeton, appSecret: config.appSecret }));
    }
    return cache.get(cle);
  }

  return {
    config,
    db: base,
    coffre,
    graphPour,
    get graph() {
      return graphPour(config.pageId);
    },
    muse: muse ?? creerMuse({ apiKey: config.modelApiKey, modele: config.modele }),
    bus,
    maintenant,
  };
}

// Un seul contexte par processus, conservé à travers le rechargement à chaud
// de Next.js en développement.
export function obtenirContexte() {
  globalThis.__livreoContexte ??= creerContexte();
  return globalThis.__livreoContexte;
}

// Lance le traitement sans faire attendre la réponse HTTP : Meta veut un 200 rapide.
export function declencher(ctx) {
  setImmediate(() => {
    traiterEnAttente(ctx).catch((erreur) => console.error("[livreo] traitement :", erreur));
  });
}
