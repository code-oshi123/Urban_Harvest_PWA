import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import webPush from 'web-push';
dotenv.config({ path: '../.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
});

const setupWebPush = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webPush.setVapidDetails(
      'mailto:admin@urbanharvest.com',
      publicKey,
      privateKey
    );
    console.log('VAPID public key loaded:', publicKey);
  } else {
    console.error('VAPID keys not configured in .env!');
  }
};

async function broadcastTest() {
  setupWebPush();
  try {
    const [rows] = await pool.execute('SELECT * FROM push_subscriptions');
    console.log(`Found ${rows.length} push subscriptions in the database.`);
    
    if (rows.length === 0) {
      console.log('No subscriptions found. Open the app, click "Enable Notifications" to subscribe a device.');
      return;
    }
    
    const payload = JSON.stringify({
      title: '📢 Admin Test Broadcast!',
      body: 'This is a live test notification from the Urban Harvest PWA admin dashboard! 🌱'
    });
    
    for (const sub of rows) {
      console.log(`Sending to endpoint: ${sub.endpoint.substring(0, 60)}...`);
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };
      
      try {
        await webPush.sendNotification(pushSubscription, payload);
        console.log('✅ Sent successfully!');
      } catch (err) {
        console.error('❌ Failed to send:', err.message);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

broadcastTest();
