# Livreo : le backend

Le backend vit dans le même projet Next.js que les écrans (`app/api/…` pour les
routes, `lib/serveur/` pour la logique). Il fait tourner la boucle du MVP :
commentaire → réservation → récap Messenger → paiement confirmé → passage à la
suivante.

## Démarrer en local

```bash
cd livreo-web
cp .env.example .env.local      # tout peut rester vide au début
npm install
npm run dev                     # puis http://localhost:3000/api/sante
npm test                        # 28 tests, sans réseau
```

Sans secrets, Graph et Muse Spark passent en **simulation** : les messages aux
acheteuses sont enregistrés au lieu d'être envoyés, et le parseur de règles
remplace l'IA. `GET /api/sante` dit ce qui est réel et ce qui est simulé.

Pour répéter la démo sans vendeuse :
`curl -X POST localhost:3000/api/rejeu -H 'Content-Type: application/json' -d '{"vitesse":2}'`
rejoue le live de `lib/serveur/rejeu-demo.json` dans la vraie chaîne de traitement.

Pour répéter avec l'app : lancer le live depuis `/essayer`, montrer le premier
article sur `/direct`, puis
`curl -X POST localhost:3000/api/rejeu -H 'Content-Type: application/json' -d '{"vitesse":2,"garder_live":true}'` :
les commentaires de démo tombent dans ce live, et c'est l'écran Direct qui
passe les articles.

Vérification de bout en bout sur un serveur lancé :
`node ../outils/verifier-backend.mjs http://localhost:3000 <META_APP_SECRET> <META_VERIFY_TOKEN>`.

## Les routes

| Route | Pour qui | Rôle |
|---|---|---|
| `GET /api/meta/webhook` | Meta | Vérification de l'abonnement (`hub.verify_token`) |
| `POST /api/meta/webhook` | Meta | Commentaires de la Page et messages Messenger, signature vérifiée |
| `GET /api/live` | App vendeuse | État du live : article, gagnante, file, doutes, paiements |
| `POST /api/live` | App vendeuse | `{"action":"demarrer","objet_fb_id":"…"}` ou `{"action":"terminer"}` |
| `POST /api/live/article` | App vendeuse | Bouton « Article suivant » : `{"ref","nom","prix"}` |
| `GET /api/live/flux` | App vendeuse | Le même état en temps réel (Server-Sent Events) |
| `POST /api/doutes/:id` | App vendeuse | `{"decision":"oui"\|"non"}` quand l'IA hésite |
| `POST /api/paiements/:id` | App vendeuse | `{"decision":"confirmer"\|"refuser"}` |
| `POST /api/rejeu` | Démo | Rejoue un live (désactivé en production sauf `LIVREO_REJEU=1`) |
| `GET /api/sante` | Tous | Intégrations réelles ou simulées, sans aucun secret |

Les routes de l'app vendeuse demandent `Authorization: Bearer <LIVREO_CLE_VENDEUSE>`
(ou `?cle=` pour le flux, car `EventSource` n'envoie pas d'en-tête). C'est un
accès provisoire, à remplacer par la session issue de Facebook Login.

Brancher l'écran Direct :

```js
const flux = new EventSource(`/api/live/flux?cle=${cle}`);
flux.onmessage = (e) => afficher(JSON.parse(e.data)); // { article, gagnante, attente, doutes, paiements, compteurs }
```

## Comment on tient les trois engagements

- **Aucun commentaire perdu.** Le webhook enregistre en base avant toute
  réponse, puis traite en arrière-plan. Pendant le live, la tâche de fond relit
  aussi les commentaires par la Graph API toutes les 2 s, et une même livraison
  reçue deux fois reste un seul événement (clé = identifiant Meta).
- **Aucun article attribué deux fois.** Un index unique en base interdit une
  deuxième gagnante active sur le même article, et une acheteuse ne prend
  qu'une place par article.
- **Aucune commande payée sans preuve.** Muse Spark lit la capture et signale
  les écarts (montant, capture qui n'en est pas une), mais seule la décision de
  la vendeuse passe la commande en « payée ».

Après un redémarrage, les délais, les files et les envois sont en base : la
tâche de fond reprend là où elle s'était arrêtée, et un envoi déjà parti ne
repart jamais (clé d'idempotence par message).

## L'IA

`lib/serveur/muse.mjs` appelle `muse-spark-1.3` sur
`https://api.meta.ai/v1/chat/completions` avec une sortie JSON imposée par
schéma (mode strict), pour deux tâches :

1. comprendre un commentaire : `{intention, article_ref, taille, quantite, confiance}` ;
2. lire une capture de paiement : `{est_paiement, montant, reference, heure, confiance}`.

Sous `LIVREO_SEUIL_CONFIANCE` (0,7 par défaut), ou quand un « jp » est écrit
mais pas compris comme un achat, un **doute** part à la vendeuse au lieu d'une
réservation. Si l'API est en panne, `lib/serveur/regles.mjs` prend le relais.

Le mode « Contributor » (moins cher) est volontairement écarté : il autorise
Meta à entraîner ses modèles sur les commentaires des clientes.

## Configurer l'app Meta

`outils/configurer-meta.mjs` fait le travail fastidieux : il échange un jeton
utilisateur contre un jeton de Page qui n'expire pas, remplit `.env.local`,
abonne la Page aux webhooks et vérifie chaque permission.

1. **App Meta** (developers.facebook.com) : créer l'app (type Entreprise),
   ajouter les produits **Messenger** et **Webhooks**, puis recopier
   l'identifiant et la clé secrète dans `META_APP_ID` et `META_APP_SECRET`.
2. **Jeton** : dans l'explorateur Graph, choisir l'app, demander un jeton
   utilisateur avec `pages_show_list`, `pages_read_engagement`,
   `pages_read_user_content`, `pages_manage_metadata`, `pages_messaging`,
   le coller dans `META_USER_TOKEN`, puis :
   `node outils/configurer-meta.mjs jeton` et `node outils/configurer-meta.mjs abonner`.
3. **Webhook** : exposer le serveur en HTTPS (en local :
   `cloudflared tunnel --url http://localhost:3000`), puis dans l'app,
   Webhooks > Page : URL `https://<adresse>/api/meta/webhook`, jeton de
   vérification `META_VERIFY_TOKEN`, cocher **feed** et **messages**.
4. **Meta Model API** (dev.meta.ai) : créer une clé dans `MODEL_API_KEY`.
5. `node outils/configurer-meta.mjs verifier` doit finir sur « Tout est prêt ».

En mode développement, seules les personnes ayant un rôle dans l'app
(administratrice, testeuse) déclenchent les webhooks : les acheteuses de la
démo doivent être ajoutées comme testeuses.

Au démarrage d'un live, envoyer `objet_fb_id` (l'identifiant de la
publication du live) pour filtrer les commentaires et activer la relecture.

## Déploiement

Il faut un **serveur Node qui reste allumé** (Railway, Render, une VM) : la
tâche de fond tourne en continu (délais, relecture) et la base SQLite vit sur
disque. Monter un volume persistant sur `LIVREO_BASE`. Les fonctions
serverless (Vercel) ne conviennent pas à ce backend tel quel.

Node 22.13 ou plus est requis (`node:sqlite`, intégré à Node).

## Réglages à mesurer sur un vrai live

- `LIVREO_DECALAGE_S` : retard du direct vu par les spectatrices. Un JP est
  rattaché à l'article montré au moment (heure du commentaire − décalage).
  À mesurer pendant le live observé, puis à fixer.
- `LIVREO_DELAI_MIN` : délai de paiement (30 min par défaut).

## Limites connues

- Le relais vidéo « live filmé dans Livreo » (navigateur → Facebook en RTMPS)
  n'est pas construit : pour la démo, la vendeuse lance son live sur Facebook
  et Livreo écoute ses commentaires.
- Une acheteuse validée après un doute garde son heure de commentaire, mais ne
  remplace pas une gagnante déjà contactée.
- L'accès vendeuse par clé partagée est provisoire (voir plus haut).
