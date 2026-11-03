import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { arreterRejeu, lancerRejeu } from "@/lib/serveur/rejeu.mjs";
import { refuserSiNonVendeuse, repondreErreur } from "@/lib/serveur/http.mjs";
import { ErreurMetier } from "@/lib/serveur/boucle.mjs";
import demo from "@/lib/serveur/rejeu-demo.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rejoue un live dans la vraie chaîne de traitement, pour répéter et filmer
// la démo sans vendeuse disponible. Corps optionnel :
// { "scenario": { articles, commentaires, captures }, "vitesse": 2 }
export async function POST(requete) {
  const ctx = obtenirContexte();
  const refus = refuserSiNonVendeuse(requete, ctx.config);
  if (refus) return refus;
  try {
    if (!ctx.config.rejeuAutorise) throw new ErreurMetier(403, "Le rejeu est désactivé (LIVREO_REJEU=1 pour l'autoriser).");
    const corps = await requete.json().catch(() => ({}));
    const vitesse = Number(corps.vitesse ?? 1);
    if (!(vitesse > 0 && vitesse <= 20)) throw new ErreurMetier(400, "La vitesse doit être comprise entre 0 et 20.");
    return Response.json(lancerRejeu(ctx, corps.scenario ?? demo, { vitesse }));
  } catch (erreur) {
    if (erreur?.message === "Un rejeu est déjà en cours.") return Response.json({ erreur: erreur.message }, { status: 409 });
    return repondreErreur(erreur);
  }
}

export function DELETE(requete) {
  const ctx = obtenirContexte();
  const refus = refuserSiNonVendeuse(requete, ctx.config);
  if (refus) return refus;
  arreterRejeu(ctx);
  return Response.json({ arrete: true });
}
