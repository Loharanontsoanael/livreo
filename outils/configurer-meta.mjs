// Assistant de configuration Meta pour Livreo. Il lit et écrit livreo-web/.env.local
// et n'affiche jamais un jeton en entier.
//
//   node outils/configurer-meta.mjs jeton     META_USER_TOKEN → jeton de Page qui n'expire pas
//   node outils/configurer-meta.mjs abonner   abonne la Page aux webhooks feed et messages
//   node outils/configurer-meta.mjs webhook https://<adresse>   déclare le webhook de l'app (feed, messages)
//   node outils/configurer-meta.mjs verifier  vérifie chaque identifiant, sans rien modifier
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { creerMuse } from "../livreo-web/lib/serveur/muse.mjs";

const FICHIER = fileURLToPath(new URL("../livreo-web/.env.local", import.meta.url));
const PERMISSIONS = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "pages_manage_metadata",
  "pages_messaging",
];

function lireEnv() {
  if (!existsSync(FICHIER)) return {};
  const env = {};
  for (const ligne of readFileSync(FICHIER, "utf8").split("\n")) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

// Remplace ou ajoute des clés ; une valeur null retire la ligne.
function ecrireEnv(modifs) {
  const lignes = existsSync(FICHIER) ? readFileSync(FICHIER, "utf8").split("\n") : [];
  const restantes = new Set(Object.keys(modifs));
  const sortie = [];
  for (const ligne of lignes) {
    const cle = ligne.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1];
    if (cle && cle in modifs) {
      restantes.delete(cle);
      if (modifs[cle] !== null) sortie.push(`${cle}=${modifs[cle]}`);
    } else {
      sortie.push(ligne);
    }
  }
  for (const cle of restantes) if (modifs[cle] !== null) sortie.push(`${cle}=${modifs[cle]}`);
  writeFileSync(FICHIER, `${sortie.join("\n").replace(/\n+$/, "")}\n`);
  chmodSync(FICHIER, 0o600);
}

const masquer = (s) => (s ? `${s.slice(0, 6)}… (${s.length} caractères)` : "vide");

async function graph(env, chemin, { methode = "GET", parametres = {}, jeton } = {}) {
  const url = new URL(`https://graph.facebook.com/${env.GRAPH_API_VERSION || "v26.0"}/${chemin}`);
  for (const [cle, valeur] of Object.entries(parametres)) url.searchParams.set(cle, valeur);
  if (jeton) {
    url.searchParams.set("access_token", jeton);
    if (env.META_APP_SECRET && !jeton.includes("|")) {
      url.searchParams.set("appsecret_proof", createHmac("sha256", env.META_APP_SECRET).update(jeton).digest("hex"));
    }
  }
  const reponse = await fetch(url, { method: methode });
  const json = await reponse.json().catch(() => ({}));
  if (!reponse.ok || json.error) {
    throw new Error(`${json.error?.message ?? `HTTP ${reponse.status}`} (code ${json.error?.code ?? "?"})`);
  }
  return json;
}

function exiger(env, ...cles) {
  const manquantes = cles.filter((c) => !env[c]);
  if (manquantes.length) {
    console.error(`Il manque dans livreo-web/.env.local : ${manquantes.join(", ")}`);
    process.exit(1);
  }
}

async function jeton() {
  const env = lireEnv();
  exiger(env, "META_APP_ID", "META_APP_SECRET", "META_USER_TOKEN");

  const long = await graph(env, "oauth/access_token", {
    parametres: {
      grant_type: "fb_exchange_token",
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      fb_exchange_token: env.META_USER_TOKEN,
    },
  });
  console.log("✓ jeton utilisateur prolongé");

  const { data: pages = [] } = await graph(env, "me/accounts", {
    parametres: { fields: "id,name,access_token" },
    jeton: long.access_token,
  });
  if (!pages.length) {
    console.error("✗ Aucune Page trouvée : le jeton doit avoir pages_show_list et vous devez administrer la Page.");
    process.exit(1);
  }
  const voulue =
    pages.find((p) => p.id === env.META_PAGE_ID) ??
    (pages.length === 1 ? pages[0] : pages.find((p) => p.name === env.LIVREO_NOM_PAGE));
  if (!voulue) {
    console.log("Plusieurs Pages : mettez l'identifiant voulu dans META_PAGE_ID puis relancez.");
    for (const p of pages) console.log(`  ${p.id}  ${p.name}`);
    process.exit(1);
  }

  const infos = await graph(env, "debug_token", {
    parametres: { input_token: voulue.access_token },
    jeton: `${env.META_APP_ID}|${env.META_APP_SECRET}`,
  });
  const expire = infos.data?.expires_at ? new Date(infos.data.expires_at * 1000).toLocaleString("fr-FR") : "jamais";

  ecrireEnv({
    META_PAGE_ID: voulue.id,
    META_PAGE_ACCESS_TOKEN: voulue.access_token,
    LIVREO_NOM_PAGE: env.LIVREO_NOM_PAGE || voulue.name,
    META_USER_TOKEN: null,
  });
  console.log(`✓ Page « ${voulue.name} » (${voulue.id}) · jeton de Page ${masquer(voulue.access_token)} · expire : ${expire}`);
  console.log("✓ .env.local mis à jour, META_USER_TOKEN effacé. Suite : node outils/configurer-meta.mjs abonner");
}

async function abonner() {
  const env = lireEnv();
  exiger(env, "META_PAGE_ID", "META_PAGE_ACCESS_TOKEN");
  await graph(env, `${env.META_PAGE_ID}/subscribed_apps`, {
    methode: "POST",
    parametres: { subscribed_fields: "feed,messages" },
    jeton: env.META_PAGE_ACCESS_TOKEN,
  });
  const { data = [] } = await graph(env, `${env.META_PAGE_ID}/subscribed_apps`, { jeton: env.META_PAGE_ACCESS_TOKEN });
  const app = data.find((a) => a.id === env.META_APP_ID) ?? data[0];
  console.log(`✓ Page abonnée · champs : ${(app?.subscribed_fields ?? []).join(", ") || "?"}`);
}

// Déclare (ou met à jour) le webhook de l'app : Meta appelle aussitôt
// l'adresse pour la vérifier, le serveur doit donc tourner et être joignable.
async function webhook() {
  const env = lireEnv();
  exiger(env, "META_APP_ID", "META_APP_SECRET", "META_VERIFY_TOKEN");
  const adresse = (process.argv[3] || env.LIVREO_URL_PUBLIQUE || "").replace(/\/+$/, "");
  if (!/^https:\/\//.test(adresse)) {
    console.error("Donnez l'adresse publique en https : node outils/configurer-meta.mjs webhook https://<adresse>");
    process.exit(1);
  }
  const jetonApp = `${env.META_APP_ID}|${env.META_APP_SECRET}`;
  await graph(env, `${env.META_APP_ID}/subscriptions`, {
    methode: "POST",
    parametres: {
      object: "page",
      callback_url: `${adresse}/api/meta/webhook`,
      verify_token: env.META_VERIFY_TOKEN,
      fields: "feed,messages",
      include_values: "true",
    },
    jeton: jetonApp,
  });
  console.log(`✓ webhook déclaré : ${adresse}/api/meta/webhook (feed, messages)`);
}

async function verifier() {
  const env = lireEnv();
  let echecs = 0;
  const ok = (texte) => console.log(`✓ ${texte}`);
  const ko = (texte) => {
    console.log(`✗ ${texte}`);
    echecs += 1;
  };

  for (const cle of ["META_APP_ID", "META_APP_SECRET", "META_VERIFY_TOKEN", "META_PAGE_ID", "META_PAGE_ACCESS_TOKEN", "MODEL_API_KEY"]) {
    env[cle] ? ok(`${cle} présent`) : ko(`${cle} manquant`);
  }

  if (env.META_APP_ID && env.META_APP_SECRET && env.META_PAGE_ACCESS_TOKEN) {
    try {
      const { data } = await graph(env, "debug_token", {
        parametres: { input_token: env.META_PAGE_ACCESS_TOKEN },
        jeton: `${env.META_APP_ID}|${env.META_APP_SECRET}`,
      });
      data.is_valid ? ok(`jeton valide · type ${data.type}`) : ko("jeton invalide ou révoqué");
      if (data.type !== "PAGE") ko("ce n'est pas un jeton de Page : lancez « jeton »");
      data.expires_at ? ko(`le jeton expire le ${new Date(data.expires_at * 1000).toLocaleString("fr-FR")}`) : ok("le jeton n'expire pas");
      const manquantes = PERMISSIONS.filter((p) => !(data.scopes ?? []).includes(p));
      manquantes.length ? ko(`permissions manquantes : ${manquantes.join(", ")}`) : ok("les 5 permissions sont accordées");
    } catch (erreur) {
      ko(`vérification du jeton impossible : ${erreur.message}`);
    }
  }

  if (env.META_PAGE_ID && env.META_PAGE_ACCESS_TOKEN) {
    try {
      const page = await graph(env, env.META_PAGE_ID, { parametres: { fields: "name" }, jeton: env.META_PAGE_ACCESS_TOKEN });
      ok(`Page joignable : « ${page.name} »`);
      const { data = [] } = await graph(env, `${env.META_PAGE_ID}/subscribed_apps`, { jeton: env.META_PAGE_ACCESS_TOKEN });
      const champs = (data.find((a) => a.id === env.META_APP_ID) ?? data[0])?.subscribed_fields ?? [];
      champs.includes("feed") && champs.includes("messages")
        ? ok("Page abonnée à feed et messages")
        : ko("Page non abonnée : lancez « abonner »");
    } catch (erreur) {
      ko(`Page injoignable : ${erreur.message}`);
    }
  }

  if (env.META_APP_ID && env.META_APP_SECRET) {
    try {
      const { data = [] } = await graph(env, `${env.META_APP_ID}/subscriptions`, { jeton: `${env.META_APP_ID}|${env.META_APP_SECRET}` });
      const page = data.find((s) => s.object === "page" && s.active);
      const champs = (page?.fields ?? []).map((f) => f.name);
      page && champs.includes("feed") && champs.includes("messages")
        ? ok(`webhook déclaré : ${page.callback_url}`)
        : ko("webhook non déclaré : lancez « webhook https://<adresse> »");
    } catch (erreur) {
      ko(`webhook illisible : ${erreur.message}`);
    }
  }

  if (env.MODEL_API_KEY) {
    try {
      const muse = creerMuse({ apiKey: env.MODEL_API_KEY, modele: env.MUSE_MODELE || "muse-spark-1.3", delaiMs: 20_000 });
      const r = await muse.comprendreCommentaire({ texte: "izaho koa jp", article: { ref: "R12", nom: "Robe bleue wax", prix: 35000 } });
      r.intention === "achat"
        ? ok(`Muse Spark répond : « izaho koa jp » → achat (confiance ${r.confiance})`)
        : ko(`Muse Spark répond mais comprend « ${r.intention} » pour « izaho koa jp »`);
    } catch (erreur) {
      ko(`Muse Spark injoignable : ${erreur.message}`);
    }
  }

  console.log(echecs ? `\n${echecs} point(s) à régler.` : "\nTout est prêt côté Meta.");
  process.exit(echecs ? 1 : 0);
}

const commandes = { jeton, abonner, webhook, verifier };
const commande = commandes[process.argv[2]];
if (!commande) {
  console.log("Usage : node outils/configurer-meta.mjs jeton | abonner | webhook <https://adresse> | verifier");
  process.exit(1);
}
commande().catch((erreur) => {
  console.error(`✗ ${erreur.message}`);
  process.exit(1);
});
