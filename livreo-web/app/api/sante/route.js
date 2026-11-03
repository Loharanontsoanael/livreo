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
  return Response.json({
    base,
    graph: ctx.graph.actif ? "actif" : "simulation",
    muse: ctx.muse.actif ? `actif (${ctx.config.modele})` : "simulation",
    webhook: ctx.config.appSecret && ctx.config.verifyToken ? "configuré" : "à configurer",
  });
}
