import { obtenirContexte } from "@/lib/serveur/contexte.mjs";
import { etat } from "@/lib/serveur/boucle.mjs";
import { exigerPage, identifier, repondreErreur } from "@/lib/serveur/http.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Flux temps réel (Server-Sent Events) pour l'écran Direct :
// new EventSource("/api/live/flux") reçoit l'état de la Page de la vendeuse à chaque
// changement (cookie de session ; ?cle=… en mode de secours).
export function GET(requete) {
  const ctx = obtenirContexte();
  const qui = identifier(requete, ctx);
  if (qui instanceof Response) return qui;
  let pageId;
  try {
    pageId = exigerPage(qui);
  } catch (erreur) {
    return repondreErreur(erreur);
  }

  const encodeur = new TextEncoder();
  let nettoyer = () => {};
  const flux = new ReadableStream({
    start(controleur) {
      const ecrire = (texte) => {
        try {
          controleur.enqueue(encodeur.encode(texte));
        } catch {
          nettoyer();
        }
      };
      const envoyerEtat = () => ecrire(`data: ${JSON.stringify(etat(ctx, pageId))}\n\n`);
      const battement = setInterval(() => ecrire(": ping\n\n"), 20_000);
      ctx.bus.on("change", envoyerEtat);
      nettoyer = () => {
        clearInterval(battement);
        ctx.bus.off("change", envoyerEtat);
      };
      requete.signal.addEventListener("abort", () => {
        nettoyer();
        try {
          controleur.close();
        } catch {}
      });
      envoyerEtat();
    },
    cancel() {
      nettoyer();
    },
  });

  return new Response(flux, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
