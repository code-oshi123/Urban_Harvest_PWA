import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import eventsRouter from './routes/events.js';
import { initDB } from './db.js';
import authRouter from './routes/auth.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors({
    origin: ['http://localhost:5173', 'https://urban-harvest-pwa.vercel.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Weather proxy endpoint
app.get('/api/weather', async (req, res) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
        );

        if (!response.ok) {
            throw new Error(`Open-Meteo API returned status ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Weather proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch weather from provider' });
    }
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

app.get('/', (req, res) => {
    res.json({ 
        message: 'Urban Harvest Hub API is running',
        status: 'active',
        endpoints: ['/api/events', '/health']
    });
});
