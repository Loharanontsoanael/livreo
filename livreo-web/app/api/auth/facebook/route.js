import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { COOKIE_ETAT, urlConnexion } from "@/lib/serveur/connexion.mjs";
import { optionsCookie, origine } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// « Continuer avec Facebook » : vers la fenêtre de connexion de Facebook.
// ?nouveau=1 redemande les Pages (après « J'ai créé ma Page »).
export function GET(requete) {
  const { config } = obtenirContexte();
  if (!config.appId || !config.appSecret) {
    return Response.json({ erreur: "META_APP_ID et META_APP_SECRET manquent sur le serveur." }, { status: 503 });
  }
  const etat = randomBytes(16).toString("base64url");
  const retour = `${origine(requete, config)}/api/auth/facebook/retour`;
  const redemander = new URL(requete.url).searchParams.get("nouveau") === "1";
  const reponse = NextResponse.redirect(urlConnexion(config, { retour, etat, redemander }));
  reponse.cookies.set(COOKIE_ETAT, etat, optionsCookie(requete, config, 600));
  return reponse;
}
