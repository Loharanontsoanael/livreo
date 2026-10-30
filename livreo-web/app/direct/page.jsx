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

      <div className="app-bas">
        <div className="app-doute" role="status">
          <p>«&nbsp;jp ve ?&nbsp;» de Mialy, c&apos;est une commande&nbsp;?</p>
          <button className="app-oui" type="button">Oui</button>
          <button className="app-non" type="button">Non</button>
        </div>
        <span className="app-ref">R12 · en cours · 3 jp</span>
        <p className="app-article"><b>Robe rouge</b><span>35&#8239;000&nbsp;Ar</span></p>
        <p className="app-gagnante">Faniry R. gagne, récap envoyé.</p>
        <p className="app-attente">2 en attente : Hanta, puis Mialy.</p>
        <button className="app-suivant" type="button">Article suivant</button>
      </div>
    </main>
  );
}
