import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setup() {
    console.log("Connecting to default 'postgres' database to check if 'mealdeal' exists...");
    const poolAdmin = new Pool({
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: 'postgres',
        port: process.env.PGPORT
    });

    try {
        const clientAdmin = await poolAdmin.connect();
        try {
            const dbCheck = await clientAdmin.query(`SELECT 1 FROM pg_database WHERE datname = 'mealdeal'`);
            if (dbCheck.rows.length === 0) {
                console.log("Database 'mealdeal' not found. Creating it...");
                await clientAdmin.query(`CREATE DATABASE mealdeal`);
                console.log("Database 'mealdeal' created successfully.");
            } else {
                console.log("Database 'mealdeal' already exists.");
            }
        } finally {
            clientAdmin.release();
        }
    } catch (e) {
        console.error("Failed to connect to postgres. Ensure PostgreSQL service is running and credentials are correct:", e.message);
        process.exit(1);
    } finally {
        await poolAdmin.end();
    }

    console.log("Connecting to 'mealdeal' database to create tables...");
    const poolApp = new Pool({
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: 'mealdeal',
        port: process.env.PGPORT
    });

    try {
        const clientApp = await poolApp.connect();
        try {
            console.log("Reading schema.sql...");
            const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
            console.log("Executing schema.sql...");
            await clientApp.query(schemaSql);
            console.log("Tables created successfully.");
        } finally {
            clientApp.release();
        }
    } catch (e) {
        console.error("Failed to set up schema:", e.message);
        process.exit(1);
    } finally {
        await poolApp.end();
    }
}

setup();
