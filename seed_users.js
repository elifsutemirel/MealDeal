import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load .env variables
dotenv.config();

const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'MealDeal',
    port: process.env.PGPORT || 5432,
});

async function main() {
    let client;
    try {
        client = await pool.connect();
    } catch (e) {
        console.error("Failed to connect to the database. Make sure your credentials in .env are correct:", e.message);
        process.exit(1);
    }
    
    try {
        await client.query('BEGIN');
        
        // 1. Regular User
        const passwordHash1 = await bcrypt.hash('password123', 10);
        const user1 = await client.query(
            'INSERT INTO "User" (username, email, password_hash, join_date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING user_id',
            ['johndoe', 'john@example.com', passwordHash1]
        );
        const userId1 = user1.rows[0].user_id;

        // 2. Admin User
        const passwordHash2 = await bcrypt.hash('adminpass', 10);
        const user2 = await client.query(
            'INSERT INTO "User" (username, email, password_hash, join_date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING user_id',
            ['adminuser', 'admin@example.com', passwordHash2]
        );
        const userId2 = user2.rows[0].user_id;
        
        await client.query('INSERT INTO "Administrator" (user_id, role_level) VALUES ($1, $2)', [userId2, 'superadmin']);

        // 3. Verified Chef User
        const passwordHash3 = await bcrypt.hash('chefpass', 10);
        const user3 = await client.query(
            'INSERT INTO "User" (username, email, password_hash, join_date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING user_id',
            ['gordonramsay', 'gordon@example.com', passwordHash3]
        );
        const userId3 = user3.rows[0].user_id;
        
        await client.query('INSERT INTO "RecipeCreator" (user_id) VALUES ($1)', [userId3]);
        await client.query('INSERT INTO "VerifiedChef" (user_id, verification_date, status) VALUES ($1, CURRENT_DATE, \'active\')', [userId3]);

        await client.query('COMMIT');
        
        console.log(`Successfully added sample users!`);
        console.log(`1. John Doe (Standard User) - ID: ${userId1}`);
        console.log(`2. Admin (Administrator) - ID: ${userId2}`);
        console.log(`3. Gordon Ramsay (Verified Chef) - ID: ${userId3}`);
        console.log(`Passwords are 'password123', 'adminpass', and 'chefpass' respectively.`);
        
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            console.error('Error: One of the sample users already exists in the database (duplicate email or username).');
        } else {
            console.error('Error seeding users:', err);
        }
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

main();
