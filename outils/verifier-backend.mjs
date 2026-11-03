// Vérification de bout en bout du backend sur un serveur local :
// node outils/verifier-backend.mjs [http://localhost:3001] [secret-de-l-app] [verify-token]
import { createHmac } from "node:crypto";

const BASE = process.argv[2] ?? "http://localhost:3001";
const SECRET = process.argv[3] ?? "secret-local-de-test";
const VERIF = process.argv[4] ?? "livreo-verif";

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
    id: "PAGE",
    changes: [
      { field: "feed", value: { item: "comment", verb: "add", comment_id: `v-${maintenant}-1`, post_id: "PAGE_POST", message: "jp", created_time: maintenant, from: { id: "U1", name: "Faniry Rakoto" } } },
      { field: "feed", value: { item: "comment", verb: "add", comment_id: `v-${maintenant}-2`, post_id: "PAGE_POST", message: "izaho koa jp", created_time: maintenant + 1, from: { id: "U2", name: "Hanta Ravelo" } } },
      { field: "feed", value: { item: "comment", verb: "add", comment_id: `v-${maintenant}-3`, post_id: "PAGE_POST", message: "jp ve ?", created_time: maintenant + 2, from: { id: "U3", name: "Mialy Rasoa" } } },
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

await attendre(500);
let etat = await (await fetch(`${BASE}/api/live`)).json();
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
