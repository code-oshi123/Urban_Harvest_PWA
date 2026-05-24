import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db.js';
import { hashPassword, verifyPassword, generateToken, authenticateToken } from '../auth.js';

const router = express.Router();

// Create users table if not exists
const initUsersTable = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};
initUsersTable();

// Register
router.post('/register', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('name').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const { email, password, name } = req.body;
    const hashedPassword = await hashPassword(password);
    
    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name || email.split('@')[0]]
    );
    
    const token = generateToken(result.insertId, email);
    res.status(201).json({ 
      success: true, 
      token,
      user: { id: result.insertId, email, name: name || email.split('@')[0] }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'Email already registered' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// Login
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

// Get current user (protected)
router.get('/me', authenticateToken, async (req, res) => {
  const [rows] = await pool.execute('SELECT id, email, name FROM users WHERE id = ?', [req.user.id]);
  res.json({ success: true, user: rows[0] });
});

// Protected events endpoint (requires auth)
router.get('/protected-events', authenticateToken, async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM events ORDER BY date ASC');
  res.json({ success: true, data: rows });
});

export default router;