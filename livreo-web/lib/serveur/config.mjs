// La configuration vient de l'environnement. Un secret manquant ne bloque
// pas le démarrage : le module concerné passe en simulation et /api/sante
// le signale, pour qu'on puisse développer et répéter la démo sans compte Meta.
export function lireConfig(env = process.env) {
  return {
    graphVersion: env.GRAPH_API_VERSION || "v26.0",
    appSecret: env.META_APP_SECRET || "",
    verifyToken: env.META_VERIFY_TOKEN || "",
    pageId: env.META_PAGE_ID || "",
    pageToken: env.META_PAGE_ACCESS_TOKEN || "",
    nomPage: env.LIVREO_NOM_PAGE || "notre boutique",
    modelApiKey: env.MODEL_API_KEY || "",
    modele: env.MUSE_MODELE || "muse-spark-1.3",
    cleVendeuse: env.LIVREO_CLE_VENDEUSE || "",
    cheminBase: env.LIVREO_BASE || "./donnees/livreo.db",
    delaiPaiementMin: Number(env.LIVREO_DELAI_MIN || 30),
    seuilConfiance: Number(env.LIVREO_SEUIL_CONFIANCE || 0.7),
    // Les spectatrices voient le live avec quelques secondes de retard : un JP
    // est rattaché à l'article montré (heure du commentaire − ce décalage).
    decalageDirectS: Number(env.LIVREO_DECALAGE_S || 0),
    numeroPaiement: env.LIVREO_NUMERO_PAIEMENT || "",
    production: env.NODE_ENV === "production",
    rejeuAutorise: env.LIVREO_REJEU === "1" || env.NODE_ENV !== "production",
  };
}
