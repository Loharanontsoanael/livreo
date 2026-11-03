import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { extraireEntrants, isoDepuis, signatureValide } from "../lib/serveur/graph.mjs";

const SECRET = "secret-de-test";
const signer = (corps) => `sha256=${createHmac("sha256", SECRET).update(corps).digest("hex")}`;

test("signature : acceptée si elle correspond au corps brut", () => {
  const corps = JSON.stringify({ entry: [] });
  assert.equal(signatureValide(corps, signer(corps), SECRET), true);
});

test("signature : refusée si le corps, le secret ou l'en-tête ne vont pas", () => {
  const corps = JSON.stringify({ entry: [] });
  assert.equal(signatureValide(`${corps} `, signer(corps), SECRET), false);
  assert.equal(signatureValide(corps, signer(corps), "autre-secret"), false);
  assert.equal(signatureValide(corps, undefined, SECRET), false);
  assert.equal(signatureValide(corps, "sha256=zz", SECRET), false);
  assert.equal(signatureValide(corps, signer(corps), ""), false);
});

test("webhook feed : un commentaire devient un entrant, ceux de la Page sont ignorés", () => {
  const charge = {
    object: "page",
    entry: [{
      id: "PAGE",
      changes: [
        { field: "feed", value: { item: "comment", verb: "add", comment_id: "C1", post_id: "PAGE_POST", message: "jp", created_time: 1793700000, from: { id: "U1", name: "Faniry" } } },
        { field: "feed", value: { item: "comment", verb: "add", comment_id: "C2", post_id: "PAGE_POST", message: "Merci !", created_time: 1793700001, from: { id: "PAGE", name: "Boutique" } } },
        { field: "feed", value: { item: "reaction", verb: "add", post_id: "PAGE_POST" } },
      ],
    }],
  };
  const entrants = extraireEntrants(charge);
  assert.equal(entrants.length, 1);
  assert.equal(entrants[0].id, "C1");
  assert.equal(entrants[0].donnees.auteur_nom, "Faniry");
  assert.equal(entrants[0].cree_le, new Date(1793700000 * 1000).toISOString());
});

test("webhook messaging : la capture est extraite, les échos ignorés", () => {
  const charge = {
    object: "page",
    entry: [{
      id: "PAGE",
      messaging: [
        { sender: { id: "PSID1" }, timestamp: 1793700000123, message: { mid: "M1", attachments: [{ type: "image", payload: { url: "https://exemple.test/capture.jpg" } }] } },
        { sender: { id: "PAGE" }, timestamp: 1793700000456, message: { mid: "M2", text: "écho", is_echo: true } },
      ],
    }],
  };
  const entrants = extraireEntrants(charge);
  assert.equal(entrants.length, 1);
  assert.equal(entrants[0].donnees.psid, "PSID1");
  assert.equal(entrants[0].donnees.image_url, "https://exemple.test/capture.jpg");
});

test("les trois formats d'heure de Meta deviennent de l'ISO", () => {
  const attendu = "2026-11-03T10:00:00.000Z";
  assert.equal(isoDepuis(Date.parse(attendu) / 1000), attendu);
  assert.equal(isoDepuis(Date.parse(attendu)), attendu);
  assert.equal(isoDepuis("2026-11-03T10:00:00+0000"), attendu);
});
