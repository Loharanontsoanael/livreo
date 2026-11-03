"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { appeler } from "@/lib/client/live";

const initiales = (nom) =>
  String(nom ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join("");

/* Après « Continuer avec Facebook » : la vendeuse choisit la Page de son
   live. Un tap connecte la Page (abonnement aux commentaires et à Messenger). */
export default function ChoixPage() {
  const router = useRouter();
  const manque = useSearchParams().get("manque");
  const [vendeuse, setVendeuse] = useState(null);
  const [choisie, setChoisie] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch("/api/vendeuse")
      .then((r) => r.json())
      .then((v) => (v.connectee ? setVendeuse(v) : router.replace("/essayer")))
      .catch(() => setErreur("Le serveur ne répond pas. Réessayez."));
  }, [router]);

  async function choisir(page) {
    if (choisie) return;
    setChoisie(page.id);
    setErreur("");
    try {
      await appeler("/api/vendeuse/page", { page_id: page.id });
      router.push("/essayer");
    } catch (e) {
      setErreur(e.message);
      setChoisie(null);
    }
  }

  async function changerDeCompte() {
    await fetch("/api/auth/deconnexion", { method: "POST" }).catch(() => {});
    router.replace("/essayer");
  }

  const haut = (
    <div className="art-haut">
      <p>Livreo</p>
      <button type="button" className="art-lien" onClick={changerDeCompte}>Changer de compte</button>
    </div>
  );

  if (!vendeuse) return <>{haut}{erreur && <p className="art-erreur" role="alert">{erreur}</p>}</>;

  if (vendeuse.pages.length === 0) {
    return (
      <>
        {haut}
        <h1>Aucune Page à votre nom.</h1>
        <p className="art-chapo">
          Livreo vend sur une Page Facebook, pas sur un profil. Créez la Page de votre boutique, puis revenez ici.
        </p>
        <div className="art-bas">
          <a className="acc-lancer" href="https://www.facebook.com/pages/create" target="_blank" rel="noreferrer">
            Créer ma Page sur Facebook
          </a>
          <a className="pg-secondaire" href="/api/auth/facebook?nouveau=1">J&apos;ai créé ma Page</a>
        </div>
      </>
    );
  }

  return (
    <>
      {haut}
      <h1>Quelle Page pour ce soir ?</h1>
      <p className="art-chapo">
        Livreo écoute les commentaires du live de cette Page et écrit aux clientes en son nom.
      </p>
      {manque && (
        <p className="pg-alerte" role="status">
          Facebook n&apos;a pas donné toutes les autorisations : Livreo risque de manquer des
          commentaires ou de ne pas pouvoir répondre. <a href="/api/auth/facebook?nouveau=1">Redonner l&apos;accès</a>
        </p>
      )}
      <ol className="pg-liste">
        {vendeuse.pages.map((page) => (
          <li key={page.id}>
            <button
              type="button"
              className={choisie === page.id ? "pg-ligne est-choisie" : "pg-ligne"}
              onClick={() => choisir(page)}
              disabled={Boolean(choisie)}
            >
              {page.photo ? (
                <img src={page.photo} alt="" />
              ) : (
                <span className="pg-av" aria-hidden="true">{initiales(page.nom)}</span>
              )}
              <span>
                <b>{page.nom}</b>
                {page.categorie && <small>{page.categorie}</small>}
              </span>
              <span className="pg-fleche" aria-hidden={choisie !== page.id}>
                {choisie === page.id ? "Connexion…" : "›"}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {erreur && <p className="art-erreur" role="alert">{erreur}</p>}
      <p className="pg-aide">Une Page manque ? Sur Facebook, vous devez en être administratrice.</p>
    </>
  );
}
