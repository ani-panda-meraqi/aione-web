-- AiOne contact messages — Cloudflare D1 (SQLite) schema
-- Run once:  npx wrangler d1 execute aione-contact --remote --file=./schema.sql
--
-- topic is validated as an enum in worker.js (general, product, sales, investment,
-- press, privacy_legal, security, fraud_abuse, complaint). No CHECK constraint here
-- so new topics (e.g. meraqi.ai "deployment") can be added without a migration.
-- This ONE table is shared by both sites: aionellc.com and meraqi.ai each bind the
-- same aione-contact database, and source_site records where the message came from.

CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT,                                      -- optional, as provided
  email       TEXT NOT NULL,                             -- normalized lowercase
  topic       TEXT NOT NULL,                             -- enum slug, see worker.js
  message     TEXT NOT NULL,                             -- capped at 5,000 chars
  source_site TEXT,                                      -- aionellc.com | meraqi.ai
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))    -- UTC ISO timestamp
);

CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_topic   ON messages (topic);
