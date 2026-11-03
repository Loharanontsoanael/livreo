import { createHmac, timingSafeEqual } from "node:crypto";

// Webhooks : Meta signe le corps brut avec le secret de l'app (HMAC SHA-256)
// dans l'en-tête X-Hub-Signature-256. On compare en temps constant.
export function signatureValide(corpsBrut, entete, secret) {
  if (!secret || typeof entete !== "string" || !entete.startsWith("sha256=")) return false;
  const attendu = createHmac("sha256", secret).update(corpsBrut, "utf8").digest();
  const recu = Buffer.from(entete.slice("sha256=".length), "hex");
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}

// Les webhooks donnent des secondes (feed) ou des millisecondes (messaging),
// la lecture Graph donne « 2026-11-03T10:00:00+0000 ».
export function isoDepuis(valeur) {
  if (typeof valeur === "number") return new Date(valeur < 1e12 ? valeur * 1000 : valeur).toISOString();
  if (typeof valeur === "string") return new Date(valeur.replace(/([+-]\d\d)(\d\d)$/, "$1:$2")).toISOString();
  return new Date().toISOString();
}

// Transforme une charge de webhook en événements normalisés, identifiés par
// l'identifiant Meta : une même livraison reçue deux fois reste un seul événement.
export function extraireEntrants(charge) {
  const sortie = [];
  for (const entree of charge?.entry ?? []) {
    for (const changement of entree.changes ?? []) {
      const v = changement.value ?? {};
      if (changement.field !== "feed" || v.item !== "comment" || v.verb !== "add" || !v.comment_id) continue;
      if (v.from?.id && v.from.id === entree.id) continue;
      sortie.push({
        id: v.comment_id,
        type: "commentaire",
        cree_le: isoDepuis(v.created_time),
        donnees: {
          objet_id: v.post_id ?? null,
          texte: v.message ?? "",
          auteur_id: v.from?.id ?? null,
          auteur_nom: v.from?.name ?? null,
        },
      });
    }
    for (const evenement of entree.messaging ?? []) {
      const message = evenement.message;
      if (!message?.mid || message.is_echo) continue;
      const image = (message.attachments ?? []).find((piece) => piece.type === "image");
      sortie.push({
        id: message.mid,
        type: "message",
        cree_le: isoDepuis(evenement.timestamp),
        donnees: {
          psid: evenement.sender?.id ?? null,
          texte: message.text ?? "",
          image_url: image?.payload?.url ?? null,
        },
      });
    }
  }
  return sortie;
}

export function creerGraph({ version, pageId, pageToken, appSecret, fetch = globalThis.fetch }) {
  const base = `https://graph.facebook.com/${version}`;
  // appsecret_proof : recommandé par Meta pour tout appel serveur, obligatoire
  // si l'option « Require App Secret » est cochée dans l'app.
  const preuve = appSecret && pageToken ? createHmac("sha256", appSecret).update(pageToken).digest("hex") : null;

  async function appel(chemin, { methode = "GET", corps, parametres = {} } = {}) {
    const url = new URL(`${base}/${chemin}`);
    for (const [cle, valeur] of Object.entries(parametres)) url.searchParams.set(cle, valeur);
    url.searchParams.set("access_token", pageToken);
    if (preuve) url.searchParams.set("appsecret_proof", preuve);
    const reponse = await fetch(url, {
      method: methode,
      headers: corps ? { "Content-Type": "application/json" } : undefined,
      body: corps ? JSON.stringify(corps) : undefined,
    });
    const json = await reponse.json().catch(() => ({}));
    if (!reponse.ok || json.error) {
      const e = json.error ?? {};
      throw new Error(`Graph API ${reponse.status} : ${e.message ?? "réponse illisible"} (code ${e.code ?? "?"})`);
    }
    return json;
  }

  return {
    actif: Boolean(pageId && pageToken),

    // Réponse privée à un commentaire : un seul message par commentaire, et
    // la réponse donne le PSID qui relie ensuite la conversation à l'acheteuse.
    reponsePrivee(commentaireId, texte) {
      return appel(`${pageId}/messages`, {
        methode: "POST",
        corps: { recipient: { comment_id: commentaireId }, message: { text: texte } },
      });
    },

    // Message dans une conversation ouverte (fenêtre de 24 h après son dernier message).
    message(psid, texte) {
      return appel(`${pageId}/messages`, {
        methode: "POST",
        corps: { recipient: { id: psid }, messaging_type: "RESPONSE", message: { text: texte } },
      });
    },

    async lireCommentaires(objetId) {
      const json = await appel(`${objetId}/comments`, {
        parametres: {
          fields: "id,message,created_time,from",
          order: "reverse_chronological",
          filter: "stream",
          limit: "100",
        },
      });
      return (json.data ?? [])
        .filter((c) => c.from?.id !== pageId)
        .map((c) => ({
          id: c.id,
          type: "commentaire",
          cree_le: isoDepuis(c.created_time),
          donnees: { objet_id: objetId, texte: c.message ?? "", auteur_id: c.from?.id ?? null, auteur_nom: c.from?.name ?? null },
        }));
    },
  };
}
