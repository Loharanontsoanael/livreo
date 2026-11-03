import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { arreterRejeu, lancerRejeu } from "@/lib/serveur/rejeu.mjs";
import { exigerPage, identifier, repondreErreur } from "@/lib/serveur/http.mjs";
import { ErreurMetier } from "@/lib/serveur/boucle.mjs";
import demo from "@/lib/serveur/rejeu-demo.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rejoue un live dans la vraie chaîne de traitement, pour répéter et filmer
// la démo sans vendeuse disponible. Corps optionnel :
// { "scenario": { articles, commentaires, captures }, "vitesse": 2 }
// { "garder_live": true } : les commentaires de démo tombent dans le live ouvert
// depuis l'app, sans ses articles (la vendeuse les passe elle-même).
export async function POST(requete) {
  const ctx = obtenirContexte();
  const qui = identifier(requete, ctx);
  if (qui instanceof Response) return qui;
  try {
    const pageId = exigerPage(qui);
    if (!ctx.config.rejeuAutorise) throw new ErreurMetier(403, "Le rejeu est désactivé (LIVREO_REJEU=1 pour l'autoriser).");
    const corps = await requete.json().catch(() => ({}));
    const vitesse = Number(corps.vitesse ?? 1);
    if (!(vitesse > 0 && vitesse <= 20)) throw new ErreurMetier(400, "La vitesse doit être comprise entre 0 et 20.");
    const garderLive = corps.garder_live === true;
    const scenario = corps.scenario ?? (garderLive ? { ...demo, articles: [] } : demo);
    return Response.json(lancerRejeu(ctx, scenario, { vitesse, garderLive, pageId }));
  } catch (erreur) {
    if (erreur?.message === "Un rejeu est déjà en cours.") return Response.json({ erreur: erreur.message }, { status: 409 });
    return repondreErreur(erreur);
  }
}

export function DELETE(requete) {
  const ctx = obtenirContexte();
  const qui = identifier(requete, ctx);
  if (qui instanceof Response) return qui;
  arreterRejeu(ctx);
  return Response.json({ arrete: true });
}
