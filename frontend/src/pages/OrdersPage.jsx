import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [pollingOrderId, setPollingOrderId] = useState(null);
  const navigate = useNavigate();
  const [cancelModal, setCancelModal] = useState({ isOpen: false, orderId: null });




  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    const res = await api.get('/orders/my-orders');
    setOrders(res.data);
    setLoading(false);
  };

  const cancelOrder = async (orderId) => {
    setCancelModal({ isOpen: true, orderId });
    };

  const handleConfirmCancel = async () => {
    const { orderId } = cancelModal;
    await api.put(`/orders/cancel/${orderId}`);
    toast.success('Order cancelled');
    fetchOrders(); // refresh orders list
    setCancelModal({ isOpen: false, orderId: null });
  };

  const handleCloseModal = () => {
    setCancelModal({ isOpen: false, orderId: null });
  };


  const reorder = async (orderId) => {
    await api.post(`/orders/reorder/${orderId}`);
    toast.success('Items added to cart');
    navigate('/cart');
  };

  const openPaymentModal = async (order) => {
    // Use stored transaction_ref from backend (or construct URL)
      // await fetchCart();
      // Open iframe modal instead of redirect
    const ref = order.transaction_ref;    
    const url = `https://checkout.chapa.co/checkout/payment/${ref}`;
    window.open(url, '_blank');
    setPaymentUrl(url);
    setPollingOrderId(order.order_number);
    // window.open(paymentRes.data.checkoutUrl, '_blank');
      // Store orderId to check status later
    sessionStorage.setItem('pendingOrderId', order.order_number);
      // await fetchCart();
    // } else {
    //   toast.error('Payment gateway error. Please complete payment later.');
    //   navigate(`/account?order=${orderNumber}`);
    // }
    
    // setShowPaymentModal(true);
  };

  // Poll payment status when modal is open (or after close)
  useEffect(() => {
    let interval;
    if (pollingOrderId && !showPaymentModal) {
      // Start polling after modal closes
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/payment/status/${pollingOrderId}`);
          if (res.data.payment_status === 'paid') {
            clearInterval(interval);
            toast.success('Payment confirmed! Order updated.');
            fetchOrders();
            setPollingOrderId(null);
          }
        } catch (err) {
          console.error('Polling error', err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [pollingOrderId, showPaymentModal]);

  if (loading) return( 
    // loading skeleton with pulse animation
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border rounded-xl p-4 bg-white shadow-sm animate-pulse">
            <div className="flex flex-wrap justify-between items-start">
              <div>
                <p className="font-bold bg-gray-300 h-6 w-32 mb-2"></p>
                <p className="text-sm text-gray-500 bg-gray-300 h-4 w-48"></p>
              </div>
              <span className="px-2 py-1 rounded text-xs bg-gray-300 h-5 w-20"></span>
            </div>
            <div className="mt-2 bg-gray-300 h-4 w-64"></div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button className="text-blue-600 text-sm bg-gray-300 h-5 w-20"></button>
              <button className="text-red-600 text-sm bg-gray-300 h-5 w-20"></button>
              <button className="text-green-600 text-sm bg-gray-300 h-5 w-20"></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="border rounded-xl p-4 bg-white shadow-sm">
              <div className="flex flex-wrap justify-between items-start">
                <div>
                  <p className="font-bold">{order.order_number}</p>
                  <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  order.order_status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.order_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.order_status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="mt-2">
                Total: ETB {order.total_amount} | Payment: {order.payment_method.toUpperCase()} | Status: <label style={{textTransform: 'capitalize'}}>{order.payment_status}</label>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => navigate(`/account?order=${order.order_number}`)} className="text-blue-600 text-sm">
                  View Details
                </button>
                {order.order_status === 'pending' && (
                  <button onClick={() => cancelOrder(order.id)} className="text-red-600 text-sm">
                    Cancel
                  </button>
                  
                )}
                {order.order_status === 'delivered' && (
                  <button onClick={() => reorder(order.id)} className="text-green-600 text-sm">
                    Reorder
                  </button>
                )}
                {order.payment_status === 'pending' && order.order_status !== 'cancelled' && (
                  <button onClick={() => openPaymentModal(order)} className="text-secondary text-sm font-semibold">
                    Pay Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Chapa Payment Iframe Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-bold">Complete Payment (Chapa)</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-black text-2xl">
                &times;
              </button>
            </div>
            <iframe
              src={paymentUrl}
              width={100}
              height={100}
              className="flex-1 w-full rounded-b-xl"
              title="Chapa Payment"
            />
          </div>
        </div>
      )}
      <ConfirmModal
  isOpen={cancelModal.isOpen}
  onClose={handleCloseModal}
  onConfirm={handleConfirmCancel}
  title="Cancel Order"
  message="Are you sure you want to cancel this order? This action cannot be undone."
  confirmText="Yes, Cancel Order"
  cancelText="No, Keep It"
/>
    </div>
  );
}