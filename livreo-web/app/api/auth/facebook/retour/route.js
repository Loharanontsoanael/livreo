import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { journal } from "@/lib/serveur/boucle.mjs";
import { COOKIE_ETAT, COOKIE_SESSION, finaliserConnexion, ouvrirSession } from "@/lib/serveur/connexion.mjs";
import { optionsCookie, origine } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const memes = (a = "", b = "") => a.length > 0 && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Retour de Facebook : on vérifie le « state », on échange le code, on range
// les Pages et on ouvre la session. Toute erreur ramène à l'accueil de l'app.
export async function GET(requete) {
  const ctx = obtenirContexte();
  const base = origine(requete, ctx.config);
  const p = new URL(requete.url).searchParams;
  const vers = (chemin) => {
    const r = NextResponse.redirect(`${base}${chemin}`);
    r.cookies.delete(COOKIE_ETAT);
    return r;
  };

  if (p.get("error")) return vers("/essayer?refus=annule");
  if (!memes(p.get("state") ?? "", requete.cookies.get(COOKIE_ETAT)?.value ?? "") || !p.get("code")) {
    return vers("/essayer?refus=expire");
  }

  try {
    const { vendeuseId, pages, manquantes } = await finaliserConnexion(ctx, {
      code: p.get("code"),
      retour: `${base}/api/auth/facebook/retour`,
    });
    journal(ctx, "connexion_facebook", { vendeuse: vendeuseId, pages, manquantes });
    const { cle } = ouvrirSession(ctx, vendeuseId);
    const r = vers(manquantes.length ? `/essayer/page?manque=${manquantes.join(",")}` : "/essayer/page");
    r.cookies.set(COOKIE_SESSION, cle, optionsCookie(requete, ctx.config, 30 * 86_400));
    return r;
  } catch (erreur) {
    console.error("[livreo] connexion Facebook :", erreur.message);
    return vers("/essayer?refus=erreur");
  }
}
