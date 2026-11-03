import { timingSafeEqual } from "node:crypto";
import { ErreurMetier } from "./boucle.mjs";
import { COOKIE_SESSION, lireSession } from "./connexion.mjs";

// Qui appelle ? Renvoie { vendeuseId, pageId, session } ou une Response de refus.
//
// 1. La session ouverte par « Continuer avec Facebook » : la Page choisie par
//    la vendeuse (pageId null tant qu'elle n'a pas choisi).
// 2. Mode de secours, sans connexion Facebook : la clé LIVREO_CLE_VENDEUSE
//    (en-tête Bearer ou ?cle=), ou rien du tout en développement. La Page est
//    alors celle de l'environnement (META_PAGE_ID).
export function identifier(requete, ctx) {
  const session = lireSession(ctx, requete.cookies?.get?.(COOKIE_SESSION)?.value);
  if (session) return { vendeuseId: session.vendeuse_id, pageId: session.page_id ?? null, session };

  const { config } = ctx;
  const secours = { vendeuseId: null, pageId: config.pageId, session: null };
  if (!config.cleVendeuse) {
    if (!config.production) return secours;
    return Response.json({ erreur: "Connectez-vous avec Facebook." }, { status: 401 });
  }
  const entete = requete.headers.get("authorization");
  const fournie = entete?.startsWith("Bearer ")
    ? entete.slice("Bearer ".length)
    : new URL(requete.url).searchParams.get("cle") ?? "";
  const a = Buffer.from(fournie);
  const b = Buffer.from(config.cleVendeuse);
  if (a.length === b.length && timingSafeEqual(a, b)) return secours;
  return Response.json({ erreur: "Connectez-vous avec Facebook." }, { status: 401 });
}

// Les routes du live ont besoin d'une Page choisie.
export function exigerPage(qui) {
  if (qui.pageId === null || qui.pageId === undefined) {
    throw new ErreurMetier(409, "Choisissez d'abord la Page de votre live.");
  }
  return qui.pageId;
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

// L'adresse publique du serveur, pour l'URL de retour de Facebook.
export function origine(requete, config) {
  if (config.urlPublique) return config.urlPublique;
  const hote = requete.headers.get("x-forwarded-host") ?? requete.headers.get("host");
  const protocole = requete.headers.get("x-forwarded-proto") ?? new URL(requete.url).protocol.replace(":", "");
  return `${protocole}://${hote}`;
}

export function optionsCookie(requete, config, maxAgeS) {
  const https = origine(requete, config).startsWith("https://");
  return { httpOnly: true, secure: https, sameSite: "lax", path: "/", maxAge: maxAgeS };
}
