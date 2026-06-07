import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../db.js';
import { hashPassword, verifyPassword, generateToken, authenticateToken } from '../auth.js';
import { sendPushToUser, broadcastPush } from './notify.js';

const router = express.Router();

// ============ HELPER FUNCTIONS ============

// Check if user is admin (database check)
const requireAdmin = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            'SELECT is_admin FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (rows.length === 0 || !rows[0].is_admin) {
            return res.status(403).json({ 
                success: false, 
                error: 'Admin access required' 
            });
        }
        
        next();
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// ============ USER AUTHENTICATION ============

// Register new user
router.post('/register', [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('name').trim().notEmpty().withMessage('Name required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    try {
        const { email, password, name } = req.body;
        const hashedPassword = await hashPassword(password);
        
        // Insert user
        const [result] = await pool.execute(
            'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
            [email, hashedPassword, name]
        );
        
        // Create default settings
        await pool.execute(
            'INSERT INTO user_settings (user_id) VALUES (?)',
            [result.insertId]
        );
        
        // Log activity
        await pool.execute(
            'INSERT INTO user_activities (user_id, action_type, details) VALUES (?, ?, ?)',
            [result.insertId, 'register', JSON.stringify({ email, name })]
        );
        
        const token = generateToken(result.insertId, email);
        res.status(201).json({ 
            success: true, 
            token,
            user: { id: result.insertId, email, name }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ success: false, error: 'Email already registered' });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

// Login user
router.post('/login', [
    body('email').isEmail(),
    body('password').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    try {
        const { email, password } = req.body;
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        const user = rows[0];
        const validPassword = await verifyPassword(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        // Log login activity
        await pool.execute(
            'INSERT INTO user_activities (user_id, action_type, details) VALUES (?, ?, ?)',
            [user.id, 'login', JSON.stringify({ email })]
        );
        
        const token = generateToken(user.id, user.email);
        res.json({ 
            success: true, 
            token,
            user: { id: user.id, email: user.email, name: user.name }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ USER PROFILE CRUD ============

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, email, name, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        
        const [settings] = await pool.execute(
            'SELECT * FROM user_settings WHERE user_id = ?',
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ 
            success: true, 
            user: users[0],
            settings: settings[0] || {}
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update user profile
router.put('/profile', authenticateToken, [
    body('name').optional().trim().notEmpty(),
    body('avatar').optional().isURL()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    try {
        const updates = [];
        const values = [];
        
        if (req.body.name) {
            updates.push('name = ?');
            values.push(req.body.name);
        }
        if (req.body.avatar) {
            updates.push('avatar = ?');
            values.push(req.body.avatar);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }
        
        values.push(req.user.id);
        await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        
        res.json({ success: true, message: 'Profile updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ SAVED EVENTS CRUD ============

// Get user's saved events
router.get('/saved-events', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT e.*, us.saved_at 
             FROM events e 
             JOIN user_saved_events us ON e.id = us.event_id 
             WHERE us.user_id = ? 
             ORDER BY us.saved_at DESC`,
            [req.user.id]
        );
        
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save an event (CREATE)
router.post('/saved-events/:eventId', authenticateToken, async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    
    try {
        // Check if event exists
        const [events] = await pool.execute('SELECT id, title FROM events WHERE id = ?', [eventId]);
        if (events.length === 0) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        
        const title = events[0].title;

        // Save event
        await pool.execute(
            'INSERT INTO user_saved_events (user_id, event_id) VALUES (?, ?)',
            [req.user.id, eventId]
        );
        
        // Log activity
        await pool.execute(
            'INSERT INTO user_activities (user_id, action_type, event_id, details) VALUES (?, ?, ?, ?)',
            [req.user.id, 'save', eventId, JSON.stringify({ action: 'saved' })]
        );

        // Send push notification to user
        sendPushToUser(req.user.id, {
            title: '❤️ Event Saved',
            body: `You saved "${title}" to your collection.`
        }).catch(err => console.error('Saved event push failed:', err));
        
        res.json({ success: true, message: 'Event saved' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ success: false, error: 'Event already saved' });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

// Remove saved event (DELETE)
router.delete('/saved-events/:eventId', authenticateToken, async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    
    try {
        const [events] = await pool.execute('SELECT title FROM events WHERE id = ?', [eventId]);
        const title = events[0]?.title || 'Event';

        await pool.execute(
            'DELETE FROM user_saved_events WHERE user_id = ? AND event_id = ?',
            [req.user.id, eventId]
        );
        
        // Log activity
        await pool.execute(
            'INSERT INTO user_activities (user_id, action_type, event_id, details) VALUES (?, ?, ?, ?)',
            [req.user.id, 'unsave', eventId, JSON.stringify({ action: 'unsaved' })]
        );

        // Send push notification to user
        sendPushToUser(req.user.id, {
            title: '💔 Event Removed',
            body: `"${title}" has been removed from your saved events.`
        }).catch(err => console.error('Unsaved event push failed:', err));
        
        res.json({ success: true, message: 'Event removed from saved' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ USER SETTINGS CRUD ============

// Get user settings
router.get('/settings', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM user_settings WHERE user_id = ?',
            [req.user.id]
        );
        
        res.json({ success: true, settings: rows[0] || {} });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update user settings
router.put('/settings', authenticateToken, async (req, res) => {
    const { theme, notifications_enabled, language } = req.body;
    
    try {
        await pool.execute(
            `UPDATE user_settings 
             SET theme = COALESCE(?, theme), 
                 notifications_enabled = COALESCE(?, notifications_enabled),
                 language = COALESCE(?, language)
             WHERE user_id = ?`,
            [theme ?? null, notifications_enabled ?? null, language ?? null, req.user.id]
        );
        
        res.json({ success: true, message: 'Settings updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ USER ACTIVITIES ============

// Get user activity history
router.get('/activities', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT * FROM user_activities 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [req.user.id]
        );
        
        res.json({ success: true, activities: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ BOOKING CRUD ============

// Book an event
router.post('/bookings/:eventId', authenticateToken, async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    const { tickets = 1 } = req.body;
    
    try {
        const [events] = await pool.execute('SELECT title FROM events WHERE id = ?', [eventId]);
        if (events.length === 0) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        const title = events[0].title;

        // Check if already booked
        const [existing] = await pool.execute(
            'SELECT * FROM event_bookings WHERE user_id = ? AND event_id = ?',
            [req.user.id, eventId]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({ success: false, error: 'Already booked this event' });
        }
        
        await pool.execute(
            'INSERT INTO event_bookings (user_id, event_id, tickets) VALUES (?, ?, ?)',
            [req.user.id, eventId, tickets]
        );
        
        // Log activity
        await pool.execute(
            'INSERT INTO user_activities (user_id, action_type, event_id, details) VALUES (?, ?, ?, ?)',
            [req.user.id, 'booking', eventId, JSON.stringify({ tickets })]
        );

        // Send push notification to user
        sendPushToUser(req.user.id, {
            title: '📅 Booking Confirmed!',
            body: `You are booked for "${title}" (${tickets} ticket${tickets > 1 ? 's' : ''}). See you there! 🎉`
        }).catch(err => console.error('Booking push failed:', err));
        
        res.json({ success: true, message: 'Event booked successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's bookings
router.get('/bookings', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT b.*, e.title, e.date, e.image_url, e.location_lat, e.location_lng 
             FROM event_bookings b 
             JOIN events e ON b.event_id = e.id 
             WHERE b.user_id = ? 
             ORDER BY b.booking_date DESC`,
            [req.user.id]
        );
        res.json({ success: true, bookings: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cancel booking
router.delete('/bookings/:eventId', authenticateToken, async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    
    try {
        const [events] = await pool.execute('SELECT title FROM events WHERE id = ?', [eventId]);
        const title = events[0]?.title || 'Event';

        await pool.execute(
            'DELETE FROM event_bookings WHERE user_id = ? AND event_id = ?',
            [req.user.id, eventId]
        );

        // Send push notification to user
        sendPushToUser(req.user.id, {
            title: '❌ Booking Cancelled',
            body: `Your booking for "${title}" has been cancelled.`
        }).catch(err => console.error('Cancel booking push failed:', err));

        res.json({ success: true, message: 'Booking cancelled' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ EVENT CRUD (User-generated content) ============

// Create new event (any logged-in user)
router.post('/events', authenticateToken, [
    body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Title must be 3-255 chars'),
    body('description').trim().isLength({ min: 10 }).withMessage('Description min 10 chars'),
    body('category').isIn(['workshop', 'event', 'product']).withMessage('Invalid category'),
    body('date').isISO8601().withMessage('Invalid date format'),
    body('image_url').optional().isURL().withMessage('Invalid image URL'),
    body('location_lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('location_lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    try {
        const { title, description, category, date, image_url, location_lat, location_lng } = req.body;
        
        const [result] = await pool.execute(
            `INSERT INTO events (title, description, category, date, image_url, location_lat, location_lng) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, description, category, date, image_url || null, location_lat || null, location_lng || null]
        );
        
        // Log activity
        await pool.execute(
            'INSERT INTO user_activities (user_id, action_type, event_id, details) VALUES (?, ?, ?, ?)',
            [req.user.id, 'create', result.insertId, JSON.stringify({ title, category })]
        );

        // Broadcast notification to all subscribers
        broadcastPush({
            title: '🌱 New Event Added!',
            body: `"${title}" has been created. Check it out! 🚀`
        }).catch(err => console.error('Broadcast push failed:', err));
        
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update user's own event
router.put('/events/:eventId', authenticateToken, [
    param('eventId').isInt().withMessage('Invalid event ID'),
    body('title').optional().trim().isLength({ min: 3, max: 255 }).withMessage('Title must be 3-255 chars'),
    body('description').optional().trim().isLength({ min: 10 }).withMessage('Description min 10 chars'),
    body('category').optional().isIn(['workshop', 'event', 'product']).withMessage('Invalid category'),
    body('date').optional().isISO8601().withMessage('Invalid date format'),
    body('image_url').optional().isURL().withMessage('Invalid image URL'),
    body('location_lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('location_lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const eventId = parseInt(req.params.eventId);
    
    try {
        const [events] = await pool.execute(
            'SELECT * FROM events WHERE id = ?',
            [eventId]
        );
        
        if (events.length === 0) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        
        const originalTitle = events[0].title;

        const updates = [];
        const values = [];
        
        ['title', 'description', 'category', 'date', 'image_url', 'location_lat', 'location_lng'].forEach(field => {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        });
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }
        
        values.push(eventId);
        await pool.execute(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, values);

        // Broadcast notification
        const updatedTitle = req.body.title || originalTitle;
        broadcastPush({
            title: '📝 Event Updated',
            body: `"${updatedTitle}" has been updated.`
        }).catch(err => console.error('Broadcast push failed:', err));
        
        res.json({ success: true, message: 'Event updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete event (user's own event)
router.delete('/events/:eventId', authenticateToken, [
    param('eventId').isInt().withMessage('Invalid event ID')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const eventId = parseInt(req.params.eventId);
    
    try {
        const [existing] = await pool.execute('SELECT title FROM events WHERE id = ?', [eventId]);
        const title = existing[0]?.title;

        const [result] = await pool.execute('DELETE FROM events WHERE id = ?', [eventId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (title) {
            broadcastPush({
                title: '🗑️ Event Cancelled',
                body: `"${title}" has been cancelled.`
            }).catch(err => console.error('Broadcast push failed:', err));
        }
        
        res.json({ success: true, message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ ADMIN ROUTES (requireAdmin middleware) ============

// Get all users (admin only)
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, email, name, created_at, is_admin FROM users'
        );
        res.json({ success: true, users: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all events with booking count (admin only)
router.get('/admin/events', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT e.*, COUNT(b.id) as booking_count 
             FROM events e 
             LEFT JOIN event_bookings b ON e.id = b.event_id 
             GROUP BY e.id 
             ORDER BY e.date ASC`
        );
        res.json({ success: true, events: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete any event (admin only)
router.delete('/admin/events/:eventId', authenticateToken, requireAdmin, async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    
    try {
        // Get title before deleting
        const [existing] = await pool.execute('SELECT title FROM events WHERE id = ?', [eventId]);
        const title = existing[0]?.title;

        // Delete bookings first (due to foreign key constraint)
        await pool.execute('DELETE FROM event_bookings WHERE event_id = ?', [eventId]);
        await pool.execute('DELETE FROM events WHERE id = ?', [eventId]);

        if (title) {
            broadcastPush({
                title: '🗑️ Event Cancelled by Admin',
                body: `"${title}" has been removed.`
            }).catch(err => console.error('Broadcast push failed:', err));
        }

        res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;