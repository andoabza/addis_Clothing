import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL;

console.log(BOT_TOKEN);

if (!BOT_TOKEN) console.warn('⚠️ Telegram bot token missing. Notifications disabled.');

// Helper: send any message to channel or admin
async function sendMessage(chatId, text, parseMode = 'HTML') {
  if (!BOT_TOKEN || !chatId) return false;
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await axios.post(url, { chat_id: chatId, text, parse_mode: parseMode });
    return res.data.ok;
  } catch (err) {
    console.error('Telegram send error:', err.response?.data || err.message);
    return false;
  }
}

async function sendPhoto(chatId, photoUrl, caption, parseMode = 'HTML') {
  if (!BOT_TOKEN || !chatId) return false;
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
    const res = await axios.post(url, { chat_id: chatId, photo: photoUrl, caption, parse_mode: parseMode });
    return res.data.ok;
  } catch (err) {
    console.error('Telegram photo error:', err.response?.data || err.message);
    return false;
  }
}

// Format product URL
function getProductLink(productId) {
  return `${FRONTEND_URL}/product/${productId}`;
}

// Format variant list as HTML
function formatVariants(variants) {
  if (!variants.length) return '❌ No variants available.';
  let html = '<b>📦 Available Variants:</b>\n';
  variants.forEach(v => {
    html += `• <b>${v.size}</b> / ${v.color} — stock: ${v.stock}${v.price_adjustment ? ` (${v.price_adjustment > 0 ? '+' : ''}${v.price_adjustment} ETB)` : ''}\n`;
  });
  return html;
}

// Main: notify channel about a new/updated variant
export async function notifyVariantAdded(product, variant, allVariants) {
  if (!BOT_TOKEN || !CHANNEL_ID) return false;

  const productUrl = getProductLink(product.id);
  const action = variant.id ? 'updated' : 'added';
  const caption = `
🆕 <b>Variant ${action.toUpperCase()}!</b>

<b>📦 Product:</b> <a href="${productUrl}">${product.name}</a>
<b>💰 Base price:</b> ETB ${product.base_price}
<b>🏷️ Category:</b> ${product.category_name || 'N/A'}

<b>✨ New variant:</b>
• Size: ${variant.size}
• Color: ${variant.color}
• Stock: ${variant.stock}
• Price adj.: ${variant.price_adjustment || 0} ETB

${formatVariants(allVariants)}

🔗 <a href="${productUrl}">👉 View product</a>
  `;

  if (product.image_url) {
    return await sendPhoto(CHANNEL_ID, product.image_url, caption, 'HTML');
  } else {
    return await sendMessage(CHANNEL_ID, caption, 'HTML');
  }
}

// Alert admin about low stock / zero stock
export async function notifyAdminLowStock(product, variant) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) return false;

  const productUrl = getProductLink(product.id);
  let severity = variant.stock === 0 ? '⚠️ <b>OUT OF STOCK</b>' : '⚠️ <b>LOW STOCK</b>';
  const message = `
${severity}

<b>Product:</b> <a href="${productUrl}">${product.name}</a>
<b>Variant:</b> ${variant.size} / ${variant.color}
<b>Remaining stock:</b> ${variant.stock}

Please restock as soon as possible.
  `;
  return await sendMessage(ADMIN_CHAT_ID, message, 'HTML');
}

// Re-export product notification (optional compatibility)
export const sendProductToTelegram = async (product, action = 'created') => {
  if (!BOT_TOKEN || !CHANNEL_ID) return false;
  const productUrl = getProductLink(product.id);
  const caption = `
🆕 <b>Product ${action.toUpperCase()}!</b>

<b>📦 Name:</b> <a href="${productUrl}">${product.name}</a>
<b>💰 Price:</b> ETB ${product.base_price}
<b>🏷️ Category:</b> ${product.category_name || 'N/A'}
<b>📝 Description:</b> ${product.description || 'No description'}
<b>⭐ Featured:</b> ${product.is_featured ? 'Yes' : 'No'}

🔗 <a href="${productUrl}">👉 View product</a>
  `;
  if (product.image_url) {
    return await sendPhoto(CHANNEL_ID, product.image_url, caption, 'HTML');
  } else {
    return await sendMessage(CHANNEL_ID, caption, 'HTML');
  }
};

// example create a clothing product then notify
const newProduct = { id: 123, name: 'T-Shirt', base_price: 500, category_name: 'Clothing', description: 'A cool t-shirt', is_featured: true, image_url: 'https://example.com/tshirt.jpg' };

sendProductToTelegram(newProduct, 'created').then(success => {
  if (success) console.log('Telegram notification sent successfully!');
  else console.log('Failed to create product.');
}).catch(err => console.error('Telegram error:', err));

notifyVariantAdded(
  { id: 123, name: 'T-Shirt', base_price: 500, category_name: 'Clothing', image_url: 'https://example.com/tshirt.jpg' },
  { id: 456, size: 'M', color: 'Red', stock: 10, price_adjustment: 50 },
  [
    { size: 'S', color: 'Red', stock: 5, price_adjustment: 0 },
    { size: 'M', color: 'Red', stock: 10, price_adjustment: 50 },
    { size: 'L', color: 'Red', stock: 0, price_adjustment: 100 }
  ]
).then(success => {
  if (success) console.log('Variant notification sent successfully!');
  else console.log('Failed to send variant notification.');
}).catch(err => console.error('Telegram error:', err));

notifyAdminLowStock(
  { id: 123, name: 'T-Shirt', base_price: 500, category_name: 'Clothing' },
  { size: 'L', color: 'Red', stock: 0 }
).then(success => {
  if (success) console.log('Admin low stock alert sent successfully!');
  else console.log('Failed to send admin alert.');
}).catch(err => console.error('Telegram error:', err));
