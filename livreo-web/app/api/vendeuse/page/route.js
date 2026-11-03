import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { choisirPage } from "@/lib/serveur/connexion.mjs";
import { journal } from "@/lib/serveur/boucle.mjs";
import { identifier, lireJson, repondreErreur } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// La vendeuse choisit la Page de son live : { "page_id": "…" }.
export async function POST(requete) {
  const ctx = obtenirContexte();
  const qui = identifier(requete, ctx);
  if (qui instanceof Response) return qui;
  if (!qui.session) return Response.json({ erreur: "Connectez-vous avec Facebook." }, { status: 401 });
  try {
    const { page_id: pageId } = await lireJson(requete);
    const resultat = await choisirPage(ctx, qui.session, pageId);
    if (resultat.erreur) return Response.json({ erreur: resultat.erreur }, { status: resultat.statut });
    journal(ctx, "page_choisie", { vendeuse: qui.vendeuseId, page: resultat.page.id });
    return Response.json({ page: resultat.page });
  } catch (erreur) {
    return repondreErreur(erreur);
  }
}
