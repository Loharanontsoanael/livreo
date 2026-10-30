// Capture une section du site local en vue ordinateur et téléphone.
// Usage : node outils/capturer-section.mjs ".demarrer" demarrer
// Produit : maquettes/captures/<nom>-ordinateur.png et <nom>-telephone.png
import { createRequire } from "module";
import { fileURLToPath } from "url";
const require = createRequire("/Users/loharanontsoasinael/Documents/Projet_Perso/agenda-toilettage/.outils/package.json");
const { chromium } = require("playwright");

const [selecteur, nom] = process.argv.slice(2);
if (!selecteur || !nom) {
  console.error("usage : node outils/capturer-section.mjs <selecteur> <nom>");
  process.exit(1);
}

const sortie = fileURLToPath(new URL("../maquettes/captures/", import.meta.url));
const vues = [
  { suffixe: "ordinateur", width: 1280, height: 800, deviceScaleFactor: 1.5 },
  { suffixe: "telephone", width: 390, height: 844, deviceScaleFactor: 2 },
];

const navigateur = await chromium.launch({ channel: "chrome" });
for (const vue of vues) {
  const contexte = await navigateur.newContext({
    viewport: { width: vue.width, height: vue.height },
    deviceScaleFactor: vue.deviceScaleFactor,
  });
  const page = await contexte.newPage();
  await page.goto(process.env.LIVREO_URL || "http://localhost:3000/", { waitUntil: "networkidle", timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  // Défilement pour charger les images différées.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await page.locator(selecteur).scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await page.locator(selecteur).screenshot({ path: `${sortie}${nom}-${vue.suffixe}.png` });
  console.log(`capture : ${nom}-${vue.suffixe}.png`);
  await contexte.close();
}
await navigateur.close();
