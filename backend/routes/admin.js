import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import { uploadToCloudinary } from '../middleware/upload.js';
import upload from '../middleware/upload.js';
import QRCode from 'qrcode';
import { sendProductToTelegram } from '../services/telegram.js';
import { notifyVariantAdded, notifyAdminLowStock } from '../services/telegram.js';

const router = express.Router();
router.use(protect, adminOnly);

// Helper: draw rounded rectangle
function roundedRect(doc, x, y, w, h, r) {
  doc.path(`M ${x + r} ${y} L ${x + w - r} ${y} A ${r} ${r} 0 0 1 ${x + w} ${y + r} L ${x + w} ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} L ${x + r} ${y + h} A ${r} ${r} 0 0 1 ${x} ${y + h - r} L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`);
  return doc;
}

router.get('/orders/:id/ticket', async (req, res) => {
  try {
    const [orderRows] = await pool.query(`
      SELECT o.*, u.name as customer_name, u.phone, dz.zone_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN delivery_zones dz ON o.delivery_zone_id = dz.id
      WHERE o.order_number = ?
    `, [req.params.id]);
    if (orderRows.length === 0) return res.status(404).json({ message: 'Order not found' });
    const order = orderRows[0];
    
    const [items] = await pool.query(`
      SELECT oi.*, p.name as product_name, v.size, v.color
      FROM order_items oi
      JOIN variants v ON oi.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `, [order.id]);

    // Generate QR code
    const qrData = JSON.stringify({
      order: order.order_number,
      total: order.total_amount,
      customer: order.customer_name,
      date: order.created_at
    });
    const qrBuffer = await QRCode.toBuffer(qrData, { 
  type: 'png', 
  margin: 2,      // increase margin for better readability
  width: 100,     // increase from 55 to 100pt (~1.4 inches)
  errorCorrectionLevel: 'H'  // medium error correction
});
    const doc = new PDFDocument({ size: 'A6', margin: 8 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=order_${order.order_number}.pdf`);
    doc.pipe(res);

    const primary = '#1a1a1a';
    const gold = '#d4af37';
    const lightGray = '#f0f0f0';
    const gray = '#666';

    // ----- Draw header and customer info (only on first page) -----
    function drawFirstPageHeader() {
      doc.rect(0, 0, doc.page.width, 30).fill(primary);
      doc.fillColor(gold).fontSize(12).font('Helvetica-Bold').text('ADDISCLOTHING', 8, 6);
      doc.fontSize(6).fillColor('white').text('Ethiopian Modern Fashion', 8, 18);
      doc.fillColor(gold).fontSize(7).text('DELIVERY TICKET', doc.page.width - 65, 8, { align: 'right' });
      doc.fillColor('black');

      let y = 35;
      const cardX = 8;
      const cardW = doc.page.width - 16;
      const cardH = 55;

      doc.rect(cardX, y, cardW, cardH).fill(lightGray).stroke();
      doc.fillColor(primary).fontSize(7).font('Helvetica-Bold').text('ORDER & CUSTOMER', cardX + 4, y + 3);
      doc.fontSize(6).font('Helvetica');
      doc.text(`Order: ${order.order_number}`, cardX + 4, y + 14);
      doc.text(`Date: ${new Date(order.created_at).toLocaleString().slice(0, 16)}`, cardX + 4, y + 22);
      doc.text(`Status: ${order.order_status.replace(/_/g, ' ').toUpperCase()}`, cardX + 4, y + 30);
      doc.text(`Name: ${order.customer_name}`, cardX + 4, y + 38);
      doc.text(`Phone: ${order.phone}`, cardX + 4, y + 46);
      doc.text(`Payment: ${order.payment_method.toUpperCase()}`, cardX + 140, y + 14);
      doc.text(`Zone: ${order.zone_name || 'N/A'}`, cardX + 140, y + 22);
      doc.text(`Delivery Fee: ETB ${order.delivery_fee}`, cardX + 140, y + 30);
      doc.text(`Total: ETB ${order.total_amount}`, cardX + 140, y + 38);
      doc.text(`Paid: ${order.payment_status}`, cardX + 140, y + 46);

      y += cardH + 2;
      doc.rect(cardX, y, cardW, 16).fill(lightGray).stroke();
      doc.fontSize(6).text(`Address: ${order.delivery_address}`, cardX + 4, y + 4);
      return y + 18;
    }

    // ----- Draw table header at given Y -----
    function drawTableHeader(yPos) {
      const startX = 8;
      const cardW = doc.page.width - 16;
      doc.rect(startX, yPos - 2, cardW, 6).fill(primary);
      doc.fillColor('white').fontSize(5).font('Helvetica-Bold');
      doc.text('Product', startX + 2, yPos - 1);
      doc.text('Qty', 180, yPos - 1, { width: 20, align: 'center' });
      doc.text('Unit Price', 210, yPos - 1, { width: 35, align: 'right' });
      doc.text('Total', 250, yPos - 1, { width: 35, align: 'right' });
      doc.fillColor(primary);
      return yPos + 8;
    }

    // ----- Draw one item row with dynamic height -----
    function drawItemRowDynamic(item, yPos, rowColor) {
      const startX = 8;
      const cardW = doc.page.width - 16;
      const productLine = `${item.product_name || 'N/A'} (${item.size || '-'},${item.color || '-'})`;
      const textHeight = doc.heightOfString(productLine, { width: 170 });
      const rowHeight = Math.max(12, textHeight + 2);
      if (rowColor) {
        doc.rect(startX, yPos - 1, cardW, rowHeight).fill(lightGray);
      }
      const itemTotal = Number(item.price_at_time) * Number(item.quantity);
      doc.fillColor(primary).fontSize(5).font('Helvetica');
      doc.text(productLine, startX + 2, yPos, { width: 170 });
      doc.text(item.quantity.toString(), 180, yPos, { width: 20, align: 'center' });
      doc.text(`ETB ${item.price_at_time}`, 210, yPos, { width: 35, align: 'right' });
      doc.text(`ETB ${itemTotal}`, 250, yPos, { width: 35, align: 'right' });
      return { rowHeight, itemTotal };
    }

    // ----- Start building PDF -----
    let currentY = drawFirstPageHeader();
    currentY = drawTableHeader(currentY);
    let subtotal = 0;
    let rowColor = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const productLine = `${item.product_name || 'N/A'} (${item.size || '-'},${item.color || '-'})`;
      const estimatedHeight = Math.max(12, doc.heightOfString(productLine, { width: 170 }) + 2);
      const isLastItem = (i === items.length - 1);
      const reserveBottomSpace = isLastItem ? 110 : 20; // extra space for totals+QR on last page
      if (currentY + estimatedHeight + reserveBottomSpace > doc.page.height - 10) {
        doc.addPage();
        currentY = 15;
        currentY = drawTableHeader(currentY);
        rowColor = false;
      }
      const { rowHeight, itemTotal } = drawItemRowDynamic(item, currentY, rowColor);
      subtotal += itemTotal;
      currentY += rowHeight;
      rowColor = !rowColor;
    }

    // ----- Draw totals and QR code (with page break if needed) -----
    const neededForTotals = 40;
    const neededForQR = 70;
    const totalNeeded = neededForTotals + neededForQR;
    if (currentY + totalNeeded > doc.page.height - 20) {
      doc.addPage();
      currentY = 15;
    }

    const totalsStartY = currentY + 5;
    const grandTotal = Number(subtotal) + Number(order.delivery_fee);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(gray);
    doc.text(`Subtotal: ETB ${subtotal}`, doc.page.width - 85, totalsStartY);
    doc.text(`Delivery: ETB ${order.delivery_fee}`, doc.page.width - 85, totalsStartY + 9);
    doc.fontSize(9).fillColor(gold).text(`TOTAL: ETB ${grandTotal}`, doc.page.width - 85, totalsStartY + 18);
    doc.fillColor(primary);

    let qrY = totalsStartY + 40;
    if (qrY + 70 > doc.page.height - 10) {
      doc.addPage();
      qrY = 60;
    }
    const qrSize = 55;
    const qrX = (doc.page.width - qrSize) / 2;
    doc.fontSize(6).fillColor(gray);
    const thankYouText = 'Thank you for shopping!';
    const thankYouWidth = doc.widthOfString(thankYouText);
    doc.text(thankYouText, (doc.page.width - thankYouWidth) / 2, qrY - 10);
  
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    doc.fontSize(4).text('Scan to verify', qrX, qrY + qrSize + 2, { width: qrSize, align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Ticket generation error:', error);
    res.status(500).json({ message: 'PDF generation failed' });
  }
});

const logProductChange = async (productId, action, changes, adminId) => {
  await pool.query(
    'INSERT INTO product_history (product_id, action, changes, admin_id) VALUES (?, ?, ?, ?)',
    [productId, action, JSON.stringify(changes), adminId]
  );
};

// Inside POST /products

// Inside PUT /products/:id
router.get('/products/history', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT ph.*, p.name as product_name, u.name as admin_name
    FROM product_history ph
    JOIN products p ON ph.product_id = p.id
    JOIN users u ON ph.admin_id = u.id
    ORDER BY ph.created_at DESC
  `);
  res.json(rows);
});

router.get('/upload', (req, res) => {
  res.send('Upload endpoint');
});

router.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [totalOrders] = await pool.query('SELECT COUNT(*) as count FROM orders');
    const [totalRevenue] = await pool.query('SELECT SUM(total_amount) as total FROM orders WHERE order_status != "cancelled"');
    const [totalProducts] = await pool.query('SELECT COUNT(*) as count FROM products');
    const [recentOrders] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5');
    res.json({
      totalOrders: totalOrders[0].count,
      totalRevenue: totalRevenue[0].total || 0,
      totalProducts: totalProducts[0].count,
      recentOrders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Product CRUD
// router.get('/products', async (req, res) => {
//   const [products] = await pool.query('SELECT * FROM products');
//   // await logProductChange(result.insertId, 'create', form, req.user.id);
//   res.json(products);
  
// });

// router.post('/products', async (req, res) => {
//   const { name, description, category_id, base_price, image_url, is_featured } = req.body;
  
//   // Validate category exists
//   const [cat] = await pool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
//   if (cat.length === 0) {
//     return res.status(400).json({ message: 'Invalid category_id' });
//   }
  
//   const [result] = await pool.query(
//     'INSERT INTO products (name, description, category_id, base_price, image_url, is_featured) VALUES (?, ?, ?, ?, ?, ?)',
//     [name, description, category_id, base_price, image_url, is_featured || false]
//   );
//   res.status(201).json({ id: result.insertId });
// });

// Product CRUD
router.get('/products', async (req, res) => {
  const [products] = await pool.query('SELECT * FROM products ORDER BY id DESC');
  res.json(products);
});

// Create product (only here you should log the change)
router.post('/products', async (req, res) => {
  const { name, description, category_id, base_price, image_url, is_featured } = req.body;
  const [result] = await pool.query(
    'INSERT INTO products (name, description, category_id, base_price, image_url, is_featured) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description, category_id, base_price, image_url, is_featured || false]
  );
  // Log the creation

  await logProductChange(result.insertId, 'create', req.body, req.user.id);
  await sendProductToTelegram({
    name,
    base_price,
    category_id,
    description,
    is_featured,
    image_url
  }, 'created').catch(err => console.error('Telegram error:', err));
  
  res.status(201).json({ id: result.insertId });
});

router.put('/products/:id', async (req, res) => {
  const { name, description, category_id, base_price, image_url, is_featured } = req.body;
  const [oldData] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  await pool.query(
    'UPDATE products SET name=?, description=?, category_id=?, base_price=?, image_url=?, is_featured=? WHERE id=?',
    [name, description, category_id, base_price, image_url, is_featured, req.params.id]
  );
  const newData = { name, description, category_id, base_price, image_url, is_featured };
  await logProductChange(req.params.id, 'update', { before: oldData, after: newData }, req.user.id);
  res.json({ success: true });
  });

router.delete('/products/:id', async (req, res) => {
  await pool.query('DELETE FROM products WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Variant management
// router.post('/variants', async (req, res) => {
//   const { product_id, size, color, stock, price_adjustment, sku } = req.body;
//   await pool.query(
//     'INSERT INTO variants (product_id, size, color, stock, price_adjustment, sku) VALUES (?, ?, ?, ?, ?, ?)',
//     [product_id, size, color, stock, price_adjustment, sku]
//   );
//   res.status(201).json({ success: true });
// });

// Add/Update variant
router.post('/variants', async (req, res) => {
  const { product_id, size, color, stock, price_adjustment, sku } = req.body;
  // ... insert variant
  // check if sku exists 
  const [existing] = await pool.query('SELECT id FROM variants WHERE sku = ?', [sku]);
  if (existing.length > 0) {
    return res.status(400).json({ message: 'SKU already exists' });
  }
  const [result] = await pool.query(
    'INSERT INTO variants (product_id, size, color, stock, price_adjustment, sku) VALUES (?, ?, ?, ?, ?, ?)',
    [product_id, size, color, stock, price_adjustment, sku || null]
  );
  
  // Fetch product details and all variants
  const [productRows] = await pool.query('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [product_id]);
  const product = productRows[0];
  const [allVariants] = await pool.query('SELECT size, color, stock, price_adjustment FROM variants WHERE product_id = ?', [product_id]);
  const newVariant = { id: result.insertId, size, color, stock, price_adjustment };
  
  // Notify channel (non-blocking)
  notifyVariantAdded(product, newVariant, allVariants).catch(console.error);
  
  // Alert admin if stock is low (<=3)
  if (stock <= 3) {
    notifyAdminLowStock(product, newVariant).catch(console.error);
  }
  
  res.status(201).json({ id: result.insertId });
});

// Similarly for PUT update – check stock change and alert if stock becomes low
router.put('/variants/:id', async (req, res) => {
  const { size, color, stock, price_adjustment, sku } = req.body;
  // ... update variant
  const [oldVariant] = await pool.query('SELECT stock, product_id FROM variants WHERE id = ?', [req.params.id]);
  await pool.query('UPDATE variants SET size=?, color=?, stock=?, price_adjustment=?, sku=? WHERE id=?',
    [size, color, stock, price_adjustment, sku, req.params.id]);
  
  // Notify if stock decreased to <=3
  if (stock <= 3 && oldVariant[0].stock > 3) {
    const [productRows] = await pool.query('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [oldVariant[0].product_id]);
    const product = productRows[0];
    const updatedVariant = { id: req.params.id, size, color, stock, price_adjustment };
    notifyAdminLowStock(product, updatedVariant).catch(console.error);
  }
  res.json({ success: true });
});

// Order management
router.get('/orders', async (req, res) => {
  const [orders] = await pool.query(`
    SELECT o.*, u.name as customer_name, u.phone, dz.zone_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN delivery_zones dz ON o.delivery_zone_id = dz.id
    ORDER BY o.created_at DESC
  `);
  res.json(orders);
});

router.put('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE orders SET order_status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ success: true });
});


// Get single order with items
router.get('/orders/:id', async (req, res) => {
  const [orderRows] = await pool.query(`
    SELECT o.*, u.name as customer_name, u.phone, dz.zone_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN delivery_zones dz ON o.delivery_zone_id = dz.id
    WHERE o.id = ?
  `, [req.params.id]);
  if (orderRows.length === 0) return res.status(404).json({ message: 'Order not found' });
  const [items] = await pool.query(`
    SELECT oi.*, p.name as product_name, v.size, v.color
    FROM order_items oi
    JOIN variants v ON oi.variant_id = v.id
    JOIN products p ON v.product_id = p.id
    WHERE oi.order_id = ?
  `, [req.params.id]);
  res.json({ order: orderRows[0], items });
});


// Get variants for a product
router.get('/products/:productId/variants', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM variants WHERE product_id = ?', [req.params.productId]);
  res.json(rows);
});

// Add variant
router.post('/variants', async (req, res) => {
  const { product_id, size, color, stock, price_adjustment, sku } = req.body;
  const [result] = await pool.query(
    'INSERT INTO variants (product_id, size, color, stock, price_adjustment, sku) VALUES (?, ?, ?, ?, ?, ?)',
    [product_id, size, color, stock, price_adjustment, sku || null]
  );
  res.status(201).json({ id: result.insertId });
});

// Update variant
// router.put('/variants/:id', async (req, res) => {
//   const { size, color, stock, price_adjustment, sku } = req.body;
//   await pool.query(
//     'UPDATE variants SET size=?, color=?, stock=?, price_adjustment=?, sku=? WHERE id=?',
//     [size, color, stock, price_adjustment, sku, req.params.id]
//   );
//   res.json({ success: true });
// });

// Delete variant
router.delete('/variants/:id', async (req, res) => {
  await pool.query('DELETE FROM variants WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

export default router;