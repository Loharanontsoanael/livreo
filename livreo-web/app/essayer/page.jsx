import Connexion from "./Connexion";

export const metadata = {
  title: "Livreo · Essayer sur mon live",
};

export default function Essayer() {
  return (
    <main className="app-ecran app-accueil">
      <p className="acc-marque">Livreo</p>
      <figure className="acc-visuel" aria-hidden="true">
        <img src="/img/vendeuse-hero-bleue.png" alt="" />
      </figure>
      <Connexion />
    </main>
  );
}
