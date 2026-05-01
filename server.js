import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Simple logging middleware
app.use((req, res, next) => {
    console.log(`REQ: ${req.method} ${req.url}`);
    next();
});

// Serve static files from dist directory (built frontend)
app.use(express.static('dist'));

app.get('/api/debug', (req, res) => res.json({ message: 'API is reachable!', routes: ['/api/auth/register', '/api/auth/login', '/api/supplier/inventory'] }));

// PostgreSQL connection pool
const pool = new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: process.env.PGPORT || 5432,
});

// Authentication Endpoints

// REGISTER
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, role, address, location_name } = req.body;
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // 1. Check for duplicate email or username
        const existing = await client.query('SELECT username, email FROM "User" WHERE email = $1 OR username = $2', [email, username]);
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            const isEmailDup = existing.rows.some(r => r.email === email);
            return res.status(400).json({
                message: isEmailDup ? 'Email already exists.' : 'Username already exists.'
            });
        }

        // 2. Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // 3. Insert base User record
        const userResult = await client.query(
            'INSERT INTO "User" (username, email, password_hash, join_date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING user_id',
            [username, email, passwordHash]
        );
        const userId = userResult.rows[0].user_id;

        // 4. Role-specific subtype insertion
        if (role === 'Home Cook') {
            await client.query('INSERT INTO "RecipeCreator" (user_id) VALUES ($1)', [userId]);
            await client.query('INSERT INTO "HomeCook" (user_id) VALUES ($1)', [userId]);
        } else if (role === 'Verified Chef') {
            await client.query('INSERT INTO "RecipeCreator" (user_id) VALUES ($1)', [userId]);
            await client.query('INSERT INTO "VerifiedChef" (user_id, verification_date, status) VALUES ($1, CURRENT_DATE, \'pending\')', [userId]);
        } else if (role === 'Local Supplier') {
            await client.query('INSERT INTO "LocalSupplier" (user_id, address, location_name) VALUES ($1, $2, $3)', [userId, address || '', location_name || '']);
        } else if (role === 'Administrator') {
            await client.query('INSERT INTO "Administrator" (user_id, role_level) VALUES ($1, $2)', [userId, 'standard']);
        }

        await client.query('COMMIT');
        res.status(201).json({ user_id: userId, username, email, role });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("REGISTRATION ERROR:", error);
        console.error("REQUEST BODY:", req.body);
        res.status(500).json({ message: 'Internal server error.', detail: error.message });
    } finally {
        if (client) client.release();
    }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const query = `
      SELECT u.user_id, u.username, u.email, u.password_hash,
      CASE
        WHEN a.user_id  IS NOT NULL THEN 'Administrator'
        WHEN vc.user_id IS NOT NULL THEN 'Verified Chef'
        WHEN hc.user_id IS NOT NULL THEN 'Home Cook'
        WHEN ls.user_id IS NOT NULL THEN 'Local Supplier'
        ELSE 'User'
      END AS role
      FROM "User" u
      LEFT JOIN "Administrator"  a  ON a.user_id  = u.user_id
      LEFT JOIN "VerifiedChef"   vc ON vc.user_id = u.user_id
      LEFT JOIN "HomeCook"       hc ON hc.user_id = u.user_id
      LEFT JOIN "LocalSupplier"  ls ON ls.user_id = u.user_id
      WHERE u.email = $1
      LIMIT 1;
    `;

        const result = await pool.query(query, [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        res.json({ user_id: user.user_id, username: user.username, email: user.email, role: user.role });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// --- RECIPE ENDPOINTS ---

// GET All Public Recipes
app.get('/api/recipes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.recipe_id as id, r.title, r.media_url as image, r.dietary_tag as category,
                   r.cook_time_min as time, r.difficulty_level as difficulty, r.preparation_steps as steps,
                   u.username as chef
            FROM "Recipe" r
            JOIN "User" u ON r.creator_id = u.user_id
            WHERE r.visibility = 'public'
            ORDER BY r.creation_time DESC
        `);

        const recipes = result.rows;

        for (let recipe of recipes) {
            const ingResult = await pool.query(`
                SELECT ri.qty as "baseQty", ri.unit, i.ingredient_id as id, i.name
                FROM "Recipe_Ingredient" ri
                JOIN "Ingredient" i ON ri.ingredient_id = i.ingredient_id
                WHERE ri.recipe_id = $1
            `, [recipe.id]);

            recipe.ingredients = ingResult.rows.map(ing => ({
                id: ing.id,
                name: ing.name,
                baseQty: Number(ing.baseQty),
                unit: ing.unit,
                pricePerUnit: 1.99,
                taxonomy: 'Produce'
            }));

            if (recipe.steps) {
                recipe.steps = recipe.steps.split('\n').filter(s => s.trim().length > 0);
            } else {
                recipe.steps = [];
            }

            recipe.rating = 5.0;
            recipe.reviews = [];

            if (!recipe.category) recipe.category = 'Standard';
            if (!recipe.image) recipe.image = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&q=80&w=800';
        }

        res.json(recipes);
    } catch (error) {
        console.error("Error fetching recipes:", error);
        res.status(500).json({ message: 'Error fetching recipes.' });
    }
});

// CREATE Recipe
app.post('/api/recipes', async (req, res) => {
    const { creator_id, title, description, preparation_steps, media_url, cook_time_min, difficulty_level, dietary_tag, base_servings, ingredients } = req.body;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Insert Recipe
        const recipeResult = await client.query(`
            INSERT INTO "Recipe" (creator_id, title, description, preparation_steps, media_url, cook_time_min, difficulty_level, dietary_tag, base_servings)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING recipe_id;
        `, [
            creator_id,
            title,
            description || null,
            preparation_steps || null,
            media_url || null,
            cook_time_min,
            difficulty_level,
            dietary_tag || null,
            base_servings || 1
        ]);

        const recipeId = recipeResult.rows[0].recipe_id;

        // Insert Ingredients
        if (ingredients && ingredients.length > 0) {
            for (const ing of ingredients) {
                let actualIngredientId = ing.ingredient_id;

                // Ensure ingredient exists in local DB
                const existingCheck = await client.query('SELECT ingredient_id FROM "Ingredient" WHERE name = $1', [ing.name]);
                if (existingCheck.rows.length > 0) {
                    actualIngredientId = existingCheck.rows[0].ingredient_id;
                } else {
                    // Insert the external ingredient
                    const newIng = await client.query('INSERT INTO "Ingredient" (name) VALUES ($1) RETURNING ingredient_id', [ing.name]);
                    actualIngredientId = newIng.rows[0].ingredient_id;
                }

                await client.query(`
                    INSERT INTO "Recipe_Ingredient" (recipe_id, ingredient_id, qty, unit)
                    VALUES ($1, $2, $3, $4);
                `, [recipeId, actualIngredientId, ing.qty, ing.unit]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ recipe_id: recipeId, message: 'Recipe created successfully.' });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('RECIPE CREATION ERROR:', error);
        res.status(500).json({ message: 'Error creating recipe.', detail: error.message });
    } finally {
        if (client) client.release();
    }
});

// UPDATE PROFILE (username, email)
app.put('/api/auth/profile', async (req, res) => {
    const { user_id, username, email } = req.body;
    if (!user_id || !username || !email) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        // Check if another user has this username or email
        const existing = await pool.query(
            'SELECT user_id, username, email FROM "User" WHERE (email = $1 OR username = $2) AND user_id != $3',
            [email, username, user_id]
        );

        if (existing.rows.length > 0) {
            const isEmailDup = existing.rows.some(r => r.email === email);
            return res.status(400).json({
                message: isEmailDup ? 'Email already exists.' : 'Username already exists.'
            });
        }

        const result = await pool.query(
            'UPDATE "User" SET username = $1, email = $2 WHERE user_id = $3 RETURNING user_id, username, email',
            [username, email, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("PROFILE UPDATE ERROR:", error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// CHANGE PASSWORD
app.put('/api/auth/password', async (req, res) => {
    const { user_id, current_password, new_password } = req.body;
    if (!user_id || !current_password || !new_password) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const userRes = await pool.query('SELECT password_hash FROM "User" WHERE user_id = $1', [user_id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(current_password, userRes.rows[0].password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password.' });
        }

        const newHash = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE "User" SET password_hash = $1 WHERE user_id = $2', [newHash, user_id]);

        res.json({ message: 'Password updated successfully.' });
    } catch (error) {
        console.error("PASSWORD CHANGE ERROR:", error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// --- CHEF ROYALTY ENDPOINTS ---

// GET Chef Royalty Matrix
app.get('/api/chef/royalties', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ message: 'userId required' });

    try {
        const query = `
            SELECT 
                r.recipe_id,
                r.title,
                COUNT(DISTINCT c.comment_id) FILTER (WHERE c.cooked_at IS NOT NULL) AS cook_count,
                COALESCE(SUM(ci.qty * ci.unit_price), 0) AS ingredient_revenue,
                (COUNT(DISTINCT c.comment_id) FILTER (WHERE c.cooked_at IS NOT NULL) * 1.00) + 
                (COALESCE(SUM(ci.qty * ci.unit_price), 0) * 0.10) AS total_royalty,
                COALESCE(AVG(c.rating), 0) as avg_rating,
                -- Score Formula: (Cooks * 10) + (Avg Rating * 5) + (Revenue * 0.05)
                (COUNT(DISTINCT c.comment_id) FILTER (WHERE c.cooked_at IS NOT NULL) * 10) + 
                (COALESCE(AVG(c.rating), 0) * 5) +
                (COALESCE(SUM(ci.qty * ci.unit_price), 0) * 0.05) as royalty_score
            FROM "Recipe" r
            LEFT JOIN "Comment" c ON c.recipe_id = r.recipe_id
            LEFT JOIN "Cart" cr ON cr.recipe_id = r.recipe_id AND cr.status = 'checked_out'
            LEFT JOIN "CartItem" ci ON ci.cart_id = cr.cart_id
            WHERE r.creator_id = $1
            GROUP BY r.recipe_id, r.title
            ORDER BY royalty_score DESC;
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching royalty data.' });
    }
});

// GET Creator Royalty Dashboard
// Available to any authenticated user that is a RecipeCreator (Home Cook or Verified Chef).
app.get('/api/creator/royalty-dashboard', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(401).json({ message: 'Authentication required.' });

    try {
        const creatorCheck = await pool.query(
            'SELECT user_id FROM "RecipeCreator" WHERE user_id = $1',
            [userId]
        );

        if (creatorCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Creator royalty dashboard is only available to recipe creators.' });
        }

        const perRecipeQuery = `
            WITH review_stats AS (
                SELECT
                    recipe_id,
                    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                    COUNT(*) AS review_count
                FROM "Comment"
                WHERE rating IS NOT NULL
                GROUP BY recipe_id
            ),
            cook_stats AS (
                SELECT
                    recipe_id,
                    COUNT(*) AS cooked_count
                FROM "Comment"
                WHERE cooked_at IS NOT NULL
                GROUP BY recipe_id
            ),
            purchase_stats AS (
                SELECT
                    c.recipe_id,
                    COUNT(DISTINCT o.order_id) AS meal_kit_order_count
                FROM "Cart" c
                JOIN "Order" o ON o.cart_id = c.cart_id
                WHERE o.status = 'confirmed'
                GROUP BY c.recipe_id
            )
            SELECT
                r.recipe_id,
                r.title,
                r.visibility,
                COALESCE(rs.avg_rating, 0::numeric)::text AS avg_rating,
                COALESCE(rs.review_count, 0)::int AS review_count,
                COALESCE(cs.cooked_count, 0)::int AS cooked_count,
                COALESCE(ps.meal_kit_order_count, 0)::int AS meal_kit_order_count,
                (
                    COALESCE(ps.meal_kit_order_count, 0) * 10
                    + COALESCE(cs.cooked_count, 0) * 2
                    + COALESCE(rs.review_count, 0)
                )::int AS creator_reward_points
            FROM "Recipe" r
            LEFT JOIN review_stats rs ON rs.recipe_id = r.recipe_id
            LEFT JOIN cook_stats cs ON cs.recipe_id = r.recipe_id
            LEFT JOIN purchase_stats ps ON ps.recipe_id = r.recipe_id
            WHERE r.creator_id = $1
            ORDER BY creator_reward_points DESC, meal_kit_order_count DESC, cooked_count DESC, review_count DESC, r.title ASC;
        `;

        const summaryQuery = `
            WITH per_recipe AS (
                WITH review_stats AS (
                    SELECT recipe_id, COUNT(*) AS review_count
                    FROM "Comment"
                    WHERE rating IS NOT NULL
                    GROUP BY recipe_id
                ),
                cook_stats AS (
                    SELECT recipe_id, COUNT(*) AS cooked_count
                    FROM "Comment"
                    WHERE cooked_at IS NOT NULL
                    GROUP BY recipe_id
                ),
                purchase_stats AS (
                    SELECT
                        c.recipe_id,
                        COUNT(DISTINCT o.order_id) AS meal_kit_order_count
                    FROM "Cart" c
                    JOIN "Order" o ON o.cart_id = c.cart_id
                    WHERE o.status = 'confirmed'
                    GROUP BY c.recipe_id
                )
                SELECT
                    r.recipe_id,
                    COALESCE(rs.review_count, 0) AS review_count,
                    COALESCE(cs.cooked_count, 0) AS cooked_count,
                    COALESCE(ps.meal_kit_order_count, 0) AS meal_kit_order_count
                FROM "Recipe" r
                LEFT JOIN review_stats rs ON rs.recipe_id = r.recipe_id
                LEFT JOIN cook_stats cs ON cs.recipe_id = r.recipe_id
                LEFT JOIN purchase_stats ps ON ps.recipe_id = r.recipe_id
                WHERE r.creator_id = $1
            )
            SELECT
                COUNT(*)::int AS total_recipes,
                COALESCE(SUM(cooked_count), 0)::int AS total_cooked_count,
                COALESCE(SUM(review_count), 0)::int AS total_review_count,
                COALESCE(SUM(meal_kit_order_count), 0)::int AS total_meal_kit_order_count,
                (
                    COALESCE(SUM(meal_kit_order_count), 0) * 10
                    + COALESCE(SUM(cooked_count), 0) * 2
                    + COALESCE(SUM(review_count), 0)
                )::int AS total_creator_reward_points
            FROM per_recipe;
        `;

        const [recipesResult, summaryResult] = await Promise.all([
            pool.query(perRecipeQuery, [userId]),
            pool.query(summaryQuery, [userId])
        ]);

        res.json({
            summary: summaryResult.rows[0],
            recipes: recipesResult.rows
        });
    } catch (error) {
        console.error('CREATOR ROYALTY DASHBOARD ERROR:', error);
        res.status(500).json({ message: 'Error fetching creator royalty dashboard.', detail: error.message });
    }
});

// LOG a Cook (Increases Royalty)
app.post('/api/recipe/cook', async (req, res) => {
    const { recipeId, userId } = req.body;
    try {
        const query = `
            INSERT INTO "Comment" (user_id, recipe_id, comment_text, cooked_at)
            VALUES ($1, $2, 'Cooked this recipe!', CURRENT_TIMESTAMP)
            RETURNING *;
        `;
        await pool.query(query, [userId, recipeId]);
        res.json({ message: 'Cook logged successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging cook.' });
    }
});

// --- SUPPLIER INVENTORY ENDPOINTS ---

// GET All Ingredients (for dropdowns)
app.get('/api/ingredients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM "Ingredient" ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching ingredients.' });
    }
});

// SEARCH External Ingredients via USDA API
app.get('/api/ingredients/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);
    try {
        const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=DEMO_KEY&pageSize=30`);
        const data = await response.json();

        if (!data.foods) return res.json([]);

        const uniqueNames = new Set();
        const results = [];

        for (const food of data.foods) {
            const lowerName = food.description.toLowerCase();
            if (!uniqueNames.has(lowerName)) {
                uniqueNames.add(lowerName);
                results.push({
                    ingredient_id: `external-${food.fdcId}`,
                    name: food.description
                });
                if (results.length >= 10) break;
            }
        }

        res.json(results);
    } catch (err) {
        console.error("USDA API Search Error:", err);
        res.status(500).json({ message: "Error searching ingredients" });
    }
});

// GET Supplier Marketplace (All suppliers and their inventory)
app.get('/api/marketplace', async (req, res) => {
    try {
        const query = `
            SELECT 
                ls.user_id AS supplier_id,
                u.username AS supplier_name,
                ls.location_name,
                COALESCE(json_agg(json_build_object(
                    'inventory_id', si.inventory_id,
                    'ingredient_id', i.ingredient_id,
                    'name', i.name,
                    'unit', si.unit,
                    'price', si.price,
                    'available_qty', si.available_qty
                )) FILTER (WHERE si.inventory_id IS NOT NULL), '[]'::json) as inventory
            FROM "LocalSupplier" ls
            JOIN "User" u ON u.user_id = ls.user_id
            LEFT JOIN "SupplierInventory" si ON si.supplier_id = ls.user_id AND si.available_qty > 0
            LEFT JOIN "Ingredient" i ON i.ingredient_id = si.ingredient_id
            GROUP BY ls.user_id, u.username, ls.location_name
            ORDER BY u.username ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('MARKETPLACE ERROR:', error);
        res.status(500).json({ message: 'Error fetching marketplace data.' });
    }
});

// GET Supplier Inventory
app.get('/api/supplier/inventory', async (req, res) => {
    const userId = req.query.userId;
    console.log(`FETCH INVENTORY FOR USER: ${userId}`);
    if (!userId) return res.status(400).json({ message: 'userId required' });

    try {
        const query = `
            SELECT si.*, i.name as ingredient_name 
            FROM "SupplierInventory" si
            JOIN "Ingredient" i ON i.ingredient_id = si.ingredient_id
            WHERE si.supplier_id = $1
            ORDER BY i.name ASC;
        `;
        const result = await pool.query(query, [userId]);
        console.log(`FOUND ${result.rows.length} ITEMS`);
        res.json(result.rows);
    } catch (error) {
        console.error("INVENTORY ERROR:", error);
        res.status(500).json({ message: 'Error fetching inventory.', detail: error.message });
    }
});

// ADD to Inventory
app.post('/api/supplier/inventory', async (req, res) => {
    const { supplier_id, ingredient_name, unit, price, package_size, available_qty } = req.body;

    if (!ingredient_name || !ingredient_name.trim()) {
        return res.status(400).json({ message: 'Ingredient name is required.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Check if ingredient exists
        let ingRes = await client.query('SELECT ingredient_id FROM "Ingredient" WHERE name ILIKE $1', [ingredient_name.trim()]);
        let ingredientId;

        if (ingRes.rows.length > 0) {
            ingredientId = ingRes.rows[0].ingredient_id;
        } else {
            // Create new ingredient
            let newIngRes = await client.query('INSERT INTO "Ingredient" (name) VALUES ($1) RETURNING ingredient_id', [ingredient_name.trim()]);
            ingredientId = newIngRes.rows[0].ingredient_id;
        }

        // Insert into SupplierInventory
        const query = `
            INSERT INTO "SupplierInventory" (supplier_id, ingredient_id, unit, price, package_size, available_qty)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const result = await client.query(query, [supplier_id, ingredientId, unit, price, package_size, available_qty]);

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Error adding to inventory.' });
    } finally {
        if (client) client.release();
    }
});

// UPDATE Inventory
app.put('/api/supplier/inventory/:id', async (req, res) => {
    const inventoryId = req.params.id;
    const { price, available_qty } = req.body;
    try {
        const query = `
            UPDATE "SupplierInventory"
            SET price = $1, available_qty = $2, last_updated = CURRENT_TIMESTAMP
            WHERE inventory_id = $3
            RETURNING *;
        `;
        const result = await pool.query(query, [price, available_qty, inventoryId]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating inventory.' });
    }
});

// DELETE Inventory
app.delete('/api/supplier/inventory/:id', async (req, res) => {
    const inventoryId = req.params.id;
    try {
        await pool.query('DELETE FROM "SupplierInventory" WHERE inventory_id = $1', [inventoryId]);
        res.json({ message: 'Item removed from inventory.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting inventory item.' });
    }
});

// --- MEAL LIST ENDPOINTS ---

// GET All Meal Lists for a User
app.get('/api/meallist', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ message: 'userId required' });

    try {
        const query = `
            SELECT ml.*, COUNT(DISTINCT mli.recipe_id) as recipe_count
            FROM "MealList" ml
            LEFT JOIN "MealListItem" mli ON mli.meal_list_id = ml.meal_list_id
            WHERE ml.user_id = $1
            GROUP BY ml.meal_list_id
            ORDER BY ml.created_date DESC;
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching meal lists.' });
    }
});

// GET Recipes in a Meal List
app.get('/api/meallist/:id/recipes', async (req, res) => {
    const mealListId = req.params.id;
    try {
        const query = `
            SELECT r.* FROM "Recipe" r
            JOIN "MealListItem" mli ON mli.recipe_id = r.recipe_id
            WHERE mli.meal_list_id = $1
            ORDER BY mli.added_date DESC;
        `;
        const result = await pool.query(query, [mealListId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching recipes.' });
    }
});

// =============================================================
// RECIPE DISCOVERY ENDPOINT
// =============================================================

// GET /api/recipes — Fetch all public recipes with their ingredients
app.get('/api/recipes', async (req, res) => {
    try {
        const query = `
            SELECT
                r.recipe_id AS id,
                r.title,
                u.username AS chef,
                r.dietary_tag AS category,
                r.cook_time_min AS time,
                r.difficulty_level AS difficulty,
                r.base_servings,
                COALESCE(ROUND(AVG(c.rating), 1), 0) AS rating,
                (
                    SELECT COALESCE(json_agg(json_build_object(
                        'id', i.ingredient_id,
                        'name', i.name,
                        'baseQty', ri.qty,
                        'unit', ri.unit,
                        'pricePerUnit', COALESCE((SELECT MIN(price) FROM "SupplierInventory" WHERE ingredient_id = i.ingredient_id), 0.10),
                        'status', CASE 
                                    WHEN COALESCE((SELECT SUM(available_qty) FROM "SupplierInventory" WHERE ingredient_id = i.ingredient_id), 0) > 0 THEN 'available'
                                    ELSE 'missing' 
                                  END
                        'pricePerUnit', COALESCE((SELECT MIN(price) FROM "SupplierInventory" WHERE ingredient_id = i.ingredient_id), 0.10),
                        'suppliers', (
                            SELECT COALESCE(json_agg(json_build_object(
                                'inventory_id', si.inventory_id,
                                'supplier_id', su.user_id,
                                'supplier_name', su.username,
                                'location_name', ls.location_name,
                                'price', si.price,
                                'available_qty', si.available_qty
                            )), '[]'::json)
                            FROM "SupplierInventory" si
                            JOIN "LocalSupplier" ls ON ls.user_id = si.supplier_id
                            JOIN "User" su ON su.user_id = ls.user_id
                            WHERE si.ingredient_id = i.ingredient_id
                        )
                    )), '[]'::json)
                    FROM "Recipe_Ingredient" ri
                    JOIN "Ingredient" i ON i.ingredient_id = ri.ingredient_id
                    WHERE ri.recipe_id = r.recipe_id
                ) AS ingredients
            FROM "Recipe" r
            JOIN "RecipeCreator" rc ON rc.user_id = r.creator_id
            JOIN "User" u ON u.user_id = rc.user_id
            LEFT JOIN "Comment" c ON c.recipe_id = r.recipe_id AND c.rating IS NOT NULL
            WHERE r.visibility = 'public'
            GROUP BY r.recipe_id, u.username
            ORDER BY rating DESC;
        `;
        const result = await pool.query(query);

        // Use default images from the mock data based on index
        const MOCK_IMAGES = [
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1608756687911-aa1599ab3bd9?auto=format&fit=crop&q=80&w=600"
        ];

        const recipes = result.rows.map((row, index) => ({
            id: row.id,
            title: row.title,
            chef: row.chef,
            rating: parseFloat(row.rating),
            time: row.time,
            difficulty: row.difficulty,
            category: row.category,
            image: MOCK_IMAGES[index % MOCK_IMAGES.length],
            ingredients: row.ingredients,
            steps: ['Prepare ingredients.', 'Cook according to best practices.', 'Serve and enjoy!'],
            substitutions: [],
            reviews: []
        }));

        // Fetch reviews for all recipes
        const recipeIds = recipes.map(r => r.id);
        if (recipeIds.length > 0) {
            const reviewsResult = await pool.query(
                `SELECT c.comment_id, c.recipe_id, c.comment_text, c.rating, c.creation_time, u.username
                 FROM "Comment" c
                 JOIN "User" u ON u.user_id = c.user_id
                 WHERE c.recipe_id = ANY($1) AND c.comment_text IS NOT NULL
                 ORDER BY c.creation_time DESC`,
                [recipeIds]
            );
            // Attach reviews to their recipes
            for (const review of reviewsResult.rows) {
                const recipe = recipes.find(r => r.id === review.recipe_id);
                if (recipe) {
                    recipe.reviews.push({
                        id: review.comment_id,
                        user: review.username,
                        comment: review.comment_text,
                        rating: review.rating,
                        date: review.creation_time
                    });
                }
            }
        }

        res.json(recipes);
    } catch (error) {
        console.error('RECIPES API ERROR:', error);
        res.status(500).json({ message: 'Error fetching recipes.', detail: error.message });
    }
});

// =============================================================
// REVIEW ENDPOINTS
// =============================================================

// GET reviews for a recipe
app.get('/api/recipe/:id/reviews', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.comment_id, c.comment_text, c.rating, c.creation_time, u.username
             FROM "Comment" c
             JOIN "User" u ON u.user_id = c.user_id
             WHERE c.recipe_id = $1 AND c.comment_text IS NOT NULL
             ORDER BY c.creation_time DESC`,
            [req.params.id]
        );
        res.json(result.rows.map(r => ({
            id: r.comment_id,
            user: r.username,
            comment: r.comment_text,
            rating: r.rating,
            date: r.creation_time
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching reviews.' });
    }
});

// POST a new review (only Home Cooks and Verified Chefs)
app.post('/api/recipe/:id/review', async (req, res) => {
    const { userId, rating, comment } = req.body;
    const recipeId = req.params.id;

    if (!userId || !comment || !rating) {
        return res.status(400).json({ message: 'userId, rating, and comment are required.' });
    }
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    try {
        // Verify user exists
        const userCheck = await pool.query('SELECT user_id, username FROM "User" WHERE user_id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if recipe exists in the DB
        const recipeCheck = await pool.query('SELECT recipe_id FROM "Recipe" WHERE recipe_id = $1', [recipeId]);
        if (recipeCheck.rows.length === 0) {
            // Recipe is from mock/static data, not in DB — return a simulated success
            return res.status(201).json({
                id: Date.now(),
                user: userCheck.rows[0].username,
                comment,
                rating,
                date: new Date().toISOString()
            });
        }

        const result = await pool.query(
            `INSERT INTO "Comment" (user_id, recipe_id, comment_text, rating, creation_time, rated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING comment_id, creation_time`,
            [userId, recipeId, comment, rating]
        );

        res.status(201).json({
            id: result.rows[0].comment_id,
            user: userCheck.rows[0].username,
            comment,
            rating,
            date: result.rows[0].creation_time
        });
    } catch (error) {
        console.error('REVIEW POST ERROR:', error);
        res.status(500).json({ message: 'Error posting review.', detail: error.message });
    }
});

// CREATE a new Meal List
app.post('/api/meallist', async (req, res) => {
    const { user_id, name, description } = req.body;
    try {
        const query = `
            INSERT INTO "MealList" (user_id, name, description, created_date)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            RETURNING *;
        `;
        const result = await pool.query(query, [user_id, name, description || '']);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating meal list.' });
    }
});

// ADD Recipe to Meal List
app.post('/api/meallist/:id/recipe', async (req, res) => {
    const mealListId = req.params.id;
    const { recipe_id } = req.body;
    try {
        // Check if already exists
        const existing = await pool.query(
            'SELECT * FROM "MealListItem" WHERE meal_list_id = $1 AND recipe_id = $2',
            [mealListId, recipe_id]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Recipe already in this meal list.' });
        }

        const query = `
            INSERT INTO "MealListItem" (meal_list_id, recipe_id, added_date)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            RETURNING *;
        `;
        const result = await pool.query(query, [mealListId, recipe_id]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding recipe to meal list.' });
    }
});

// REMOVE Recipe from Meal List
app.delete('/api/meallist/:id/recipe/:recipeId', async (req, res) => {
    const { id, recipeId } = req.params;
    try {
        await pool.query(
            'DELETE FROM "MealListItem" WHERE meal_list_id = $1 AND recipe_id = $2',
            [id, recipeId]
        );
        res.json({ message: 'Recipe removed from meal list.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing recipe.' });
    }
});

// DELETE a Meal List
app.delete('/api/meallist/:id', async (req, res) => {
    const mealListId = req.params.id;
    try {
        await pool.query('DELETE FROM "MealList" WHERE meal_list_id = $1', [mealListId]);
        res.json({ message: 'Meal list deleted.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting meal list.' });
    }
});

// =============================================================
// CART & CHECKOUT ENDPOINTS
// =============================================================

// POST /api/checkout
app.post('/api/checkout', async (req, res) => {
    const { userId, totalAmount, items } = req.body;

    // In a real scenario, we would use the session userId. Here we default to 1 for dummy testing.
    const effectiveUserId = userId || 1;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // 1. Update User's total amount spent
        await client.query(
            'UPDATE "User" SET total = total + $1 WHERE user_id = $2',
            [totalAmount || 0, effectiveUserId]
        );
        // 2. Deduct Supplier Inventory
        if (items && items.length > 0) {
            for (const item of items) {
                const scaleFactor = item.recipe.isIngredientOnly ? item.servings : item.servings / 2;
                const ingredients = item.recipe.cartIngredients || [];
                for (const ing of ingredients) {
                    if (ing.selectedSupplier && ing.selectedSupplier.inventory_id) {
                        const deduction = ing.baseQty * scaleFactor;
                        await client.query(
                            'UPDATE "SupplierInventory" SET available_qty = GREATEST(0, available_qty - $1) WHERE inventory_id = $2',
                            [deduction, ing.selectedSupplier.inventory_id]
                        );
                        console.log(`[Checkout] Deducted ${deduction} from inventory ${ing.selectedSupplier.inventory_id}`);
                    }
                }
            }
        }
        // 2. Create Cart
        const cartRes = await client.query('INSERT INTO "Cart" (user_id, target_servings) VALUES ($1, 1) RETURNING cart_id', [effectiveUserId]);
        const cartId = cartRes.rows[0].cart_id;

        // 3. Process each recipe in the cart and its selected ingredients
        if (items && items.length > 0) {
            console.log(`\x1b[32m[CHECKOUT START]\x1b[0m User: ${effectiveUserId}`);
            
            for (const cartEntry of items) {
                const ingredients = cartEntry.recipe.cartIngredients || [];
                const servingsFactor = Number(cartEntry.servings || 2) / 2;

                for (const ing of ingredients) {
                    const rawId = ing.id;
                    const ingId = typeof rawId === 'string' && rawId.startsWith('i') 
                        ? parseInt(rawId.replace('i','')) 
                        : parseInt(rawId);
                    
                    if (isNaN(ingId)) continue;

                    let invRes;
                    // Eğer kullanıcı spesifik bir envanter (tedarikçi) seçmişse onu kullan
                    if (ing.selectedInventoryId) {
                        invRes = await client.query(
                            `SELECT si.inventory_id, si.supplier_id, ls.location_name, si.price, si.available_qty 
                             FROM "SupplierInventory" si
                             JOIN "LocalSupplier" ls ON ls.user_id = si.supplier_id
                             WHERE si.inventory_id = $1 AND si.available_qty > 0`, 
                            [ing.selectedInventoryId]
                        );
                    } else {
                        // Seçmemişse en ucuzunu bul
                        invRes = await client.query(
                            `SELECT si.inventory_id, si.supplier_id, ls.location_name, si.price, si.available_qty 
                             FROM "SupplierInventory" si
                             JOIN "LocalSupplier" ls ON ls.user_id = si.supplier_id
                             WHERE si.ingredient_id = $1 AND si.available_qty > 0 
                             ORDER BY si.price ASC LIMIT 1`, 
                            [ingId]
                        );
                    }
                    
                    if (invRes.rows.length > 0) {
                        const inv = invRes.rows[0];
                        const qtyToDeduct = Number(ing.baseQty || 1) * servingsFactor;
                        const newQty = Math.max(0, Number(inv.available_qty) - qtyToDeduct);
                        
                        console.log(`    - Processing: ${ing.name} | Deducting ${qtyToDeduct} from "${inv.location_name}"`);

                        if (newQty <= 0) {
                            // STOK BİTTİ -> SİL
                            await client.query('DELETE FROM "SupplierInventory" WHERE inventory_id = $1', [inv.inventory_id]);
                            console.log(`      ✓ Stock reached 0. Item REMOVED from inventory.`);
                        } else {
                            // STOK VAR -> GÜNCELLE
                            await client.query('UPDATE "SupplierInventory" SET available_qty = $1 WHERE inventory_id = $2', [newQty, inv.inventory_id]);
                            console.log(`      ✓ Stock updated. Remaining: ${newQty}`);
                        }

                        await client.query(
                            'INSERT INTO "CartItem" (cart_id, inventory_id, qty, unit_price) VALUES ($1, $2, $3, $4)', 
                            [cartId, inv.inventory_id, qtyToDeduct, inv.price]
                        );
                    }
                }
            }
        }

        // 4. Create Order
        await client.query('INSERT INTO "Order" (cart_id, total_amount, status) VALUES ($1, $2, $3)', [cartId, totalAmount || 0, 'pending']);

        await client.query('COMMIT');
        res.json({ message: 'Checkout successful! Order confirmed and inventory deducted.' });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("CHECKOUT ERROR:", error);
        res.status(500).json({ message: 'Error processing checkout.', detail: error.message });
    } finally {
        if (client) client.release();
    }
});

// =============================================================
// CHALLENGE ENDPOINTS
// =============================================================

// Seed helper — runs once on startup if the table is empty
async function seedChallengesIfEmpty() {
    const count = await pool.query('SELECT COUNT(*) FROM "KitchenChallenge"');
    if (parseInt(count.rows[0].count) > 0) return;

    const SEED = [
        { title: 'Zero Waste Week', description: 'Cook only with ingredients you have at home. No new purchases!', start_date: '2026-05-01', end_date: '2026-05-07' },
        { title: 'Under 20 Minutes Challenge', description: 'Prepare a delicious meal in 20 minutes or less!', start_date: '2026-05-01', end_date: '2026-05-14' },
        { title: 'Vegan Venture', description: 'Try 5 different vegan recipes this month!', start_date: '2026-05-01', end_date: '2026-05-31' },
        { title: 'Keto King', description: 'Complete 10 keto-friendly meals and log your progress!', start_date: '2026-05-01', end_date: '2026-05-21' },
        { title: 'Fusion Flavor Fest', description: 'Cook one recipe from 3 different cuisines!', start_date: '2026-06-01', end_date: '2026-06-14' },
        { title: 'Budget Gourmet', description: 'Create a 3-course meal for under $15!', start_date: '2026-05-01', end_date: '2026-12-31' },
    ];

    for (const c of SEED) {
        await pool.query(
            `INSERT INTO "KitchenChallenge" (title, description, start_date, end_date) VALUES ($1, $2, $3, $4)`,
            [c.title, c.description, c.start_date, c.end_date]
        );
    }
    console.log('Seeded KitchenChallenge table with', SEED.length, 'challenges.');
}

// GET /api/challenges — list all challenges with recipe counts
app.get('/api/challenges', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                kc.challenge_id,
                kc.title,
                kc.description,
                kc.start_date,
                kc.end_date,
                COUNT(DISTINCT hcc.user_id)       AS participants,
                COUNT(DISTINCT kcr.recipe_id)     AS recipe_count,
                CASE
                    WHEN kc.start_date > CURRENT_DATE THEN 'upcoming'
                    WHEN kc.end_date   < CURRENT_DATE THEN 'completed'
                    ELSE 'active'
                END AS status
            FROM "KitchenChallenge" kc
            LEFT JOIN "HomeCook_Challenge"      hcc ON hcc.challenge_id = kc.challenge_id
            LEFT JOIN "KitchenChallenge_Recipe" kcr ON kcr.challenge_id = kc.challenge_id
            GROUP BY kc.challenge_id
            ORDER BY kc.start_date DESC;
        `);

        const DISPLAY = {
            'Zero Waste Week': { icon: '🌱', difficulty: 'Hard', duration: '7 days', prize: 'Green Leaf Badge + 50 MealCoins', image: 'https://images.unsplash.com/photo-1506484381205-f7945653044d?auto=format&fit=crop&q=80&w=600' },
            'Under 20 Minutes Challenge': { icon: '⚡', difficulty: 'Medium', duration: '14 days', prize: 'Speed Chef Badge + 30 MealCoins', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=600' },
            'Vegan Venture': { icon: '🥬', difficulty: 'Easy', duration: '30 days', prize: 'Plant-Based Master Badge + 75 MealCoins', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600' },
            'Keto King': { icon: '🥩', difficulty: 'Hard', duration: '21 days', prize: 'Keto Champion Badge + 100 MealCoins', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600' },
            'Fusion Flavor Fest': { icon: '🌍', difficulty: 'Medium', duration: '14 days', prize: 'Global Palate Badge + 40 MealCoins', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=600' },
            'Budget Gourmet': { icon: '💎', difficulty: 'Hard', duration: 'Ongoing', prize: 'Deal Hunter Badge + 60 MealCoins', image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=600' },
        };

        const rows = result.rows.map(r => ({
            ...r,
            participants: parseInt(r.participants) || 0,
            recipe_count: parseInt(r.recipe_count) || 0,
            ...(DISPLAY[r.title] || { icon: '🍽️', difficulty: 'Medium', duration: 'Ongoing', prize: 'Badge', image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=600' }),
        }));

        res.json(rows);
    } catch (error) {
        console.error('CHALLENGES LIST ERROR:', error);
        res.status(500).json({ message: 'Error fetching challenges.', detail: error.message });
    }
});

// GET /api/challenges/joined?userId=X
app.get('/api/challenges/joined', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    try {
        const result = await pool.query(
            'SELECT challenge_id FROM "HomeCook_Challenge" WHERE user_id = $1',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching joined challenges.' });
    }
});

// POST /api/challenges/:id/join
app.post('/api/challenges/:id/join', async (req, res) => {
    const challengeId = req.params.id;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    try {
        const homeCookCheck = await pool.query('SELECT user_id FROM "HomeCook" WHERE user_id = $1', [userId]);
        if (homeCookCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Only Home Cooks can join challenges.' });
        }
        await pool.query(
            `INSERT INTO "HomeCook_Challenge" (user_id, challenge_id, joined_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, challenge_id) DO NOTHING`,
            [userId, challengeId]
        );
        res.json({ message: 'Joined successfully!' });
    } catch (error) {
        console.error('JOIN CHALLENGE ERROR:', error);
        res.status(500).json({ message: 'Error joining challenge.', detail: error.message });
    }
});

// GET /api/challenges/:id/progress?userId=X
app.get('/api/challenges/:id/progress', async (req, res) => {
    const challengeId = req.params.id;
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    try {
        const totalRes = await pool.query(
            'SELECT COUNT(*) AS total FROM "KitchenChallenge_Recipe" WHERE challenge_id = $1',
            [challengeId]
        );
        const total = parseInt(totalRes.rows[0].total);

        const cookedRes = await pool.query(`
            SELECT DISTINCT c.recipe_id
            FROM "Comment" c
            JOIN "KitchenChallenge_Recipe" kcr
              ON kcr.recipe_id = c.recipe_id AND kcr.challenge_id = $1
            WHERE c.user_id = $2 AND c.cooked_at IS NOT NULL`,
            [challengeId, userId]
        );
        const cooked_recipe_ids = cookedRes.rows.map(r => r.recipe_id);
        res.json({ cooked_count: cooked_recipe_ids.length, total, cooked_recipe_ids });
    } catch (error) {
        console.error('PROGRESS ERROR:', error);
        res.status(500).json({ message: 'Error fetching progress.', detail: error.message });
    }
});

// GET /api/challenges/:id/leaderboard
app.get('/api/challenges/:id/leaderboard', async (req, res) => {
    const challengeId = req.params.id;
    try {
        const result = await pool.query(`
            SELECT
                u.user_id,
                u.username,
                COUNT(DISTINCT c.recipe_id) AS cooked_count
            FROM "HomeCook_Challenge" hcc
            JOIN "User" u ON u.user_id = hcc.user_id
            LEFT JOIN "Comment" c
                ON c.user_id = hcc.user_id
               AND c.cooked_at IS NOT NULL
               AND c.recipe_id IN (
                   SELECT recipe_id FROM "KitchenChallenge_Recipe" WHERE challenge_id = $1
               )
            WHERE hcc.challenge_id = $1
            GROUP BY u.user_id, u.username
            ORDER BY cooked_count DESC
            LIMIT 10;
        `, [challengeId]);
        res.json(result.rows);
    } catch (error) {
        console.error('LEADERBOARD ERROR:', error);
        res.status(500).json({ message: 'Error fetching leaderboard.', detail: error.message });
    }
});

// GET /api/challenges/:id/recipes
app.get('/api/challenges/:id/recipes', async (req, res) => {
    const challengeId = req.params.id;
    try {
        const result = await pool.query(`
            SELECT r.recipe_id, r.title, r.cook_time_min, r.difficulty_level
            FROM "KitchenChallenge_Recipe" kcr
            JOIN "Recipe" r ON r.recipe_id = kcr.recipe_id
            WHERE kcr.challenge_id = $1
            ORDER BY r.title;
        `, [challengeId]);
        res.json(result.rows);
    } catch (error) {
        console.error('CHALLENGE RECIPES ERROR:', error);
        res.status(500).json({ message: 'Error fetching challenge recipes.', detail: error.message });
    }
});

// Client-side error logging endpoint
app.post('/api/client-error', (req, res) => {
    try {
        const info = req.body || {};
        console.error('CLIENT ERROR LOG:', JSON.stringify(info, null, 2));
    } catch (e) {
        console.error('Failed to log client error', e);
    }
    res.status(204).end();
});

// =============================================================
// LEADERBOARDS & ACHIEVEMENTS ENDPOINTS
// =============================================================

// GET /api/leaderboard/global — Top Home Cooks by recipes cooked
app.get('/api/leaderboard/global', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.user_id, 
                u.username, 
                u.total AS meal_coins,
                COUNT(c.comment_id) AS cooked_count
            FROM "User" u
            LEFT JOIN "Comment" c ON c.user_id = u.user_id AND c.cooked_at IS NOT NULL
            GROUP BY u.user_id, u.username, u.total
            ORDER BY cooked_count DESC, meal_coins DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('GLOBAL LEADERBOARD ERROR:', error);
        res.status(500).json({ message: 'Error fetching global leaderboard.', detail: error.message });
    }
});

// GET /api/users/:id/achievements — Get dynamic badges and stats for a user
app.get('/api/users/:id/achievements', async (req, res) => {
    const userId = req.params.id;
    try {
        // 1. Get total cooked recipes
        const cookedResult = await pool.query(
            `SELECT COUNT(*) as cooked_count FROM "Comment" WHERE user_id = $1 AND cooked_at IS NOT NULL`,
            [userId]
        );
        const cookedCount = parseInt(cookedResult.rows[0].cooked_count) || 0;

        // 2. Get joined challenges
        const joinedResult = await pool.query(
            `SELECT COUNT(*) as joined_count FROM "HomeCook_Challenge" WHERE user_id = $1`,
            [userId]
        );
        const joinedCount = parseInt(joinedResult.rows[0].joined_count) || 0;

        // 3. Get user details (MealCoins)
        const userResult = await pool.query(`SELECT total FROM "User" WHERE user_id = $1`, [userId]);
        const mealCoins = userResult.rows.length > 0 ? parseFloat(userResult.rows[0].total) : 0;

        // 4. Calculate Badges dynamically
        const badges = [];

        // Cooking Badges
        if (cookedCount >= 1) badges.push({ id: 'first_cook', name: 'First Cook', icon: '🍳', description: 'Cooked your first recipe on MealDeal!', color: 'emerald' });
        if (cookedCount >= 5) badges.push({ id: 'chef_training', name: 'Chef in Training', icon: '👨‍🍳', description: 'Cooked 5 recipes.', color: 'amber' });
        if (cookedCount >= 10) badges.push({ id: 'master_cook', name: 'Master Cook', icon: '👑', description: 'Cooked 10 recipes.', color: 'purple' });
        if (cookedCount >= 50) badges.push({ id: 'legendary_cook', name: 'Legendary Cook', icon: '🌟', description: 'Cooked 50 recipes.', color: 'orange' });

        // Challenge Badges
        if (joinedCount >= 1) badges.push({ id: 'challenger', name: 'Challenger', icon: '⚔️', description: 'Joined your first kitchen challenge.', color: 'blue' });
        if (joinedCount >= 5) badges.push({ id: 'challenge_veteran', name: 'Challenge Veteran', icon: '🛡️', description: 'Joined 5 kitchen challenges.', color: 'indigo' });

        // MealCoin Badges
        if (mealCoins >= 50) badges.push({ id: 'deal_hunter', name: 'Deal Hunter', icon: '💎', description: 'Earned 50 MealCoins.', color: 'teal' });
        if (mealCoins >= 200) badges.push({ id: 'meal_mogul', name: 'Meal Mogul', icon: '🏦', description: 'Accumulated 200 MealCoins.', color: 'yellow' });

        res.json({
            stats: {
                cookedCount,
                joinedCount,
                mealCoins
            },
            badges
        });
    } catch (error) {
        console.error('ACHIEVEMENTS ERROR:', error);
        res.status(500).json({ message: 'Error fetching achievements.', detail: error.message });
    }
});

// Fallback to index.html for client-side routing (must be after all /api routes)
app.use((req, res) => {
    res.sendFile('dist/index.html', { root: __dirname });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        await pool.query('SELECT NOW()');
        console.log('PostgreSQL Connected Successfully');
        await seedChallengesIfEmpty();
    } catch (err) {
        console.error('PostgreSQL Connection Error:', err.message);
    }
});
