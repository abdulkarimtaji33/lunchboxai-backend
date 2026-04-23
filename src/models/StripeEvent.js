'use strict';

const pool = require('../config/database');

async function insertIfNew(stripeEventId) {
  try {
    const [result] = await pool.execute(
      'INSERT INTO stripe_processed_events (stripe_event_id) VALUES (?)',
      [stripeEventId]
    );
    return result.affectedRows > 0;
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return false;
    throw e;
  }
}

module.exports = { insertIfNew };
