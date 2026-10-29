# Livreo — règles de design de la landing

Référence pour l'équipe : comment la page gère ses couleurs, sa typographie
et ses interdits. La source des styles est `public/css/livreo.css`
(sa copie de travail : `../site/css/livreo.css`) ; la lib d'animations est
`public/css/couches.css` + `public/js/couches.js`, reprise du projet
agenda-toilettage et branchée sur nos jetons.

## La règle des trois actes

On ne change pas de couleur à chaque section (effet zèbre) : on groupe les
sections en **actes**, et la couleur ne change qu'entre deux actes.

1. **Acte jour (blanc)** — comprendre : le héros, le problème.
   Fond blanc pur ; la couleur vit dans les accents (bleu `#0866ff`) et les
   blocs internes (la carte dépliée de l'accordéon, la nappe de points).
2. **Acte nuit (bleu nuit `#0b1430`)** — vivre le live : la boucle sur le
   vif + les engagements, **fondus en une seule séquence sombre**. La photo
   fond dans la nuit (dégradé vers `--nuit` à droite et en bas), et la
   section suivante enchaîne sans couture. Une seule séquence nuit par page
   (héritée de la règle « une seule bande nuit » de la lib couches).
3. **Acte retour (blanc)** — agir : l'appel aux vendeuses pilotes, le pied.

Transitions : une photo peut fondre vers la nuit (masque ou dégradé) ; entre
deux actes sans photo, la coupe est franche, jamais de dégradé décoratif.

## Jetons de couleur

- Encre : `--encre #121a2e` (+ 500/400 pour les gris) ; nuit : `--nuit #0b1430`
- Accent : `--accent #0866ff`, `--accent-700 #0a4fc4` (boutons, repères, liens)
- Teintes claires : `--bleu-pale #eef3fe`, `--bleu-200 #d2e0fb`
- Rouge du direct : `--direct #c2183a` (badge EN DIRECT, urgences) ;
  sur fond nuit, sa déclinaison claire `#f0a9b8`
- Or du paiement : `--or / --or-encre` — réservé aux écrans produit sur fond
  clair. **Jamais de jaune sur l'acte nuit** (demande du 29/10) : sur la nuit,
  « payé » se dit en bleu clair `#9cc0ff`.
- Les jetons `--brand-*` existent uniquement pour alimenter couches.css.

## Typographie (quatre rôles stricts)

- **Hanken Grotesk** (`--titrage`, variable, en local) : le titrage — titres
  de scènes (700), fil des étapes et titres de cartes (600–650). Graisses
  disciplinées : jamais de 800 systématique (c'est le tic du design généré).
- **DM Sans** : le discours — chapos, corps, boutons, et les grands chiffres
  fins (graisse 200–300), qui restent la signature.
- **JetBrains Mono** : les données et repères — étiquettes de scène,
  horodatages `21:04:12`, libellés de stats. Jamais en capitales espacées.
- **Caveat** : interdit pour le moment (pas de manuscrit dans cette version).

Signature : les grands chiffres fins (graisse 200–300) pour stats et zéros.

## Interdits

- Tiret cadratin « — » dans les textes (tic d'IA) ; utiliser la virgule ou « · ».
- Cartes décoratives (fond + coins arrondis + ombre) hors écrans produit :
  tout bloc avec cadre + ombre porte la classe `c-produit`.
- Pilules décoratives, filets séparateurs gris, émojis, manuscrit, bloc-note.
- Alternance de fond section par section.

## Animations

- La lib couches (flux de « JP », titres mot à mot, pause) + CSS pur
  (`animation-timeline: view()`) pour les apparitions au défilement.
- Tout doit rester visible sans JavaScript et en « animations réduites ».
- Bouton « Mettre les animations en pause » obligatoire dans l'en-tête.

## Contrôle qualité

Depuis le dossier agenda-toilettage, site lancé (`npm run dev`, port 3005) :

```
NODE_PATH=.outils/node_modules node scripts/verifier_couches.js http://localhost:3005/
```

Attendu : tout passe sauf « couleurs : uniquement les jetons de la marque »
(le script compare à la palette lavande de l'agenda, pas à celle de Livreo).
