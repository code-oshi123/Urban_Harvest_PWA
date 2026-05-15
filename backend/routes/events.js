import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../db.js';

const router = express.Router();

// GET all events (with optional category filter)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM events ORDER BY date DESC';
    let params = [];
    if (category) {
      query = 'SELECT * FROM events WHERE category = ? ORDER BY date DESC';
      params = [category];
    }
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single event
router.get('/:id', [
  param('id').isInt().withMessage('Invalid event ID')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create new event
router.post('/', [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Title must be 3-255 chars'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description min 10 chars'),
  body('category').isIn(['workshop', 'event', 'product']).withMessage('Invalid category'),
  body('image_url').optional().isURL().withMessage('Invalid image URL'),
  body('date').isISO8601().withMessage('Invalid date format'),
  body('location_lat').optional().isFloat({ min: -90, max: 90 }),
  body('location_lng').optional().isFloat({ min: -180, max: 180 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const { title, description, category, image_url, location_lat, location_lng, date } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO events (title, description, category, image_url, location_lat, location_lng, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, category, image_url, location_lat || null, location_lng || null, date]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update event
router.put('/:id', [
  param('id').isInt(),
  body('title').optional().trim().isLength({ min: 3, max: 255 }),
  body('description').optional().trim().isLength({ min: 10 }),
  body('category').optional().isIn(['workshop', 'event', 'product'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const updates = [];
    const values = [];
    for (const [key, value] of Object.entries(req.body)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    values.push(req.params.id);
    await pool.execute(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, message: 'Event updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;