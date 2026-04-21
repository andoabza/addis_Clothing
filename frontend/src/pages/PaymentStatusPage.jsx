import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    const params = Object.fromEntries([...searchParams]);

    if (!orderId) {
      setStatus('error');
      return;
    }

    const checkPayment = async () => {
      try {
        // Poll every 3 seconds for up to 2 minutes
        let attempts = 0;
        const maxAttempts = 40;
        const interval = setInterval(async () => {
          attempts++;
          const res = await api.get(`/payment/status/${orderId}`);
          console.log(res);
          
          if (res.data.payment_status === 'paid') {
            clearInterval(interval);
            setStatus('success');
            toast.success('Payment confirmed! Your order is now confirmed.');
            // Also fetch order number
            const orderRes = await api.get(`/orders/${orderId}`);
            setOrderNumber(orderRes.data.order_number);
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            setStatus('timeout');
          }
        }, 3000);
      } catch (error) {
        setStatus('error');
      }
    };

    checkPayment();
  }, [searchParams]);

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      {status === 'checking' && (
        <>
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold">Verifying Payment...</h2>
          <p className="text-gray-500 mt-2">Please wait while we confirm your transaction.</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold">Payment Successful!</h2>
          <p className="text-gray-500 mt-2">Your order {orderNumber} has been confirmed.</p>
          <button onClick={() => navigate('/account')} className="btn-primary mt-6">View My Orders</button>
        </>
      )}
      {status === 'timeout' && (
        <>
          <div className="text-yellow-500 text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold">Still Checking</h2>
          <p className="text-gray-500 mt-2">Payment may still be processing. Please check your orders page later.</p>
          <button onClick={() => navigate('/account')} className="btn-primary mt-6">Go to Orders</button>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="text-red-500 text-6xl mb-4">✗</div>
          <h2 className="text-2xl font-bold">Payment Verification Failed</h2>
          <p className="text-gray-500 mt-2">We couldn't verify your payment. Please contact support or try again.</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-6">Return Home</button>
        </>
      )}
    </div>
  );
}