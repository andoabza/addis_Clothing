import express from 'express';
import { protect } from '../middleware/auth.js';
import pool from '../config/db.js';

const router = express.Router();

// Get cart
router.get('/', protect, async (req, res) => {
  try {
    let [cart] = await pool.query('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    if (cart.length === 0) {
      const [newCart] = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [req.user.id]);
      cart = [{ id: newCart.insertId }];
    }
    const [items] = await pool.query(`
      SELECT ci.*, v.*, p.name as product_name, p.base_price, p.image_url, ci.id
      FROM cart_items ci
      JOIN variants v ON ci.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE ci.cart_id = ?
    `, [cart[0].id]);
    res.json({ cartId: cart[0].id, items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add to cart
router.post('/add', protect, async (req, res) => {
  try {
    const { variantId, quantity } = req.body;
    if (!variantId || !quantity || quantity < 1) {
      return res.status(400).json({ message: 'Invalid variant or quantity' });
    }

    // Get or create user's cart
    let [cart] = await pool.query('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    if (cart.length === 0) {
      const [newCart] = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [req.user.id]);
      cart = [{ id: newCart.insertId }];
    }
    const cartId = cart[0].id;

    // Check if the same variant is already in cart
    const [existing] = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?',
      [cartId, variantId]
    );

    if (existing.length > 0) {
      // Update quantity – add to existing
      const newQuantity = existing[0].quantity + quantity;
      await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQuantity, existing[0].id]);
    } else {
      // Insert new item
      await pool.query(
        'INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?, ?, ?)',
        [cartId, variantId, quantity]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Failed to add item to cart' });
  }
});

// Update quantity
router.put('/update/:itemId', protect, async (req, res) => {
  try {
    const { quantity } = req.body;
    await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, req.params.itemId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove item

router.delete('/remove/:itemId', protect, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id = ?', [req.params.itemId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;