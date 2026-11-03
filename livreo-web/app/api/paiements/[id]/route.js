import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { deciderPaiement, etat, ErreurMetier } from "@/lib/serveur/boucle.mjs";
import { lireJson, refuserSiNonVendeuse, repondreErreur } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// La vendeuse confirme ou refuse un paiement lu par l'IA : { "decision": "confirmer" | "refuser" }.
// Une commande n'est jamais marquée payée sans cette décision.
export async function POST(requete, { params }) {
  const ctx = obtenirContexte();
  const refus = refuserSiNonVendeuse(requete, ctx.config);
  if (refus) return refus;
  try {
    const { decision } = await lireJson(requete);
    if (decision !== "confirmer" && decision !== "refuser") {
      throw new ErreurMetier(400, "La décision doit être « confirmer » ou « refuser ».");
    }
    await deciderPaiement(ctx, Number(params.id), decision === "confirmer");
    return Response.json(etat(ctx));
  } catch (erreur) {
    return repondreErreur(erreur);
  }
}
