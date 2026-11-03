import { createHash, createHmac, randomBytes } from "node:crypto";
import { transaction } from "./db.mjs";

// Connexion des vendeuses avec Facebook, et leurs sessions.
//
// 1. /api/auth/facebook envoie vers la fenêtre de Facebook (avec un « state »
//    aléatoire contre la falsification de requête).
// 2. Facebook revient sur /api/auth/facebook/retour avec un code, échangé ici
//    contre un jeton utilisateur, prolongé, puis contre les jetons des Pages
//    (qui, issus d'un jeton prolongé, n'expirent pas).
// 3. Les Pages sont rangées chiffrées, la session est ouverte.

export const PERMISSIONS = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "pages_manage_metadata",
  "pages_messaging",
];

const DUREE_SESSION_JOURS = 30;
export const COOKIE_SESSION = "livreo_session";
export const COOKIE_ETAT = "livreo_etat";

const empreinte = (cle) => createHash("sha256").update(cle).digest("hex");

export function urlConnexion(config, { retour, etat, redemander = false }) {
  const url = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", retour);
  url.searchParams.set("state", etat);
  url.searchParams.set("response_type", "code");
  if (config.loginConfigId) url.searchParams.set("config_id", config.loginConfigId);
  else url.searchParams.set("scope", PERMISSIONS.join(","));
  // « J'ai créé ma Page » : Facebook redemande quelles Pages partager.
  if (redemander) url.searchParams.set("auth_type", "rerequest");
  return url.toString();
}

async function graphUtilisateur(config, chemin, parametres, fetchFn = fetch) {
  const url = new URL(`https://graph.facebook.com/${config.graphVersion}/${chemin}`);
  for (const [cle, valeur] of Object.entries(parametres)) url.searchParams.set(cle, valeur);
  if (parametres.access_token && config.appSecret) {
    url.searchParams.set("appsecret_proof", createHmac("sha256", config.appSecret).update(parametres.access_token).digest("hex"));
  }
  const reponse = await fetchFn(url);
  const json = await reponse.json().catch(() => ({}));
  if (!reponse.ok || json.error) throw new Error(`Facebook : ${json.error?.message ?? `HTTP ${reponse.status}`}`);
  return json;
}

// Code de retour → vendeuse et Pages enregistrées. Renvoie l'id de la vendeuse.
export async function finaliserConnexion(ctx, { code, retour }, fetchFn = fetch) {
  const { config } = ctx;
  const court = await graphUtilisateur(
    config,
    "oauth/access_token",
    { client_id: config.appId, client_secret: config.appSecret, redirect_uri: retour, code },
    fetchFn,
  );
  const long = await graphUtilisateur(
    config,
    "oauth/access_token",
    { grant_type: "fb_exchange_token", client_id: config.appId, client_secret: config.appSecret, fb_exchange_token: court.access_token },
    fetchFn,
  );
  const jeton = long.access_token;
  const moi = await graphUtilisateur(config, "me", { fields: "id,name", access_token: jeton }, fetchFn);
  const { data: permissions = [] } = await graphUtilisateur(config, "me/permissions", { access_token: jeton }, fetchFn);
  const accordees = new Set(permissions.filter((p) => p.status === "granted").map((p) => p.permission));
  const manquantes = PERMISSIONS.filter((p) => !accordees.has(p));

  const pages = [];
  let suite = { fields: "id,name,category,access_token,picture{url}", limit: "100", access_token: jeton };
  for (let tour = 0; tour < 5 && suite; tour += 1) {
    const lot = await graphUtilisateur(config, "me/accounts", suite, fetchFn);
    pages.push(...(lot.data ?? []));
    suite = lot.paging?.cursors?.after && lot.paging?.next ? { ...suite, after: lot.paging.cursors.after } : null;
  }

  const maintenant = ctx.maintenant().toISOString();
  const vendeuseId = transaction(ctx.db, () => {
    ctx.db
      .prepare("INSERT INTO vendeuses (fb_id, nom, cree_le) VALUES (?, ?, ?) ON CONFLICT(fb_id) DO UPDATE SET nom = excluded.nom")
      .run(moi.id, moi.name ?? null, maintenant);
    const id = ctx.db.prepare("SELECT id FROM vendeuses WHERE fb_id = ?").get(moi.id).id;
    const ecrire = ctx.db.prepare(
      `INSERT INTO pages (id, vendeuse_id, nom, categorie, photo, jeton, maj_le) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET vendeuse_id = excluded.vendeuse_id, nom = excluded.nom, categorie = excluded.categorie,
         photo = excluded.photo, jeton = excluded.jeton, maj_le = excluded.maj_le`,
    );
    for (const p of pages) {
      if (!p.access_token) continue;
      ecrire.run(p.id, id, p.name, p.category ?? null, p.picture?.data?.url ?? null, ctx.coffre.chiffrer(p.access_token), maintenant);
    }
    return id;
  });
  return { vendeuseId, pages: pages.length, manquantes };
}

export function ouvrirSession(ctx, vendeuseId) {
  const cle = randomBytes(32).toString("base64url");
  const maintenant = ctx.maintenant();
  const expire = new Date(maintenant.getTime() + DUREE_SESSION_JOURS * 86_400_000);
  ctx.db
    .prepare("INSERT INTO sessions (cle, vendeuse_id, cree_le, expire_le) VALUES (?, ?, ?, ?)")
    .run(empreinte(cle), vendeuseId, maintenant.toISOString(), expire.toISOString());
  return { cle, expire };
}

export function lireSession(ctx, cle) {
  if (!cle) return null;
  return (
    ctx.db
      .prepare(
        `SELECT s.cle, s.vendeuse_id, s.page_id, v.nom AS vendeuse_nom FROM sessions s
         JOIN vendeuses v ON v.id = s.vendeuse_id WHERE s.cle = ? AND s.expire_le > ?`,
      )
      .get(empreinte(cle), ctx.maintenant().toISOString()) ?? null
  );
}

export function fermerSession(ctx, cle) {
  if (cle) ctx.db.prepare("DELETE FROM sessions WHERE cle = ?").run(empreinte(cle));
}

export function pagesDe(ctx, vendeuseId) {
  return ctx.db
    .prepare("SELECT id, nom, categorie, photo, abonnee_le FROM pages WHERE vendeuse_id = ? ORDER BY nom")
    .all(vendeuseId);
}

// La vendeuse choisit sa Page : on abonne la Page au webhook, puis on la
// rattache à la session.
export async function choisirPage(ctx, session, pageId) {
  const page = ctx.db.prepare("SELECT id, nom FROM pages WHERE id = ? AND vendeuse_id = ?").get(String(pageId ?? ""), session.vendeuse_id);
  if (!page) return { erreur: "Cette Page n'est pas reliée à votre compte.", statut: 404 };
  const graph = ctx.graphPour(page.id);
  if (!graph.actif) return { erreur: "Le jeton de cette Page est illisible : reconnectez-vous avec Facebook.", statut: 409 };
  try {
    await graph.abonner();
  } catch (erreur) {
    console.error("[livreo] abonnement de la Page", page.id, ":", erreur.message);
    return {
      erreur: "Facebook refuse l'accès à cette Page. Reconnectez-vous avec Facebook et cochez-la dans la liste.",
      statut: 502,
    };
  }
  const maintenant = ctx.maintenant().toISOString();
  ctx.db.prepare("UPDATE pages SET abonnee_le = ? WHERE id = ?").run(maintenant, page.id);
  ctx.db.prepare("UPDATE sessions SET page_id = ? WHERE cle = ?").run(page.id, session.cle);
  return { page };
}
