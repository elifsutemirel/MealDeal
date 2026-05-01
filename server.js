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
    const { username, email, password, role } = req.body;
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
            await client.query('INSERT INTO "LocalSupplier" (user_id, address, location_name) VALUES ($1, $2, $3)', [userId, '', '']);
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
    const { supplier_id, ingredient_id, unit, price, package_size, available_qty } = req.body;
    try {
        const query = `
            INSERT INTO "SupplierInventory" (supplier_id, ingredient_id, unit, price, package_size, available_qty)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const result = await pool.query(query, [supplier_id, ingredient_id, unit, price, package_size, available_qty]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding to inventory.' });
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

// =============================================================
// CHALLENGE ENDPOINTS
// =============================================================

// Seed helper — runs once on startup if the table is empty
async function seedChallengesIfEmpty() {
    const count = await pool.query('SELECT COUNT(*) FROM "KitchenChallenge"');
    if (parseInt(count.rows[0].count) > 0) return;

    const SEED = [
        { title: 'Zero Waste Week',            description: 'Cook only with ingredients you have at home. No new purchases!', start_date: '2026-05-01', end_date: '2026-05-07' },
        { title: 'Under 20 Minutes Challenge', description: 'Prepare a delicious meal in 20 minutes or less!',                start_date: '2026-05-01', end_date: '2026-05-14' },
        { title: 'Vegan Venture',              description: 'Try 5 different vegan recipes this month!',                        start_date: '2026-05-01', end_date: '2026-05-31' },
        { title: 'Keto King',                  description: 'Complete 10 keto-friendly meals and log your progress!',           start_date: '2026-05-01', end_date: '2026-05-21' },
        { title: 'Fusion Flavor Fest',         description: 'Cook one recipe from 3 different cuisines!',                       start_date: '2026-06-01', end_date: '2026-06-14' },
        { title: 'Budget Gourmet',             description: 'Create a 3-course meal for under $15!',                            start_date: '2026-05-01', end_date: '2026-12-31' },
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
            'Zero Waste Week':            { icon: '🌱', difficulty: 'Hard',   duration: '7 days',   prize: 'Green Leaf Badge + 50 MealCoins',        image: 'https://images.unsplash.com/photo-1506484381205-f7945653044d?auto=format&fit=crop&q=80&w=600' },
            'Under 20 Minutes Challenge': { icon: '⚡', difficulty: 'Medium', duration: '14 days',  prize: 'Speed Chef Badge + 30 MealCoins',         image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=600' },
            'Vegan Venture':              { icon: '🥬', difficulty: 'Easy',   duration: '30 days',  prize: 'Plant-Based Master Badge + 75 MealCoins', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600' },
            'Keto King':                  { icon: '🥩', difficulty: 'Hard',   duration: '21 days',  prize: 'Keto Champion Badge + 100 MealCoins',     image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600' },
            'Fusion Flavor Fest':         { icon: '🌍', difficulty: 'Medium', duration: '14 days',  prize: 'Global Palate Badge + 40 MealCoins',      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=600' },
            'Budget Gourmet':             { icon: '💎', difficulty: 'Hard',   duration: 'Ongoing',  prize: 'Deal Hunter Badge + 60 MealCoins',        image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=600' },
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