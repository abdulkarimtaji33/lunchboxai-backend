'use strict';

/**
 * Dumps live DB DDL (tables + views) into schema.sql. Run from repo root:
 *   node lunchboxai-backend/scripts/dump-schema.js
 * or:
 *   cd lunchboxai-backend && node scripts/dump-schema.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const db = process.env.DB_NAME || 'lunchboxai';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: db,
  });

  const lines = [];
  lines.push(`-- Schema extracted from live database (${new Date().toISOString()})`);
  lines.push(`-- Database: \`${db}\``);
  lines.push('');
  lines.push('SET NAMES utf8mb4;');
  lines.push('SET FOREIGN_KEY_CHECKS = 0;');
  lines.push('');

  const [[ver]] = await conn.query('SELECT VERSION() AS v');
  lines.push(`-- Server: ${ver.v}`);
  lines.push('');

  const [tables] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [db]
  );

  for (const row of tables) {
    const name = row.TABLE_NAME;
    const [rows] = await conn.query(`SHOW CREATE TABLE \`${name}\``);
    const key = Object.keys(rows[0]).find((k) => /^create table$/i.test(k));
    lines.push(rows[0][key] + ';');
    lines.push('');
  }

  const [views] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'VIEW'
ORDER BY TABLE_NAME`,
    [db]
  );

  if (views.length) {
    lines.push('-- Views');
    lines.push('');
    for (const row of views) {
      const name = row.TABLE_NAME;
      const [rows] = await conn.query(`SHOW CREATE VIEW \`${name}\``);
      const key = Object.keys(rows[0]).find((k) => /^create view$/i.test(k));
      lines.push(rows[0][key] + ';');
      lines.push('');
    }
  }

  lines.push('SET FOREIGN_KEY_CHECKS = 1;');
  await conn.end();

  const out = path.join(__dirname, '..', 'schema.sql');
  fs.writeFileSync(out, lines.join('\n'), 'utf8');
  console.log('Wrote', out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
