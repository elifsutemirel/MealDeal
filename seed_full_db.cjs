// seed_full_db.cjs
// Bu script veritabanına tüm tarif, malzeme ve tedarikçi verilerini ekler.
// Çalıştırmak için: docker exec mealdeal-app node /dev/stdin < seed_full_db.cjs
// Ya da: docker cp seed_full_db.cjs mealdeal-app:/app/seed_full_db.cjs && docker exec mealdeal-app node seed_full_db.cjs

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres_secure_2026',
  database: process.env.PGDATABASE || 'mealdeal_db',
});

// ============================================================
// CENTRAL INGREDIENT POOL
// These are all the ingredients used across all recipes.
// ============================================================
const INGREDIENT_POOL = [
  { id: 1,  name: 'Quinoa',                  taxonomy: 'Grains' },
  { id: 2,  name: 'Sweet Potato',             taxonomy: 'Root Veg' },
  { id: 3,  name: 'Roma Tomato',              taxonomy: 'Tomato' },
  { id: 4,  name: 'Kale',                     taxonomy: 'Leafy Greens' },
  { id: 5,  name: 'Salmon Fillet',            taxonomy: 'Fish' },
  { id: 6,  name: 'Asparagus',               taxonomy: 'Veg' },
  { id: 7,  name: 'Lemon',                    taxonomy: 'Citrus' },
  { id: 8,  name: 'Grass-fed Butter',         taxonomy: 'Dairy' },
  { id: 9,  name: 'Arborio Rice',             taxonomy: 'Grains' },
  { id: 10, name: 'Cremini Mushrooms',        taxonomy: 'Mushrooms' },
  { id: 11, name: 'Parmesan Cheese',          taxonomy: 'Cheese' },
  { id: 12, name: 'Vegetable Broth',          taxonomy: 'Broth' },
  { id: 13, name: 'White Wine',               taxonomy: 'Wine' },
  { id: 14, name: 'Chicken Breast',           taxonomy: 'Poultry' },
  { id: 15, name: 'Thai Green Curry Paste',   taxonomy: 'Spice' },
  { id: 16, name: 'Coconut Milk',             taxonomy: 'Dairy Alt' },
  { id: 17, name: 'Thai Basil',              taxonomy: 'Herbs' },
  { id: 18, name: 'Bell Pepper',              taxonomy: 'Veg' },
  { id: 19, name: 'Fresh Pasta',             taxonomy: 'Grains' },
  { id: 20, name: 'Guanciale',               taxonomy: 'Meat' },
  { id: 21, name: 'Pecorino Romano',          taxonomy: 'Cheese' },
  { id: 22, name: 'Egg Yolks',               taxonomy: 'Eggs' },
  { id: 23, name: 'Black Truffle Oil',        taxonomy: 'Oil' },
  { id: 24, name: 'Brown Rice',              taxonomy: 'Grains' },
  { id: 25, name: 'Chickpeas',               taxonomy: 'Legumes' },
  { id: 26, name: 'Avocado',                taxonomy: 'Fruit' },
  { id: 27, name: 'Spirulina',               taxonomy: 'Superfood' },
  { id: 28, name: 'Goji Berries',            taxonomy: 'Berries' },
  { id: 29, name: 'Sea Bass Fillet',         taxonomy: 'Fish' },
  { id: 30, name: 'Butter',                  taxonomy: 'Dairy' },
  { id: 31, name: 'Fresh Thyme',             taxonomy: 'Herbs' },
  { id: 32, name: 'Garlic',                  taxonomy: 'Veg' },
  { id: 33, name: 'Ramen Noodles',           taxonomy: 'Grains' },
  { id: 34, name: 'Szechuan Peppercorns',    taxonomy: 'Spice' },
  { id: 35, name: 'Chili Oil',               taxonomy: 'Oil' },
  { id: 36, name: 'Sesame Oil',              taxonomy: 'Oil' },
  { id: 37, name: 'Green Onion',             taxonomy: 'Veg' },
];

// ============================================================
// RECIPES + their ingredient links
// ============================================================
const RECIPES = [];

// ============================================================
// SUPPLIERS
// ============================================================
const SUPPLIERS = [];

// PLACEHOLDER - removed to avoid compilation error
const REMOVED_RECIPES = [
  {
    title: 'Organic Harvest Bowl',
    chef_username: 'chef_aybegum',
    chef_email: 'aybegum@mealdeal.com',
    dietary_tag: 'Vegan',
    cook_time_min: 20,
    difficulty_level: 'Easy',
    base_servings: 2,
    ingredients: [
      { name: 'Quinoa',       qty: 100, unit: 'g',   pricePerUnit: 0.02 },
      { name: 'Sweet Potato', qty: 1,   unit: 'pc',  pricePerUnit: 1.50 },
      { name: 'Roma Tomato',  qty: 2,   unit: 'pcs', pricePerUnit: 0.75 },
      { name: 'Kale',         qty: 50,  unit: 'g',   pricePerUnit: 0.03 },
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
      { name: 'Salmon Fillet',    qty: 180, unit: 'g',      pricePerUnit: 0.05 },
      { name: 'Asparagus',       qty: 6,   unit: 'spears', pricePerUnit: 0.50 },
      { name: 'Lemon',            qty: 0.5, unit: 'pc',     pricePerUnit: 1.00 },
      { name: 'Grass-fed Butter', qty: 15,  unit: 'g',      pricePerUnit: 0.04 },
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
      { name: 'Arborio Rice',    qty: 300, unit: 'g',  pricePerUnit: 0.01 },
      { name: 'Cremini Mushrooms', qty: 250, unit: 'g', pricePerUnit: 0.04 },
      { name: 'Parmesan Cheese', qty: 80,  unit: 'g',  pricePerUnit: 0.10 },
      { name: 'Vegetable Broth', qty: 1,   unit: 'L',  pricePerUnit: 1.20 },
      { name: 'White Wine',      qty: 200, unit: 'ml', pricePerUnit: 0.15 },
    ]
  },
  {
    title: 'Thai Green Curry with Chicken',
    chef_username: 'chef_niran',
    chef_email: 'niran@mealdeal.com',
    dietary_tag: 'Gluten-Free',
    cook_time_min: 25,
    difficulty_level: 'Medium',
    base_servings: 3,
    ingredients: [
      { name: 'Chicken Breast',         qty: 400, unit: 'g',    pricePerUnit: 0.025 },
      { name: 'Thai Green Curry Paste',  qty: 3,   unit: 'tbsp', pricePerUnit: 0.50 },
      { name: 'Coconut Milk',            qty: 400, unit: 'ml',   pricePerUnit: 0.08 },
      { name: 'Thai Basil',             qty: 30,  unit: 'g',    pricePerUnit: 0.20 },
      { name: 'Bell Pepper',             qty: 1,   unit: 'pc',   pricePerUnit: 1.00 },
    ]
  },
  {
    title: 'Truffle Pasta Carbonara',
    chef_username: 'chef_marco',
    chef_email: 'marco@mealdeal.com',
    dietary_tag: 'Gluten-Free',
    cook_time_min: 20,
    difficulty_level: 'Hard',
    base_servings: 2,
    ingredients: [
      { name: 'Fresh Pasta',      qty: 400, unit: 'g',    pricePerUnit: 0.15 },
      { name: 'Guanciale',        qty: 150, unit: 'g',    pricePerUnit: 0.30 },
      { name: 'Pecorino Romano',  qty: 100, unit: 'g',    pricePerUnit: 0.12 },
      { name: 'Egg Yolks',        qty: 4,   unit: 'pcs',  pricePerUnit: 0.15 },
      { name: 'Black Truffle Oil', qty: 2,  unit: 'tbsp', pricePerUnit: 0.80 },
    ]
  },
  {
    title: 'Buddha Power Bowl',
    chef_username: 'chef_zeynep',
    chef_email: 'zeynep@mealdeal.com',
    dietary_tag: 'Vegan',
    cook_time_min: 25,
    difficulty_level: 'Easy',
    base_servings: 2,
    ingredients: [
      { name: 'Brown Rice',   qty: 150, unit: 'g',    pricePerUnit: 0.01 },
      { name: 'Chickpeas',    qty: 200, unit: 'g',    pricePerUnit: 0.02 },
      { name: 'Avocado',      qty: 1,   unit: 'pc',   pricePerUnit: 2.00 },
      { name: 'Spirulina',    qty: 1,   unit: 'tbsp', pricePerUnit: 0.30 },
      { name: 'Goji Berries', qty: 30,  unit: 'g',    pricePerUnit: 0.50 },
    ]
  },
  {
    title: 'Pan-Seared Sea Bass with Lemon Butter',
    chef_username: 'chef_onur',
    chef_email: 'onur@mealdeal.com',
    dietary_tag: 'Keto',
    cook_time_min: 18,
    difficulty_level: 'Medium',
    base_servings: 2,
    ingredients: [
      { name: 'Sea Bass Fillet', qty: 200, unit: 'g',      pricePerUnit: 0.08 },
      { name: 'Lemon',           qty: 1,   unit: 'pc',     pricePerUnit: 0.50 },
      { name: 'Butter',          qty: 50,  unit: 'g',      pricePerUnit: 0.02 },
      { name: 'Fresh Thyme',     qty: 10,  unit: 'g',      pricePerUnit: 0.30 },
      { name: 'Garlic',          qty: 2,   unit: 'cloves', pricePerUnit: 0.05 },
    ]
  },
  {
    title: 'Spicy Szechuan Noodles',
    chef_username: 'chef_lin',
    chef_email: 'lin@mealdeal.com',
    dietary_tag: 'Vegan',
    cook_time_min: 22,
    difficulty_level: 'Medium',
    base_servings: 2,
    ingredients: [
      { name: 'Ramen Noodles',       qty: 300, unit: 'g',    pricePerUnit: 0.02 },
      { name: 'Szechuan Peppercorns', qty: 1,  unit: 'tbsp', pricePerUnit: 0.40 },
      { name: 'Chili Oil',            qty: 3,  unit: 'tbsp', pricePerUnit: 0.15 },
      { name: 'Sesame Oil',           qty: 2,  unit: 'tbsp', pricePerUnit: 0.12 },
      { name: 'Green Onion',          qty: 50, unit: 'g',    pricePerUnit: 0.08 },
    ]
  },
];



async function seedAll() {
  const client = await pool.connect();
  console.log('Connected to database.');

  try {
    await client.query('BEGIN');

    // 1. Seed Ingredients (using OVERRIDING SYSTEM VALUE to set IDs)
    console.log('\n[1/5] Seeding ingredients...');
    // Reset the sequence
    await client.query('TRUNCATE TABLE "SupplierInventory", "Recipe_Ingredient", "Ingredient" RESTART IDENTITY CASCADE');

    for (const ing of INGREDIENT_POOL) {
      await client.query(
        `INSERT INTO "Ingredient" (ingredient_id, name) VALUES ($1, $2) ON CONFLICT (ingredient_id) DO UPDATE SET name = EXCLUDED.name`,
        [ing.id, ing.name]
      );
    }
    // Update the sequence to not conflict
    await client.query(`SELECT setval(pg_get_serial_sequence('"Ingredient"', 'ingredient_id'), (SELECT MAX(ingredient_id) FROM "Ingredient"))`);
    console.log(`  ✓ Seeded ${INGREDIENT_POOL.length} ingredients.`);

    // Done - skipping suppliers and recipes
    await client.query('COMMIT');
    console.log('\n[2/2] ✅ Ingredients seeded successfully!');
    console.log('\nNote: No mock suppliers or recipes were added.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAll();
      // Check if user exists
      const existing = await client.query('SELECT user_id FROM "User" WHERE username = $1', [sup.username]);
      let userId;
      if (existing.rows.length > 0) {
        userId = existing.rows[0].user_id;
        // Update existing user's password to ensure it matches sup.password
        await client.query('UPDATE "User" SET password_hash = $1, email = $2 WHERE user_id = $3', [hash, sup.email, userId]);
        console.log(`  ✓ Updated existing supplier "${sup.username}" (id=${userId}) with new password.`);
      } else {
        const userRes = await client.query(
          'INSERT INTO "User" (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id',
          [sup.username, sup.email, hash]
        );
        userId = userRes.rows[0].user_id;
        await client.query(
          'INSERT INTO "LocalSupplier" (user_id, address, location_name) VALUES ($1, $2, $3)',
          [userId, sup.address, sup.location_name]
        );
        console.log(`  ✓ Created supplier "${sup.username}" (id=${userId}).`);
      }
      supplierIds.push({ ...sup, userId });
    }

    // 3. Seed SupplierInventory
    console.log('\n[3/5] Seeding supplier inventory...');
    for (const sup of supplierIds) {
      for (const ingId of sup.carries) {
        const ingredient = INGREDIENT_POOL.find(i => i.id === ingId);
        if (!ingredient) continue;
        const price = (Math.random() * 3 + 0.5).toFixed(2);
        const qty = Math.floor(Math.random() * 200 + 50);
        // Delete existing entry for this supplier+ingredient first, then insert fresh
        await client.query(
          `DELETE FROM "SupplierInventory" WHERE supplier_id = $1 AND ingredient_id = $2`,
          [sup.userId, ingId]
        );
        await client.query(
          `INSERT INTO "SupplierInventory" (supplier_id, ingredient_id, unit, price, available_qty, package_size)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [sup.userId, ingId, 'unit', price, qty, 1]
        );
      }
      console.log(`  ✓ ${sup.location_name}: ${sup.carries.length} items stocked.`);
    }

    // 4. Seed Chefs and Recipes
    console.log('\n[4/5] Seeding chefs and recipes...');
    for (const recipe of RECIPES) {
      // Check/create chef user
      const existing = await client.query('SELECT user_id FROM "User" WHERE username = $1', [recipe.chef_username]);
      let chefId;
      if (existing.rows.length > 0) {
        chefId = existing.rows[0].user_id;
      } else {
        const hash = await bcrypt.hash('chef_pass123', 10);
        const userRes = await client.query(
          'INSERT INTO "User" (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id',
          [recipe.chef_username, recipe.chef_email, hash]
        );
        chefId = userRes.rows[0].user_id;
        await client.query('INSERT INTO "RecipeCreator" (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [chefId]);
        await client.query(
          'INSERT INTO "VerifiedChef" (user_id, verification_date) VALUES ($1, NOW()) ON CONFLICT DO NOTHING',
          [chefId]
        );
      }

      // Check/create recipe
      const existingRecipe = await client.query('SELECT recipe_id FROM "Recipe" WHERE title = $1', [recipe.title]);
      let recipeId;
      if (existingRecipe.rows.length > 0) {
        recipeId = existingRecipe.rows[0].recipe_id;
        console.log(`  ~ Recipe "${recipe.title}" already exists.`);
      } else {
        const recipeRes = await client.query(
          `INSERT INTO "Recipe" (creator_id, title, dietary_tag, cook_time_min, difficulty_level, base_servings, visibility)
           VALUES ($1, $2, $3, $4, $5, $6, 'public') RETURNING recipe_id`,
          [chefId, recipe.title, recipe.dietary_tag, recipe.cook_time_min, recipe.difficulty_level, recipe.base_servings]
        );
        recipeId = recipeRes.rows[0].recipe_id;
        console.log(`  ✓ Created recipe "${recipe.title}" (id=${recipeId}).`);
      }

      // Link ingredients to recipe
      for (const ing of recipe.ingredients) {
        const ingRow = await client.query('SELECT ingredient_id FROM "Ingredient" WHERE name = $1', [ing.name]);
        if (ingRow.rows.length === 0) {
          console.warn(`  ! Ingredient "${ing.name}" not found in pool!`);
          continue;
        }
        const ingredientId = ingRow.rows[0].ingredient_id;
        await client.query(
          `INSERT INTO "Recipe_Ingredient" (recipe_id, ingredient_id, qty, unit)
           VALUES ($1, $2, $3, $4) ON CONFLICT (recipe_id, ingredient_id) DO UPDATE SET qty = EXCLUDED.qty, unit = EXCLUDED.unit`,
          [recipeId, ingredientId, ing.qty, ing.unit]
        );
      }
    }

    // 5. Done
    await client.query('COMMIT');
    console.log('\n[5/5] ✅ All data seeded successfully!');
    console.log('\nSupplier Login Credentials:');
    for (const sup of SUPPLIERS) {
      console.log(`  ${sup.location_name}: username="${sup.username}" | password="password123"`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAll();
