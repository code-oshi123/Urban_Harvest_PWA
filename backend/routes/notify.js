import express from 'express';
import webPush from 'web-push';
import pool from '../db.js';
import { verifyToken } from '../auth.js';

const router = express.Router();

// Helper to load and set VAPID details dynamically
const setupWebPush = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webPush.setVapidDetails(
      'mailto:admin@urbanharvest.com',
      publicKey,
      privateKey
    );
  }
};

// GET VAPID public key
router.get('/vapid-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ success: false, error: 'VAPID keys not configured on server' });
  }
  res.json({ success: true, publicKey });
});

// POST Subscribe browser to push
router.post('/subscribe', async (req, res) => {
  const { subscription, trigger } = req.body;
  if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    return res.status(400).json({ success: false, error: 'Invalid subscription object' });
  }

  // Detect user if authorization header is provided
  let userId = null;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      userId = decoded.id;
    }
  }

  try {
    // Save to database, binding user_id if logged in
    await pool.execute(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
      [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );

    // Send confirmation/login/register push if trigger is specified
    if (trigger && userId) {
      const [userRows] = await pool.execute('SELECT name FROM users WHERE id = ?', [userId]);
      const userName = userRows[0]?.name || 'User';
      
      const subRow = {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      };

      if (trigger === 'login') {
        await sendPushNotification(subRow, {
          title: '🔐 Login Successful',
          body: `Welcome back to Urban Harvest Hub, ${userName}! ✨`
        });
      } else if (trigger === 'register') {
        await sendPushNotification(subRow, {
          title: '✨ Registration Successful',
          body: `Welcome to Urban Harvest Hub, ${userName}! Explore sustainable events near you. 🌱`
        });
      }
    }

    res.json({ success: true, message: 'Subscription stored successfully' });
  } catch (error) {
    console.error('Failed to store subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST Unsubscribe (completely remove device)
router.post('/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ success: false, error: 'Endpoint is required' });
  }

  try {
    await pool.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST Dissociate user on Logout (revert to anonymous sub so they still get broadcasts)
router.post('/logout-subscription', async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ success: false, error: 'Endpoint is required' });
  }

  try {
    // Send logout notification first
    setupWebPush();
    const [rows] = await pool.execute('SELECT * FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    if (rows.length > 0) {
      await sendPushNotification(rows[0], {
        title: '🚪 Logged Out',
        body: 'You have been logged out. You will still receive general updates.'
      });
    }

    // Set user_id to NULL
    await pool.execute('UPDATE push_subscriptions SET user_id = NULL WHERE endpoint = ?', [endpoint]);
    res.json({ success: true, message: 'Subscription dissociated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET Send test notification (admin/dev testing)
router.post('/send-test', async (req, res) => {
  const { title, body } = req.body;
  try {
    await broadcastPush({
      title: title || 'Test Push Notification 📢',
      body: body || 'This is a test notification from Urban Harvest Hub!'
    });
    res.json({ success: true, message: 'Broadcast triggered' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Core push helper: send notification to a single DB row subscription
export async function sendPushNotification(subscription, payload) {
  setupWebPush();
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };

  try {
    await webPush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log(`Cleaning up expired subscription: ${subscription.endpoint}`);
      try {
        await pool.execute('DELETE FROM push_subscriptions WHERE id = ?', [subscription.id]);
      } catch (dbErr) {
        console.error('Error cleaning up subscription:', dbErr);
      }
    } else {
      console.error('Push notification failed:', error.message);
    }
    return false;
  }
}

// Core push helper: Broadcast to all subscriptions
export async function broadcastPush(payload) {
  try {
    const [rows] = await pool.execute('SELECT * FROM push_subscriptions');
    const promises = rows.map(sub => sendPushNotification(sub, payload));
    await Promise.all(promises);
  } catch (error) {
    console.error('Broadcast failed:', error);
  }
}

// Core push helper: Send to all subscriptions of a specific user ID
export async function sendPushToUser(userId, payload) {
  if (!userId) return;
  try {
    const [rows] = await pool.execute('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);
    const promises = rows.map(sub => sendPushNotification(sub, payload));
    await Promise.all(promises);
  } catch (error) {
    console.error(`Push to user #${userId} failed:`, error);
  }
}

export default router;
