import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { deciderDoute, etat, ErreurMetier } from "@/lib/serveur/boucle.mjs";
import { exigerPage, identifier, lireJson, repondreErreur } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// L'IA hésite sur un commentaire, la vendeuse tranche : { "decision": "oui" | "non" }.
export async function POST(requete, { params }) {
  const ctx = obtenirContexte();
  const qui = identifier(requete, ctx);
  if (qui instanceof Response) return qui;
  try {
    const pageId = exigerPage(qui);
    const { decision } = await lireJson(requete);
    if (decision !== "oui" && decision !== "non") throw new ErreurMetier(400, "La décision doit être « oui » ou « non ».");
    await deciderDoute(ctx, Number(params.id), decision === "oui", pageId);
    return Response.json(etat(ctx, pageId));
  } catch (erreur) {
    return repondreErreur(erreur);
  }
}
