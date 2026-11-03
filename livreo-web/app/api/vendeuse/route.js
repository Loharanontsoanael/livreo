import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { pagesDe } from "@/lib/serveur/connexion.mjs";
import { identifier } from "@/lib/serveur/http.mjs";
import { numeroPaiement } from "@/lib/serveur/boucle.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Qui est connectée, ses Pages et la Page choisie (jamais les jetons).
export function GET(requete) {
  const ctx = obtenirContexte();
  const qui = identifier(requete, ctx);
  if (qui instanceof Response) return Response.json({ connectee: false });
  if (!qui.session) {
    // Mode de secours : la Page de l'environnement, sans connexion Facebook.
    return Response.json({
      connectee: false,
      secours: ctx.config.pageId ? { nom: ctx.config.nomPage, numero: numeroPaiement(ctx, ctx.config.pageId) } : null,
    });
  }
  const pages = pagesDe(ctx, qui.vendeuseId);
  return Response.json({
    connectee: true,
    nom: qui.session.vendeuse_nom,
    pages,
    page: pages.find((p) => p.id === qui.pageId) ?? null,
    numero: qui.pageId ? numeroPaiement(ctx, qui.pageId) : "",
  });
}
