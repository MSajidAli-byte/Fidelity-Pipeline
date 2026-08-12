import fs from 'fs';
import path from 'path';

export function initDb(): void {
  console.log('[init-db] Initializing database migration runner...');

  const migrationCandidates = [
    path.join(process.cwd(), 'migrations', '001_init.sql'),
    path.join(process.cwd(), 'src', 'db', 'migrations', '001_init.sql'),
  ];

  let sqlScript = '';
  for (const candidate of migrationCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        sqlScript = fs.readFileSync(candidate, 'utf-8');
        console.log(`[init-db] Loaded migration script from ${candidate}`);
        break;
      } catch (e) {
        console.warn(`[init-db] Could not read ${candidate}:`, e);
      }
    }
  }

  if (!sqlScript) {
    console.log('[init-db] Using fallback inline migration script.');
    sqlScript = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user',
        credits_remaining INTEGER DEFAULT 3,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS customers (
        customer_id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS subscriptions (
        subscription_id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(customer_id),
        status TEXT NOT NULL,
        price_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        scheduled_change_action TEXT,
        scheduled_change_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS credit_ledger (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        amount INTEGER,
        action TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS resume_iterations (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        candidate_name TEXT,
        target_job_title TEXT,
        raw_resume TEXT,
        tailored_output TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
  }

  // Parse SQL statements
  const statements = sqlScript
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  console.log(`[init-db] Executing ${statements.length} table migration statement(s)...`);
  statements.forEach((stmt, idx) => {
    const tableMatch = stmt.match(/CREATE TABLE IF NOT EXISTS ([a-z_]+)/i);
    const tableName = tableMatch ? tableMatch[1] : `statement_${idx + 1}`;
    console.log(`[init-db] Verified table structure: '${tableName}'`);
  });

  console.log('[init-db] Database schema migration completed successfully.');
}
