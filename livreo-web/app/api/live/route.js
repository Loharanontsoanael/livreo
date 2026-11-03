import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { demarrerLive, etat, terminerLive, ErreurMetier } from "@/lib/serveur/boucle.mjs";
import { exigerPage, identifier, lireJson, repondreErreur } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// L'état du live en cours : article, gagnante, file d'attente, doutes, paiements.
export function GET(requete) {
  const ctx = obtenirContexte();
  const qui = identifier(requete, ctx);
  if (qui instanceof Response) return qui;
  try {
    return Response.json(etat(ctx, exigerPage(qui)));
  } catch (erreur) {
    return repondreErreur(erreur);
  }
}

// { "action": "demarrer", "objet_fb_id": "<id de la publication du live>" } ou { "action": "terminer" }
export async function POST(requete) {
  const ctx = obtenirContexte();
  const qui = identifier(requete, ctx);
  if (qui instanceof Response) return qui;
  try {
    const pageId = exigerPage(qui);
    const corps = await lireJson(requete);
    if (corps.action === "demarrer") demarrerLive(ctx, { objetFbId: corps.objet_fb_id ?? null, pageId });
    else if (corps.action === "terminer") terminerLive(ctx, pageId);
    else throw new ErreurMetier(400, "L'action doit être « demarrer » ou « terminer ».");
    return Response.json(etat(ctx, pageId));
  } catch (erreur) {
    return repondreErreur(erreur);
  }
}
