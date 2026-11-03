import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { enregistrerNumero, journal } from "@/lib/serveur/boucle.mjs";
import { exigerPage, identifier, lireJson, repondreErreur } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Le numéro Mobile Money de la boutique, écrit dans chaque récap : { "numero": "034 12 345 67" }.
export async function POST(requete) {
  const ctx = obtenirContexte();
  const qui = identifier(requete, ctx);
  if (qui instanceof Response) return qui;
  try {
    const pageId = exigerPage(qui);
    const { numero } = await lireJson(requete);
    const enregistre = enregistrerNumero(ctx, pageId, numero);
    journal(ctx, "numero_paiement", { page: pageId });
    return Response.json({ numero: enregistre });
  } catch (erreur) {
    return repondreErreur(erreur);
  }
}
