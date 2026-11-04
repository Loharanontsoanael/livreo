# Livreo : réponses du formulaire de soumission

Formulaire : https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit
Deadline : jeudi 5 novembre, 05:00 heure de Madagascar.

> À vérifier avant de soumettre : si un produit ou du code existait avant le
> 26 octobre (« JP Live » ?), ajouter au début de la description :
> « Before the hackathon, [ce qui existait]. Everything below was built during
> the event. » Sinon, garder le texte tel quel : Git montre que tout le code
> date du 29 octobre ou après.

---

## Team Name
```
Livreo
```

## Team Members
Ajouter les 4 membres avec le bouton +, Idealy compris.

## Which track are you submitting to?
Startups Track

## Which problem statement did you build towards?
Build for Your World

## X post link (Most Viral Track)
Laisser vide.

## Project Description
```
Livreo turns Facebook Live comments into paid orders, while the seller is still live.

In Madagascar, thousands of women sell clothes on Facebook Live. Buyers comment "jp" (j'prends, "I'll take it"), dozens within seconds, in French and Malagasy. After the live, sellers spend hours finding who commented first, messaging each buyer by hand and checking Mobile Money screenshots one by one. Every manual step loses sales.

Everything in this project was built during the hackathon (first commit Oct 29): the first clear "jp" wins the item and others queue in comment order; the winner gets a private reply on Messenger with the price, the shop's Mobile Money number and a deadline; Muse Spark reads her payment screenshot and flags mismatches; the seller confirms in one tap; unpaid items move to the next buyer automatically. Each seller connects her own Facebook Page. Details in the README under "Built during the hackathon".
```

## Public GitHub Repository
```
https://github.com/Loharanontsoanael/livreo
```

## 3-Minute Demo Video
```
https://youtu.be/Zc9yQ6dyk1M
```

## Describe your use of Meta products to build the submitted project
```
Muse Spark (muse-spark-1.3) through the Meta Model API, used for two tasks with strict JSON-schema outputs:
1. Comment understanding: reads ambiguous live comments in French, Malagasy and slang ("izaho koa jp", "jp ilay mena M", "jp ve ?") into {intention, item_ref, size, quantity, confidence}. Below a confidence threshold, the seller gets a Yes/No question instead of a guess. Clear "jp" are decided instantly by rules; ambiguous ones are read in parallel, and decisions stay in comment order so the first buyer always wins.
2. Multimodal payment check: reads Mobile Money screenshots into {is_payment, amount, reference}, compares the amount to the price and flags mismatches. Only the seller's tap marks an order as paid.
Meta platform: Graph API webhooks (feed and messages, signature verified), Private Replies to the winning comment, Messenger Platform, Facebook Login for Business so each seller connects her own Page (tokens encrypted at rest).
Architecture: Next.js 14 + Node server, SQLite with a unique index that refuses a second winner per item, idempotent sends, Server-Sent Events for the live screen, 39 automated tests. If the Model API is down, a rule-based parser takes over.
```

## Why are Meta's models important to your solution?
```
Live comments are short, noisy and multilingual: French, Malagasy, abbreviations, questions mixed with orders. Muse Spark understands them in context and tells us when it is unsure, which is exactly what a seller needs: speed on clear orders, a human decision on doubtful ones. The same model reads payment screenshots, so one Meta model covers both the text and the image side of the sale. Combined with Facebook Live, Messenger and the Graph API, the whole loop stays inside the tools sellers and buyers already use: nothing to install for the buyer.
```

## Partner technologies feedback
Laisser vide (ni Baseten, ni Modal, ni Fireworks).

## Questions de sondage
Répondre selon votre vrai ressenti.

## Consentement
Cocher la case en bas, puis **Submit**.

---

## Avant 05:00
- Chaque membre réclame **ses propres 150 $ de crédits Meta API**.
- Tester le lien GitHub et la vidéo en navigation privée.
