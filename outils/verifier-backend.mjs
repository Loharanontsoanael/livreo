// Vérification de bout en bout du backend sur un serveur local :
// node outils/verifier-backend.mjs [http://localhost:3001] [secret-de-l-app] [verify-token]
// Sans arguments, le secret, le jeton de vérification et la Page de secours
// sont lus dans livreo-web/.env.local. Les réponses aux faux commentaires sont
// simulées (identifiants « simule-… ») : aucun message ne part vraiment.
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const fichierEnv = new URL("../livreo-web/.env.local", import.meta.url);
const env = {};
if (existsSync(fichierEnv)) {
  for (const ligne of readFileSync(fichierEnv, "utf8").split("\n")) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}
const BASE = process.argv[2] ?? "http://localhost:3001";
const SECRET = process.argv[3] ?? env.META_APP_SECRET ?? "secret-local-de-test";
const VERIF = process.argv[4] ?? env.META_VERIFY_TOKEN ?? "livreo-verif";
const PAGE = env.META_PAGE_ID ?? "";

let echecs = 0;
function verifier(nom, condition, detail = "") {
  console.log(`${condition ? "✓" : "✗"} ${nom}${detail ? ` · ${detail}` : ""}`);
  if (!condition) echecs += 1;
}
const json = (chemin, corps) =>
  fetch(`${BASE}${chemin}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const sante = await (await fetch(`${BASE}/api/sante`)).json();
verifier("santé", sante.base === "ok", JSON.stringify(sante));

const verif = await fetch(`${BASE}/api/meta/webhook?hub.mode=subscribe&hub.verify_token=${VERIF}&hub.challenge=defi42`);
verifier("webhook : vérification Meta acceptée", verif.status === 200 && (await verif.text()) === "defi42");
const mauvais = await fetch(`${BASE}/api/meta/webhook?hub.mode=subscribe&hub.verify_token=faux&hub.challenge=x`);
verifier("webhook : mauvais jeton refusé", mauvais.status === 403);

await json("/api/live", { action: "demarrer" });
await json("/api/live/article", { ref: "R12", nom: "Robe bleue wax", prix: 35000 });

const maintenant = Math.floor(Date.now() / 1000);
const charge = JSON.stringify({
  object: "page",
  entry: [{
    id: PAGE,
    changes: [
      { field: "feed", value: { item: "comment", verb: "add", comment_id: `simule-v-${maintenant}-1`, post_id: "PAGE_POST", message: "jp", created_time: maintenant, from: { id: "U1", name: "Faniry Rakoto" } } },
      { field: "feed", value: { item: "comment", verb: "add", comment_id: `simule-v-${maintenant}-2`, post_id: "PAGE_POST", message: "izaho koa jp", created_time: maintenant + 1, from: { id: "U2", name: "Hanta Ravelo" } } },
      { field: "feed", value: { item: "comment", verb: "add", comment_id: `simule-v-${maintenant}-3`, post_id: "PAGE_POST", message: "jp ve ?", created_time: maintenant + 2, from: { id: "U3", name: "Mialy Rasoa" } } },
    ],
  }],
});
const nonSigne = await fetch(`${BASE}/api/meta/webhook`, { method: "POST", body: charge });
verifier("webhook : charge non signée refusée", nonSigne.status === 401);

const signature = `sha256=${createHmac("sha256", SECRET).update(charge).digest("hex")}`;
const recu = await fetch(`${BASE}/api/meta/webhook`, { method: "POST", body: charge, headers: { "x-hub-signature-256": signature } });
verifier("webhook : charge signée acceptée", recu.status === 200, JSON.stringify(await recu.json()));
const rejoue = await fetch(`${BASE}/api/meta/webhook`, { method: "POST", body: charge, headers: { "x-hub-signature-256": signature } });
verifier("webhook : même livraison reçue deux fois, zéro nouveau", (await rejoue.json()).recus === 0);

// Avec la vraie IA, un commentaire ambigu prend quelques secondes : on attend
// que les trois soient rangés (gagnante, file, doute), 30 s au plus.
let etat;
for (let essai = 0; essai < 60; essai += 1) {
  etat = await (await fetch(`${BASE}/api/live`)).json();
  if (etat.gagnante && etat.attente.length + etat.doutes.length >= 2) break;
  await attendre(500);
}
verifier("gagnante : la première JP", etat.gagnante?.nom === "Faniry Rakoto", etat.gagnante?.statut);
verifier("file d'attente", etat.attente.map((a) => a.nom).join(",") === "Hanta Ravelo");
verifier("doute levé sur « jp ve ? »", etat.doutes.length === 1 && etat.doutes[0].nom === "Mialy Rasoa");

const decision = await json(`/api/doutes/${etat.doutes[0].id}`, { decision: "oui" });
etat = await decision.json();
verifier("doute tranché : Mialy rejoint la file", etat.attente.map((a) => a.nom).join(",") === "Hanta Ravelo,Mialy Rasoa");

const flux = await fetch(`${BASE}/api/live/flux`);
const lecteur = flux.body.getReader();
const { value } = await lecteur.read();
const premier = new TextDecoder().decode(value);
verifier("flux temps réel : premier événement reçu", premier.startsWith("data: ") && premier.includes("Faniry"));
await lecteur.cancel();

const article = await json("/api/live/article", { ref: "R12", nom: "Doublon", prix: 1000 });
verifier("article déjà passé refusé proprement", article.status === 409, (await article.json()).erreur);

console.log(echecs ? `\n${echecs} vérification(s) en échec` : "\nTout est vert.");
process.exit(echecs ? 1 : 0);
