import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, extname, join } from 'path';
import fs from 'fs';
import multer from 'multer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsRoot = join(__dirname, 'uploads');
const verifiedChefUploadDir = join(uploadsRoot, 'verified-chef-applications');
fs.mkdirSync(verifiedChefUploadDir, { recursive: true });

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// Simple logging middleware
app.use((req, res, next) => {
    console.log(`REQ: ${req.method} ${req.url}`);
    next();
});

// Serve static files from dist directory (built frontend)
app.use(express.static('dist'));
app.use('/uploads', express.static(uploadsRoot));

const applicationUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, verifiedChefUploadDir),
        filename: (_req, file, cb) => {
            const safeBase = file.originalname
                .replace(extname(file.originalname), '')
                .replace(/[^a-zA-Z0-9_-]/g, '-')
                .slice(0, 40) || 'document';
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}-${safeBase}${extname(file.originalname).toLowerCase()}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = new Set([
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp'
        ]);
        if (!allowedTypes.has(file.mimetype)) {
            return cb(new Error('Only PDF, JPG, PNG, and WEBP files are allowed.'));
        }
        cb(null, true);
    }
});

const uploadApplicationFiles = applicationUpload.fields([
    { name: 'cv_file', maxCount: 1 },
    { name: 'certificate_file', maxCount: 1 }
]);

app.get('/api/debug', (req, res) => res.json({ message: 'API is reachable!', routes: ['/api/auth/register', '/api/auth/login', '/api/supplier/inventory'] }));

// PostgreSQL connection pool
const pool = new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: process.env.PGPORT || 5432,
});

async function requireAdmin(userId, db = pool) {
    if (!userId) {
        const error = new Error('adminId required.');
        error.statusCode = 400;
        throw error;
    }

    const result = await db.query('SELECT user_id FROM "Administrator" WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
        const error = new Error('Administrator access required.');
        error.statusCode = 403;
        throw error;
    }
}

async function ensureChallengeWorkflowSchema() {
    await pool.query(`
        ALTER TABLE "KitchenChallenge"
        ADD COLUMN IF NOT EXISTS creator_id INT REFERENCES "VerifiedChef"(user_id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS winner_id INT REFERENCES "User"(user_id) ON DELETE SET NULL;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS "ChallengeSubmission" (
            submission_id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
            challenge_id INT NOT NULL REFERENCES "KitchenChallenge"(challenge_id) ON DELETE CASCADE,
            recipe_id INT NOT NULL REFERENCES "Recipe"(recipe_id) ON DELETE CASCADE,
            photo_url TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_by INT REFERENCES "User"(user_id) ON DELETE SET NULL,
            review_note TEXT,
            reviewed_at TIMESTAMP,
            UNIQUE (user_id, challenge_id, recipe_id)
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS "ChallengeReward" (
            reward_id SERIAL PRIMARY KEY,
            challenge_id INT NOT NULL REFERENCES "KitchenChallenge"(challenge_id) ON DELETE CASCADE,
            user_id INT NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
            reward_points INT NOT NULL DEFAULT 0,
            awarded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (challenge_id, user_id)
        );
    `);
}

async function ensureMockAdminAccount() {
    const username = process.env.MOCK_ADMIN_USERNAME || 'mockadmin';
    const email = process.env.MOCK_ADMIN_EMAIL || 'mockadmin@mealdeal.local';
    const password = process.env.MOCK_ADMIN_PASSWORD || 'mockadmin123';
    const passwordHash = await bcrypt.hash(password, 10);
    let client;

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT user_id FROM "User" WHERE username = $1 OR email = $2 LIMIT 1',
            [username, email]
        );

        let userId;
        if (existing.rows.length > 0) {
            userId = existing.rows[0].user_id;
            await client.query(
                'UPDATE "User" SET username = $1, email = $2, password_hash = $3 WHERE user_id = $4',
                [username, email, passwordHash, userId]
            );
        } else {
            const created = await client.query(
                'INSERT INTO "User" (username, email, password_hash, join_date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING user_id',
                [username, email, passwordHash]
            );
            userId = created.rows[0].user_id;
        }

        await client.query(
            `INSERT INTO "Administrator" (user_id, role_level, note)
             VALUES ($1, 'System Admin', 'Seeded demo admin account')
             ON CONFLICT (user_id) DO UPDATE
             SET role_level = EXCLUDED.role_level,
                 note = EXCLUDED.note`,
            [userId]
        );

        await client.query('COMMIT');
        console.log(`Mock admin ready: ${email} / ${password}`);
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('MOCK ADMIN SEED ERROR:', error.message);
    } finally {
        if (client) client.release();
    }
}

function handleAdminError(res, error, label) {
    console.error(label, error);
    res.status(error.statusCode || 500).json({
        message: error.statusCode ? error.message : 'Admin operation failed.',
        detail: error.statusCode ? undefined : error.message
    });
}

// Authentication Endpoints

// REGISTER
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, role, address, locationName } = req.body;
    const isSupplier = role === 'local_supplier';
    const publicRole = isSupplier ? 'Local Supplier' : 'Home Cook';
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

        if (isSupplier && (!address || !locationName)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Address and location name are required for Local Supplier accounts.' });
        }

        // 2. Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // 3. Insert base User record
        const userResult = await client.query(
            'INSERT INTO "User" (username, email, password_hash, join_date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING user_id',
            [username, email, passwordHash]
        );
        const userId = userResult.rows[0].user_id;

        // 4. Insert into role-specific tables
        if (isSupplier) {
            await client.query(
                'INSERT INTO "LocalSupplier" (user_id, address, location_name) VALUES ($1, $2, $3)',
                [userId, address, locationName]
            );
        } else {
            await client.query('INSERT INTO "RecipeCreator" (user_id) VALUES ($1)', [userId]);
            await client.query('INSERT INTO "HomeCook" (user_id) VALUES ($1)', [userId]);
        }

        await client.query('COMMIT');
        res.status(201).json({ user_id: userId, username, email, role: publicRole });

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
        WHEN vc.user_id IS NOT NULL AND vc.status IN ('active', 'approved') THEN 'Verified Chef'
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

// VERIFIED CHEF APPLICATION WORKFLOW
app.post('/api/verified-chef-applications', uploadApplicationFiles, async (req, res) => {
    const {
        userId,
        full_name,
        biography,
        cooking_experience,
        education,
        certificates,
        awards,
        professional_experience,
        portfolio_url,
        cv_text
    } = req.body;
    const cvFilePath = req.files?.cv_file?.[0] ? `/uploads/verified-chef-applications/${req.files.cv_file[0].filename}` : null;
    const certificateFilePath = req.files?.certificate_file?.[0] ? `/uploads/verified-chef-applications/${req.files.certificate_file[0].filename}` : null;

    if (!userId || !full_name) {
        return res.status(400).json({ message: 'userId and full_name are required.' });
    }

    try {
        const homeCook = await pool.query('SELECT user_id FROM "HomeCook" WHERE user_id = $1', [userId]);
        if (homeCook.rows.length === 0) {
            return res.status(403).json({ message: 'Only Home Cooks can apply for Verified Chef status.' });
        }

        const existingChef = await pool.query(
            'SELECT user_id FROM "VerifiedChef" WHERE user_id = $1 AND status IN (\'active\', \'approved\')',
            [userId]
        );
        if (existingChef.rows.length > 0) {
            return res.status(400).json({ message: 'This user is already a Verified Chef.' });
        }

        const pending = await pool.query(
            'SELECT application_id FROM "VerifiedChefApplication" WHERE user_id = $1 AND status = \'pending\'',
            [userId]
        );
        if (pending.rows.length > 0) {
            return res.status(400).json({ message: 'You already have a pending application.' });
        }

        const result = await pool.query(`
            INSERT INTO "VerifiedChefApplication" (
                user_id, full_name, biography, cooking_experience, education,
                certificates, awards, professional_experience, portfolio_url,
                cv_file_path, certificate_file_path, cv_text
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `, [
            userId,
            full_name,
            biography || null,
            cooking_experience || null,
            education || null,
            certificates || null,
            awards || null,
            professional_experience || null,
            portfolio_url || null,
            cvFilePath,
            certificateFilePath,
            cv_text || null
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('VERIFIED CHEF APPLICATION CREATE ERROR:', error);
        res.status(500).json({ message: 'Error submitting application.', detail: error.message });
    }
});

app.get('/api/my/verified-chef-application', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId required.' });

    try {
        const result = await pool.query(`
            SELECT *
            FROM "VerifiedChefApplication"
            WHERE user_id = $1
            ORDER BY submitted_at DESC
            LIMIT 1;
        `, [userId]);

        res.json(result.rows[0] || null);
    } catch (error) {
        console.error('MY VERIFIED CHEF APPLICATION ERROR:', error);
        res.status(500).json({ message: 'Error fetching application.', detail: error.message });
    }
});

app.get('/api/admin/verified-chef-applications/summary', async (req, res) => {
    const { adminId } = req.query;
    if (!adminId) return res.status(400).json({ message: 'adminId required.' });

    try {
        const admin = await pool.query('SELECT user_id FROM "Administrator" WHERE user_id = $1', [adminId]);
        if (admin.rows.length === 0) {
            return res.status(403).json({ message: 'Administrator access required.' });
        }

        const result = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
                COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
                COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
                (SELECT COUNT(*) FROM "VerifiedChef" WHERE status IN ('active', 'approved')) AS verified_chef_count
            FROM "VerifiedChefApplication";
        `);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('ADMIN APPLICATION SUMMARY ERROR:', error);
        res.status(500).json({ message: 'Error fetching summary.', detail: error.message });
    }
});

app.get('/api/admin/verified-chef-applications', async (req, res) => {
    const { adminId, status } = req.query;
    if (!adminId) return res.status(400).json({ message: 'adminId required.' });

    try {
        const admin = await pool.query('SELECT user_id FROM "Administrator" WHERE user_id = $1', [adminId]);
        if (admin.rows.length === 0) {
            return res.status(403).json({ message: 'Administrator access required.' });
        }

        const params = [];
        let where = '';
        if (['pending', 'approved', 'rejected'].includes(status)) {
            params.push(status);
            where = 'WHERE vca.status = $1';
        }

        const result = await pool.query(`
            SELECT
                vca.*,
                u.username,
                u.email,
                reviewer.username AS reviewed_by_username
            FROM "VerifiedChefApplication" vca
            JOIN "User" u ON u.user_id = vca.user_id
            LEFT JOIN "User" reviewer ON reviewer.user_id = vca.reviewed_by
            ${where}
            ORDER BY
                CASE WHEN vca.status = 'pending' THEN 0 ELSE 1 END,
                vca.submitted_at DESC;
        `, params);

        res.json(result.rows);
    } catch (error) {
        console.error('ADMIN APPLICATION LIST ERROR:', error);
        res.status(500).json({ message: 'Error fetching applications.', detail: error.message });
    }
});

app.get('/api/admin/verified-chef-applications/:applicationId', async (req, res) => {
    const { adminId } = req.query;
    const { applicationId } = req.params;
    if (!adminId) return res.status(400).json({ message: 'adminId required.' });

    try {
        const admin = await pool.query('SELECT user_id FROM "Administrator" WHERE user_id = $1', [adminId]);
        if (admin.rows.length === 0) {
            return res.status(403).json({ message: 'Administrator access required.' });
        }

        const result = await pool.query(`
            SELECT vca.*, u.username, u.email
            FROM "VerifiedChefApplication" vca
            JOIN "User" u ON u.user_id = vca.user_id
            WHERE vca.application_id = $1;
        `, [applicationId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Application not found.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('ADMIN APPLICATION DETAIL ERROR:', error);
        res.status(500).json({ message: 'Error fetching application.', detail: error.message });
    }
});

app.patch('/api/admin/verified-chef-applications/:applicationId/status', async (req, res) => {
    const { applicationId } = req.params;
    const { adminId, status, admin_note } = req.body;

    if (!adminId || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'adminId and a valid status are required.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const admin = await client.query('SELECT user_id FROM "Administrator" WHERE user_id = $1', [adminId]);
        if (admin.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Administrator access required.' });
        }

        const appResult = await client.query(
            'SELECT * FROM "VerifiedChefApplication" WHERE application_id = $1 FOR UPDATE',
            [applicationId]
        );
        if (appResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Application not found.' });
        }

        const application = appResult.rows[0];
        if (application.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Only pending applications can be reviewed.' });
        }

        const updated = await client.query(`
            UPDATE "VerifiedChefApplication"
            SET status = $1,
                admin_note = $2,
                reviewed_at = CURRENT_TIMESTAMP,
                reviewed_by = $3
            WHERE application_id = $4
            RETURNING *;
        `, [status, admin_note || null, adminId, applicationId]);

        if (status === 'approved') {
            await client.query(
                'INSERT INTO "RecipeCreator" (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
                [application.user_id]
            );
            await client.query(`
                INSERT INTO "VerifiedChef" (user_id, verification_date, status)
                VALUES ($1, CURRENT_DATE, 'approved')
                ON CONFLICT (user_id)
                DO UPDATE SET verification_date = CURRENT_DATE, status = 'approved';
            `, [application.user_id]);
        }

        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('ADMIN APPLICATION STATUS ERROR:', error);
        res.status(500).json({ message: 'Error reviewing application.', detail: error.message });
    } finally {
        if (client) client.release();
    }
});

app.get('/api/users/:id/role', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.user_id, u.username, u.email,
            CASE
                WHEN a.user_id IS NOT NULL THEN 'Administrator'
                WHEN vc.user_id IS NOT NULL AND vc.status IN ('active', 'approved') THEN 'Verified Chef'
                WHEN hc.user_id IS NOT NULL THEN 'Home Cook'
                WHEN ls.user_id IS NOT NULL THEN 'Local Supplier'
                ELSE 'User'
            END AS role
            FROM "User" u
            LEFT JOIN "Administrator" a ON a.user_id = u.user_id
            LEFT JOIN "VerifiedChef" vc ON vc.user_id = u.user_id
            LEFT JOIN "HomeCook" hc ON hc.user_id = u.user_id
            LEFT JOIN "LocalSupplier" ls ON ls.user_id = u.user_id
            WHERE u.user_id = $1;
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('USER ROLE ERROR:', error);
        res.status(500).json({ message: 'Error fetching user role.', detail: error.message });
    }
});

// ADMIN OPERATIONS DASHBOARD
app.get('/api/admin/dashboard-summary', async (req, res) => {
    const { adminId } = req.query;

    try {
        await requireAdmin(adminId);

        const result = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM "VerifiedChefApplication" WHERE status = 'pending')::int AS pending_applications,
                (SELECT COUNT(*) FROM "HomeCook")::int AS home_cooks,
                (SELECT COUNT(*) FROM "VerifiedChef" WHERE status IN ('active', 'approved'))::int AS verified_chefs,
                (SELECT COUNT(*) FROM "Recipe")::int AS total_recipes,
                (SELECT COUNT(*) FROM "KitchenChallenge" WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE)::int AS active_challenges,
                (SELECT COUNT(*) FROM "LocalSupplier")::int AS suppliers,
                (SELECT COUNT(*) FROM "Comment")::int AS comments,
                (SELECT COUNT(*) FROM "Order")::int AS orders;
        `);

        res.json(result.rows[0]);
    } catch (error) {
        handleAdminError(res, error, 'ADMIN SUMMARY ERROR:');
    }
});

app.get('/api/admin/users', async (req, res) => {
    const { adminId } = req.query;

    try {
        await requireAdmin(adminId);

        const result = await pool.query(`
            SELECT
                u.user_id,
                u.username,
                u.email,
                u.join_date,
                CASE
                    WHEN a.user_id IS NOT NULL THEN 'Administrator'
                    WHEN vc.user_id IS NOT NULL AND vc.status IN ('active', 'approved') THEN 'Verified Chef'
                    WHEN hc.user_id IS NOT NULL THEN 'Home Cook'
                    WHEN ls.user_id IS NOT NULL THEN 'Local Supplier'
                    ELSE 'User'
                END AS role
            FROM "User" u
            LEFT JOIN "Administrator" a ON a.user_id = u.user_id
            LEFT JOIN "VerifiedChef" vc ON vc.user_id = u.user_id
            LEFT JOIN "HomeCook" hc ON hc.user_id = u.user_id
            LEFT JOIN "LocalSupplier" ls ON ls.user_id = u.user_id
            ORDER BY u.join_date DESC
            LIMIT 100;
        `);

        res.json(result.rows);
    } catch (error) {
        handleAdminError(res, error, 'ADMIN USERS ERROR:');
    }
});

app.get('/api/admin/suppliers', async (req, res) => {
    const { adminId } = req.query;

    try {
        await requireAdmin(adminId);

        const result = await pool.query(`
            SELECT
                ls.user_id,
                u.username,
                u.email,
                ls.location_name,
                ls.address,
                COUNT(si.inventory_id)::int AS inventory_items
            FROM "LocalSupplier" ls
            JOIN "User" u ON u.user_id = ls.user_id
            LEFT JOIN "SupplierInventory" si ON si.supplier_id = ls.user_id
            GROUP BY ls.user_id, u.username, u.email, ls.location_name, ls.address
            ORDER BY ls.location_name ASC;
        `);

        res.json(result.rows);
    } catch (error) {
        handleAdminError(res, error, 'ADMIN SUPPLIERS ERROR:');
    }
});

app.get('/api/admin/challenges', async (req, res) => {
    const { adminId } = req.query;

    try {
        await requireAdmin(adminId);

        const result = await pool.query(`
            SELECT
                kc.challenge_id,
                kc.title,
                kc.description,
                kc.start_date,
                kc.end_date,
                COUNT(DISTINCT hcc.user_id)::int AS participants,
                CASE
                    WHEN kc.start_date > CURRENT_DATE THEN 'upcoming'
                    WHEN kc.end_date < CURRENT_DATE THEN 'completed'
                    ELSE 'active'
                END AS status
            FROM "KitchenChallenge" kc
            LEFT JOIN "HomeCook_Challenge" hcc ON hcc.challenge_id = kc.challenge_id
            GROUP BY kc.challenge_id
            ORDER BY kc.start_date DESC;
        `);

        res.json(result.rows);
    } catch (error) {
        handleAdminError(res, error, 'ADMIN CHALLENGES ERROR:');
    }
});

app.delete('/api/admin/challenges/:challengeId', async (req, res) => {
    const { adminId } = req.body;
    const { challengeId } = req.params;

    try {
        await requireAdmin(adminId);

        const result = await pool.query(
            'DELETE FROM "KitchenChallenge" WHERE challenge_id = $1 RETURNING challenge_id',
            [challengeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Challenge not found.' });
        }

        res.json({ message: 'Challenge removed.' });
    } catch (error) {
        handleAdminError(res, error, 'ADMIN DELETE CHALLENGE ERROR:');
    }
});

app.get('/api/admin/recipes', async (req, res) => {
    const { adminId } = req.query;

    try {
        await requireAdmin(adminId);

        const result = await pool.query(`
            SELECT
                r.recipe_id,
                r.title,
                r.visibility,
                r.creation_time,
                r.difficulty_level,
                u.username AS creator_name,
                COALESCE(ROUND(AVG(c.rating)::numeric, 1), 0)::text AS avg_rating,
                COUNT(c.comment_id)::int AS comments
            FROM "Recipe" r
            JOIN "User" u ON u.user_id = r.creator_id
            LEFT JOIN "Comment" c ON c.recipe_id = r.recipe_id
            GROUP BY r.recipe_id, u.username
            ORDER BY r.creation_time DESC
            LIMIT 100;
        `);

        res.json(result.rows);
    } catch (error) {
        handleAdminError(res, error, 'ADMIN RECIPES ERROR:');
    }
});

app.patch('/api/admin/recipes/:recipeId/visibility', async (req, res) => {
    const { adminId, visibility } = req.body;
    const { recipeId } = req.params;

    if (!['public', 'private'].includes(visibility)) {
        return res.status(400).json({ message: 'visibility must be public or private.' });
    }

    try {
        await requireAdmin(adminId);

        const result = await pool.query(
            'UPDATE "Recipe" SET visibility = $1 WHERE recipe_id = $2 RETURNING recipe_id, title, visibility',
            [visibility, recipeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Recipe not found.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        handleAdminError(res, error, 'ADMIN RECIPE VISIBILITY ERROR:');
    }
});

app.get('/api/admin/comments', async (req, res) => {
    const { adminId } = req.query;

    try {
        await requireAdmin(adminId);

        const result = await pool.query(`
            SELECT
                c.comment_id,
                c.comment_text,
                c.review_text,
                c.rating,
                c.creation_time,
                u.username,
                r.title AS recipe_title
            FROM "Comment" c
            JOIN "User" u ON u.user_id = c.user_id
            JOIN "Recipe" r ON r.recipe_id = c.recipe_id
            ORDER BY c.creation_time DESC
            LIMIT 100;
        `);

        res.json(result.rows);
    } catch (error) {
        handleAdminError(res, error, 'ADMIN COMMENTS ERROR:');
    }
});

app.delete('/api/admin/comments/:commentId', async (req, res) => {
    const { adminId } = req.body;
    const { commentId } = req.params;

    try {
        await requireAdmin(adminId);

        const result = await pool.query(
            'DELETE FROM "Comment" WHERE comment_id = $1 RETURNING comment_id',
            [commentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Comment not found.' });
        }

        res.json({ message: 'Comment removed.' });
    } catch (error) {
        handleAdminError(res, error, 'ADMIN DELETE COMMENT ERROR:');
    }
});

// --- RECIPE ENDPOINTS ---



// CREATE Recipe
app.post('/api/recipes', async (req, res) => {
    const { creator_id, title, description, preparation_steps, media_url, cook_time_min, difficulty_level, dietary_tag, base_servings, visibility, ingredients } = req.body;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Insert Recipe
        const recipeResult = await client.query(`
            INSERT INTO "Recipe" (creator_id, title, description, preparation_steps, media_url, cook_time_min, difficulty_level, dietary_tag, base_servings, visibility)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
            base_servings || 1,
            visibility || 'public'
        ]);

        const recipeId = recipeResult.rows[0].recipe_id;

        // Insert Ingredients
        if (ingredients && ingredients.length > 0) {
            for (const ing of ingredients) {
                let actualIngredientId = ing.ingredient_id;

                // Ensure ingredient exists in local DB (case-insensitive)
                const ingredientName = (ing.name || '').trim();
                const existingCheck = await client.query('SELECT ingredient_id, allowed_units FROM "Ingredient" WHERE name ILIKE $1', [ingredientName]);
                if (existingCheck.rows.length > 0) {
                    actualIngredientId = existingCheck.rows[0].ingredient_id;
                    
                    // Validate unit is allowed (trim spaces)
                    const allowedUnits = existingCheck.rows[0].allowed_units.split(',').map(u => u.trim());
                    if (!allowedUnits.includes(ing.unit.trim())) {
                        throw new Error(`Invalid unit "${ing.unit}" for ingredient "${ingredientName}". Allowed units: ${existingCheck.rows[0].allowed_units}`);
                    }
                } else {
                    // Insert the external ingredient with default allowed units (including adet)
                    const newIng = await client.query('INSERT INTO "Ingredient" (name, allowed_units) VALUES ($1, $2) RETURNING ingredient_id', [ingredientName, 'kg,g,pc,adet,L,ml,tbsp,tsp,oz,cup']);
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
        const creatorCheck = await pool.query(`
            SELECT
                rc.user_id AS recipe_creator_id,
                hc.user_id AS home_cook_id,
                vc.user_id AS verified_chef_id
            FROM "User" u
            LEFT JOIN "RecipeCreator" rc ON rc.user_id = u.user_id
            LEFT JOIN "HomeCook" hc ON hc.user_id = u.user_id
            LEFT JOIN "VerifiedChef" vc ON vc.user_id = u.user_id AND vc.status IN ('active', 'approved')
            WHERE u.user_id = $1
        `,
            [userId]
        );

        if (
            creatorCheck.rows.length === 0 ||
            (!creatorCheck.rows[0].recipe_creator_id && !creatorCheck.rows[0].home_cook_id && !creatorCheck.rows[0].verified_chef_id)
        ) {
            return res.status(403).json({ message: 'Creator royalty dashboard is only available to recipe creators.' });
        }

        if (!creatorCheck.rows[0].recipe_creator_id) {
            await pool.query(
                'INSERT INTO "RecipeCreator" (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
                [userId]
            );
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

// GET /api/ingredients/suppliers - Find suppliers for a specific ingredient by name
app.get('/api/ingredients/suppliers', async (req, res) => {
    const ingredientName = req.query.name;
    if (!ingredientName) {
        return res.status(400).json({ message: 'Ingredient name is required' });
    }

    try {
        const query = `
            SELECT 
                si.inventory_id,
                ls.user_id AS supplier_id,
                u.username AS supplier_name,
                ls.location_name,
                i.ingredient_id,
                i.name AS ingredient_name,
                si.unit,
                si.price,
                si.package_size,
                si.available_qty
            FROM "SupplierInventory" si
            JOIN "Ingredient" i ON i.ingredient_id = si.ingredient_id
            JOIN "LocalSupplier" ls ON ls.user_id = si.supplier_id
            JOIN "User" u ON u.user_id = ls.user_id
            WHERE i.name ILIKE $1 AND si.available_qty > 0
            ORDER BY si.price ASC;
        `;
        const result = await pool.query(query, [ingredientName]);
        res.json(result.rows);
    } catch (error) {
        console.error('INGREDIENT SUPPLIERS ERROR:', error);
        res.status(500).json({ message: 'Error fetching ingredient suppliers.' });
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
        let ingRes = await client.query('SELECT ingredient_id, allowed_units FROM "Ingredient" WHERE name ILIKE $1', [ingredient_name.trim()]);
        let ingredientId;
        let allowedUnits;

        if (ingRes.rows.length > 0) {
            ingredientId = ingRes.rows[0].ingredient_id;
            allowedUnits = ingRes.rows[0].allowed_units;
            console.log(`FOUND EXISTING INGREDIENT: "${ingredient_name.trim()}" with ID ${ingredientId}, allowed units: ${allowedUnits}`);
            
            // Validate unit
            const allowedUnitsArray = allowedUnits.split(',');
            if (!allowedUnitsArray.includes(unit)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    message: `Invalid unit "${unit}" for ingredient "${ingredient_name.trim()}". Allowed units: ${allowedUnits}`,
                    allowedUnits: allowedUnitsArray
                });
            }
        } else {
            // Create new ingredient with default allowed units
            let newIngRes = await client.query('INSERT INTO "Ingredient" (name, allowed_units) VALUES ($1, $2) RETURNING ingredient_id', [ingredient_name.trim(), 'kg,g,pc']);
            ingredientId = newIngRes.rows[0].ingredient_id;
            console.log(`CREATED NEW INGREDIENT: "${ingredient_name.trim()}" with ID ${ingredientId}`);
        }

        // Insert into SupplierInventory
        const query = `
            INSERT INTO "SupplierInventory" (supplier_id, ingredient_id, unit, price, package_size, available_qty)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const result = await client.query(query, [supplier_id, ingredientId, unit, price, package_size, available_qty]);
        console.log(`ADDED INVENTORY: Supplier ${supplier_id}, Ingredient ${ingredientId} (${ingredient_name.trim()}), Qty: ${available_qty}`);

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

// --- SUPPLIER ORDER ENDPOINTS ---

// GET Supplier Orders
app.get('/api/supplier/orders', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ message: 'userId required' });

    try {
        const query = `
            SELECT 
                o.order_id, 
                o.order_date, 
                o.total_amount, 
                o.status,
                u.username AS buyer_name,
                json_agg(json_build_object(
                    'item_name', i.name,
                    'qty', ci.qty,
                    'price', ci.unit_price,
                    'unit', si.unit
                )) AS items
            FROM "Order" o
            JOIN "Cart" c ON o.cart_id = c.cart_id
            JOIN "User" u ON c.user_id = u.user_id
            JOIN "CartItem" ci ON ci.cart_id = c.cart_id
            JOIN "SupplierInventory" si ON ci.inventory_id = si.inventory_id
            JOIN "Ingredient" i ON si.ingredient_id = i.ingredient_id
            WHERE si.supplier_id = $1
            GROUP BY o.order_id, u.username
            ORDER BY o.order_date DESC;
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('SUPPLIER ORDERS ERROR:', error);
        res.status(500).json({ message: 'Error fetching supplier orders.' });
    }
});

// FULFILL Order
app.put('/api/supplier/orders/:id/fulfill', async (req, res) => {
    const orderId = req.params.id;
    try {
        await pool.query('UPDATE "Order" SET status = \'fulfilled\' WHERE order_id = $1', [orderId]);
        res.json({ message: 'Order marked as fulfilled.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fulfilling order.' });
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
                r.description,
                r.preparation_steps,
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
                                                'pricePerUnit', COALESCE((SELECT MIN(price) FROM "SupplierInventory" WHERE ingredient_id = i.ingredient_id AND available_qty > 0), 0.10),
                        'status', CASE 
                                                                        WHEN COALESCE((SELECT SUM(available_qty) FROM "SupplierInventory" WHERE ingredient_id = i.ingredient_id AND available_qty > 0), 0) > 0 THEN 'available'
                                    ELSE 'missing' 
                                  END,
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
                                                            AND si.available_qty > 0
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
            description: row.description,
            chef: row.chef,
            rating: parseFloat(row.rating),
            time: row.time,
            difficulty: row.difficulty,
            category: row.category,
            base_servings: row.base_servings,
            image: MOCK_IMAGES[index % MOCK_IMAGES.length],
            ingredients: row.ingredients,
            steps: row.preparation_steps
                ? row.preparation_steps.split('\n').map(s => s.trim()).filter(Boolean)
                : ['Prepare ingredients.', 'Cook according to best practices.', 'Serve and enjoy!'],
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

// GET /api/recipes/:id/inventory — live ingredient supplier availability for recipe detail screen
app.get('/api/recipes/:id/inventory', async (req, res) => {
    const recipeId = req.params.id;
    console.log(`FETCHING INVENTORY FOR RECIPE ${recipeId}`);
    try {
        const recipeExists = await pool.query('SELECT recipe_id FROM "Recipe" WHERE recipe_id = $1 LIMIT 1', [recipeId]);
        if (recipeExists.rows.length === 0) {
            return res.status(404).json({ message: 'Recipe not found.' });
        }

        const query = `
            SELECT COALESCE(json_agg(json_build_object(
                'id', i.ingredient_id,
                'name', i.name,
                'baseQty', ri.qty,
                'unit', ri.unit,
                'pricePerUnit', COALESCE((
                    SELECT MIN(si_min.price)
                    FROM "SupplierInventory" si_min
                    WHERE si_min.ingredient_id = i.ingredient_id AND si_min.available_qty > 0
                ), 0.10),
                'suppliers', COALESCE((
                    SELECT json_agg(json_build_object(
                        'inventory_id', si.inventory_id,
                        'supplier_id', su.user_id,
                        'supplier_name', su.username,
                        'location_name', ls.location_name,
                        'price', si.price,
                        'unit', si.unit,
                        'available_qty', si.available_qty
                    ) ORDER BY si.price ASC)
                    FROM "SupplierInventory" si
                    JOIN "LocalSupplier" ls ON ls.user_id = si.supplier_id
                    JOIN "User" su ON su.user_id = ls.user_id
                    WHERE si.ingredient_id = i.ingredient_id
                      AND si.available_qty > 0
                ), '[]'::json)
            )), '[]'::json) AS ingredients
            FROM "Recipe_Ingredient" ri
            JOIN "Ingredient" i ON i.ingredient_id = ri.ingredient_id
            WHERE ri.recipe_id = $1;
        `;

        const result = await pool.query(query, [recipeId]);
        console.log(`RECIPE ${recipeId} INVENTORY:`, JSON.stringify(result.rows[0]?.ingredients, null, 2));
        res.json({ recipe_id: Number(recipeId), ingredients: result.rows[0]?.ingredients || [] });
    } catch (error) {
        console.error('RECIPE INVENTORY API ERROR:', error);
        res.status(500).json({ message: 'Error fetching recipe inventory.', detail: error.message });
    }
});

// =============================================================
// AI SUBSTITUTION ENDPOINT (server-side Gemini proxy)
// =============================================================
app.post('/api/ai/substitute', async (req, res) => {
    const { ingredientName, userPrompt, currentPrice } = req.body;
    if (!ingredientName || !userPrompt) {
        return res.status(400).json({ message: 'ingredientName and userPrompt are required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ message: 'AI service is not configured on this server.' });
    }

    const systemPrompt = "You are an expert culinary AI assistant for 'MealDeal', a Farm-to-Table marketplace. A user needs an ingredient substitution based on local availability, dietary restrictions, or personal requests. You must return a JSON object with strictly these three fields: 'suggestion' (the specific name of the substitute), 'suggestedPrice' (a reasonable estimated unit price as a number, e.g., 1.50), and 'reason' (a 1-2 sentence explanation of why this is a good substitute based on the user's prompt).";
    const prompt = `I need a substitute for ${ingredientName}. My specific request or constraint is: "${userPrompt}". Currently, the original ingredient costs $${Number(currentPrice || 0).toFixed(2)} per unit. Give me a creative and practical alternative.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'OBJECT',
                properties: {
                    suggestion: { type: 'STRING' },
                    suggestedPrice: { type: 'NUMBER' },
                    reason: { type: 'STRING' }
                },
                required: ['suggestion', 'suggestedPrice', 'reason']
            }
        }
    };

    const delays = [1000, 2000, 4000];
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            const geminiRes = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!geminiRes.ok) {
                const errText = await geminiRes.text();
                throw new Error(`Gemini API error ${geminiRes.status}: ${errText}`);
            }
            const data = await geminiRes.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Empty response from Gemini');
            const parsed = JSON.parse(text);
            return res.json(parsed);
        } catch (err) {
            console.error(`[AI Substitute] Attempt ${attempt + 1} failed:`, err.message);
            if (attempt === 3) {
                return res.status(502).json({ message: `AI service failed: ${err.message}` });
            }
            await new Promise(r => setTimeout(r, delays[attempt]));
        }
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

    // Unit conversion helper (mirrors src/utils/unitConversion.js)
    const UNIT_GROUPS_SERVER = {
        weight: { units: ['kg','g','mg','lb','oz'], toBase: { kg:1000, g:1, mg:0.001, lb:453.592, oz:28.3495 } },
        volume: { units: ['L','ml','cup','tbsp','tsp'], toBase: { L:1000, ml:1, cup:236.588, tbsp:14.7868, tsp:4.92892 } },
        count:  { units: ['pc','pcs','bunch','clove','spear','can','adet'], toBase: { pc:1, pcs:1, bunch:1, clove:1, spear:1, can:1, adet:1 } },
    };
    function convertAmount(amount, fromUnit, toUnit) {
        if (!fromUnit || !toUnit || fromUnit === toUnit) return amount;
        for (const [groupName, group] of Object.entries(UNIT_GROUPS_SERVER)) {
            if (group.units.includes(fromUnit) && group.units.includes(toUnit)) {
                if (groupName === 'count' && fromUnit !== toUnit) return null;
                const base = amount * group.toBase[fromUnit];
                return base / group.toBase[toUnit];
            }
        }
        return null; // incompatible units
    }

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
        // 2. Process each recipe/marketplace item as its own cart so recipe
        // purchases can be counted correctly in creator royalties.
        if (items && items.length > 0) {
            console.log(`\x1b[32m[CHECKOUT START]\x1b[0m User: ${effectiveUserId}`);
            
            for (const cartEntry of items) {
                const ingredients = cartEntry.recipe.cartIngredients || [];
                // For direct marketplace items (isIngredientOnly), baseQty=1 and servings=qty bought.
                // For recipe items, scale by servings / base_servings.
                const isIngredientOnly = !!cartEntry.recipe.isIngredientOnly;
                const servingsFactor = isIngredientOnly
                    ? Number(cartEntry.servings || 1)
                    : Number(cartEntry.servings || 2) / Number(cartEntry.recipe.base_servings || 2);
                const recipeId = isIngredientOnly
                    ? null
                    : parseInt(cartEntry.recipe.id || cartEntry.recipe.recipe_id) || null;
                const targetServings = Math.max(1, parseInt(cartEntry.servings || 1) || 1);
                const itemTotal = Number(cartEntry.recipe.finalPrice ?? cartEntry.totalPrice ?? totalAmount ?? 0);
                const cartRes = await client.query(
                    'INSERT INTO "Cart" (user_id, recipe_id, target_servings) VALUES ($1, $2, $3) RETURNING cart_id',
                    [effectiveUserId, recipeId, targetServings]
                );
                const cartId = cartRes.rows[0].cart_id;

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
                            `SELECT si.inventory_id, si.supplier_id, ls.location_name, si.price, si.available_qty, si.unit
                             FROM "SupplierInventory" si
                             JOIN "LocalSupplier" ls ON ls.user_id = si.supplier_id
                             WHERE si.inventory_id = $1 AND si.available_qty > 0`, 
                            [ing.selectedInventoryId]
                        );
                    } else {
                        // Seçmemişse en ucuzunu bul
                        invRes = await client.query(
                            `SELECT si.inventory_id, si.supplier_id, ls.location_name, si.price, si.available_qty, si.unit
                             FROM "SupplierInventory" si
                             JOIN "LocalSupplier" ls ON ls.user_id = si.supplier_id
                             WHERE si.ingredient_id = $1 AND si.available_qty > 0 
                             ORDER BY si.price ASC LIMIT 1`, 
                            [ingId]
                        );
                    }
                    
                    if (invRes.rows.length > 0) {
                        const inv = invRes.rows[0];
                        const recipeQty = Number(ing.baseQty || 1) * servingsFactor;
                        const recipeUnit = (ing.unit || '').trim();
                        const supplierUnit = (inv.unit || '').trim();

                        // Convert recipe quantity into supplier's unit before deducting
                        let qtyToDeduct = recipeQty;
                        if (recipeUnit && supplierUnit && recipeUnit !== supplierUnit) {
                            const converted = convertAmount(recipeQty, recipeUnit, supplierUnit);
                            if (converted !== null) {
                                qtyToDeduct = converted;
                            }
                            // If units are incompatible (e.g. kg vs L), fall back to raw qty
                        }

                        const newQty = Math.max(0, Number(inv.available_qty) - qtyToDeduct);
                        
                        console.log(`    - Processing: ${ing.name} | ${recipeQty} ${recipeUnit} → ${qtyToDeduct} ${supplierUnit} deducted from "${inv.location_name}" (had ${inv.available_qty} ${supplierUnit})`);

                        await client.query(
                            'INSERT INTO "CartItem" (cart_id, inventory_id, qty, unit_price) VALUES ($1, $2, $3, $4)', 
                            [cartId, inv.inventory_id, qtyToDeduct, inv.price]
                        );

                        // Always UPDATE (never DELETE) to preserve FK references from CartItem
                        await client.query('UPDATE "SupplierInventory" SET available_qty = $1 WHERE inventory_id = $2', [newQty, inv.inventory_id]);
                        if (newQty <= 0) {
                            console.log(`      ✓ Stock reached 0. Item marked as out of stock.`);
                        } else {
                            console.log(`      ✓ Stock updated. Remaining: ${newQty}`);
                        }
                    }
                }

                await client.query(
                    'INSERT INTO "Order" (cart_id, total_amount, status) VALUES ($1, $2, $3)',
                    [cartId, itemTotal || 0, 'confirmed']
                );
            }
        } else {
            const cartRes = await client.query(
                'INSERT INTO "Cart" (user_id, target_servings) VALUES ($1, 1) RETURNING cart_id',
                [effectiveUserId]
            );
            await client.query(
                'INSERT INTO "Order" (cart_id, total_amount, status) VALUES ($1, $2, $3)',
                [cartRes.rows[0].cart_id, totalAmount || 0, 'confirmed']
            );
        }

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
                kc.creator_id,
                kc.winner_id,
                u_winner.username AS winner_name,
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
            LEFT JOIN "User" u_winner ON u_winner.user_id = kc.winner_id
            GROUP BY kc.challenge_id, u_winner.username
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
        // Count total recipes in challenge
        const totalRes = await pool.query(
            'SELECT COUNT(*) AS total FROM "KitchenChallenge_Recipe" WHERE challenge_id = $1',
            [challengeId]
        );
        const total = parseInt(totalRes.rows[0].total);

        // Count approved submissions by this user
        const approvedRes = await pool.query(
            `SELECT recipe_id FROM "ChallengeSubmission" 
             WHERE challenge_id = $1 AND user_id = $2 AND status = 'approved'`,
            [challengeId, userId]
        );

        // Get all submissions to track status
        const allSubmissions = await pool.query(
            `SELECT submission_id, recipe_id, status, photo_url, review_note, submitted_at
             FROM "ChallengeSubmission"
             WHERE challenge_id = $1 AND user_id = $2`,
            [challengeId, userId]
        );

        const cooked_recipe_ids = approvedRes.rows.map(r => r.recipe_id);
        
        res.json({ 
            cooked_count: cooked_recipe_ids.length, 
            total, 
            cooked_recipe_ids,
            submissions: allSubmissions.rows
        });
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
                COUNT(DISTINCT cs.recipe_id) AS cooked_count
            FROM "HomeCook_Challenge" hcc
            JOIN "User" u ON u.user_id = hcc.user_id
            LEFT JOIN "ChallengeSubmission" cs 
                ON cs.user_id = hcc.user_id 
                AND cs.challenge_id = hcc.challenge_id
                AND cs.status = 'approved'
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

// POST /api/challenges — create new challenge (Verified Chef only)
app.post('/api/challenges', async (req, res) => {
    const creator_id = req.body.creator_id || req.body.userId;
    const { title, description, start_date, end_date } = req.body;

    if (!creator_id || !title || !start_date || !end_date) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Verify user is a Verified Chef
        const chefCheck = await pool.query(
            'SELECT user_id FROM "VerifiedChef" WHERE user_id = $1 AND status IN (\'active\', \'approved\')',
            [creator_id]
        );

        if (chefCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Only Verified Chefs can create challenges.' });
        }

        const result = await pool.query(
            `INSERT INTO "KitchenChallenge" (creator_id, title, description, start_date, end_date)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [creator_id, title, description || null, start_date, end_date]
        );

        res.json({ message: 'Challenge created successfully!', challenge: result.rows[0] });
    } catch (error) {
        console.error('CREATE CHALLENGE ERROR:', error);
        res.status(500).json({ message: 'Error creating challenge.', detail: error.message });
    }
});

// POST /api/challenges/:id/recipes — add recipe to challenge (Creator only)
app.post('/api/challenges/:id/recipes', async (req, res) => {
    const challengeId = req.params.id;
    const { userId, recipeId } = req.body;

    console.log('ADD RECIPE REQUEST:', { challengeId, userId, recipeId });

    if (!userId || !recipeId) {
        console.log('MISSING FIELDS:', { userId, recipeId });
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Check if user is the creator
        const challenge = await pool.query(
            'SELECT creator_id FROM "KitchenChallenge" WHERE challenge_id = $1',
            [challengeId]
        );

        console.log('CHALLENGE FOUND:', challenge.rows[0]);

        if (challenge.rows.length === 0) {
            return res.status(404).json({ message: 'Challenge not found.' });
        }

        if (challenge.rows[0].creator_id !== parseInt(userId)) {
            console.log('PERMISSION DENIED:', { creator_id: challenge.rows[0].creator_id, userId: parseInt(userId) });
            return res.status(403).json({ message: 'Only the challenge creator can add recipes.' });
        }

        // Add recipe to challenge
        await pool.query(
            `INSERT INTO "KitchenChallenge_Recipe" (challenge_id, recipe_id)
             VALUES ($1, $2)
             ON CONFLICT (challenge_id, recipe_id) DO NOTHING`,
            [challengeId, recipeId]
        );

        console.log('RECIPE ADDED SUCCESSFULLY');
        res.json({ message: 'Recipe added to challenge!' });
    } catch (error) {
        console.error('ADD RECIPE ERROR:', error);
        res.status(500).json({ message: 'Error adding recipe.', detail: error.message });
    }
});

// DELETE /api/challenges/:id — permanently delete a challenge (creator only)
app.delete('/api/challenges/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    let client;
    try {
        client = await pool.connect();
        // Verify ownership
        const check = await client.query('SELECT creator_id FROM "KitchenChallenge" WHERE challenge_id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ message: 'Challenge not found.' });
        if (parseInt(check.rows[0].creator_id) !== parseInt(userId)) {
            return res.status(403).json({ message: 'Only the creator can delete this challenge.' });
        }
        await client.query('BEGIN');
        await client.query('DELETE FROM "ChallengeSubmission" WHERE challenge_id = $1', [id]);
        await client.query('DELETE FROM "HomeCook_Challenge" WHERE challenge_id = $1', [id]);
        await client.query('DELETE FROM "KitchenChallenge_Recipe" WHERE challenge_id = $1', [id]);
        await client.query('DELETE FROM "KitchenChallenge" WHERE challenge_id = $1', [id]);
        await client.query('COMMIT');
        res.json({ message: 'Challenge deleted.' });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('DELETE CHALLENGE ERROR:', error);
        res.status(500).json({ message: 'Error deleting challenge.', detail: error.message });
    } finally {
        if (client) client.release();
    }
});

// DELETE /api/challenges/:challengeId/recipes/:recipeId — remove recipe from challenge
app.delete('/api/challenges/:challengeId/recipes/:recipeId', async (req, res) => {
    const { challengeId, recipeId } = req.params;

    try {
        await pool.query(
            'DELETE FROM "KitchenChallenge_Recipe" WHERE challenge_id = $1 AND recipe_id = $2',
            [challengeId, recipeId]
        );

        res.json({ message: 'Recipe removed from challenge!' });
    } catch (error) {
        console.error('REMOVE RECIPE ERROR:', error);
        res.status(500).json({ message: 'Error removing recipe.', detail: error.message });
    }
});

// POST /api/challenges/:id/submit — submit photo proof for recipe completion (Home Cook)
app.post('/api/challenges/:id/submit', async (req, res) => {
    const challengeId = req.params.id;
    const { userId, recipeId, photoUrl } = req.body;

    if (!userId || !recipeId || !photoUrl) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Verify user is a home cook and joined the challenge
        const joinCheck = await pool.query(
            'SELECT * FROM "HomeCook_Challenge" WHERE user_id = $1 AND challenge_id = $2',
            [userId, challengeId]
        );

        if (joinCheck.rows.length === 0) {
            return res.status(403).json({ message: 'You must join the challenge first.' });
        }

        // Check if recipe is part of challenge
        const recipeCheck = await pool.query(
            'SELECT * FROM "KitchenChallenge_Recipe" WHERE challenge_id = $1 AND recipe_id = $2',
            [challengeId, recipeId]
        );

        if (recipeCheck.rows.length === 0) {
            return res.status(400).json({ message: 'Recipe is not part of this challenge.' });
        }

        // Check if there's already a submission for this recipe
        const existingSubmission = await pool.query(
            'SELECT * FROM "ChallengeSubmission" WHERE user_id = $1 AND challenge_id = $2 AND recipe_id = $3',
            [userId, challengeId, recipeId]
        );

        let result;
        if (existingSubmission.rows.length > 0) {
            const existing = existingSubmission.rows[0];
            
            // Only allow resubmission if previous was rejected
            if (existing.status === 'rejected') {
                // Update the existing submission with new photo and reset status to pending
                result = await pool.query(
                    `UPDATE "ChallengeSubmission" 
                     SET photo_url = $1, status = 'pending', reviewed_by = NULL, review_note = NULL, reviewed_at = NULL
                     WHERE submission_id = $2
                     RETURNING *`,
                    [photoUrl, existing.submission_id]
                );
            } else {
                return res.status(400).json({ 
                    message: existing.status === 'approved' 
                        ? 'This recipe has already been approved.' 
                        : 'Submission already pending review.'
                });
            }
        } else {
            // Insert new submission
            result = await pool.query(
                `INSERT INTO "ChallengeSubmission" (user_id, challenge_id, recipe_id, photo_url)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [userId, challengeId, recipeId, photoUrl]
            );
        }

        res.json({ message: 'Submission uploaded successfully!', submission: result.rows[0] });
    } catch (error) {
        console.error('SUBMIT PHOTO ERROR:', error);
        res.status(500).json({ message: 'Error submitting photo.', detail: error.message });
    }
});

// GET /api/challenges/:id/submissions — get submissions for review (Challenge Creator only)
app.get('/api/challenges/:id/submissions', async (req, res) => {
    const challengeId = req.params.id;

    try {
        const result = await pool.query(`
            SELECT
                cs.submission_id,
                cs.user_id,
                cs.recipe_id,
                cs.photo_url,
                cs.status,
                cs.submitted_at,
                cs.review_note,
                u.username,
                r.title AS recipe_title
            FROM "ChallengeSubmission" cs
            JOIN "User" u ON u.user_id = cs.user_id
            JOIN "Recipe" r ON r.recipe_id = cs.recipe_id
            WHERE cs.challenge_id = $1
            ORDER BY cs.submitted_at DESC
        `, [challengeId]);

        res.json(result.rows);
    } catch (error) {
        console.error('SUBMISSIONS ERROR:', error);
        res.status(500).json({ message: 'Error fetching submissions.', detail: error.message });
    }
});

// POST /api/challenges/submissions/:id/review — review submission (approve/reject)
// Only the challenge creator (Verified Chef who created that specific challenge) can review.
app.post('/api/challenges/submissions/:id/review', async (req, res) => {
    const submissionId = req.params.id;
    const { status, reviewNote, reviewedBy } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    if (!reviewedBy) {
        return res.status(400).json({ message: 'reviewedBy (chef user_id) is required.' });
    }

    try {
        // Fetch submission to get challenge_id
        const subRes = await pool.query(
            'SELECT challenge_id FROM "ChallengeSubmission" WHERE submission_id = $1',
            [submissionId]
        );
        if (subRes.rows.length === 0) {
            return res.status(404).json({ message: 'Submission not found.' });
        }
        const { challenge_id } = subRes.rows[0];

        // Verify the reviewer is the creator of this specific challenge
        const challengeRes = await pool.query(
            'SELECT creator_id FROM "KitchenChallenge" WHERE challenge_id = $1',
            [challenge_id]
        );
        if (challengeRes.rows.length === 0) {
            return res.status(404).json({ message: 'Challenge not found.' });
        }
        if (parseInt(challengeRes.rows[0].creator_id) !== parseInt(reviewedBy)) {
            return res.status(403).json({ message: 'Only the challenge creator can review submissions.' });
        }

        // Update submission status
        await pool.query(
            `UPDATE "ChallengeSubmission" 
             SET status = $1, review_note = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
             WHERE submission_id = $4`,
            [status, reviewNote || null, reviewedBy, submissionId]
        );

        // If approved, check if this user completed all recipes
        if (status === 'approved') {
            const submission = await pool.query(
                'SELECT challenge_id, user_id FROM "ChallengeSubmission" WHERE submission_id = $1',
                [submissionId]
            );

            if (submission.rows.length > 0) {
                const { challenge_id, user_id } = submission.rows[0];

                // Count total recipes in challenge
                const totalRecipes = await pool.query(
                    'SELECT COUNT(*) AS total FROM "KitchenChallenge_Recipe" WHERE challenge_id = $1',
                    [challenge_id]
                );

                // Count approved submissions by this user
                const approvedCount = await pool.query(
                    `SELECT COUNT(*) AS approved FROM "ChallengeSubmission" 
                     WHERE challenge_id = $1 AND user_id = $2 AND status = 'approved'`,
                    [challenge_id, user_id]
                );

                const total = parseInt(totalRecipes.rows[0].total);
                const approved = parseInt(approvedCount.rows[0].approved);

                // If user completed all recipes, check if they're the first to complete
                if (total > 0 && approved >= total) {
                    const challenge = await pool.query(
                        'SELECT winner_id FROM "KitchenChallenge" WHERE challenge_id = $1',
                        [challenge_id]
                    );

                    if (challenge.rows.length > 0 && !challenge.rows[0].winner_id) {
                            // This user is the first to complete - set as winner
                            await pool.query(
                                'UPDATE "KitchenChallenge" SET winner_id = $1 WHERE challenge_id = $2',
                                [user_id, challenge_id]
                            );

                            // Award 100 reward points
                            await pool.query(
                                'INSERT INTO "ChallengeReward" (challenge_id, user_id, reward_points) VALUES ($1, $2, $3) ON CONFLICT (challenge_id, user_id) DO NOTHING',
                                [challenge_id, user_id, 100]
                            );

                            // Award 50 MealCoins to winner
                            await pool.query(
                                'UPDATE "User" SET total = total + 50 WHERE user_id = $1',
                                [user_id]
                            );

                            console.log(`🏆 Challenge ${challenge_id} won by user ${user_id}!`);
                        }
                }
            }
        }

        res.json({ message: 'Submission reviewed successfully!' });
    } catch (error) {
        console.error('REVIEW SUBMISSION ERROR:', error);
        res.status(500).json({ message: 'Error reviewing submission.', detail: error.message });
    }
});

// GET /api/challenges/:id/participants — get all participants
app.get('/api/challenges/:id/participants', async (req, res) => {
    const challengeId = req.params.id;

    try {
        const result = await pool.query(`
            SELECT
                u.user_id,
                u.username,
                hcc.joined_at
            FROM "HomeCook_Challenge" hcc
            JOIN "User" u ON u.user_id = hcc.user_id
            WHERE hcc.challenge_id = $1
            ORDER BY hcc.joined_at DESC
        `, [challengeId]);

        res.json(result.rows);
    } catch (error) {
        console.error('PARTICIPANTS ERROR:', error);
        res.status(500).json({ message: 'Error fetching participants.', detail: error.message });
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

// GET /api/leaderboard/global — Top Home Cooks by challenges won, then recipes cooked
app.get('/api/leaderboard/global', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.user_id, 
                u.username, 
                u.total AS meal_coins,
                -- cooked_count = distinct recipes cooked via comments OR approved in challenges
                (
                    SELECT COUNT(DISTINCT recipe_id) FROM (
                        SELECT c2.recipe_id
                        FROM "Comment" c2
                        WHERE c2.user_id = u.user_id AND c2.cooked_at IS NOT NULL AND c2.recipe_id IS NOT NULL
                        UNION
                        SELECT cs.recipe_id
                        FROM "ChallengeSubmission" cs
                        WHERE cs.user_id = u.user_id AND cs.status = 'approved'
                    ) cooked_recipes
                ) AS cooked_count,
                COUNT(DISTINCT kc.challenge_id) AS challenges_won,
                COALESCE(SUM(DISTINCT cr.reward_points), 0) AS total_reward_points,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object('title', kc.title, 'won_at', cr.awarded_at)
                    ) FILTER (WHERE kc.challenge_id IS NOT NULL),
                    '[]'::json
                ) AS won_challenges
            FROM "User" u
            LEFT JOIN "HomeCook" hc ON hc.user_id = u.user_id
            LEFT JOIN "VerifiedChef" vc ON vc.user_id = u.user_id AND vc.status IN ('active', 'approved')
            LEFT JOIN "Administrator" a ON a.user_id = u.user_id
            LEFT JOIN "LocalSupplier" ls ON ls.user_id = u.user_id
            LEFT JOIN "KitchenChallenge" kc ON kc.winner_id = u.user_id
            LEFT JOIN "ChallengeReward" cr ON cr.user_id = u.user_id AND cr.challenge_id = kc.challenge_id
            WHERE a.user_id IS NULL
              AND ls.user_id IS NULL
              AND (hc.user_id IS NOT NULL OR vc.user_id IS NOT NULL)
            GROUP BY u.user_id, u.username, u.total
            ORDER BY challenges_won DESC, cooked_count DESC, meal_coins DESC;
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
        // 1. Get total distinct cooked recipes (via comments OR approved challenge submissions)
        const cookedResult = await pool.query(
            `SELECT COUNT(DISTINCT recipe_id) AS cooked_count FROM (
                SELECT recipe_id FROM "Comment"
                WHERE user_id = $1 AND cooked_at IS NOT NULL AND recipe_id IS NOT NULL
                UNION
                SELECT recipe_id FROM "ChallengeSubmission"
                WHERE user_id = $1 AND status = 'approved'
            ) cooked_recipes`,
            [userId]
        );
        const cookedCount = parseInt(cookedResult.rows[0].cooked_count) || 0;

        // 2. Get joined challenges
        const joinedResult = await pool.query(
            `SELECT COUNT(*) as joined_count FROM "HomeCook_Challenge" WHERE user_id = $1`,
            [userId]
        );
        const joinedCount = parseInt(joinedResult.rows[0].joined_count) || 0;

        // 3. Get challenges won
        const wonResult = await pool.query(
            `SELECT COUNT(*) as won_count FROM "KitchenChallenge" WHERE winner_id = $1`,
            [userId]
        );
        const wonCount = parseInt(wonResult.rows[0].won_count) || 0;

        // 4. Get user details (MealCoins)
        const userResult = await pool.query(`SELECT total FROM "User" WHERE user_id = $1`, [userId]);
        const mealCoins = userResult.rows.length > 0 ? parseFloat(userResult.rows[0].total) : 0;

        // 5. Calculate Badges dynamically
        const badges = [];

        // Cooking Badges
        if (cookedCount >= 1) badges.push({ id: 'first_cook', name: 'First Cook', icon: '🍳', description: 'Cooked your first recipe on MealDeal!', color: 'emerald' });
        if (cookedCount >= 5) badges.push({ id: 'chef_training', name: 'Chef in Training', icon: '👨‍🍳', description: 'Cooked 5 recipes.', color: 'amber' });
        if (cookedCount >= 10) badges.push({ id: 'master_cook', name: 'Master Cook', icon: '👑', description: 'Cooked 10 recipes.', color: 'purple' });
        if (cookedCount >= 50) badges.push({ id: 'legendary_cook', name: 'Legendary Cook', icon: '🌟', description: 'Cooked 50 recipes.', color: 'orange' });

        // Challenge Badges
        if (joinedCount >= 1) badges.push({ id: 'challenger', name: 'Challenger', icon: '⚔️', description: 'Joined your first kitchen challenge.', color: 'blue' });
        if (joinedCount >= 5) badges.push({ id: 'challenge_veteran', name: 'Challenge Veteran', icon: '🛡️', description: 'Joined 5 kitchen challenges.', color: 'indigo' });

        // Challenge Win Badges
        if (wonCount >= 1) badges.push({ id: 'champion', name: 'Challenge Champion', icon: '🏆', description: 'Won your first kitchen challenge!', color: 'yellow' });
        if (wonCount >= 3) badges.push({ id: 'serial_winner', name: 'Serial Winner', icon: '🥇', description: 'Won 3 kitchen challenges.', color: 'amber' });

        // MealCoin Badges
        if (mealCoins >= 50) badges.push({ id: 'deal_hunter', name: 'Deal Hunter', icon: '💎', description: 'Earned 50 MealCoins.', color: 'teal' });
        if (mealCoins >= 200) badges.push({ id: 'meal_mogul', name: 'Meal Mogul', icon: '🏦', description: 'Accumulated 200 MealCoins.', color: 'yellow' });

        res.json({
            stats: { cookedCount, joinedCount, wonCount, mealCoins },
            badges
        });
    } catch (error) {
        console.error('ACHIEVEMENTS ERROR:', error);
        res.status(500).json({ message: 'Error fetching achievements.', detail: error.message });
    }
});

// GET /api/users/:id/rewards — Get reward log for a user
app.get('/api/users/:id/rewards', async (req, res) => {
    const userId = req.params.id;
    try {
        const result = await pool.query(`
            SELECT
                cr.reward_id,
                cr.reward_points,
                cr.awarded_at,
                kc.title    AS challenge_title,
                kc.challenge_id
            FROM "ChallengeReward" cr
            JOIN "KitchenChallenge" kc ON kc.challenge_id = cr.challenge_id
            WHERE cr.user_id = $1
            ORDER BY cr.awarded_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('REWARDS ERROR:', error);
        res.status(500).json({ message: 'Error fetching rewards.', detail: error.message });
    }
});

app.use((error, _req, res, next) => {
    if (error instanceof multer.MulterError || error.message?.includes('Only PDF')) {
        return res.status(400).json({ message: error.message });
    }
    next(error);
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
        await ensureChallengeWorkflowSchema();
        await ensureMockAdminAccount();
        await seedChallengesIfEmpty();
    } catch (err) {
        console.error('PostgreSQL Connection Error:', err.message);
    }
});
