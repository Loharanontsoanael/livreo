import { EventEmitter } from "node:events";
import { lireConfig } from "./config.mjs";
import { ouvrirBase } from "./db.mjs";
import { creerGraph } from "./graph.mjs";
import { creerMuse } from "./muse.mjs";
import { traiterEnAttente } from "./boucle.mjs";

// Le contexte réunit la base, les deux API et l'horloge. Les tests en
// construisent un avec des doubles ; l'app utilise le singleton ci-dessous.
export function creerContexte({ config = lireConfig(), db, graph, muse, maintenant = () => new Date() } = {}) {
  const bus = new EventEmitter();
  bus.setMaxListeners(100);
  return {
    config,
    db: db ?? ouvrirBase(config.cheminBase),
    graph: graph ?? creerGraph({
      version: config.graphVersion,
      pageId: config.pageId,
      pageToken: config.pageToken,
      appSecret: config.appSecret,
    }),
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
