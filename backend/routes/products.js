import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.get('/categories', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM categories');
  res.json(rows);
});
// Get all products with variants
router.get('/', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, sort } = req.query;
    let query = `
      SELECT p.*, c.name as category_name,
      (SELECT JSON_ARRAYAGG(
        JSON_OBJECT('id', v.id, 'size', v.size, 'color', v.color, 'stock', v.stock, 'price_adjustment', v.price_adjustment)
       ) FROM variants v WHERE v.product_id = p.id) as variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (category) {
      query += ' AND c.slug = ?';
      params.push(category);
    }
    if (minPrice) {
      query += ' AND p.base_price >= ?';
      params.push(minPrice);
    }
    if (maxPrice) {
      query += ' AND p.base_price <= ?';
      params.push(maxPrice);
    }
    if (sort === 'price_asc') query += ' ORDER BY p.base_price ASC';
    else if (sort === 'price_desc') query += ' ORDER BY p.base_price DESC';
    else query += ' ORDER BY p.created_at DESC';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    if (isNaN(req.params.id)) return res.status(400).json({ message: 'Invalid product ID' });
    
    const [productRows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (productRows.length === 0) return res.status(404).json({ message: 'Product not found' });
    const [variantRows] = await pool.query('SELECT * FROM variants WHERE product_id = ?', [req.params.id]);
    res.json({ ...productRows[0], variants: variantRows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;