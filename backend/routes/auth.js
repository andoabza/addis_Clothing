import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import otpGenerator from 'otp-generator';

const otpStore = new Map();
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)',
      [name, email || null, phone, hashedPassword]
    );
    const token = jwt.sign({ id: result.insertId, role: 'user' }, process.env.JWT_SECRET);
    res.status(201).json({ token, user: { id: result.insertId, name, email, phone, role: 'user' } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Request OTP for password reset
router.post('/forgot-password', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone required' });
  
  // Check if user exists
  const [rows] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
  if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
  
  const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
  // Store OTP with expiry (5 minutes)
  otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 });
  
  // TODO: Send SMS via Ethio Telecom API
  console.log(`OTP for ${phone}: ${otp}`); // For testing
  // In production: integrate SMS gateway
  res.json({ message: 'OTP sent successfully' });
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  const record = otpStore.get(phone);
  if (!record) return res.status(400).json({ message: 'No OTP requested' });
  if (record.expires < Date.now()) return res.status(400).json({ message: 'OTP expired' });
  if (record.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
  // Mark as verified (store temp token)
  const token = Math.random().toString(36).substring(2);
  otpStore.set(phone, { ...record, verified: true, token });
  res.json({ message: 'OTP verified', token });
});

// Reset password
router.post('/reset-password', async (req, res) => {
  const { phone, newPassword, token } = req.body;
  const record = otpStore.get(phone);
  if (!record || !record.verified || record.token !== token) {
    return res.status(400).json({ message: 'Unauthorized or expired' });
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password = ? WHERE phone = ?', [hashedPassword, phone]);
  otpStore.delete(phone);
  res.json({ message: 'Password reset successful' });
});

export default router;