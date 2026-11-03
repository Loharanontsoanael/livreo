import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { articleSuivant, etat } from "@/lib/serveur/boucle.mjs";
import { exigerPage, identifier, lireJson, repondreErreur } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Le bouton « Article suivant » : { "ref": "R13", "nom": "Robe rouge", "prix": 35000 }.
// Les JP arrivés avant ce moment restent sur l'article précédent.
export async function POST(requete) {
  const ctx = obtenirContexte();
  const qui = identifier(requete, ctx);
  if (qui instanceof Response) return qui;
  try {
    const pageId = exigerPage(qui);
    const { ref, nom, prix } = await lireJson(requete);
    articleSuivant(ctx, { ref, nom, prix, pageId });
    return Response.json(etat(ctx, pageId));
  } catch (erreur) {
    return repondreErreur(erreur);
  }
}
