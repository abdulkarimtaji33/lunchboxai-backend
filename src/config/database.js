'use strict';

const mysql = require('mysql2/promise');
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = require('./env');

const pool = mysql.createPool({
  host:             DB_HOST,
  port:             DB_PORT,
  user:             DB_USER,
  password:         DB_PASSWORD,
  database:         DB_NAME,
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
  timezone:         '+00:00',
});

async function testConnection() {
  const connection = await pool.getConnection();
  await connection.query('SELECT 1');
  connection.release();
  console.log('MySQL connection pool established.');
}

module.exports = { pool, testConnection };
