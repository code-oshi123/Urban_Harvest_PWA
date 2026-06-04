import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const tables = ['users', 'user_settings', 'user_notifications', 'user_activities'];
        for (const table of tables) {
            const [desc] = await pool.execute(`DESCRIBE ${table};`);
            console.log(`\nTable ${table}:`);
            console.table(desc);
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await pool.end();
    }
}
check();
