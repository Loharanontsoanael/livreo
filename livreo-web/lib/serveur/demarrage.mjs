import { obtenirContexte } from "./contexte.mjs";
import { demarrerTravailleur } from "./travailleur.mjs";

export function demarrer() {
  demarrerTravailleur(obtenirContexte());
}
