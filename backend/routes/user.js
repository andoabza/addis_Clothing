import express from 'express';
import bcrypt from 'bcryptjs';
import { protect } from '../middleware/auth.js';
import pool from '../config/db.js';
import axios from 'axios';

const router = express.Router();

router.post('/recently-viewed', protect, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ message: 'Product ID is required' });
  if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID' });
  await pool.query(
    'INSERT INTO recently_viewed (user_id, product_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE viewed_at = CURRENT_TIMESTAMP',
    [req.user.id, productId]
  );
  res.json({ success: true });
});

router.get('/recently-viewed', protect, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT p.* FROM recently_viewed rv
    JOIN products p ON rv.product_id = p.id
    WHERE rv.user_id = ?
    ORDER BY rv.viewed_at DESC LIMIT 10
  `, [req.user.id]);
  res.json(rows);
});

// Get user profile
router.get('/profile', protect, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.id !== parseInt(req.params.id)) return res.status(403).json({ message: 'Forbidden' });

    const [rows] = await pool.query(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile (name, email)
router.put('/profile', protect, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.id !== parseInt(req.params.id)) return res.status(403).json({ message: 'Forbidden' });
      
    const { name, email } = req.body;
    await pool.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, req.user.id]);
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Change password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
    
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ success: true, message: 'Password changed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all saved addresses for user
router.get('/addresses', protect, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM saved_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add new address
router.post('/addresses', protect, async (req, res) => {
  try {
    const { address_line, city, zone_id, is_default } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    if (is_default) {
      await connection.query('UPDATE saved_addresses SET is_default = FALSE WHERE user_id = ?', [req.user.id]);
    }
    const [result] = await connection.query(
      'INSERT INTO saved_addresses (user_id, address_line, city, zone_id, is_default) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, address_line, city, zone_id, is_default || false]
    );
    await connection.commit();
    res.status(201).json({ id: result.insertId, success: true });
  } catch (error) {
    console.log(error);
    
    await connection.rollback();
    res.status(500).json({ message: error.message });
  }
});

// Update address
router.put('/addresses/:id', protect, async (req, res) => {
  try {
    const { address_line, city, zone_id, is_default } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // Verify address belongs to user
    const [check] = await connection.query('SELECT id FROM saved_addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (check.length === 0) return res.status(404).json({ message: 'Address not found' });
    
    if (is_default) {
      await connection.query('UPDATE saved_addresses SET is_default = FALSE WHERE user_id = ?', [req.user.id]);
    }
    await connection.query(
      'UPDATE saved_addresses SET address_line = ?, city = ?, zone_id = ?, is_default = ? WHERE id = ?',
      [address_line, city, zone_id, is_default || false, req.params.id]
    );
    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: error.message });
  }
});

// Delete address
router.delete('/addresses/:id', protect, async (req, res) => {
  try {
    await pool.query('DELETE FROM saved_addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user account (and all related data)
router.delete('/account', protect, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Delete user's orders, cart, wishlist, addresses, then user
    await connection.query('DELETE FROM orders WHERE user_id = ?', [req.user.id]);
    await connection.query('DELETE FROM wishlist WHERE user_id = ?', [req.user.id]);
    await connection.query('DELETE FROM saved_addresses WHERE user_id = ?', [req.user.id]);
    const [cart] = await connection.query('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    if (cart.length) await connection.query('DELETE FROM cart_items WHERE cart_id = ?', [cart[0].id]);
    await connection.query('DELETE FROM carts WHERE user_id = ?', [req.user.id]);
    await connection.query('DELETE FROM users WHERE id = ?', [req.user.id]);
    await connection.commit();
    res.json({ success: true, message: 'Account permanently deleted' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
});

router.get('/geocode', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q, format: 'json', limit: 5, addressdetails: 1 },
      headers: { 'User-Agent': 'AddisClothingApp/1.0' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json([]);
  }
});

export default router;