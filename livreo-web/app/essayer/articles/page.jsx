import ListeArticles from "./ListeArticles";

export const metadata = {
  title: "Livreo · Les articles de ce soir",
};

export default function Articles() {
  return (
    <main className="app-ecran art">
      <ListeArticles />
    </main>
  );
}
