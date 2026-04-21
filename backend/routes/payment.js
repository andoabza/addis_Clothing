import express, { request } from 'express';
import { protect } from '../middleware/auth.js';
import pool from '../config/db.js';
import { initializePayment, verifyPayment } from '../config/chapa.js';

const router = express.Router();

// Initiate payment for an order
router.post('/initiate/:orderId', protect, async (req, res) => {
  try {
    const [orderRows] = await pool.query(`
      SELECT o.*, u.email, u.name as customer_name, u.phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.order_number = ? AND o.user_id = ?
    `, [req.params.orderId, req.user.id]);
    if (orderRows.length === 0) return res.status(404).json({ message: 'Order not found' });
    const order = orderRows[0];
    if (order.payment_status === 'paid') return res.json({ message: 'Already paid', redirectUrl: null });

    const names = order.customer_name.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || 'Customer';
  
    const paymentData = await initializePayment({
      order_number: order.order_number,
      total_amount: order.total_amount,
      email: order.email || `${order.phone}@addisclothing.com`,
      first_name: firstName,
      last_name: lastName,
      phone: order.phone
    });
    // a regex to extract transaction ID from the checkout URL https://checkout.chapa.co/checkout/payment/XzbqAu44d5dVvz3x9QFTwY9ibgbEGJMTpDKcmPG7aXkRk
    const txIdMatch = paymentData.data?.checkout_url?.match(/\/payment\/([^\/]+)/);
    const transactionId = txIdMatch ? txIdMatch[1] : null;


    // Save transaction reference
    await pool.query('UPDATE orders SET transaction_ref = ? WHERE id = ?', [transactionId, order.id]);
    res.json({ checkoutUrl: paymentData.data?.checkout_url, message: 'Redirect to payment' });
  } catch (error) {
    console.error('Error initiating payment', req.params.orderId);
    res.status(500).json({ message: 'Payment initiation failed' });
  }
});

// Webhook callback from Chapa
router.post('/callback', async (req, res) => {
  try {
    const { status, tx_ref, transaction_id } = req.body;
    if (status === 'success') {
      const verification = await verifyPayment(transaction_id);
      if (verification.data?.status === 'success') {
        // clear cart items for the order
        const [cart] = await pool.query('SELECT id FROM carts WHERE user_id = ?', [order.user_id]);
        if (cart.length) {
          await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cart[0].id]);
        }
        await pool.query('UPDATE orders SET payment_status = "paid", order_status = "confirmed", transaction_id = ? WHERE order_number = ?', [transaction_id, tx_ref]);
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Error processing payment callback');
    res.status(500).json({ message: 'Error processing payment callback' });
  }

});

// Manual check for payment status (frontend polling)
router.get('/status/:orderId', protect, async (req, res) => {
  try {
    const orderNumber = req.params.orderId;
    if (!orderNumber || orderNumber === 'undifined') res.status(404).json({ message: 'Error payment not found' });
    const paymentRes = await verifyPayment(orderNumber);
    if (paymentRes.data?.status === 'success') {
      // clear cart items for the order
      const [cart] = await pool.query('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
      if (cart.length) {
        await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cart[0].id]);
      }
      await pool.query('UPDATE orders SET payment_status = "paid", order_status = "confirmed" WHERE order_number = ?', [req.params.orderId]);
      return res.json({ payment_status: 'paid' });
    }
    return res.json({ payment_status: paymentRes.data.status });
  } catch (error) {
    console.error('Error processing payment status');
    res.status(500).json({ message: 'Error processing payment status' });
  }
});

export default router;