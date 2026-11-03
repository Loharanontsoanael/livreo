"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireArticles, formatAr, lancerLive, lireArticles, lirePrix, refSuivante } from "@/lib/client/live";

/* Les articles du soir, dans l'ordre du live. Pendant le live, « Article
   suivant » les fait passer un par un, sans rien taper. */
export default function ListeArticles() {
  const router = useRouter();
  const champNom = useRef(null);
  const [liste, setListe] = useState([]);
  const [nom, setNom] = useState("");
  const [prix, setPrix] = useState("");
  const [edition, setEdition] = useState(null);
  const [erreur, setErreur] = useState("");
  const [lancement, setLancement] = useState(false);

  useEffect(() => setListe(lireArticles()), []);

  const changer = (nouvelle) => {
    setListe(nouvelle);
    ecrireArticles(nouvelle);
  };

  function ajouter(e) {
    e.preventDefault();
    const montant = lirePrix(prix);
    if (!nom.trim() || !montant) {
      setErreur("Il faut un nom et un prix en ariary.");
      return;
    }
    changer([...liste, { ref: refSuivante(liste), nom: nom.trim(), prix: montant }]);
    setNom("");
    setPrix("");
    setErreur("");
    champNom.current?.focus();
  }

  async function lancer() {
    setLancement(true);
    setErreur("");
    try {
      await lancerLive();
      router.push("/direct");
    } catch (e) {
      setErreur(e.message);
      setLancement(false);
    }
  }

  return (
    <>
      <div className="art-haut">
        <p>Livreo</p>
        <a href="/essayer">Retour</a>
      </div>
      <h1>Les articles de ce soir.</h1>
      <p className="art-chapo">
        Dans l&apos;ordre où vous allez les montrer. Pendant le live, un seul tap passe au suivant.
      </p>

      {liste.length > 0 && (
        <ol className="art-liste">
          {liste.map((article, i) =>
            edition === article.ref ? (
              <Edition
                key={article.ref}
                article={article}
                enregistrer={(modifie) => {
                  changer(liste.map((a, j) => (j === i ? modifie : a)));
                  setEdition(null);
                }}
                retirer={() => {
                  changer(liste.filter((_, j) => j !== i));
                  setEdition(null);
                }}
              />
            ) : (
              <li key={article.ref}>
                <button type="button" className="art-ligne" onClick={() => setEdition(article.ref)}>
                  <i className="art-ref">{article.ref}</i>
                  <b>{article.nom}</b>
                  <span>{formatAr(article.prix)}</span>
                </button>
              </li>
            ),
          )}
        </ol>
      )}

      <form className="art-ajout" onSubmit={ajouter}>
        <input
          ref={champNom}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom de l'article"
          aria-label="Nom de l'article"
          autoComplete="off"
          enterKeyHint="next"
        />
        <input
          value={prix}
          onChange={(e) => setPrix(e.target.value)}
          placeholder="Prix"
          aria-label="Prix en ariary"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
        />
        <button type="submit" aria-label="Ajouter l'article">+</button>
      </form>
      {erreur && <p className="art-erreur" role="alert">{erreur}</p>}

      <div className="art-bas">
        <button type="button" className="acc-lancer" onClick={lancer} disabled={lancement}>
          {lancement ? "Lancement…" : "Lancer le live"}
        </button>
        <small>
          {liste.length
            ? "Touchez une ligne pour la modifier ou la retirer."
            : "Vous pourrez aussi saisir un article pendant le live."}
        </small>
      </div>
    </>
  );
}

function Edition({ article, enregistrer, retirer }) {
  const [nom, setNom] = useState(article.nom);
  const [prix, setPrix] = useState(String(article.prix));
  const montant = lirePrix(prix);

  return (
    <li>
      <form
        className="art-edition"
        onSubmit={(e) => {
          e.preventDefault();
          if (nom.trim() && montant) enregistrer({ ...article, nom: nom.trim(), prix: montant });
        }}
      >
        <i className="art-ref">{article.ref}</i>
        <input value={nom} onChange={(e) => setNom(e.target.value)} aria-label="Nom de l'article" autoFocus />
        <input value={prix} onChange={(e) => setPrix(e.target.value)} aria-label="Prix en ariary" inputMode="numeric" />
        <div className="art-edition-actions">
          <button type="button" onClick={retirer}>Retirer</button>
          <button type="submit" disabled={!nom.trim() || !montant}>Enregistrer</button>
        </div>
      </form>
    </li>
  );
}
