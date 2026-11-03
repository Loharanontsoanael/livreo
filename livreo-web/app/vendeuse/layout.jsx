import Plan from "./Plan";

export const metadata = {
  title: "Livreo · App vendeuse",
};

/* L'app vendeuse (maquettes du canevas, données factices).
   Les styles sont préfixés par .lv-app : le site et /essayer, /direct
   n'en voient rien. Sur ordinateur, le plan des écrans s'affiche à côté
   du téléphone ; sur téléphone, l'écran prend toute la place. */
export default function LayoutVendeuse({ children }) {
  return (
    <>
      <link rel="stylesheet" href="/css/vendeuse.css?v=1" />
      <div className="lv-app">
        <Plan />
        <div className="lv-ecran">{children}</div>
      </div>
    </>
  );
}
