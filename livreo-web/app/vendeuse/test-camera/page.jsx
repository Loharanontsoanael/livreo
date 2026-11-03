import Aller from "../Aller";

/* 5c · Test caméra et micro. Généré depuis la maquette E3f-Test-camera.html du canevas. */
export const metadata = { title: "Livreo · Test caméra et micro" };

const css = "";

export default function Ecran() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="tel"><img className="camera" src="/img/live-ringlight.jpg" alt="" style={{ objectPosition: "62% 35%" }} /><div className="statut"><span>19:56</span><span className="ic"><i /><i /><i /><span className="bat"><b style={{ width: "64%" }} /></span></span></div><div className="voile-haut" /><div className="direct-haut"><span className="badge" style={{ background: "#49536b" }}><i />TEST · PAS EN DIRECT</span></div><div className="voile-bas" style={{ height: "520px" }} /><div className="direct-bas" style={{ gap: "14px" }}><h2>Dites un prix, pour voir.</h2><div className="onde"><i style={{ height: "14px" }} /><i style={{ height: "8px" }} /><i style={{ height: "16px" }} /><i style={{ height: "5px" }} /><i style={{ height: "6px" }} /><i style={{ height: "21px" }} /><i style={{ height: "7px" }} /><i style={{ height: "15px" }} /><i style={{ height: "22px" }} /><i style={{ height: "5px" }} /><i style={{ height: "20px" }} /><i style={{ height: "10px" }} /><i style={{ height: "5px" }} /><i style={{ height: "6px" }} /><i style={{ height: "17px" }} /><i style={{ height: "17px" }} /><i style={{ height: "6px" }} /><i style={{ height: "11px" }} /><i style={{ height: "6px" }} /><i style={{ height: "21px" }} /><i style={{ height: "17px" }} /><i style={{ height: "5px" }} /><i style={{ height: "22px" }} /><i style={{ height: "7px" }} /><i style={{ height: "11px" }} /><i style={{ height: "22px" }} /><i style={{ height: "5px" }} /><i style={{ height: "22px" }} /><i style={{ height: "22px" }} /><i style={{ height: "16px" }} /></div><p className="entendu"><q><em>Telo alina sy dimy arivo</em></q></p><p className="article"><b>Livreo a compris</b><span>35 000 Ar</span></p><p className="attente">Image nette, son clair. Rien n'est diffusé pendant le test.</p><Aller vers="/vendeuse/avant-live" className="btn">C'est bon</Aller></div></main>
    </>
  );
}
