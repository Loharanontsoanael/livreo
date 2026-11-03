"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ecrans from "./ecrans.json";

const PARCOURS = {
  B: "La première fois",
  C: "Chaque soir de live",
};

/* Le plan des écrans, à côté du téléphone (ordinateur seulement). */
export default function Plan() {
  const ici = usePathname();
  if (ici === "/vendeuse") return null;
  return (
    <nav className="lv-plan" aria-label="Écrans de l'app">
      <Link href="/vendeuse" className="lv-plan-titre">App vendeuse</Link>
      {Object.entries(PARCOURS).map(([p, nom]) => (
        <div key={p}>
          <p className="lv-plan-parcours">{nom}</p>
          <ol>
            {ecrans.filter((e) => e.parcours === p).map((e) => (
              <li key={e.route}>
                <Link href={e.route} aria-current={e.route === ici ? "page" : undefined}>
                  <span>{e.num}</span>
                  {e.titre}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </nav>
  );
}
