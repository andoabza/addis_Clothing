CREATE DATABASE addis_clothing;
USE addis_clothing;

-- Users
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery zones (Addis Ababa)
CREATE TABLE delivery_zones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_name VARCHAR(200) NOT NULL,
  fee_etb DECIMAL(10,2) NOT NULL,
  estimated_hours VARCHAR(20)
);
INSERT INTO delivery_zones (zone_name, fee_etb, estimated_hours) VALUES
('Bole', 50, '1-2 hours'),
('Kirkos', 40, '1-2 hours'),
('Lideta', 40, '1-2 hours'),
('Kolfe', 60, '2-3 hours'),
('Gulele', 70, '3-4 hours'),
('Yeka', 50, '2-3 hours'),
('Nifas Silk', 60, '2-3 hours'),
('Akaki', 90, '4-5 hours');

-- Categories
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) UNIQUE,
  image_url TEXT
);

-- Products
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category_id INT,
  base_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Product variants (size, color, stock)
CREATE TABLE variants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  size ENUM('XS','S','M','L','XL','XXL') NOT NULL,
  color VARCHAR(30) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  price_adjustment DECIMAL(10,2) DEFAULT 0.00,
  sku VARCHAR(50) UNIQUE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Carts
CREATE TABLE carts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Cart items
CREATE TABLE cart_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cart_id INT NOT NULL,
  variant_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES variants(id)
);

-- Orders
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  order_number VARCHAR(20) UNIQUE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_zone_id INT,
  delivery_address TEXT NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  order_note TEXT,
  delivery_date DATE,
  payment_method ENUM('cod','telebirr','cbe') NOT NULL,
  payment_status ENUM('pending','paid','failed') DEFAULT 'pending',
  order_status ENUM('pending','confirmed','ready_for_delivery','with_delivery_agent','delivered','cancelled') DEFAULT 'pending',
  promo_code VARCHAR(20),
  transaction_ref TEXT,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (delivery_zone_id) REFERENCES delivery_zones(id)
);

-- Order items
CREATE TABLE order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  variant_id INT NOT NULL,
  quantity INT NOT NULL,
  price_at_time DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES variants(id)
);

-- Wishlist
CREATE TABLE wishlist (
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Promo codes
CREATE TABLE promo_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) UNIQUE NOT NULL,
  discount_percent INT,
  max_discount DECIMAL(10,2),
  expires_at DATE
);
CREATE TABLE saved_addresses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  address_line TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  zone_id INT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES delivery_zones(id)
);

CREATE TABLE recently_viewed (
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);


CREATE TABLE product_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  action ENUM('create', 'update', 'delete') NOT NULL,
  changes JSON,
  admin_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

ALTER TABLE orders ADD COLUMN order_note TEXT, ADD COLUMN delivery_date DATE;

-- Drop existing foreign keys
ALTER TABLE cart_items DROP FOREIGN KEY cart_items_ibfk_2;
ALTER TABLE order_items DROP FOREIGN KEY order_items_ibfk_1;
ALTER TABLE variants DROP FOREIGN KEY variants_ibfk_1;
ALTER TABLE wishlist DROP FOREIGN KEY wishlist_ibfk_2;

-- Re-add with CASCADE
ALTER TABLE variants ADD CONSTRAINT variants_ibfk_1 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_ibfk_2 FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE;
ALTER TABLE order_items ADD CONSTRAINT order_items_ibfk_1 FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE;
ALTER TABLE wishlist ADD CONSTRAINT wishlist_ibfk_2 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;