"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { appeler, formatAr, lancerLive, lireArticles } from "@/lib/client/live";

const REFUS = {
  annule: "Connexion annulée. Livreo a besoin de votre accord pour lire les commentaires de votre Page.",
  expire: "La connexion a pris trop de temps. Réessayez.",
  erreur: "Facebook n'a pas répondu. Réessayez dans un instant.",
};

/* L'accueil de l'app : se connecter avec Facebook, puis lancer le live
   sur la Page choisie. */
export default function Connexion() {
  const router = useRouter();
  const refus = REFUS[useSearchParams().get("refus")] ?? "";
  const [vendeuse, setVendeuse] = useState(null);
  const [demo, setDemo] = useState(false);
  const [articles, setArticles] = useState([]);
  const [lancement, setLancement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [numero, setNumero] = useState("");
  const [aValider, setAValider] = useState(0);

  useEffect(() => {
    setArticles(lireArticles());
    fetch("/api/vendeuse")
      .then((r) => r.json())
      .then((v) => {
        if (v.connectee && !v.page) {
          router.replace("/essayer/page");
          return;
        }
        setVendeuse(v);
        setNumero(v.numero ?? v.secours?.numero ?? "");
        try {
          if (v.secours && sessionStorage.getItem("livreo.demo")) setDemo(true);
        } catch {}
      })
      .catch(() => setVendeuse({ connectee: false }));
  }, [router]);

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

  const page = vendeuse?.page ?? (demo && vendeuse?.secours ? { nom: vendeuse.secours.nom, categorie: "Page de démonstration" } : null);

  // Les captures envoyées après la fin du live attendent la vendeuse ici.
  useEffect(() => {
    if (!page) return;
    fetch("/api/live")
      .then((r) => (r.ok ? r.json() : null))
      .then((e) => setAValider(e?.paiements?.length ?? 0))
      .catch(() => {});
  }, [page?.nom]);

  if (vendeuse === null) return <div className="acc-bloc" aria-busy="true" />;
  const dernier = articles.at(-1);

  if (!page) {
    return (
      <div className="acc-bloc">
        <h1>Votre live, encaissé en direct.</h1>
        <p className="acc-chapo">
          Connectez la Page Facebook de votre boutique : Livreo écoute les
          commentaires de votre live et s&apos;occupe du reste.
        </p>
        <a className="acc-fb" href="/api/auth/facebook">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
          </svg>
          Continuer avec Facebook
        </a>
        {refus && <p className="art-erreur" role="alert">{refus}</p>}
        <p className="acc-note">
          Livreo lit vos Pages, les commentaires du live et peut écrire sur
          Messenger. Rien n&apos;est jamais publié à votre place.
        </p>
        {vendeuse.secours && (
          <button
            type="button"
            className="acc-demo"
            onClick={() => {
              setDemo(true);
              try {
                sessionStorage.setItem("livreo.demo", "1");
              } catch {}
            }}
          >
            Essayer avec la Page de démonstration
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="acc-bloc">
      <h1>Ce soir, chez {page.nom.replace(/^Chez /, "")}.</h1>
      <ul className="acc-prets">
        <li>
          <i className="est-ok" aria-hidden="true" />
          <div>
            <b>{page.nom}</b>
            <small>Page connectée{page.categorie ? ` · ${page.categorie}` : ""}</small>
          </div>
          {vendeuse.connectee && <a href="/essayer/page">changer</a>}
        </li>
        <li>
          <i className={articles.length ? "est-ok" : "est-ok est-vide"} aria-hidden="true" />
          <div>
            <b>
              {articles.length
                ? `${articles.length} article${articles.length > 1 ? "s" : ""} prêt${articles.length > 1 ? "s" : ""}`
                : "Aucun article préparé"}
            </b>
            <small>
              {dernier ? `dernier : ${dernier.nom} · ${formatAr(dernier.prix)}` : "un seul tap par article pendant le live"}
            </small>
          </div>
          <a href="/essayer/articles">{articles.length ? "revoir" : "préparer"}</a>
        </li>
        <Numero numero={numero} changer={setNumero} />
        {aValider > 0 && (
          <li>
            <i className="est-ok est-attente" aria-hidden="true" />
            <div>
              <b>{aValider} capture{aValider > 1 ? "s" : ""} à valider</b>
              <small>paiements reçus après le live</small>
            </div>
            <a href="/direct">valider</a>
          </li>
        )}
      </ul>
      <button type="button" className="acc-lancer" onClick={lancer} disabled={lancement}>
        {lancement ? "Lancement…" : "Lancer le live"}
      </button>
      {erreur && <p className="art-erreur" role="alert">{erreur}</p>}
    </div>
  );
}

/* Le numéro Mobile Money, écrit dans chaque récap : sans lui, les clientes
   ne savent pas où payer. Il se modifie sur place. */
function Numero({ numero, changer }) {
  const [edition, setEdition] = useState(false);
  const [saisie, setSaisie] = useState(numero);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur("");
    try {
      const { numero: enregistre } = await appeler("/api/vendeuse/reglages", { numero: saisie });
      changer(enregistre);
      setEdition(false);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  if (edition) {
    return (
      <li>
        <i className="est-ok est-vide" aria-hidden="true" />
        <form className="acc-numero" onSubmit={enregistrer}>
          <input
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="034 12 345 67"
            aria-label="Numéro Mobile Money"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
          />
          <button type="submit" disabled={envoi}>{envoi ? "…" : "OK"}</button>
          {erreur && <p className="art-erreur" role="alert">{erreur}</p>}
        </form>
      </li>
    );
  }

  return (
    <li>
      <i className={numero ? "est-ok" : "est-ok est-vide"} aria-hidden="true" />
      <div>
        <b>{numero ? `Mobile Money ${numero}` : "Numéro Mobile Money"}</b>
        <small>{numero ? "écrit dans chaque récap Messenger" : "à ajouter : vos clientes doivent savoir où payer"}</small>
      </div>
      <a
        href="#numero"
        onClick={(e) => {
          e.preventDefault();
          setSaisie(numero);
          setEdition(true);
        }}
      >
        {numero ? "changer" : "ajouter"}
      </a>
    </li>
  );
}
