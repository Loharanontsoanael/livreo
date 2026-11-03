import { Suspense } from "react";
import ChoixPage from "./ChoixPage";

export const metadata = {
  title: "Livreo · Quelle Page pour ce soir ?",
};

export default function Page() {
  return (
    <main className="app-ecran art">
      <Suspense fallback={null}>
        <ChoixPage />
      </Suspense>
    </main>
  );
}
