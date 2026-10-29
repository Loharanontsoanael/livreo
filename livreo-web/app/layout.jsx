import Script from "next/script";

export const metadata = {
  title: "Livreo — vos lives Facebook, encaissés",
  description:
    "Livreo transforme les commentaires « JP » de vos lives Facebook en commandes payées : réservation à la seconde, récap Messenger, paiement vérifié. Pour les vendeuses en live à Madagascar.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        {/* La lib couches et les styles Livreo sont servis tels quels depuis
            public/ : couches.css référence ses polices en chemins relatifs. */}
        <link rel="stylesheet" href="/css/couches.css" />
        <link rel="stylesheet" href="/css/livreo.css" />
      </head>
      <body>
        {children}
        <Script src="/js/couches.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
