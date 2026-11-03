// Le parseur de secours : il tourne quand Muse Spark est indisponible, et il
// dit toujours si un « jp » est écrit, ce qui sert à lever un doute.

const JP = /(^|[^a-z])(j\s*['’]?\s*p+|j\s*['’]?\s*prends?|je\s+prends?|alaiko)([^a-z]|$)/;
const QUESTION = /\?|(^|[^a-z])(ve|combien|ohatrinona|aiza|mbola\s+misy|misy\s+ve)([^a-z]|$)/;
const TAILLE = /(^|[^a-z0-9])(xxs|xs|s|m|l|xl|xxl|xxxl|3[4-9]|4[0-8])([^a-z0-9]|$)/;
const REFERENCE = /(^|[^a-z0-9])r\s?-?(\d{1,3})([^0-9]|$)/;

function normaliser(texte) {
  return String(texte ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function analyserParRegles(texte) {
  const t = normaliser(texte);
  const jp = JP.test(t);
  const question = QUESTION.test(t);
  const taille = jp ? (t.match(TAILLE)?.[2]?.toUpperCase() ?? null) : null;
  const ref = t.match(REFERENCE);

  let intention = "autre";
  let confiance = 0.9;
  if (jp && question) {
    intention = "achat";
    confiance = 0.4;
  } else if (jp) {
    intention = "achat";
    confiance = 0.85;
  } else if (question) {
    intention = "question";
    confiance = 0.8;
  }

  return {
    intention,
    article_ref: ref ? `R${ref[2]}` : null,
    taille,
    quantite: 1,
    confiance,
    jp,
    source: "regles",
  };
}
