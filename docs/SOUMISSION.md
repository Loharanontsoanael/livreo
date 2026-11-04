# Livreo · hackathon submission

## Project name
Livreo

## Tagline (one line)
Turn Facebook Live comments into paid orders, while the seller is still live.

## Track
Startup Track

## Short description
In Madagascar, thousands of women sell clothes on Facebook Live. Buyers comment "jp" (j'prends, "I'll take it"), dozens within seconds, in French and Malagasy. After the live, sellers spend hours finding who was first, messaging each buyer and checking Mobile Money screenshots by hand. Livreo does it during the live: the first clear "jp" wins the item, the winner gets a private reply on Messenger with the price, the Mobile Money number and a deadline, Muse Spark reads her payment screenshot, and the seller confirms in one tap. If she doesn't pay in time, the item goes to the next buyer automatically.

## How we use Meta's AI and platform
- **Muse Spark (Meta Model API, muse-spark-1.3)**: understands ambiguous comments in French, Malagasy and slang (strict JSON output: intention, item, size, confidence) and reads Mobile Money payment screenshots (amount, reference). Low-confidence comments become a Yes/No question for the seller instead of a guess.
- **Graph API + Webhooks**: receives Page comments and Messenger messages (signature verified), answers the winning comment with a Private Reply.
- **Messenger Platform**: recaps, payment confirmations.
- **Facebook Login for Business**: each seller connects her own Page; tokens are encrypted at rest.

## What makes it reliable
- No comment lost: every webhook is stored before processing and counted once.
- No item sold twice: the database itself refuses a second winner for the same item.
- No order marked paid without proof: the AI reads, only the seller confirms.
- A plain "jp" is decided instantly by rules; Muse Spark reads ambiguous comments in parallel, decisions stay in comment order.

## Built with
Muse Spark (Meta Model API), Facebook Graph API, Webhooks, Messenger Platform, Facebook Login for Business, Next.js 14, Node.js (node:sqlite), Server-Sent Events.

## Status
Working MVP: full loop tested end to end with the real Model API and a real Facebook Page (39 automated tests). The Meta app is in development mode pending app review.

## What's next
Pilot with sellers in Antananarivo, Meta app review, delivery routes per neighbourhood, live video relay inside the app.

## Links
- Code: https://github.com/Loharanontsoanael/livreo (README explains setup)
- Demo video: https://youtu.be/Zc9yQ6dyk1M
