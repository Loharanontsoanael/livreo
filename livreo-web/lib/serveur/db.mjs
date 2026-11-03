import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Toutes les heures sont stockées en ISO 8601 UTC : elles se trient comme du texte.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS entrants (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  donnees TEXT NOT NULL,
  cree_le TEXT NOT NULL,
  recu_le TEXT NOT NULL,
  traite_le TEXT,
  essais INTEGER NOT NULL DEFAULT 0,
  erreur TEXT
);
CREATE INDEX IF NOT EXISTS entrants_a_traiter ON entrants(traite_le, cree_le);

CREATE TABLE IF NOT EXISTS lives (
  id INTEGER PRIMARY KEY,
  objet_fb_id TEXT,
  demarre_le TEXT NOT NULL,
  termine_le TEXT
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY,
  live_id INTEGER NOT NULL REFERENCES lives(id),
  ref TEXT NOT NULL,
  nom TEXT NOT NULL,
  prix INTEGER NOT NULL,
  ouvert_le TEXT NOT NULL,
  ferme_le TEXT,
  UNIQUE (live_id, ref)
);

CREATE TABLE IF NOT EXISTS commentaires (
  fb_id TEXT PRIMARY KEY,
  live_id INTEGER REFERENCES lives(id),
  article_id INTEGER REFERENCES articles(id),
  auteur_id TEXT,
  auteur_nom TEXT,
  texte TEXT NOT NULL,
  cree_le TEXT NOT NULL,
  intention TEXT,
  taille TEXT,
  confiance REAL,
  source TEXT
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id),
  commentaire_id TEXT NOT NULL UNIQUE REFERENCES commentaires(fb_id),
  auteur_id TEXT,
  auteur_nom TEXT,
  psid TEXT,
  statut TEXT NOT NULL,
  contactee_le TEXT,
  delai_le TEXT,
  payee_le TEXT
);
-- Le garde-fou « aucun article attribué deux fois » : la base refuse une
-- deuxième gagnante active sur le même article, quoi que fasse le code.
CREATE UNIQUE INDEX IF NOT EXISTS une_gagnante_par_article
  ON reservations(article_id) WHERE statut IN ('contactee', 'a_confirmer', 'payee');
CREATE INDEX IF NOT EXISTS reservations_psid ON reservations(psid, statut);

CREATE TABLE IF NOT EXISTS doutes (
  id INTEGER PRIMARY KEY,
  commentaire_id TEXT NOT NULL UNIQUE REFERENCES commentaires(fb_id),
  statut TEXT NOT NULL DEFAULT 'ouvert',
  decide_le TEXT
);

CREATE TABLE IF NOT EXISTS paiements (
  id INTEGER PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id),
  message_id TEXT NOT NULL UNIQUE,
  image_url TEXT,
  montant INTEGER,
  reference TEXT,
  heure TEXT,
  ecart TEXT,
  statut TEXT NOT NULL DEFAULT 'a_confirmer',
  decide_le TEXT
);

CREATE TABLE IF NOT EXISTS envois (
  cle TEXT PRIMARY KEY,
  destinataire TEXT NOT NULL,
  texte TEXT NOT NULL,
  statut TEXT NOT NULL,
  reponse TEXT,
  essais INTEGER NOT NULL DEFAULT 1,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal (
  id INTEGER PRIMARY KEY,
  quand TEXT NOT NULL,
  type TEXT NOT NULL,
  details TEXT
);

-- Chaque vendeuse se connecte avec Facebook et choisit une de ses Pages.
CREATE TABLE IF NOT EXISTS vendeuses (
  id INTEGER PRIMARY KEY,
  fb_id TEXT NOT NULL UNIQUE,
  nom TEXT,
  cree_le TEXT NOT NULL
);

-- Le jeton de Page est chiffré (AES-256-GCM) : une copie de la base ne suffit
-- pas à écrire au nom des boutiques.
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  vendeuse_id INTEGER NOT NULL REFERENCES vendeuses(id),
  nom TEXT NOT NULL,
  categorie TEXT,
  photo TEXT,
  jeton TEXT NOT NULL,
  abonnee_le TEXT,
  maj_le TEXT NOT NULL
);

-- Réglages de chaque boutique (aussi pour la Page de secours, sans ligne dans pages).
CREATE TABLE IF NOT EXISTS reglages (
  page_id TEXT PRIMARY KEY,
  numero_paiement TEXT,
  maj_le TEXT NOT NULL
);

-- Seule l'empreinte SHA-256 de la clé de session est gardée.
CREATE TABLE IF NOT EXISTS sessions (
  cle TEXT PRIMARY KEY,
  vendeuse_id INTEGER NOT NULL REFERENCES vendeuses(id),
  page_id TEXT,
  cree_le TEXT NOT NULL,
  expire_le TEXT NOT NULL
);
`;

// Colonnes ajoutées après la première version : une base existante les reçoit
// au démarrage, sans perdre ses données.
const MIGRATIONS = [
  ["lives", "page_id", "TEXT NOT NULL DEFAULT ''"],
  ["entrants", "page_id", "TEXT NOT NULL DEFAULT ''"],
];

export function ouvrirBase(chemin) {
  if (chemin !== ":memory:") mkdirSync(dirname(chemin), { recursive: true });
  const db = new DatabaseSync(chemin);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");
  db.exec(SCHEMA);
  for (const [table, colonne, definition] of MIGRATIONS) {
    const existe = db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === colonne);
    if (!existe) db.exec(`ALTER TABLE ${table} ADD COLUMN ${colonne} ${definition}`);
  }
  db.exec("CREATE INDEX IF NOT EXISTS lives_par_page ON lives(page_id, termine_le)");
  return db;
}

export function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const resultat = fn();
    db.exec("COMMIT");
    return resultat;
  } catch (erreur) {
    db.exec("ROLLBACK");
    throw erreur;
  }
}
