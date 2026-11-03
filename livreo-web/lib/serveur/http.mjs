import { timingSafeEqual } from "node:crypto";
import { ErreurMetier } from "./boucle.mjs";

// Accès vendeuse provisoire : une clé partagée, en attendant la session issue
// de Facebook Login. EventSource ne peut pas envoyer d'en-tête, d'où le
// paramètre ?cle= accepté pour le flux en direct.
export function refuserSiNonVendeuse(requete, config) {
  if (!config.cleVendeuse) {
    if (!config.production) return null;
    return Response.json({ erreur: "LIVREO_CLE_VENDEUSE n'est pas configurée sur le serveur." }, { status: 503 });
  }
  const entete = requete.headers.get("authorization");
  const fournie = entete?.startsWith("Bearer ")
    ? entete.slice("Bearer ".length)
    : new URL(requete.url).searchParams.get("cle") ?? requete.cookies?.get?.("livreo_cle")?.value ?? "";
  const a = Buffer.from(fournie);
  const b = Buffer.from(config.cleVendeuse);
  if (a.length === b.length && timingSafeEqual(a, b)) return null;
  return Response.json({ erreur: "Accès réservé à la vendeuse." }, { status: 401 });
}

export async function lireJson(requete) {
  try {
    return await requete.json();
  } catch {
    throw new ErreurMetier(400, "Le corps de la requête doit être du JSON.");
  }
}

export function repondreErreur(erreur) {
  if (erreur instanceof ErreurMetier) return Response.json({ erreur: erreur.message }, { status: erreur.statut });
  console.error("[livreo]", erreur);
  return Response.json({ erreur: "Erreur interne." }, { status: 500 });
}
