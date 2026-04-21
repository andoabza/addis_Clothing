import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import wishlistRoutes from './routes/wishlist.js';
import userRoutes from './routes/user.js';
import pool from './config/db.js';
import morgan from 'morgan';
import paymentRoutes from './routes/payment.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.get('/api/delivery-zones', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM delivery_zones ORDER BY id');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get('/', (req, res) => {
  res.send('Addis Clothing API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));