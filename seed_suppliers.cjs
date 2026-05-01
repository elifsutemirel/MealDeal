const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT || 5432,
});

async function seedSuppliers() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Seeding Local Suppliers...');

    const suppliers = [
      { username: 'bilkent_hub', email: 'bilkent@mealdeal.com', name: 'Bilkent Hub', address: 'Bilkent, Ankara' },
      { username: 'tunali_fresh', email: 'tunali@mealdeal.com', name: 'Tunali Fresh', address: 'Tunali, Ankara' },
      { username: 'bahceli_market', email: 'bahceli@mealdeal.com', name: 'Bahcelievler Market', address: 'Bahcelievler, Ankara' }
    ];

    const passwordHash = await bcrypt.hash('password123', 10);
    const supplierUserIds = [];

    for (const sup of suppliers) {
      // Check if exists
      const existing = await client.query('SELECT user_id FROM "User" WHERE username = $1', [sup.username]);
      let userId;
      if (existing.rows.length === 0) {
        const res = await client.query(
          'INSERT INTO "User" (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id',
          [sup.username, sup.email, passwordHash]
        );
        userId = res.rows[0].user_id;
        await client.query(
          'INSERT INTO "LocalSupplier" (user_id, address, location_name) VALUES ($1, $2, $3)',
          [userId, sup.address, sup.name]
        );
        console.log(`Created supplier: ${sup.name}`);
      } else {
        userId = existing.rows[0].user_id;
        console.log(`Supplier ${sup.name} already exists.`);
      }
      supplierUserIds.push(userId);
    }

    console.log('Seeding Supplier Inventory...');
    const ingredients = await client.query('SELECT ingredient_id FROM "Ingredient"');
    
    // Clear existing inventory for these suppliers to avoid duplicates
    await client.query('DELETE FROM "SupplierInventory" WHERE supplier_id = ANY($1::int[])', [supplierUserIds]);

    for (const userId of supplierUserIds) {
      // Each supplier gets ~70% of the ingredients randomly
      for (const row of ingredients.rows) {
        if (Math.random() < 0.7) {
          const price = (Math.random() * 5 + 0.5).toFixed(2);
          const qty = Math.floor(Math.random() * 100) + 10;
          await client.query(
            'INSERT INTO "SupplierInventory" (supplier_id, ingredient_id, unit, price, package_size, available_qty) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, row.ingredient_id, 'unit', price, 1, qty]
          );
        }
      }
      console.log(`Assigned inventory to supplier ID: ${userId}`);
    }

    await client.query('COMMIT');
    console.log('Seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seedSuppliers();
