import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Simple logging middleware
app.use((req, res, next) => {
    console.log(`REQ: ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => res.send('Backend is running!'));
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

// 404 Catch-all
app.use((req, res) => {
    console.log(`404 NOT FOUND: ${req.method} ${req.url}`);
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found on this server.` });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        await pool.query('SELECT NOW()');
        console.log('PostgreSQL Connected Successfully');
    } catch (err) {
        console.error('PostgreSQL Connection Error:', err.message);
    }
});