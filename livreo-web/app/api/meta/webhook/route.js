import { obtenirContexte, declencher } from "@/lib/serveur/contexte.mjs";
import { extraireEntrants, signatureValide } from "@/lib/serveur/graph.mjs";
import { recevoir } from "@/lib/serveur/boucle.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vérification de l'abonnement, faite une fois par Meta à la configuration du webhook.
export function GET(requete) {
  const { config } = obtenirContexte();
  const p = new URL(requete.url).searchParams;
  const valide =
    p.get("hub.mode") === "subscribe" &&
    config.verifyToken &&
    p.get("hub.verify_token") === config.verifyToken;
  return valide ? new Response(p.get("hub.challenge") ?? "", { status: 200 }) : new Response("Interdit", { status: 403 });
}

// Commentaires de la Page et messages Messenger. On vérifie la signature sur
// le corps brut, on enregistre, et on répond tout de suite : le traitement
// (IA, envois) part en arrière-plan.
export async function POST(requete) {
  const ctx = obtenirContexte();
  const corpsBrut = await requete.text();
  if (!signatureValide(corpsBrut, requete.headers.get("x-hub-signature-256"), ctx.config.appSecret)) {
    return new Response("Signature invalide", { status: 401 });
  }
  let charge;
  try {
    charge = JSON.parse(corpsBrut);
  } catch {
    return new Response("JSON invalide", { status: 400 });
  }
  const nouveaux = recevoir(ctx, extraireEntrants(charge));
  if (nouveaux) declencher(ctx);
  return Response.json({ recus: nouveaux });
}
