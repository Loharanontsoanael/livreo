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
  // Un live ouvert par Page : chacun est relu avec le jeton de sa Page.
  setInterval(async () => {
    if (relectureEnCours) return;
    const lives = ctx.db.prepare("SELECT page_id, objet_fb_id FROM lives WHERE termine_le IS NULL AND objet_fb_id IS NOT NULL").all();
    if (!lives.length) return;
    relectureEnCours = true;
    try {
      for (const live of lives) {
        const graph = ctx.graphPour(live.page_id || undefined);
        if (!graph.actif) continue;
        try {
          const nouveaux = recevoir(ctx, await graph.lireCommentaires(live.objet_fb_id));
          if (nouveaux) journal(ctx, "relecture_rattrapage", { page: live.page_id, nouveaux });
        } catch (erreur) {
          console.error("[livreo] relecture Graph :", erreur.message);
        }
      }
    } finally {
      relectureEnCours = false;
    }
  }, PERIODE_RELECTURE_MS);

  console.info(
    `[livreo] travailleur démarré · Page de secours ${ctx.graph.actif ? "active" : "absente"} · Muse ${ctx.muse.actif ? "actif" : "en simulation"}`,
  );
}
