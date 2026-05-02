const pkg = require('pg');
const bcrypt = require('bcryptjs');

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'password',
  database: process.env.PGDATABASE || 'mealdeal',
  port: process.env.PGPORT || 5433,
});

async function main() {
  const username = 'mockadmin';
  const email = 'mockadmin@mealdeal.test';
  const password = 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(`
      INSERT INTO "User" (username, email, password_hash, join_date)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (email)
      DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash
      RETURNING user_id;
    `, [username, email, passwordHash]);

    const userId = userResult.rows[0].user_id;

    await client.query(`
      INSERT INTO "Administrator" (user_id, role_level, note)
      VALUES ($1, 'superadmin', 'Mock admin account for demo testing')
      ON CONFLICT (user_id)
      DO UPDATE SET role_level = 'superadmin', note = EXCLUDED.note;
    `, [userId]);

    await client.query('COMMIT');
    console.log('Mock admin ready:');
    console.log(`email: ${email}`);
    console.log(`password: ${password}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed mock admin:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
