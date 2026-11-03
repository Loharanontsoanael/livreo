import EcranDirect from "./EcranDirect";

export const metadata = {
  title: "Livreo · Direct",
};

/* L'écran Direct de l'app vendeuse : la caméra plein écran, les infos du
   live par-dessus, mises à jour en temps réel par le serveur. */
export default function Direct() {
  return <EcranDirect />;
}
