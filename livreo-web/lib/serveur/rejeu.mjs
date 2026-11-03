import { articleSuivant, demarrerLive, recevoir } from "./boucle.mjs";
import { declencher } from "./contexte.mjs";

// Rejoue un live (réel, transcrit, ou de démonstration) dans la même chaîne
// que les webhooks. Les envois vers les acheteuses sont toujours simulés :
// les identifiants commencent par « rejeu- ».
export function lancerRejeu(ctx, scenario, { vitesse = 1 } = {}) {
  if (ctx.rejeuEnCours) throw new Error("Un rejeu est déjà en cours.");
  const id = Date.now().toString(36);
  const minuteurs = [];
  ctx.rejeuEnCours = { id, minuteurs };
  demarrerLive(ctx, { objetFbId: null });

  const evenements = [
    ...(scenario.articles ?? []).map((a) => ({ ...a, genre: "article" })),
    ...(scenario.commentaires ?? []).map((c) => ({ ...c, genre: "commentaire" })),
    ...(scenario.captures ?? []).map((c) => ({ ...c, genre: "capture" })),
  ].sort((a, b) => a.a - b.a);

  const auteurId = (nom) => `rejeu-${nom.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}`;
  let fin = 0;

  evenements.forEach((ev, i) => {
    const delaiMs = Math.max(0, (ev.a * 1000) / vitesse);
    fin = Math.max(fin, delaiMs);
    minuteurs.push(
      setTimeout(() => {
        const cree = ctx.maintenant().toISOString();
        if (ev.genre === "article") {
          try {
            articleSuivant(ctx, ev);
          } catch (erreur) {
            console.error("[livreo] rejeu, article :", erreur.message);
          }
          return;
        }
        if (ev.genre === "commentaire") {
          recevoir(ctx, [{
            id: `rejeu-${id}-${i}`,
            type: "commentaire",
            cree_le: cree,
            donnees: { objet_id: null, texte: ev.texte, auteur_id: auteurId(ev.auteur), auteur_nom: ev.auteur },
          }]);
        } else {
          recevoir(ctx, [{
            id: `rejeu-${id}-${i}`,
            type: "message",
            cree_le: cree,
            donnees: { psid: `simule-${auteurId(ev.auteur)}`, texte: "", image_url: ev.image_url },
          }]);
        }
        declencher(ctx);
      }, delaiMs),
    );
  });
  minuteurs.push(setTimeout(() => (ctx.rejeuEnCours = null), fin + 1000));
  return { id, evenements: evenements.length, duree_s: Math.round(fin / 1000) };
}

export function arreterRejeu(ctx) {
  for (const m of ctx.rejeuEnCours?.minuteurs ?? []) clearTimeout(m);
  ctx.rejeuEnCours = null;
}
