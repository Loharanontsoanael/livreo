import Link from "next/link";
import ecrans from "./ecrans.json";

export const metadata = {
  title: "Livreo · App vendeuse : les écrans",
};

const PARCOURS = [
  ["B", "La première fois", "Connexion Facebook, choix de la Page."],
  ["C", "Chaque soir de live", "Accueil, avant le live, direct, confirmations sur Messenger, feuille de route."],
];

/* Sommaire de l'app vendeuse : chaque écran et chaque état, dans l'ordre
   d'utilisation. Données factices en attendant le serveur. */
export default function Sommaire() {
  return (
    <main className="lv-sommaire">
      <p className="lv-plan-titre">Livreo</p>
      <h1>App vendeuse</h1>
      <p className="lv-chapo">
        Le live est filmé dans Livreo et relayé sur la Page Facebook. La première JP gagne,
        l&apos;IA confirme avec elle sur Messenger ; sans réponse en 30&nbsp;min, la suivante
        est contactée. Les données sont factices.
      </p>
      <Link className="lv-commencer" href="/vendeuse/connexion">Commencer : 1 · Connexion</Link>
      {PARCOURS.map(([p, nom, sous]) => (
        <section key={p}>
          <h2>{nom}</h2>
          <p className="lv-sous">{sous}</p>
          <ol>
            {ecrans.filter((e) => e.parcours === p).map((e) => (
              <li key={e.route}>
                <Link href={e.route}><span>{e.num}</span>{e.titre}</Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
