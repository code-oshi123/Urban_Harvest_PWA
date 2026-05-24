import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import eventsRouter from './routes/events.js';
import { initDB } from './db.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ FIXED: Proper CORS configuration
app.use(cors({
    origin: ['http://localhost:5173', 'https://urban-harvest-pwa.vercel.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/events', eventsRouter);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: err.message });
});

async function startServer() {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server running on port ${PORT}`);
    });
}

// Push notification endpoint
app.post('/api/notify', async (req, res) => {
  const { title, body } = req.body;
  // Store notification in database or send via web-push
  res.json({ success: true });
});
startServer();
