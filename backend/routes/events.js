import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../db.js';

const router = express.Router();

// GET all events (READ)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM events ORDER BY date ASC';
    let params = [];
    
    if (category && category !== 'all') {
      query = 'SELECT * FROM events WHERE category = ? ORDER BY date ASC';
      params = [category];
    }
    
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single event (READ ONE)
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

// POST create new event (CREATE)
router.post('/', [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Title must be 3-255 chars'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description min 10 chars'),
  body('category').isIn(['workshop', 'event', 'product']).withMessage('Invalid category'),
  body('image_url').optional().isURL().withMessage('Invalid image URL'),
  body('date').isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const { title, description, category, image_url, date } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO events (title, description, category, image_url, date) VALUES (?, ?, ?, ?, ?)',
      [title, description, category, image_url || null, date]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update event (UPDATE)
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

// DELETE event (DELETE)
router.delete('/:id', [
  param('id').isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const [result] = await pool.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;