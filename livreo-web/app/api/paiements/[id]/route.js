import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { deciderPaiement, etat, ErreurMetier } from "@/lib/serveur/boucle.mjs";
import { exigerPage, identifier, lireJson, repondreErreur } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// La vendeuse confirme ou refuse un paiement lu par l'IA : { "decision": "confirmer" | "refuser" }.
// Une commande n'est jamais marquée payée sans cette décision.
export async function POST(requete, { params }) {
  const ctx = obtenirContexte();
  const qui = identifier(requete, ctx);
  if (qui instanceof Response) return qui;
  try {
    const pageId = exigerPage(qui);
    const { decision } = await lireJson(requete);
    if (decision !== "confirmer" && decision !== "refuser") {
      throw new ErreurMetier(400, "La décision doit être « confirmer » ou « refuser ».");
    }
    await deciderPaiement(ctx, Number(params.id), decision === "confirmer", pageId);
    return Response.json(etat(ctx, pageId));
  } catch (erreur) {
    return repondreErreur(erreur);
  }
}
