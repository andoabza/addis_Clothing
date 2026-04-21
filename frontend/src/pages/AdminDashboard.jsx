import { useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiPrinter } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import ProductsAdmin from '../components/ProductsAdmin';

// Stats Component
function Stats() {
  const [stats, setStats] = useState({});
  useEffect(() => { api.get('/admin/stats').then(res => setStats(res.data)); }, []);
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="bg-white p-4 rounded shadow">📦 Orders: {stats.totalOrders || 0}</div>
      <div className="bg-white p-4 rounded shadow">💰 Revenue: ETB {stats.totalRevenue || 0}</div>
      <div className="bg-white p-4 rounded shadow">👕 Products: {stats.totalProducts || 0}</div>
    </div>
  );
}


// Products Management with Cloudinary Upload


// Orders Management with Print Ticket
function OrdersAdmin() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { fetchOrders(); }, []);
  const fetchOrders = async () => { const res = await api.get('/admin/orders'); setOrders(res.data); };
  const updateStatus = async (id, status) => {
    await api.put(`/admin/orders/${id}/status`, { status });
    toast.success('Status updated');
    fetchOrders();
  };
  const printTicket = async (orderId) => {
    //window.open(`${import.meta.env.VITE_API_URL}/admin/orders/${orderId}/ticket`, '_blank');
    api.get(`/admin/orders/${orderId}/ticket`, { responseType: 'blob' }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');   
      link.href = url;
      link.setAttribute('view', `${orderId} Ticket.pdf`);
      document.body.appendChild(link);
      link.click();
    }); 
  };
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Orders</h2>
      <div className="space-y-2">
        {/* skeletons with pulse animation if no order found */}
        {orders.length === 0 && (
          [...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse bg-gray-200">
              <div className="bg-gray-400 h-6 mb-2 rounded w-1/2"></div>
              <div className="h-4 bg-gray-400 mb-1 rounded w-1/3"></div>
              <div className="h-4 bg-gray-400 rounded w-1/4"></div>
            </div>
          ))
        )}

        {orders.map(order => (
          <div key={order.id} className="border p-4 rounded">
            <div className="flex justify-between flex-wrap gap-2">
              <div><b>{order.order_number}</b> - {order.customer_name} ({order.phone})</div>
              <div className="flex gap-2">
                <button onClick={() => printTicket(order.order_number)} className="bg-blue-500 text-white px-2 py-1 rounded text-sm flex items-center gap-1"><FiPrinter /> Print</button>
                <select value={order.order_status} onChange={(e) => updateStatus(order.id, e.target.value)} className="border p-1 rounded">
                  <option>pending</option><option>confirmed</option><option>ready_for_delivery</option><option>with_delivery_agent</option><option>delivered</option><option>cancelled</option>
                </select>
              </div>
            </div>
            <div className="text-sm mt-1">Total: ETB {order.total_amount} | Payment: {order.payment_method} <label style={{textTransform: 'capitalize'}}>[{order.payment_status}]</label> | Zone: {order.zone_name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Admin Dashboard
export default function AdminDashboard() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="flex gap-4 mb-8 border-b pb-2">
        <Link to="/admin" className="hover:text-secondary">Stats</Link>
        <Link to="/admin/products" className="hover:text-secondary">Products</Link>
        <Link to="/admin/orders" className="hover:text-secondary">Orders</Link>
      </div>
      <Routes>
        <Route path="/" element={<Stats />} />
        <Route path="/products" element={<ProductsAdmin />} />
        <Route path="/orders" element={<OrdersAdmin />} />
      </Routes>
    </div>
  );
}