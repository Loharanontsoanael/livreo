import CartesProbleme from "./CartesProbleme";

export default function Accueil() {
  return (
    <>
      <header className="entete">
        <a className="marque" href="#">Livreo</a>
      </header>

      <main>
        {/* Le héros */}
        <section className="scene">
          <div className="nuage nuage-accueil" aria-hidden="true" />
          <div className="texte">
            <p className="etiquette">L&apos;assistant de vente des lives Facebook à Madagascar</p>
            <h1 className="titre">Transformez vos lives en ventes&nbsp;payées.</h1>
            <p className="chapo">
              Livreo capte les commentaires de votre live Facebook, réserve chaque article au
              premier acheteur, envoie le récapitulatif sur Messenger et vérifie chaque paiement.
              Vous animez, Livreo encaisse.
            </p>
            <div className="actions">
              <a className="bouton" href="#pilotes">Essayer sur mon live</a>
              <a className="lien" href="#boucle">Comment ça marche</a>
            </div>
          </div>
          <div className="objet">
            <figure className="sujet-live">
              <img
                src="/img/vendeuse-hero-bleue.png"
                alt="Une vendeuse souriante derrière son ring light, pendant son live"
                width={1073}
                height={1400}
              />
              <div
                className="c-flux"
                data-couche="flux"
                data-elements="JP, jp, JP, izaho koa jp, jp !!, JP"
                aria-hidden="true"
              />
            </figure>
          </div>
          <ul className="preuves">
            <li>
              <b>3 <i>s</i></b>
              <span>du commentaire à la réservation</span>
            </li>
            <li>
              <b>100 <i>%</i></b>
              <span>des commentaires captés</span>
            </li>
            <li>
              <b>0</b>
              <span>paiement validé sans preuve</span>
            </li>
          </ul>
        </section>

        {/* Le problème */}
        <section className="scene scene-probleme">
          <div className="nuage nuage-transition" aria-hidden="true" />
          <div className="texte">
            <p className="etiquette">Le problème</p>
            <h2 className="titre titre-2" data-couche="mots">Après le live, des heures de travail.</h2>
            <p className="chapo">
              Aujourd&apos;hui, tout se fait à la main. Chaque étape prend du temps, et chaque
              étape fait perdre des ventes.
            </p>
          </div>
          <CartesProbleme />
        </section>

        {/* La boucle, sur le vif : la photo du live, les 4 moments en pastilles */}
        <section className="vif" id="boucle">
          <div className="vif-photo" aria-hidden="true">
            <img src="/img/live-argumentaire.jpg" alt="" width={1920} height={1280} loading="lazy" />
          </div>
          <div className="vif-contenu">
            <div className="vif-texte">
              <p className="etiquette">La boucle Livreo</p>
              <h2 className="titre titre-2">Pendant qu&apos;elle vend, Livreo encaisse.</h2>
              <p>Quatre étapes automatiques, à la seconde près, pendant que le live continue.</p>
            </div>
            <div className="fil-etapes">
              <p className="etape-f">
                <b>Réservé à la seconde.</b>
              </p>
              <p className="etape-f">
                <b>Le récap part tout seul.</b>
              </p>
              <p className="etape-f">
                <b>La capture est lue. <span className="paye">Payé.</span></b>
              </p>
              <p className="etape-f">
                <b>Au suivant, automatiquement.</b>
              </p>
            </div>
          </div>
        </section>

        {/* Côté acheteuses : la fin de la bande nuit, le téléphone monolithe */}
        <section className="scene fond-nuit scene-nuit">
          <div className="nuage nuage-nuit" aria-hidden="true" />
          <div className="texte">
            <p className="etiquette">Côté acheteuses</p>
            <h2 className="titre titre-2">Vos clientes ont déjà tout.</h2>
            <p className="chapo">
              Un commentaire pour commander, une capture pour payer.
              <b> Rien à installer&nbsp;: juste des ventes plus rapides.</b>
            </p>
          </div>
          <div className="objet">
            <figure className="cl-sujet" aria-hidden="true">
              <img src="/img/tel-plat.jpg" alt="" width={1920} height={2880} loading="lazy" />
              <div className="cl-lueur" />
              <div className="cl-ecran c-produit">
                <div className="cl-barre">
                  <span className="cl-heure-mini">21:42</span>
                  <span className="cl-icones">
                    <i className="ico-barre b1" /><i className="ico-barre b2" /><i className="ico-barre b3" />
                    <i className="ico-batterie" />
                  </span>
                </div>
                <div className="cl-entete-chat">
                  <span className="cl-avatar">L</span>
                  <b>Livreo</b>
                </div>
                <div className="cl-chat">
                  <p className="cl-date">ce soir · 21:42</p>
                  <p className="bulle bulle-livreo">
                    Robe bleue wax · 45&nbsp;000&nbsp;Ar. Réservée pour vous jusqu&apos;à 22:00.
                  </p>
                  <p className="bulle bulle-cliente">capture envoyée</p>
                  <p className="cl-statut">payé · confirmé à 21:44</p>
                </div>
                <div className="cl-saisie"><span>Écrire…</span><i /></div>
              </div>
            </figure>
          </div>
        </section>

        {/* Démarrer : la vraie fin de page, les trois pas avant le pied */}
        <section className="demarrer" id="pilotes">
          <p className="etiquette">Vendeuses pilotes</p>
          <h2 className="titre titre-2">Démarrez cette semaine.</h2>
          <p className="chapo">
            Les premiers lives accompagnés se font à Antananarivo, avec l&apos;équipe à vos côtés.
          </p>
          <div className="pas-colonnes">
            <div className="pas">
              <i>1</i>
              <b>Proposez votre live.</b>
              <span>Un message suffit. On vous répond le jour même, en français ou en malgache.</span>
            </div>
            <div className="pas">
              <i>2</i>
              <b>On installe tout avec vous.</b>
              <span>La veille de votre live, en 30 minutes. Rien à payer, rien à configurer vous-même.</span>
            </div>
            <div className="pas">
              <i>3</i>
              <b>Vous vendez, Livreo encaisse.</b>
              <span>Vous animez votre live comme d&apos;habitude, la liste des commandes payées se remplit.</span>
            </div>
          </div>
          <div className="demarrer-final">
            <a className="bouton-demarrer" href="#">
              <b>Proposer mon live</b>
              <span>réponse le jour même</span>
            </a>
            <p className="conditions">
              Gratuit pendant le pilote. Vous gardez la main : Livreo ne publie jamais à votre
              place.
            </p>
          </div>
        </section>
      </main>

      <footer className="pied-livreo">
        <p className="pied-ligne">
          <b>Livreo</b> · Antananarivo, Madagascar
        </p>
        <p className="pied-ligne">
          Construit avec les API Meta pour le Meta Global AI Developer Hackathon 2026. Misaotra.
        </p>
      </footer>

      {/* Téléphone : la bande d'action en bas, après le héros. */}
      <div className="c-barre-cta" data-couche="barre-cta">
        <span>Votre prochain live, sans cahier.</span>
        <a className="bouton bouton-petit" href="#pilotes">Essayer</a>
      </div>
    </>
  );
}
