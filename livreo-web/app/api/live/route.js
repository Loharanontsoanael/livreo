import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { demarrerLive, etat, terminerLive, ErreurMetier } from "@/lib/serveur/boucle.mjs";
import { lireJson, refuserSiNonVendeuse, repondreErreur } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// L'état du live en cours : article, gagnante, file d'attente, doutes, paiements.
export function GET(requete) {
  const ctx = obtenirContexte();
  return refuserSiNonVendeuse(requete, ctx.config) ?? Response.json(etat(ctx));
}

// { "action": "demarrer", "objet_fb_id": "<id de la publication du live>" } ou { "action": "terminer" }
export async function POST(requete) {
  const ctx = obtenirContexte();
  const refus = refuserSiNonVendeuse(requete, ctx.config);
  if (refus) return refus;
  try {
    const corps = await lireJson(requete);
    if (corps.action === "demarrer") demarrerLive(ctx, { objetFbId: corps.objet_fb_id ?? null });
    else if (corps.action === "terminer") terminerLive(ctx);
    else throw new ErreurMetier(400, "L'action doit être « demarrer » ou « terminer ».");
    return Response.json(etat(ctx));
  } catch (erreur) {
    return repondreErreur(erreur);
  }
}
