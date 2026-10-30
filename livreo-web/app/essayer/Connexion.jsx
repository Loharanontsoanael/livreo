"use client";

import { useState } from "react";

/* L'accueil de l'app : connecter sa Page, puis lancer le live.
   La connexion est factice pour le design, le serveur branchera
   Facebook Login derrière le même bouton. */
export default function Connexion() {
  const [page, setPage] = useState(null);

  if (page === null) {
    return (
      <div className="acc-bloc">
        <h1>Votre live, encaissé en direct.</h1>
        <p className="acc-chapo">
          Connectez la Page Facebook de votre boutique : Livreo écoute les
          commentaires de votre live et s&apos;occupe du reste.
        </p>
        <button
          className="acc-fb"
          type="button"
          onClick={() => setPage({ nom: "Chez Nirina", detail: "Boutique · Antananarivo" })}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
          </svg>
          Continuer avec Facebook
        </button>
        <p className="acc-note">
          Livreo lit vos Pages, les commentaires du live et peut écrire sur
          Messenger. Rien n&apos;est jamais publié à votre place.
        </p>
      </div>
    );
  }

  return (
    <div className="acc-bloc">
      <h1>Ce soir, chez {page.nom.replace("Chez ", "")}.</h1>
      <ul className="acc-prets">
        <li>
          <i className="est-ok" aria-hidden="true" />
          <div>
            <b>{page.nom}</b>
            <small>Page connectée · {page.detail}</small>
          </div>
        </li>
        <li>
          <i className="est-ok" aria-hidden="true" />
          <div>
            <b>8 fiches articles prêtes</b>
            <small>dernière : Robe bleue wax · 35 000 Ar</small>
          </div>
          <a href="#">revoir</a>
        </li>
        <li>
          <i className="est-ok" aria-hidden="true" />
          <div>
            <b>Messenger actif</b>
            <small>récaps et confirmations partiront tout seuls</small>
          </div>
        </li>
      </ul>
      <a className="acc-lancer" href="/direct">Lancer le live</a>
      <p className="acc-note">Dernier live : il y a 6 jours · 42 commandes payées.</p>
    </div>
  );
}
