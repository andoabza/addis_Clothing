import express from 'express';
import { protect } from '../middleware/auth.js';
import pool from '../config/db.js';

const router = express.Router();

// Create order
router.post('/', protect, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const { deliveryZoneId, deliveryAddress, paymentMethod, promoCode, totalAmount } = req.body;
    
    // Get cart items
    const [cart] = await connection.query('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    if (cart.length === 0) throw new Error('Cart not found');
    const [items] = await connection.query(`
      SELECT ci.variant_id, ci.quantity, v.price_adjustment, p.base_price
      FROM cart_items ci
      JOIN variants v ON ci.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE ci.cart_id = ?
    `, [cart[0].id]);
    if (items.length === 0) throw new Error('Cart is empty');
    
    // let subtotal = 0;
    // for (const item of items) {
    //   subtotal += (item.base_price + item.price_adjustment) * item.quantity;
    // }
      
    // create delivery zone id if not exists deliveryZoneId is the name of the zone
    let deliveryZone = deliveryZoneId;
    if (isNaN(deliveryZone)) {
      const [existingZone] = await connection.query('SELECT id FROM delivery_zones WHERE zone_name = ?', [deliveryZone]);
      if (existingZone.length) {
        deliveryZone = existingZone[0].id;
      } else {
        const [newZone] = await connection.query('INSERT INTO delivery_zones (zone_name, fee_etb, estimated_hours) VALUES (?, ?, ?)', [deliveryZone, 100, 'Unknown']);
        
        deliveryZone = newZone.insertId;
      }
    }

    // Get delivery fee
    const [zone] = await connection.query('SELECT fee_etb FROM delivery_zones WHERE id = ?', [deliveryZone]);
    const deliveryFee = zone[0]?.fee_etb || 50;
    
    let discount = 0;
    if (promoCode) {
      const [promo] = await connection.query('SELECT * FROM promo_codes WHERE code = ? AND expires_at >= CURDATE()', [promoCode]);
      if (promo.length) {
        discount = (subtotal * promo[0].discount_percent) / 100;
        if (promo[0].max_discount && discount > promo[0].max_discount) discount = promo[0].max_discount;
      }
    }
    
    const total = totalAmount;
    // Order Number format: ORD-<random5chars>
    const orderNumber = 'ORD-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const [orderRes] = await connection.query(
      `INSERT INTO orders (user_id, order_number, total_amount, delivery_zone_id, delivery_address, delivery_fee, payment_method, discount_amount, promo_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, orderNumber, total, deliveryZone, deliveryAddress, deliveryFee, paymentMethod, discount, promoCode || null]
    );
    
    for (const item of items) {
      const price = item.base_price;
      await connection.query(
        'INSERT INTO order_items (order_id, variant_id, quantity, price_at_time) VALUES (?, ?, ?, ?)',
        [orderRes.insertId, item.variant_id, item.quantity, price]
      );
      // Decrease stock
      await connection.query('UPDATE variants SET stock = stock - ? WHERE id = ?', [item.quantity, item.variant_id]);
    }
    // Clear cart if payment is confirmed in payment callback, for now we can clear it immediately since we will handle payment in a separate step

    await connection.commit();
    res.json({ orderId: orderRes.insertId, orderNumber, total });
  } catch (error) {
    await connection.rollback();
    
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
});

// Get user orders
router.get('/my-orders', protect, async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT o.*, dz.zone_name
      FROM orders o
      LEFT JOIN delivery_zones dz ON o.delivery_zone_id = dz.id
      WHERE o.user_id = ? AND o.order_status != 'cancelled'
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Track order
router.get('/track/:orderNumber', protect, async (req, res) => {
  try {
    const [order] = await pool.query('SELECT order_status, created_at FROM orders WHERE order_number = ? AND user_id = ?', [req.params.orderNumber, req.user.id]);
    if (order.length === 0) return res.status(404).json({ message: 'Order not found' });
    res.json(order[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:orderNumber', protect, async (req, res) => {
  const [order] = await pool.query('SELECT order_number FROM orders WHERE order_number = ? AND user_id = ?', [req.params.orderId, req.user.id]);
  if (order.length === 0) return res.status(404).json({ message: 'Order not found' });
  res.json(order[0]);
});

// Cancel order (restore stock)
router.put('/cancel/:orderId', protect, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [order] = await connection.query(
      'SELECT order_status, user_id FROM orders WHERE id = ?',
      [req.params.orderId]
    );
    if (order.length === 0) return res.status(404).json({ message: 'Order not found' });
    if (order[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const allowedStatuses = ['pending', 'confirmed'];
    if (!allowedStatuses.includes(order[0].order_status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }
    // Restore stock
    const [items] = await connection.query('SELECT variant_id, quantity FROM order_items WHERE order_id = ?', [req.params.orderId]);
    for (const item of items) {
      await connection.query('UPDATE variants SET stock = stock + ? WHERE id = ?', [item.quantity, item.variant_id]);
    }
    await connection.query('UPDATE orders SET order_status = "cancelled" WHERE id = ?', [req.params.orderId]);
    await connection.commit();
    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
});

// Reorder (add all items from previous order to cart)
router.post('/reorder/:orderId', protect, async (req, res) => {
  try {
    // Get order items
    const [items] = await pool.query(
      'SELECT variant_id, quantity FROM order_items WHERE order_id = ?',
      [req.params.orderId]
    );
    if (items.length === 0) return res.status(404).json({ message: 'No items found' });
    // Get user's cart
    let [cart] = await pool.query('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    if (cart.length === 0) {
      const [newCart] = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [req.user.id]);
      cart = [{ id: newCart.insertId }];
    }
    // Add each item to cart (update quantity if already exists)
    for (const item of items) {
      const [existing] = await pool.query(
        'SELECT id FROM cart_items WHERE cart_id = ? AND variant_id = ?',
        [cart[0].id, item.variant_id]
      );
      if (existing.length > 0) {
        await pool.query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [item.quantity, existing[0].id]);
      } else {
        await pool.query('INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?, ?, ?)', [cart[0].id, item.variant_id, item.quantity]);
      }
    }
    res.json({ success: true, message: 'Items added to cart' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single order by order number (for the logged-in user)
router.get('/by-number/:orderNumber', protect, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.*, u.name as customer_name, u.phone, dz.zone_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN delivery_zones dz ON o.delivery_zone_id = dz.id
      WHERE o.order_number = ? AND o.user_id = ?
    `, [req.params.orderNumber, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Order not found' });
    const order = rows[0];
    const [items] = await pool.query(`
      SELECT oi.*, p.name as product_name, v.size, v.color
      FROM order_items oi
      JOIN variants v ON oi.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE oi.order_id = ?
    `, [order.id]);
    res.json({ order, items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:orderId/items', protect, async (req, res) => {
  const [items] = await pool.query(`
    SELECT oi.*, p.name as product_name, v.size, v.color
    FROM order_items oi
    JOIN variants v ON oi.variant_id = v.id
    JOIN products p ON v.product_id = p.id
    WHERE oi.order_id = ?
  `, [req.params.orderId]);
   res.json(items);
});

export default router;