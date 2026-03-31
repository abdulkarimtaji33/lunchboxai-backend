'use strict';

/**
 * run-migration.js
 * ─────────────────────────────────────────────────────────────────────
 * Runs all pending SQL migration files against the configured database.
 *
 * Usage:
 *   node run-migration.js                  — run all pending migrations
 *   node run-migration.js --list           — list all migrations & status
 *   node run-migration.js --file <name>    — run a single migration by filename
 *   node run-migration.js --force          — re-run already-applied migrations
 *
 * How it works:
 *   1. Ensures a `migrations` tracking table exists in the DB.
 *   2. Reads all .sql files from src/config/migrations/ in alphabetical order.
 *   3. Skips files that are already recorded as applied (unless --force).
 *   4. Splits each file on semicolons and executes each statement individually
 *      so multi-statement files work correctly with mysql2.
 *   5. Records each successful migration in the tracking table.
 */

require('dotenv').config();

const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

const env = require('./src/config/env');

const MIGRATIONS_DIR = path.join(__dirname, 'src', 'config', 'migrations');

const args   = process.argv.slice(2);
const LIST   = args.includes('--list');
const FORCE  = args.includes('--force');
const FILE_IDX = args.indexOf('--file');
const ONLY_FILE = FILE_IDX !== -1 ? args[FILE_IDX + 1] : null;

async function ensureTrackingTable(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      filename   VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getApplied(conn) {
  const [rows] = await conn.execute('SELECT filename FROM _migrations');
  return new Set(rows.map(r => r.filename));
}

async function runFile(conn, filepath, filename) {
  const sql = fs.readFileSync(filepath, 'utf8');

  // Strip full-line SQL comments (-- ...) before splitting on semicolons
  const stripped = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = stripped
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    await conn.execute(stmt);
  }

  await conn.execute(
    'INSERT INTO _migrations (filename) VALUES (?) ON DUPLICATE KEY UPDATE applied_at = NOW()',
    [filename]
  );
}

async function main() {
  const conn = await mysql.createConnection({
    host:     env.db.host,
    port:     env.db.port,
    user:     env.db.user,
    password: env.db.password,
    database: env.db.database,
    multipleStatements: false, // we split manually for safety
  });

  try {
    await ensureTrackingTable(conn);
    const applied = await getApplied(conn);

    // Collect migration files
    let files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort(); // alphabetical = chronological when prefixed with date or name

    if (ONLY_FILE) {
      files = files.filter(f => f === ONLY_FILE || f === ONLY_FILE + '.sql');
      if (files.length === 0) {
        console.error(`No migration file found matching: ${ONLY_FILE}`);
        process.exit(1);
      }
    }

    if (LIST) {
      console.log('\nMigrations:\n');
      for (const f of files) {
        const status = applied.has(f) ? '✓ applied' : '○ pending';
        console.log(`  ${status}  ${f}`);
      }
      console.log();
      return;
    }

    let ran = 0;
    let skipped = 0;

    for (const filename of files) {
      if (applied.has(filename) && !FORCE) {
        console.log(`  skip  ${filename}`);
        skipped++;
        continue;
      }

      const filepath = path.join(MIGRATIONS_DIR, filename);
      process.stdout.write(`  run   ${filename} … `);
      try {
        await runFile(conn, filepath, filename);
        console.log('OK');
        ran++;
      } catch (err) {
        console.log('FAILED');
        console.error(`\nError in ${filename}:\n  ${err.message}\n`);
        process.exit(1);
      }
    }

    console.log(`\nDone. Ran: ${ran}  Skipped: ${skipped}\n`);

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('Migration runner error:', err.message);
  process.exit(1);
});
