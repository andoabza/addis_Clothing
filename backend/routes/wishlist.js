import express from 'express';
import { protect } from '../middleware/auth.js';
import pool from '../config/db.js';

const router = express.Router();

// Get user's wishlist
router.get('/', protect, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT w.product_id, p.name, p.base_price, p.image_url, c.name as category_name
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE w.user_id = ?
      ORDER BY w.added_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add to wishlist
router.post('/add', protect, async (req, res) => {
  try {
    const { productId } = req.body;
    await pool.query(
      'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE added_at = CURRENT_TIMESTAMP',
      [req.user.id, productId]
    );
    res.json({ success: true, message: 'Added to wishlist' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove from wishlist
router.delete('/remove/:productId', protect, async (req, res) => {
  try {
    await pool.query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, req.params.productId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check if product is in wishlist
router.get('/check/:productId', protect, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, req.params.productId]);
    res.json({ isWishlisted: rows.length > 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;