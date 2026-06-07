import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import eventsRouter from './routes/events.js';
import { initDB } from './db.js';
import authRouter from './routes/auth.js';
import notifyRouter from './routes/notify.js';
import fs from 'fs';
import path from 'path';
import webPush from 'web-push';

dotenv.config();

// Generate VAPID keys if not present
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log('Generating VAPID keys...');
    try {
        const keys = webPush.generateVAPIDKeys();
        process.env.VAPID_PUBLIC_KEY = keys.publicKey;
        process.env.VAPID_PRIVATE_KEY = keys.privateKey;
        
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            envContent += `\n# VAPID keys for push notifications\nVAPID_PUBLIC_KEY="${keys.publicKey}"\nVAPID_PRIVATE_KEY="${keys.privateKey}"\n`;
            fs.writeFileSync(envPath, envContent, 'utf8');
            console.log('✅ Generated VAPID keys and appended to .env');
        } else {
            fs.writeFileSync(envPath, `VAPID_PUBLIC_KEY="${keys.publicKey}"\nVAPID_PRIVATE_KEY="${keys.privateKey}"\n`, 'utf8');
            console.log('✅ Created .env with generated VAPID keys');
        }
    } catch (err) {
        console.error('Failed to generate VAPID keys automatically:', err.message);
    }
}

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://[::1]:5173',
        'https://urban-harvest-pwa.vercel.app',
        'https://urban-harvst-hub.vercel.app',
        'https://urban-harvest-hub.vercel.app'
    ],
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

// Push notification routes
app.use('/api/notify', notifyRouter);
startServer();

app.get('/', (req, res) => {
    res.json({ 
        message: 'Urban Harvest Hub API is running',
        status: 'active',
        endpoints: ['/api/events', '/health']
    });
});
