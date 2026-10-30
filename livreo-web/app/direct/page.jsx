export const metadata = {
  title: "Livreo · Direct",
};

/* L'écran Direct de l'app vendeuse : la caméra plein écran, les infos du
   live par-dessus. Données factices en attendant le serveur de l'équipe. */
export default function Direct() {
  return (
    <main className="app-direct">
      {/* La caméra : une photo tient lieu de flux pour le design. */}
      <img className="app-camera" src="/img/live-argumentaire.jpg" alt="" />

      <div className="app-haut">
        <span className="app-badge"><i />EN DIRECT</span>
        <span className="app-duree">23:12</span>
        <span className="app-spectateurs">128 regardent</span>
      </div>

      <div className="app-doute" role="status">
        <p>«&nbsp;jp ve ?&nbsp;» de Mialy : <b>c&apos;est une commande ?</b></p>
        <button className="app-oui" type="button">Oui</button>
        <button className="app-non" type="button">Non</button>
      </div>

      <div className="app-bas">
        <span className="app-ref">R12 · en cours · 3 JP</span>
        <p className="app-article"><b>Robe rouge</b><span>35&nbsp;000&nbsp;Ar</span></p>
        <p className="app-gagnante"><i />Faniry R. gagne · récap envoyé</p>
        <p className="app-attente">en attente : Hanta (21:42:04) · Mialy (21:42:09)</p>
        <button className="app-suivant" type="button">Article suivant</button>
      </div>
    </main>
  );
}
