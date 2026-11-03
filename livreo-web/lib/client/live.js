// Côté téléphone de la vendeuse : la liste des articles du soir (gardée sur
// l'appareil) et les appels au serveur Livreo.

const CLE_ARTICLES = "livreo.articles";

export function lireArticles() {
  try {
    const liste = JSON.parse(localStorage.getItem(CLE_ARTICLES) ?? "[]");
    return Array.isArray(liste)
      ? liste.filter((a) => a && typeof a.ref === "string" && a.nom && Number.isInteger(a.prix) && a.prix > 0)
      : [];
  } catch {
    return [];
  }
}

export function ecrireArticles(liste) {
  try {
    localStorage.setItem(CLE_ARTICLES, JSON.stringify(liste));
  } catch {
    // Stockage indisponible (navigation privée) : la liste vit le temps de la page.
  }
}

// R1, R2… : la suivante après la plus grande déjà utilisée.
export function refSuivante(liste, ...autres) {
  const numeros = [...liste.map((a) => a.ref), ...autres].map((r) => Number(/^R(\d+)$/i.exec(r ?? "")?.[1] ?? 0));
  return `R${Math.max(0, ...numeros) + 1}`;
}

// « 35 000 », « 35000 Ar » → 35000 ; null si ce n'est pas un prix.
export function lirePrix(texte) {
  const n = Number(String(texte ?? "").replace(/[^\d]/g, ""));
  return Number.isInteger(n) && n > 0 ? n : null;
}

const NOMBRE = new Intl.NumberFormat("fr-FR");
export const formatAr = (n) => `${NOMBRE.format(n)} Ar`;

// « Faniry Rakoto » → « Faniry R. »
export function nomCourt(nom) {
  const [prenom, ...reste] = String(nom ?? "").trim().split(/\s+/);
  const initiale = reste.at(-1)?.[0];
  return initiale ? `${prenom} ${initiale.toUpperCase()}.` : prenom || "Une cliente";
}

export const prenom = (nom) => String(nom ?? "").trim().split(/\s+/)[0] || "une cliente";

export async function appeler(chemin, corps) {
  const reponse = await fetch(chemin, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps ?? {}),
  });
  const json = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new Error(json.erreur ?? "Le serveur ne répond pas. Réessayez.");
  return json;
}
