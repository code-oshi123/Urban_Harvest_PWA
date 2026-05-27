import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') }); // Load .env relative to script directory

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkAdmin() {
    try {
        console.log("Connecting to database server...");
        const [dbRows] = await pool.execute("SHOW DATABASES");
        console.log("Available databases:");
        console.log(dbRows);
        
        // Select urban_harvest database
        const dbName = 'urban_harvest';
        await pool.query(`USE \`${dbName}\``);
        
        console.log("\n--- user_settings table structure ---");
        const [schema] = await pool.execute("DESCRIBE user_settings");
        console.log(schema);

        console.log("\n--- user_settings records ---");
        const [settings] = await pool.execute("SELECT * FROM user_settings");
        console.log(settings);

        console.log("\n--- users records ---");
        const [users] = await pool.execute("SELECT * FROM users");
        console.log(users);
        return;

        const adminUser = rows.find(r => r.email === 'admin1@gmail.com');
        if (adminUser) {
            console.log("Admin user found:", adminUser);
            if (adminUser.is_admin !== 1) {
                console.log("Admin user does not have is_admin = 1. Updating now...");
                await pool.execute("UPDATE users SET is_admin = 1 WHERE email = 'admin1@gmail.com'");
                console.log("Successfully updated admin permission!");
            }
        } else {
            console.log("Admin user not found in database. Creating user...");
            const hash = await bcrypt.hash('admin123', 10);
            const [result] = await pool.execute(
                "INSERT INTO users (email, password_hash, name, is_admin) VALUES ('admin1@gmail.com', ?, 'Admin User', 1)",
                [hash]
            );
            console.log("Created admin user with ID:", result.insertId);

            // Create default settings for admin
            await pool.execute(
                'INSERT INTO user_settings (user_id) VALUES (?)',
                [result.insertId]
            ).catch(err => console.log("Note settings insert failed (might already exist):", err.message));
        }
    } catch (err) {
        console.error("Error checking/creating admin:", err);
    } finally {
        await pool.end();
    }
}

checkAdmin();
