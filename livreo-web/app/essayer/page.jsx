import Connexion from "./Connexion";

export const metadata = {
  title: "Livreo · Essayer sur mon live",
};

export default function Essayer() {
  return (
    <main className="app-ecran app-accueil">
      <p className="acc-marque">Livreo</p>
      <Connexion />
    </main>
  );
}
