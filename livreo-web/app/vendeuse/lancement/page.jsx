import Aller from "../Aller";

/* 6 · Lancement du live. Généré depuis la maquette E3e-Lancement.html du canevas. */
export const metadata = { title: "Livreo · Lancement du live" };

const css = "";

export default function Ecran() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="tel"><img className="camera" src="/img/live-ringlight.jpg" alt="" style={{ objectPosition: "62% 35%", filter: "brightness(.4)" }} /><div className="statut"><span>20:01</span><span className="ic"><i /><i /><i /><span className="bat"><b style={{ width: "63%" }} /></span></span></div><div className="voile-bas" style={{ height: "600px" }} /><div className="direct-bas" style={{ gap: "16px" }}><h2>Lancement du live…</h2><ul className="liste"><li><i className="pt" /><div><b>Live créé sur la Page</b><small>Chez Nirina</small></div></li><li><i className="pt" /><div><b>Vidéo reçue par Livreo</b><small>720p · 2,3 Mb/s</small></div></li><li><i className="pt att" /><div><b>Facebook reçoit l'image</b><small>le live devient public à cette étape</small></div></li><li><i className="pt non" /><div><b>Écoute des commentaires</b></div></li></ul><div className="chargement"><i /></div><p className="attente">Comptez 10 à 20 secondes.</p><Aller vers="/vendeuse/avant-live" className="btn discret">Annuler</Aller></div></main>
    </>
  );
}
