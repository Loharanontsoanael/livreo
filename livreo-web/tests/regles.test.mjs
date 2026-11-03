import { test } from "node:test";
import assert from "node:assert/strict";
import { analyserParRegles } from "../lib/serveur/regles.mjs";

const cas = [
  ["jp", "achat", true],
  ["JP !!", "achat", true],
  ["izaho koa jp", "achat", true],
  ["j'prends", "achat", true],
  ["alaiko", "achat", true],
  ["jp ve ?", "achat", false],
  ["ohatrinona ?", "question", false],
  ["salama !", "autre", false],
  ["tsara be io", "autre", false],
  ["j'aime pas", "autre", false],
];

for (const [texte, intention, sur] of cas) {
  test(`« ${texte} » → ${intention}${sur ? " sûr" : ""}`, () => {
    const r = analyserParRegles(texte);
    assert.equal(r.intention, intention);
    assert.equal(r.confiance >= 0.7, sur || intention !== "achat");
  });
}

test("un « jp » suivi d'une question est un achat douteux", () => {
  const r = analyserParRegles("jp ve ?");
  assert.equal(r.jp, true);
  assert.ok(r.confiance < 0.7);
});

test("la taille et la référence sont reconnues", () => {
  const r = analyserParRegles("jp ilay mena M r13");
  assert.equal(r.taille, "M");
  assert.equal(r.article_ref, "R13");
});
