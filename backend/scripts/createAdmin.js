import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const createAdmin = async () => {
  const name = 'Admin User';
  const phone = '0912345678'; // change to your admin phone
  const password = 'admin123'; // change to strong password
  const hashed = await bcrypt.hash(password, 10);
  try {
    await pool.query(
      'INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = ?',
      [name, phone, hashed, 'admin', 'admin']
    );
    console.log('Admin user created/updated');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createAdmin();