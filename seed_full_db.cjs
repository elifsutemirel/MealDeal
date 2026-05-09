// seed_full_db.cjs
// Bu script veritabanına tüm tarif, malzeme ve tedarikçi verilerini ekler.
// Çalıştırmak için: node seed_full_db.cjs

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres_secure_2026',
  database: process.env.PGDATABASE || 'mealdeal_db',
});

// ============================================================
// DATA POOL
// ============================================================

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

const SUPPLIERS = [
  { username: 'bazaar_admin', email: 'bazaar@example.com', location_name: 'Ankara Central Bazaar', address: 'Bilkent/Ankara' },
  { username: 'fresh_market', email: 'fresh@example.com', location_name: 'Fresh Harvest Market', address: 'Cankaya/Ankara' }
];

const RECIPES = [
  {
    title: 'Organic Harvest Bowl',
    chef_username: 'chef_aybegum',
    chef_email: 'aybegum@mealdeal.com',
    dietary_tag: 'Vegan',
    cook_time_min: 20,
    difficulty_level: 'Easy',
    base_servings: 2,
    ingredients: [
      { name: 'Quinoa',       qty: 100, unit: 'g' },
      { name: 'Sweet Potato', qty: 1,   unit: 'pc' },
      { name: 'Roma Tomato',  qty: 2,   unit: 'pcs' },
      { name: 'Kale',         qty: 50,  unit: 'g' },
    ]
  },
  {
    title: 'Seared Atlantic Salmon',
    chef_username: 'chef_burkay',
    chef_email: 'burkay@mealdeal.com',
    dietary_tag: 'Keto',
    cook_time_min: 15,
    difficulty_level: 'Medium',
    base_servings: 2,
    ingredients: [
      { name: 'Salmon Fillet',    qty: 180, unit: 'g' },
      { name: 'Asparagus',       qty: 6,   unit: 'spears' },
      { name: 'Lemon',            qty: 0.5, unit: 'pc' },
      { name: 'Grass-fed Butter', qty: 15,  unit: 'g' },
    ]
  },
  {
    title: 'Creamy Mushroom Risotto',
    chef_username: 'chef_deniz',
    chef_email: 'deniz@mealdeal.com',
    dietary_tag: 'Vegetarian',
    cook_time_min: 35,
    difficulty_level: 'Medium',
    base_servings: 4,
    ingredients: [
      { name: 'Arborio Rice',    qty: 300, unit: 'g' },
      { name: 'Cremini Mushrooms', qty: 250, unit: 'g' },
      { name: 'Parmesan Cheese', qty: 80,  unit: 'g' },
      { name: 'Vegetable Broth', qty: 1,   unit: 'L' },
      { name: 'White Wine',      qty: 200, unit: 'ml' },
    ]
  }
];

// ============================================================
// SEEDING LOGIC
// ============================================================

async function seedAll() {
  const client = await pool.connect();
  console.log('Connected to database.');

  try {
    await client.query('BEGIN');

    // 1. Clear existing data
    console.log('\n[1/4] Clearing old data...');
    await client.query('TRUNCATE TABLE "Order", "CartItem", "Cart", "SupplierInventory", "Recipe_Ingredient", "Recipe", "VerifiedChef", "RecipeCreator", "HomeCook", "LocalSupplier", "Administrator", "User" RESTART IDENTITY CASCADE');

    // 2. Seed Ingredients
    console.log('\n[2/4] Seeding ingredients...');
    for (const ing of INGREDIENT_POOL) {
      await client.query(
        'INSERT INTO "Ingredient" (ingredient_id, name) VALUES ($1, $2)',
        [ing.id, ing.name]
      );
    }
    console.log(`  ✓ Seeded ${INGREDIENT_POOL.length} ingredients.`);

    // 3. Seed Suppliers
    console.log('\n[3/4] Seeding suppliers and inventory...');
    const passHash = await bcrypt.hash('password123', 10);
    for (const sup of SUPPLIERS) {
      const res = await client.query(
        'INSERT INTO "User" (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id',
        [sup.username, sup.email, passHash]
      );
      const userId = res.rows[0].user_id;
      await client.query(
        'INSERT INTO "LocalSupplier" (user_id, address, location_name) VALUES ($1, $2, $3)',
        [userId, sup.address, sup.location_name]
      );

      // Add random stock for all ingredients for this supplier
      for (const ing of INGREDIENT_POOL) {
        await client.query(
          'INSERT INTO "SupplierInventory" (supplier_id, ingredient_id, available_qty, unit, price) VALUES ($1, $2, $3, $4, $5)',
          [userId, ing.id, 500, 'g', (Math.random() * 5 + 1).toFixed(2)]
        );
      }
      console.log(`  ✓ Supplier "${sup.location_name}" created with full inventory.`);
    }

    // 4. Seed Recipes
    console.log('\n[4/4] Seeding recipes...');
    for (const recipe of RECIPES) {
      // Create chef
      const chefRes = await client.query(
        'INSERT INTO "User" (username, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET email=EXCLUDED.email RETURNING user_id',
        [recipe.chef_username, recipe.chef_email, passHash]
      );
      const chefId = chefRes.rows[0].user_id;
      await client.query('INSERT INTO "RecipeCreator" (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [chefId]);
      await client.query('INSERT INTO "VerifiedChef" (user_id, verification_date, status) VALUES ($1, NOW(), \'approved\') ON CONFLICT DO NOTHING', [chefId]);

      // Create recipe
      const recRes = await client.query(
        'INSERT INTO "Recipe" (creator_id, title, dietary_tag, cook_time_min, difficulty_level, base_servings, visibility) VALUES ($1, $2, $3, $4, $5, $6, \'public\') RETURNING recipe_id',
        [chefId, recipe.title, recipe.dietary_tag, recipe.cook_time_min, recipe.difficulty_level, recipe.base_servings]
      );
      const recipeId = recRes.rows[0].recipe_id;

      // Link ingredients
      for (const ing of recipe.ingredients) {
        const ingRes = await client.query('SELECT ingredient_id FROM "Ingredient" WHERE name = $1', [ing.name]);
        if (ingRes.rows.length > 0) {
          await client.query(
            'INSERT INTO "Recipe_Ingredient" (recipe_id, ingredient_id, qty, unit) VALUES ($1, $2, $3, $4)',
            [recipeId, ingRes.rows[0].ingredient_id, ing.qty, ing.unit]
          );
        }
      }
      console.log(`  ✓ Recipe "${recipe.title}" created.`);
    }

    await client.query('COMMIT');
    console.log('\n✅ SEEDING COMPLETE!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ SEEDING FAILED:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAll();
