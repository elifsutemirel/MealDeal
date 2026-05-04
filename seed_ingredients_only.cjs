// seed_ingredients_only.cjs
// Seeds only ingredients, no mock suppliers or recipes

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres_secure_2026',
  database: process.env.PGDATABASE || 'mealdeal_db',
});

const INGREDIENT_POOL = [
  { id: 1,  name: 'Quinoa' },
  { id: 2,  name: 'Sweet Potato' },
  { id: 3,  name: 'Roma Tomato' },
  { id: 4,  name: 'Kale' },
  { id: 5,  name: 'Salmon Fillet' },
  { id: 6,  name: 'Asparagus' },
  { id: 7,  name: 'Lemon' },
  { id: 8,  name: 'Grass-fed Butter' },
  { id: 9,  name: 'Arborio Rice' },
  { id: 10, name: 'Cremini Mushrooms' },
  { id: 11, name: 'Parmesan Cheese' },
  { id: 12, name: 'Vegetable Broth' },
  { id: 13, name: 'White Wine' },
  { id: 14, name: 'Chicken Breast' },
  { id: 15, name: 'Thai Green Curry Paste' },
  { id: 16, name: 'Coconut Milk' },
  { id: 17, name: 'Thai Basil' },
  { id: 18, name: 'Bell Pepper' },
  { id: 19, name: 'Fresh Pasta' },
  { id: 20, name: 'Guanciale' },
  { id: 21, name: 'Pecorino Romano' },
  { id: 22, name: 'Egg Yolks' },
  { id: 23, name: 'Black Truffle Oil' },
  { id: 24, name: 'Brown Rice' },
  { id: 25, name: 'Chickpeas' },
  { id: 26, name: 'Avocado' },
  { id: 27, name: 'Spirulina' },
  { id: 28, name: 'Goji Berries' },
  { id: 29, name: 'Sea Bass Fillet' },
  { id: 30, name: 'Butter' },
  { id: 31, name: 'Fresh Thyme' },
  { id: 32, name: 'Garlic' },
  { id: 33, name: 'Ramen Noodles' },
  { id: 34, name: 'Szechuan Peppercorns' },
  { id: 35, name: 'Chili Oil' },
  { id: 36, name: 'Sesame Oil' },
  { id: 37, name: 'Green Onion' },
];

async function seedIngredients() {
  const client = await pool.connect();
  console.log('✓ Connected to database');

  try {
    await client.query('BEGIN');
    console.log('\n[1/1] Seeding ingredients...');
    
    // Clear and reset sequences
    await client.query('TRUNCATE TABLE "SupplierInventory", "Recipe_Ingredient", "Ingredient" RESTART IDENTITY CASCADE');

    for (const ing of INGREDIENT_POOL) {
      await client.query(
        'INSERT INTO "Ingredient" (ingredient_id, name) VALUES ($1, $2) ON CONFLICT (ingredient_id) DO UPDATE SET name = EXCLUDED.name',
        [ing.id, ing.name]
      );
    }
    
    // Update sequence
    await client.query(`SELECT setval(pg_get_serial_sequence('"Ingredient"', 'ingredient_id'), (SELECT MAX(ingredient_id) FROM "Ingredient"))`);
    
    await client.query('COMMIT');
    console.log(`✓ Seeded ${INGREDIENT_POOL.length} ingredients successfully`);
    console.log('\nNote: No mock suppliers or recipes were added.');
    console.log('You can now create recipes and add inventory through the UI.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

seedIngredients();
