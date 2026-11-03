import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Chiffrement des jetons de Page au repos (AES-256-GCM). La clé dérive de
// LIVREO_CLE_CHIFFREMENT, ou à défaut de la clé secrète de l'app Meta :
// changer l'une ou l'autre oblige les vendeuses à se reconnecter.
export function creerCoffre(secret) {
  const cle = secret ? createHash("sha256").update(`livreo-jetons:${secret}`).digest() : null;
  return {
    actif: Boolean(cle),
    chiffrer(texte) {
      if (!cle) throw new Error("Aucune clé de chiffrement : renseignez META_APP_SECRET.");
      const iv = randomBytes(12);
      const chiffreur = createCipheriv("aes-256-gcm", cle, iv);
      const corps = Buffer.concat([chiffreur.update(texte, "utf8"), chiffreur.final()]);
      return ["v1", iv.toString("base64url"), chiffreur.getAuthTag().toString("base64url"), corps.toString("base64url")].join(".");
    },
    dechiffrer(paquet) {
      if (!cle) return null;
      const [version, iv, etiquette, corps] = String(paquet).split(".");
      if (version !== "v1") return null;
      try {
        const dechiffreur = createDecipheriv("aes-256-gcm", cle, Buffer.from(iv, "base64url"));
        dechiffreur.setAuthTag(Buffer.from(etiquette, "base64url"));
        return Buffer.concat([dechiffreur.update(Buffer.from(corps, "base64url")), dechiffreur.final()]).toString("utf8");
      } catch {
        return null;
      }
    },
  };
}
