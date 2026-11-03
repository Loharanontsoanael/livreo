import Aller from "../Aller";

/* 8 · Confirmations. Généré depuis la maquette A9-Paiements.html du canevas. */
export const metadata = { title: "Livreo · Confirmations" };

const css = "";

export default function Ecran() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="tel clair"><div className="statut"><span>22:31</span><span className="ic"><i /><i /><i /><span className="bat"><b style={{ width: "41%" }} /></span></span></div><p className="marque">Livreo</p><p className="etape-n">LIVE EN COURS · 2:29</p><div className="bloc haut" style={{ gap: "6px" }}><h2>Confirmations</h2><p className="chapo">L'IA discute avec chaque gagnante sur Messenger. Si elle ne confirme pas, la suivante est prévenue.</p></div><div style={{ position: "absolute", top: "220px", left: "24px", right: "24px" }}><ul className="liste-clair"><li className="ligne"><b>Hery · R12 gilet M</b><span className="m">38 000</span><small>Ampefiloha · à la livraison, espèces</small><span className="etat ok">CONFIRMÉE</span></li><li className="ligne"><b>Rado · R13 bottines</b><span className="m">48 000</span><small>demande si la pointure 38 existe</small><span className="etat vu">EN DISCUSSION</span></li><li className="ligne"><b>Nomena · R14 pull</b><span className="m">33 000</span><small>a payé avant · MVola, capture lue</small><span className="etat ok">PAYÉ AVANT</span></li><li className="ligne"><b>Lova → Soa · R16 sac</b><span className="m">23 000</span><small>Lova n'a pas répondu en 30 min · Soa prévenue</small><span className="etat ecart">PASSÉE À LA SUIVANTE</span></li></ul></div><div className="bloc" style={{ gap: "10px" }}><p className="note">Montants = prix + frais de livraison du quartier. Touchez une ligne pour lire la conversation.</p><Aller vers="/vendeuse/feuille-de-route" className="btn">Voir la feuille de route</Aller></div></main>
    </>
  );
}
