// Démarre la tâche de fond (délais, reprise, relecture Graph) une seule fois
// au lancement du serveur Node. La condition est remplacée à la compilation,
// ce qui retire l'import de la version « edge », qui ne connaît pas node:sqlite.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { demarrer } = await import("./lib/serveur/demarrage.mjs");
    demarrer();
  }
}
