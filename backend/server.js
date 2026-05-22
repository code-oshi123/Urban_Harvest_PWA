import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import eventsRouter from './routes/events.js';
import pool, { initDB, testConnection } from './db.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Routes
app.use('/api/events', eventsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

// Initialize and start server
async function startServer() {
    try {
        // Test database connection first
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ Cannot start server - database connection failed');
            process.exit(1);
        }
        
        // Initialize tables
        await initDB();
        
        // Start server
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Server running on port ${PORT}`);
            console.log(`📍 Health check: http://localhost:${PORT}/health`);
            console.log(`🌐 API endpoint: http://localhost:${PORT}/api/events`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();