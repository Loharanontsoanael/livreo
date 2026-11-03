import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { articleSuivant, etat } from "@/lib/serveur/boucle.mjs";
import { lireJson, refuserSiNonVendeuse, repondreErreur } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Le bouton « Article suivant » : { "ref": "R13", "nom": "Robe rouge", "prix": 35000 }.
// Les JP arrivés avant ce moment restent sur l'article précédent.
export async function POST(requete) {
  const ctx = obtenirContexte();
  const refus = refuserSiNonVendeuse(requete, ctx.config);
  if (refus) return refus;
  try {
    articleSuivant(ctx, await lireJson(requete));
    return Response.json(etat(ctx));
  } catch (erreur) {
    return repondreErreur(erreur);
  }
}
