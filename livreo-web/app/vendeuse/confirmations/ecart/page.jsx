import Aller from "../../Aller";

/* 8d · Paiement d'avance : écart. Généré depuis la maquette E5c-Ecart.html du canevas. */
export const metadata = { title: "Livreo · Paiement d'avance : écart" };

const css = "";

export default function Ecran() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="tel clair"><div className="statut"><span>22:33</span><span className="ic"><i /><i /><i /><span className="bat"><b style={{ width: "40%" }} /></span></span></div><p className="marque">Livreo</p><p className="etape-n">LIVE EN COURS · 2:31</p><div className="bloc"><span className="alerte-pt" /><h2>Paiement d'avance : Lova a payé 5 000 Ar de moins.</h2><div className="preuve"><p className="ligne-p" style={{ margin: "0" }}><span>Article</span><b>R14 · pull vert d'eau</b></p><p className="ligne-p" style={{ margin: "0" }}><span>Attendu</span><b>30 000 Ar</b></p><p className="ligne-p" style={{ margin: "0" }}><span>Lu sur la capture</span><b className="ecart">25 000 Ar</b></p><p className="ligne-p" style={{ margin: "0" }}><span>Opérateur · réf.</span><b>MVola · 7TQ1X9</b></p><p className="ligne-p" style={{ margin: "0" }}><span>Heure</span><b>21:02</b></p></div><p className="note">Vérifiez sur votre téléphone Mobile Money : une capture peut être ancienne ou recadrée.</p><button className="btn">Demander les 5 000 Ar restants</button><button className="btn sec">J'ai bien reçu 30 000, valider</button><Aller vers="/vendeuse/confirmations" className="btn discret">Annuler la réservation</Aller></div></main>
    </>
  );
}
