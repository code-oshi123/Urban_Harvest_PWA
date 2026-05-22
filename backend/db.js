import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Aiven MySQL requires SSL connection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // This SSL configuration is CRITICAL for Aiven
    ssl: {
        rejectUnauthorized: false  // For development only
        // For production, use: ca: process.env.DB_CA_CERT
    }
});

// Test connection on startup
export async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Successfully connected to Aiven MySQL');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Aiven MySQL connection failed:', error.message);
        console.error('Please check your .env credentials');
        return false;
    }
}

// Initialize database tables (if not exists)
export async function initDB() {
    const connection = await pool.getConnection();
    try {
        // Check if events table exists
        const [tables] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'events'
        `);
        
        if (tables[0].count === 0) {
            console.log('Creating events table...');
            await connection.execute(`
                CREATE TABLE events (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT NOT NULL,
                    category ENUM('workshop', 'event', 'product') NOT NULL,
                    image_url VARCHAR(500),
                    location_lat DECIMAL(10,8),
                    location_lng DECIMAL(11,8),
                    date DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Events table created');
            
            // Insert sample data
            console.log('Inserting sample events...');
            await connection.execute(`
                INSERT INTO events (title, description, category, image_url, date) VALUES
                ('Organic Gardening Workshop', 'Learn sustainable farming techniques', 'workshop', 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735', CURDATE() + INTERVAL 30 DAY),
                ('Farmers Market Day', 'Local produce and crafts', 'event', 'https://images.unsplash.com/photo-1488459716781-31db52582fe9', CURDATE() + INTERVAL 45 DAY),
                ('Composting 101', 'Turn waste into garden gold', 'workshop', 'https://images.unsplash.com/photo-1535241749838-299277b6305f', CURDATE() + INTERVAL 60 DAY)
            `);
            console.log('✅ Sample data inserted');
        } else {
            console.log('✅ Events table already exists');
        }
    } catch (error) {
        console.error('Database initialization error:', error);
    } finally {
        connection.release();
    }
}

