import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { deciderDoute, etat, ErreurMetier } from "@/lib/serveur/boucle.mjs";
import { lireJson, refuserSiNonVendeuse, repondreErreur } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// L'IA hésite sur un commentaire, la vendeuse tranche : { "decision": "oui" | "non" }.
export async function POST(requete, { params }) {
  const ctx = obtenirContexte();
  const refus = refuserSiNonVendeuse(requete, ctx.config);
  if (refus) return refus;
  try {
    const { decision } = await lireJson(requete);
    if (decision !== "oui" && decision !== "non") throw new ErreurMetier(400, "La décision doit être « oui » ou « non ».");
    await deciderDoute(ctx, Number(params.id), decision === "oui");
    return Response.json(etat(ctx));
  } catch (erreur) {
    return repondreErreur(erreur);
  }
}
