import Aller from "../Aller";

/* 9 · Fin du live. Généré depuis la maquette A10-Fin-du-live.html du canevas. */
export const metadata = { title: "Livreo · Fin du live" };

const css = "";

export default function Ecran() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="tel clair"><div className="statut"><span>23:12</span><span className="ic"><i /><i /><i /><span className="bat"><b style={{ width: "33%" }} /></span></span></div><p className="marque">Livreo</p><p className="etape-n">TERMINÉ · 23:08</p><div className="bloc haut" style={{ gap: "6px" }}><h1>Live terminé.<br />3 h 06 de vente.</h1><p className="chapo">Les messages de confirmation sont partis pendant le live, article par article.</p></div><div style={{ position: "absolute", top: "268px", left: "24px", right: "24px" }} className="chiffres"><div><b>27</b><span>articles reconnus</span></div><div><b>41</b><span>gagnantes contactées</span></div><div><b>33</b><span>commandes confirmées</span></div><div><b>6</b><span>sans réponse, passées à la suivante</span></div><div><b>4</b><span>doutes réglés d'un toucher</span></div><div><b>1,3<i>M</i></b><span>Ar à encaisser à la livraison</span></div></div><div className="bloc" style={{ gap: "10px" }}><Aller vers="/vendeuse/confirmations" className="mini-btn">2 confirmations encore en discussion</Aller><Aller vers="/vendeuse/feuille-de-route" className="btn">Préparer la feuille de route</Aller></div></main>
    </>
  );
}
