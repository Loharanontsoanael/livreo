"use client";

import { useRouter } from "next/navigation";

/* Un vrai <button> qui mène à un autre écran : garde l'apparence des
   boutons des maquettes (un lien <a> perdrait les styles de bouton). */
export default function Aller({ vers, ...props }) {
  const router = useRouter();
  return <button type="button" {...props} onClick={() => router.push(vers)} />;
}
