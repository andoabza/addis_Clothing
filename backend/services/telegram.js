import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL;

if (!BOT_TOKEN) console.warn('⚠️ Telegram bot token missing. Notifications disabled.');

// Helper: send formatted text (Markdown)
async function sendMessage(chatId, text, parseMode = 'Markdown') {
  if (!BOT_TOKEN || !chatId) return false;
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await axios.post(url, {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: false  // shows link preview
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    return res.data.ok;
  } catch (err) {
    console.error('Telegram sendMessage error:', err.response?.data || err.message);
    return false;
  }
}

// Helper: send photo with caption (Markdown)
async function sendPhoto(chatId, photoUrl, caption, parseMode = 'Markdown') {
  if (!BOT_TOKEN || !chatId) return false;
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
    const res = await axios.post(url, {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: parseMode
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    return res.data.ok;
  } catch (err) {
    console.error('Telegram sendPhoto error:', err.response?.data || err.message);
    return false;
  }
}

// Generate clickable product link
function getProductLink(productId) {
  return `${FRONTEND_URL}/product/${productId}`;
}

// Format variant list as Markdown
function formatVariantsMarkdown(variants) {
  if (!variants.length) return '❌ *No variants available* – product not for sale.';
  let text = '*📦 Available Variants:*\n';
  variants.forEach(v => {
    const stockEmoji = v.stock === 0 ? '❌' : (v.stock <= 3 ? '⚠️' : '✅');
    text += `${stockEmoji} *${v.size}* / ${v.color} — stock: ${v.stock}`;
    if (v.price_adjustment) text += ` (${v.price_adjustment > 0 ? '+' : ''}${v.price_adjustment} ETB)`;
    text += '\n';
  });
  return text;
}

// ----- 1. Notify public channel when a variant is added/updated -----
export async function notifyVariantAdded(product, variant, allVariants, action = 'added') {
  if (!BOT_TOKEN || !CHANNEL_ID) return false;

  const productUrl = getProductLink(product.id);
  const title = action === 'added' ? '🆕 *New Variant Added!*' : '🔄 *Variant Updated*';
  const variantLine = `• *${variant.size}* / ${variant.color} — stock: ${variant.stock}` +
    (variant.price_adjustment ? ` (${variant.price_adjustment > 0 ? '+' : ''}${variant.price_adjustment} ETB)` : '');

  const message = `${title}\n\n` +
    `*📦 Product:* [${product.name}](${productUrl})\n` +
    `*💰 Base price:* ETB ${product.base_price}\n` +
    `*🏷️ Category:* ${product.category_name || 'N/A'}\n\n` +
    `*✨ ${action === 'added' ? 'New' : 'Updated'} variant:*\n${variantLine}\n\n` +
    `${formatVariantsMarkdown(allVariants)}\n\n` +
    `${productUrl}`;

  if (product.image_url) {
    // Send photo + caption (Markdown)
    return await sendPhoto(CHANNEL_ID, product.image_url, message, 'Markdown');
  } else {
    return await sendMessage(CHANNEL_ID, message, 'Markdown');
  }
}

// ----- 2. Alert admin (private) about low/out-of-stock -----
export async function notifyAdminLowStock(product, variant) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) return false;

  const productUrl = getProductLink(product.id);
  const severity = variant.stock === 0 ? '⚠️ *OUT OF STOCK*' : '⚠️ *LOW STOCK*';
  const caption = `${severity}\n\n` +
    `*Product:* [${product.name}](${productUrl})\n` +
    `*Variant:* ${variant.size} / ${variant.color}\n` +
    `*Remaining stock:* ${variant.stock}\n\n` +
    `Please restock soon.`;

  if (product.image_url) {
    return await sendPhoto(ADMIN_CHAT_ID, product.image_url, caption, 'Markdown');
  } else {
    return await sendMessage(ADMIN_CHAT_ID, caption, 'Markdown');
  }
}

// ----- 3. Notify channel when a product is first created (without variants) -----
export const sendProductToTelegram = async (product, action = 'created') => {
  if (!BOT_TOKEN || !CHANNEL_ID) return false;

  const productUrl = getProductLink(product.id);
  const message = `🆕 *Product ${action.toUpperCase()}!*\n\n` +
    `*📦 Name:* [${product.name}](${productUrl})\n` +
    `*💰 Price:* ETB ${product.base_price}\n` +
    `*🏷️ Category:* ${product.category_name || 'N/A'}\n` +
    `*📝 Description:* ${product.description || 'No description'}\n` +
    `*⭐ Featured:* ${product.is_featured ? 'Yes' : 'No'}\n\n` +
    `${productUrl}`;

  if (product.image_url) {
    return await sendPhoto(CHANNEL_ID, product.image_url, message, 'Markdown');
  } else {
    return await sendMessage(CHANNEL_ID, message, 'Markdown');
  }
};