import { obtenirContexte } from "@/lib/serveur/contexte.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Contrôle de santé public : dit quelles intégrations sont réelles ou simulées,
// sans jamais exposer de secret.
export function GET() {
  const ctx = obtenirContexte();
  let base = "ok";
  try {
    ctx.db.prepare("SELECT 1").get();
  } catch {
    base = "en panne";
  }
  const pages = base === "ok" ? ctx.db.prepare("SELECT COUNT(*) AS n FROM pages WHERE abonnee_le IS NOT NULL").get().n : 0;
  return Response.json({
    base,
    connexion_facebook: ctx.config.appId && ctx.config.appSecret ? "prête" : "à configurer",
    pages_connectees: pages,
    page_de_secours: ctx.graph.actif ? "active" : "absente",
    muse: ctx.muse.actif ? `actif (${ctx.config.modele})` : "simulation",
    webhook: ctx.config.appSecret && ctx.config.verifyToken ? "configuré" : "à configurer",
  });
}
