import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../data/relationship-intel.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    keywords TEXT,
    last_sync INTEGER,
    contact_count INTEGER DEFAULT 0,
    interaction_count INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    first_seen INTEGER,
    last_seen INTEGER,
    notes TEXT,
    status TEXT,
    tags TEXT,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS contact_projects (
    contact_email TEXT,
    project_id TEXT,
    PRIMARY KEY (contact_email, project_id),
    FOREIGN KEY (contact_email) REFERENCES contacts(email),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    project_id TEXT,
    message_id TEXT,
    thread_id TEXT,
    event_id TEXT,
    from_email TEXT,
    from_name TEXT,
    subject TEXT,
    title TEXT,
    date INTEGER,
    snippet TEXT,
    body TEXT,
    account TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS interaction_participants (
    interaction_id INTEGER,
    email TEXT,
    name TEXT,
    role TEXT, -- 'to', 'cc', 'attendee'
    FOREIGN KEY (interaction_id) REFERENCES interactions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_contacts_last_seen ON contacts(last_seen DESC);
  CREATE INDEX IF NOT EXISTS idx_interactions_project ON interactions(project_id, date DESC);
  CREATE INDEX IF NOT EXISTS idx_interactions_date ON interactions(date DESC);
  CREATE INDEX IF NOT EXISTS idx_participants_email ON interaction_participants(email);
`);

console.log('✓ Database initialized:', dbPath);

export default db;
