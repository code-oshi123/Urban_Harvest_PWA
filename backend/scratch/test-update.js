import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'urban_harvest',
    ssl: {
        rejectUnauthorized: false
    }
});

async function testUpdate() {
    try {
        console.log("Testing UPDATE with undefined values using execute()...");
        const theme = 'dark';
        const notifications_enabled = undefined;
        const language = undefined;
        const userId = 1;

        // This matches the query in auth.js
        await pool.execute(
            `UPDATE user_settings 
             SET theme = COALESCE(?, theme), 
                 notifications_enabled = COALESCE(?, notifications_enabled),
                 language = COALESCE(?, language)
             WHERE user_id = ?`,
            [theme, notifications_enabled, language, userId]
        );
        console.log("UPDATE executed successfully!");
    } catch (err) {
        console.error("UPDATE failed:", err);
    } finally {
        await pool.end();
    }
}

testUpdate();
