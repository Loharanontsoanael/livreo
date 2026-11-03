import { entretenir, recevoir, journal } from "./boucle.mjs";

const PERIODE_ENTRETIEN_MS = 5_000;
const PERIODE_RELECTURE_MS = 2_000;

// La tâche de fond : délais de paiement, reprise après panne, et relecture
// de secours des commentaires via la Graph API pendant le live (au cas où un
// webhook se perd ou arrive en retard). Ne tourne que sur un serveur Node
// qui reste allumé, pas sur des fonctions serverless.
export function demarrerTravailleur(ctx) {
  if (globalThis.__livreoTravailleur) return;
  globalThis.__livreoTravailleur = true;

  setInterval(() => {
    entretenir(ctx).catch((erreur) => console.error("[livreo] entretien :", erreur));
  }, PERIODE_ENTRETIEN_MS);

  let relectureEnCours = false;
  setInterval(async () => {
    if (relectureEnCours || !ctx.graph.actif) return;
    const live = ctx.db.prepare("SELECT objet_fb_id FROM lives WHERE termine_le IS NULL ORDER BY id DESC LIMIT 1").get();
    if (!live?.objet_fb_id) return;
    relectureEnCours = true;
    try {
      const nouveaux = recevoir(ctx, await ctx.graph.lireCommentaires(live.objet_fb_id));
      if (nouveaux) journal(ctx, "relecture_rattrapage", { nouveaux });
    } catch (erreur) {
      console.error("[livreo] relecture Graph :", erreur.message);
    } finally {
      relectureEnCours = false;
    }
  }, PERIODE_RELECTURE_MS);

  console.info(
    `[livreo] travailleur démarré · Graph ${ctx.graph.actif ? "actif" : "en simulation"} · Muse ${ctx.muse.actif ? "actif" : "en simulation"}`,
  );
}
