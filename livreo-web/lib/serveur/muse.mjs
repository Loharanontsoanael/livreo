// Meta Model API (Muse Spark), en format Chat Completions avec une sortie
// JSON imposée par schéma. Le schéma est en mode strict : chaque objet porte
// additionalProperties false et liste toutes ses clés dans required.

const URL_MODELE = "https://api.meta.ai/v1/chat/completions";

const texteOuNul = { anyOf: [{ type: "string" }, { type: "null" }] };

const SCHEMA_COMMENTAIRE = {
  type: "object",
  additionalProperties: false,
  required: ["intention", "article_ref", "taille", "quantite", "confiance"],
  properties: {
    intention: { type: "string", enum: ["achat", "question", "autre"] },
    article_ref: texteOuNul,
    taille: texteOuNul,
    quantite: { type: "integer" },
    confiance: { type: "number" },
  },
};

const SCHEMA_CAPTURE = {
  type: "object",
  additionalProperties: false,
  required: ["est_paiement", "montant", "reference", "heure", "confiance"],
  properties: {
    est_paiement: { type: "boolean" },
    montant: { anyOf: [{ type: "integer" }, { type: "null" }] },
    reference: texteOuNul,
    heure: texteOuNul,
    confiance: { type: "number" },
  },
};

const CONSIGNE_COMMENTAIRE = `Tu analyses les commentaires d'un live Facebook de vente de vêtements à Madagascar. Les acheteuses écrivent en malgache, en français ou en mélange, souvent en abrégé. « jp » (ou « JP », « j'prends », « alaiko ») veut dire qu'elle prend l'article montré à ce moment-là.
Réponds uniquement avec le JSON demandé.
- intention : « achat » si la personne réserve l'article ; « question » si elle demande quelque chose (prix, taille, disponibilité) sans réserver clairement ; « autre » pour le reste (salutations, encouragements).
- article_ref : la référence d'article (par exemple « R12 ») seulement si elle est écrite dans le commentaire, sinon null.
- taille : la taille demandée (S, M, L, XL, 38…) si elle est écrite, sinon null.
- quantite : 1, sauf si un nombre d'articles est clairement demandé.
- confiance : de 0 à 1, ta certitude sur l'intention. Descends sous 0,7 dès qu'il y a un doute, par exemple un « jp » suivi d'une question.
Exemples :
« jp » : achat, confiance 0,95.
« izaho koa jp » (moi aussi jp) : achat, 0,9.
« jp ilay mena M » (jp la rouge en M) : achat, taille M, 0,9.
« jp ve ? » (je peux encore prendre ?) : question, 0,4.
« ohatrinona ? » (combien ?) : question, 0,95.
« salama » (bonjour) : autre, 0,98.`;

const CONSIGNE_CAPTURE = `Tu lis une capture d'écran envoyée par une acheteuse comme preuve de paiement par Mobile Money à Madagascar.
Réponds uniquement avec le JSON demandé, et n'invente rien : une information illisible vaut null.
- est_paiement : vrai seulement si l'image montre la confirmation d'un transfert réussi.
- montant : le montant transféré en ariary, nombre entier sans espace.
- reference : la référence de la transaction, recopiée telle qu'écrite.
- heure : la date et l'heure de la transaction en ISO 8601 si elles sont lisibles.
- confiance : de 0 à 1, ta certitude sur la lecture.`;

export function creerMuse({ apiKey, modele, fetch = globalThis.fetch, delaiMs = 8000 }) {
  async function appeler(messages, nom, schema) {
    const controleur = new AbortController();
    const minuteur = setTimeout(() => controleur.abort(), delaiMs);
    try {
      const reponse = await fetch(URL_MODELE, {
        method: "POST",
        signal: controleur.signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modele,
          messages,
          response_format: { type: "json_schema", json_schema: { name: nom, strict: true, schema } },
        }),
      });
      if (!reponse.ok) {
        const corps = await reponse.text();
        throw new Error(`Meta Model API ${reponse.status} : ${corps.slice(0, 300)}`);
      }
      const corps = await reponse.json();
      return JSON.parse(corps.choices[0].message.content);
    } finally {
      clearTimeout(minuteur);
    }
  }

  return {
    actif: Boolean(apiKey),

    async comprendreCommentaire({ texte, article }) {
      const montre = article ? `${article.ref} · ${article.nom} · ${article.prix} Ar` : "aucun";
      const resultat = await appeler(
        [
          { role: "system", content: CONSIGNE_COMMENTAIRE },
          { role: "user", content: `Article montré : ${montre}\nCommentaire : « ${texte} »` },
        ],
        "commentaire_live",
        SCHEMA_COMMENTAIRE,
      );
      return { ...resultat, source: "muse" };
    },

    async lireCapture({ imageUrl, prixAttendu }) {
      const resultat = await appeler(
        [
          { role: "system", content: CONSIGNE_CAPTURE },
          {
            role: "user",
            content: [
              { type: "text", text: `Montant attendu : ${prixAttendu} Ar.` },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        "capture_paiement",
        SCHEMA_CAPTURE,
      );
      return { ...resultat, source: "muse" };
    },
  };
}
