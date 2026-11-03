"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { appeler, ecrireArticles, formatAr, lireArticles, lirePrix, nomCourt, prenom, refSuivante } from "@/lib/client/live";

/* L'écran Direct branché sur le serveur : l'état arrive en temps réel par
   /api/live/flux, chaque bouton appelle la route qui va avec. */
export default function EcranDirect() {
  const router = useRouter();
  const [etat, setEtat] = useState(null);
  const [enLigne, setEnLigne] = useState(true);
  const [liste, setListe] = useState([]);
  const [saisie, setSaisie] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [finDemandee, setFinDemandee] = useState(false);
  const maintenant = useHorloge();

  useEffect(() => setListe(lireArticles()), []);

  useEffect(() => {
    const flux = new EventSource("/api/live/flux");
    flux.onmessage = (e) => {
      setEtat(JSON.parse(e.data));
      setEnLigne(true);
    };
    flux.onerror = () => setEnLigne(false);
    return () => flux.close();
  }, []);

  useEffect(() => {
    if (!erreur) return;
    const t = setTimeout(() => setErreur(""), 5000);
    return () => clearTimeout(t);
  }, [erreur]);

  useEffect(() => {
    if (!finDemandee) return;
    const t = setTimeout(() => setFinDemandee(false), 4000);
    return () => clearTimeout(t);
  }, [finDemandee]);

  async function agir(action) {
    if (occupe) return;
    setOccupe(true);
    setErreur("");
    try {
      const nouvel = await action();
      if (nouvel?.live !== undefined) setEtat(nouvel);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setOccupe(false);
    }
  }

  const live = etat?.live ?? null;
  const article = etat?.article ?? null;
  const position = article ? liste.findIndex((a) => a.ref === article.ref) : -1;
  const prochain = liste[position + 1] ?? null;

  const montrer = (a) => agir(() => appeler("/api/live/article", a));

  function saisir(nom, prix) {
    const nouveau = { ref: refSuivante(liste, article?.ref), nom, prix };
    const avecNouveau = [...liste.slice(0, position + 1), nouveau, ...liste.slice(position + 1)];
    setListe(avecNouveau);
    ecrireArticles(avecNouveau);
    setSaisie(false);
    montrer(nouveau);
  }

  function terminer() {
    if (!finDemandee) {
      setFinDemandee(true);
      return;
    }
    agir(async () => {
      await appeler("/api/live", { action: "terminer" });
      router.push("/essayer");
    });
  }

  const decision = etat?.doutes?.[0]
    ? { genre: "doute", ...etat.doutes[0] }
    : etat?.paiements?.[0]
      ? { genre: "paiement", ...etat.paiements[0] }
      : null;

  return (
    <main className="app-direct">
      {/* La caméra : une photo tient lieu de flux tant que le relais vidéo n'est pas construit. */}
      <img className="app-camera" src="/img/live-argumentaire.jpg" alt="" />

      <div className="app-haut">
        {live ? (
          <>
            <span className="app-badge"><i />EN DIRECT</span>
            <span className="app-duree">{duree(live.demarre_le, maintenant)}</span>
          </>
        ) : (
          <span className="app-duree">Livreo</span>
        )}
        {!enLigne && <span className="app-hors-ligne" role="status">Reconnexion…</span>}
        {live && (
          <button
            type="button"
            className={finDemandee ? "app-terminer est-confirme" : "app-terminer"}
            onClick={terminer}
            disabled={occupe}
          >
            {finDemandee ? "Terminer le live ?" : "Terminer"}
          </button>
        )}
      </div>

      <div className="app-bas">
        {decision && (
          <Decision
            decision={decision}
            occupe={occupe}
            repondre={(oui) =>
              agir(() =>
                decision.genre === "doute"
                  ? appeler(`/api/doutes/${decision.id}`, { decision: oui ? "oui" : "non" })
                  : appeler(`/api/paiements/${decision.id}`, { decision: oui ? "confirmer" : "refuser" }),
              )
            }
          />
        )}

        {etat === null ? (
          <span className="app-ref">Connexion au live…</span>
        ) : !live ? (
          <>
            <span className="app-ref">Aucun live en cours</span>
            <p className="app-article"><b>Prête quand vous l&apos;êtes.</b></p>
          </>
        ) : !article ? (
          <>
            <span className="app-ref">En direct · aucun article montré</span>
            <p className="app-article"><b>Montrez votre premier article.</b></p>
          </>
        ) : (
          <>
            <span className="app-ref">
              {article.ref} · en cours · {article.jp} jp
            </span>
            <p className="app-article">
              <b>{article.nom}</b>
              <span>{formatAr(article.prix)}</span>
            </p>
            <p className="app-gagnante">{phraseGagnante(etat.gagnante)}</p>
            {etat.attente.length > 0 && <p className="app-attente">{phraseAttente(etat.attente)}</p>}
          </>
        )}

        {live && prochain && !saisie && (
          <p className="app-ensuite">
            Ensuite : <b>{prochain.nom}</b>, {formatAr(prochain.prix)}
          </p>
        )}

        {erreur && <p className="app-erreur" role="alert">{erreur}</p>}

        {saisie ? (
          <Saisie annuler={() => setSaisie(false)} valider={saisir} occupe={occupe} />
        ) : !live ? (
          <button
            type="button"
            className="app-suivant"
            disabled={occupe || etat === null}
            onClick={() => agir(() => appeler("/api/live", { action: "demarrer" }))}
          >
            Lancer le live
          </button>
        ) : (
          <div className="app-actions">
            <button
              type="button"
              className="app-suivant"
              disabled={occupe}
              onClick={() => (prochain ? montrer(prochain) : setSaisie(true))}
            >
              {prochain ? "Article suivant" : "Saisir l'article suivant"}
            </button>
            <button
              type="button"
              className="app-saisir"
              aria-label="Saisir un article hors liste"
              onClick={() => setSaisie(true)}
            >
              +
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Decision({ decision, occupe, repondre }) {
  const texte =
    decision.genre === "doute"
      ? `« ${decision.texte} » de ${prenom(decision.nom)}, c'est une commande ?`
      : phrasePaiement(decision);
  return (
    <div className="app-doute" role="status">
      <p>
        {texte}
        {decision.genre === "paiement" && decision.image_url && (
          <>
            {" "}
            <a href={decision.image_url} target="_blank" rel="noreferrer">Voir la capture</a>
          </>
        )}
      </p>
      <button className="app-oui" type="button" disabled={occupe} onClick={() => repondre(true)}>Oui</button>
      <button className="app-non" type="button" disabled={occupe} onClick={() => repondre(false)}>Non</button>
    </div>
  );
}

function Saisie({ annuler, valider, occupe }) {
  const [nom, setNom] = useState("");
  const [prix, setPrix] = useState("");
  const montant = lirePrix(prix);
  return (
    <form
      className="app-saisie"
      onSubmit={(e) => {
        e.preventDefault();
        if (nom.trim() && montant) valider(nom.trim(), montant);
      }}
    >
      <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de l'article" aria-label="Nom de l'article" autoFocus autoComplete="off" />
      <input value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="Prix" aria-label="Prix en ariary" inputMode="numeric" autoComplete="off" />
      <button type="button" className="app-non" onClick={annuler}>Annuler</button>
      <button type="submit" className="app-suivant" disabled={occupe || !nom.trim() || !montant}>Montrer</button>
    </form>
  );
}

// Une phrase courte par cas d'écart signalé par le serveur.
function phrasePaiement(p) {
  const qui = nomCourt(p.nom);
  if (!p.ecart) return `Capture de ${qui}, ${formatAr(p.montant)}. On valide ?`;
  if (p.montant != null && p.montant !== p.prix) {
    return `Capture de ${qui} : ${formatAr(p.montant)} au lieu de ${formatAr(p.prix)}. On valide ?`;
  }
  if (/n'est pas/.test(p.ecart)) return `${qui} a envoyé une image qui n'est pas un paiement. On valide ?`;
  if (/illisible/.test(p.ecart)) return `Capture de ${qui}, montant illisible. On valide ?`;
  return `Capture de ${qui}, à vérifier à l'œil. On valide ?`;
}

function phraseGagnante(g) {
  if (!g) return "Pas encore de JP.";
  const qui = nomCourt(g.nom);
  if (g.statut === "attente") return `${qui} gagne, envoi du récap…`;
  if (g.statut === "a_confirmer") return `${qui} a envoyé sa capture.`;
  if (g.statut === "payee") return `${qui} a payé.`;
  return `${qui} gagne, récap envoyé.`;
}

function phraseAttente(attente) {
  const [a, b] = attente.map((x) => prenom(x.nom));
  if (attente.length === 1) return `1 en attente : ${a}.`;
  if (attente.length === 2) return `2 en attente : ${a}, puis ${b}.`;
  const autres = attente.length - 2;
  return `${attente.length} en attente : ${a}, puis ${b} et ${autres} autre${autres > 1 ? "s" : ""}.`;
}

function duree(debut, maintenant) {
  const s = Math.max(0, Math.floor((maintenant - Date.parse(debut)) / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function useHorloge() {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const minuteur = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(minuteur);
  }, []);
  return t;
}
