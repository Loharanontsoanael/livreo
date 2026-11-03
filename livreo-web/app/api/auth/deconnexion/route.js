import { NextResponse } from "next/server";
import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { COOKIE_SESSION, fermerSession } from "@/lib/serveur/connexion.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// « Changer de compte » : la session est supprimée côté serveur, pas seulement le cookie.
export function POST(requete) {
  fermerSession(obtenirContexte(), requete.cookies.get(COOKIE_SESSION)?.value);
  const reponse = NextResponse.json({ deconnectee: true });
  reponse.cookies.delete(COOKIE_SESSION);
  return reponse;
}
