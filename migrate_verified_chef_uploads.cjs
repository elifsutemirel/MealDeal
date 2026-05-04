const pkg = require('pg');

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'password',
  database: process.env.PGDATABASE || 'mealdeal',
  port: process.env.PGPORT || 5433,
});

async function main() {
  await pool.query(`
    ALTER TABLE "VerifiedChefApplication"
    ADD COLUMN IF NOT EXISTS cv_file_path VARCHAR(255),
    ADD COLUMN IF NOT EXISTS certificate_file_path VARCHAR(255);
  `);

  await pool.query(`
    ALTER TABLE "VerifiedChefApplication"
    DROP COLUMN IF EXISTS cv_url;
  `);

  console.log('VerifiedChefApplication upload columns ready.');
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
