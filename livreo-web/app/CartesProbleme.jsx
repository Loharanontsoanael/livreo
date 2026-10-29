"use client";

import { useState } from "react";

// L'accordéon du problème : la carte active s'élargit et se déplie en bloc
// bleu avec son texte ; les autres se replient en photos labellisées.
const CARTES = [
  {
    id: "recopier",
    img: "/img/asset-recopier.jpg",
    alt: "Une main recopie les commandes dans un cahier",
    label: "Recopier à la main",
    eyebrow: "après chaque live",
    titre: "Des heures de recopiage.",
    texte:
      "Chaque commentaire est noté dans un cahier, un par un, pour retrouver qui a dit « JP » en premier. Souvent tard dans la nuit.",
  },
  {
    id: "verifier",
    img: "/img/asset-verifier.jpg",
    alt: "Des mains vérifient une capture de paiement sur un téléphone",
    label: "Vérifier chaque capture",
    eyebrow: "preuve par preuve",
    titre: "Des fausses captures qui passent.",
    texte:
      "Chaque preuve MVola ou Orange Money est contrôlée à l'œil, une par une. Les incohérences passent, et elles coûtent cher.",
  },
  {
    id: "relancer",
    img: "/img/asset-relancer.jpg",
    alt: "Des vêtements en attente sur un portant",
    label: "Relancer les « JP fantômes »",
    eyebrow: "pendant ce temps",
    titre: "Des articles bloqués.",
    texte:
      "Les acheteurs qui ne paient jamais immobilisent les articles. À chaque live, des ventes sont perdues.",
  },
];

export default function CartesProbleme() {
  const [active, setActive] = useState(0);

  return (
    <div className="cartes-probleme">
      {CARTES.map((c, i) => (
        <article
          key={c.id}
          className={"carte" + (i === active ? " est-active" : "")}
          tabIndex={0}
          aria-expanded={i === active}
          onMouseEnter={() => setActive(i)}
          onFocus={() => setActive(i)}
          onClick={() => setActive(i)}
        >
          <img src={c.img} alt={c.alt} loading="lazy" />
          <p className="carte-label">{c.label}</p>
          <div className="carte-detail" aria-hidden={i !== active}>
            <span>{c.eyebrow}</span>
            <h3>{c.titre}</h3>
            <p>{c.texte}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
