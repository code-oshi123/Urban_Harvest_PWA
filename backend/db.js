import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Railway provides these variable names automatically 
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export async function initDB() {
    const conn = await pool.getConnection();
    conn.release();
    console.log('Database connected successfully');
}

export default pool;