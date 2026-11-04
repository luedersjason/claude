-- One row per stored document, same shape the Claude artifact database exposed to the page.
CREATE TABLE IF NOT EXISTS docs (
  col TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  ver INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (col, id)
);
CREATE INDEX IF NOT EXISTS docs_col_updated ON docs (col, updated_at);
-- Team members who can open the site. role: admin | editor | viewer
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  invite_hash TEXT UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  hash TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
