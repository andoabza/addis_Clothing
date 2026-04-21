import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_BASE_URL = process.env.CHAPA_BASE_URL;
export const initializePayment = async (order) => {
  const { order_number, total_amount, email, first_name, last_name, phone } = order;
  const response = await axios.post(`${CHAPA_BASE_URL}/transaction/initialize`, {
    amount: total_amount,
    currency: 'ETB',
    email,
    first_name,
    last_name,
    phone_number: phone,
    tx_ref: order_number,
    callback_url: `${process.env.APP_URL}/api/payment/callback`,
    return_url: `${process.env.FRONTEND_URL}/payment-status?order_id=${order.order_number}`,
    // return_url: `https://checkout.chapa.co/checkout/payment/${order.order_number}`,
    customization: {
      title: 'Addis Clothing',
      description: `Payment for order ${order_number}`
    }
  }, {
    headers: {
      Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data;
};

export const verifyPayment = async (transactionId) => {
  try {
  const response = await axios.get(`${CHAPA_BASE_URL}/transaction/verify/${transactionId}`, {
    headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` }
  });
  
  return response.data;
}
  catch (error) {
    return { data: { status: 'error' }, message: error.message };
  }
};