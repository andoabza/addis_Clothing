import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiUser, FiMapPin, FiPackage, FiHeart, FiLogOut, FiEdit2, FiTrash2, FiPlus, FiArrowLeft } from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSearchParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import { FiEye, FiEyeOff } from 'react-icons/fi';


// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationPicker({ onSelectLocation }) {
  const [position, setPosition] = useState(null);
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelectLocation(e.latlng);
    }
  });
  return position ? <Marker position={position} /> : null;
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const { wishlist, fetchWishlist } = useWishlist();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [zones, setZones] = useState([]);
  const [addressForm, setAddressForm] = useState({ address_line: '', city: '', zone_id: '', is_default: false });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLatLng, setSelectedLatLng] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, orderId: null });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);


  // Single order view
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [paymentChecked, setPaymentChecked] = useState(false);

  const statusSteps = ['pending', 'confirmed', 'ready_for_delivery', 'with_delivery_agent', 'delivered'];

  // Fetch order items by order ID
  const fetchOrderItems = async (orderId) => {
    const res = await api.get(`/orders/${orderId}/items`);
    setSelectedOrderItems(res.data);
  };

  // Fetch single order by order number
  const fetchOrderByNumber = async (orderNumber) => {
    try {
      const res = await api.get(`/orders/by-number/${orderNumber}`);
      setSelectedOrder(res.data.order);
      setSelectedOrderItems(res.data.items);
    } catch (err) {
      toast.error('Order not found');
    }
  };

  // Handle URL order parameter
  useEffect(() => {
    const orderNumber = searchParams.get('order');
    if (orderNumber) {
      if (orders.length > 0) {
        const found = orders.find(o => o.order_number === orderNumber);
        if (found) {
          setSelectedOrder(found);
          fetchOrderItems(found.id);
        } else {
          fetchOrderByNumber(orderNumber);
        }
      } else if (orderNumber) {
        fetchOrderByNumber(orderNumber);
      }
    } else {
      setSelectedOrder(null);
      setSelectedOrderItems([]);
    }
  }, [searchParams, orders]);

  // Payment polling after returning from Chapa
  useEffect(() => {
    const orderId = searchParams.get('order_id');
    if (orderId && !paymentChecked) {
      setPaymentChecked(true);
      const interval = setInterval(async () => {
        try {
          const statusRes = await api.get(`/payment/status/${orderId}`);
          if (statusRes.data.payment_status === 'paid') {
            clearInterval(interval);
            toast.success('Payment confirmed! Order confirmed.');
            fetchOrders();
            // Clear URL param
            window.history.replaceState({}, '', '/account');
          }
        } catch (err) {
          console.error('Payment polling error', err);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [searchParams, paymentChecked]);

  // Data fetching
  useEffect(() => {
    fetchProfile();
    fetchAddresses();
    fetchOrders();
    fetchZones();
    fetchWishlist();
  }, []);

  const fetchProfile = async () => {
    const res = await api.get('/user/profile');
    setProfile(res.data);
  };
  const fetchAddresses = async () => {
    const res = await api.get('/user/addresses');
    setAddresses(res.data);
  };
  const fetchOrders = async () => {
    const res = await api.get('/orders/my-orders');
    setOrders(res.data);
  };
  const fetchZones = async () => {
    const res = await api.get('/delivery-zones');
    setZones(res.data);
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/user/profile', { name: profile.name, email: profile.email });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    setLoading(true);
    try {
      await api.put('/user/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    setDeleteModal({ isOpen: true, userId: user?.id });
  };

  const handleDeleteModal = async () => {
    const { userId } = deleteModal;
    try {
      await api.delete('/user/account');
      toast.success('Account deleted');
      logout();
      window.location.href = '/';
      setCancelModal({ isOpen: false, userId: null });
    } catch (err) {
      toast.error('Deletion failed');
    }
  }

  const handleCloseModal = () => {
    setDeleteModal({ isOpen: false, userId: null });
  };

  const saveAddress = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingAddress) {
        await api.put(`/user/addresses/${editingAddress.id}`, addressForm);
        toast.success('Address updated');
      } else {
        await api.post('/user/addresses', addressForm);
        toast.success('Address added');
      }
      await fetchAddresses();
      setShowAddressModal(false);
      resetAddressForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteAddress = async (id) => {
    if (confirm('Delete this address?')) {
      await api.delete(`/user/addresses/${id}`);
      toast.success('Address deleted');
      fetchAddresses();
    }
  };

  const resetAddressForm = () => {
    setAddressForm({ address_line: '', city: '', zone_id: '', is_default: false });
    setEditingAddress(null);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedLatLng(null);
  };

  const openEditAddress = (addr) => {
    setEditingAddress(addr);
    setAddressForm({
      address_line: addr.address_line,
      city: addr.city,
      zone_id: addr.zone_id || '',
      is_default: addr.is_default
    });
    setShowAddressModal(true);
  };

  const searchLocation = async () => {
    if (!searchQuery) return;
    const res = await api.get(`/user/geocode?q=${encodeURIComponent(searchQuery)}`);
    setSearchResults(res.data);
  };

  const selectSearchResult = (result) => {
    setAddressForm({
      ...addressForm,
      address_line: result.display_name,
      city: result.address?.city || result.address?.town || 'Addis Ababa'
    });
    setSelectedLatLng({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setSearchResults([]);
    setSearchQuery('');
  };

  // Render order details view if a specific order is selected
  if (selectedOrder) {
    const currentStep = statusSteps.indexOf(selectedOrder.order_status);
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedOrder(null)}
            className="flex items-center gap-2 text-secondary mb-6 hover:underline"
          >
            <FiArrowLeft /> Back to Orders
          </button>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedOrder.order_number}</h2>
                <p className="text-gray-500">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm capitalize ${selectedOrder.order_status === 'delivered' ? 'bg-green-100 text-green-800' :
                  selectedOrder.order_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                }`}>
                {selectedOrder.order_status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs mb-1">
                {statusSteps.map((step, idx) => (
                  <span key={step} className={idx <= currentStep ? 'text-black font-medium' : 'text-gray-400'}>
                    {step.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-black rounded-full transition-all" style={{ width: `${((currentStep + 1) / statusSteps.length) * 100}%` }}></div>
              </div>
            </div>

            {/* Items table */}
            <div className="border-t pt-4 mb-4">
              <h3 className="font-semibold mb-2">Items</h3>
              <div className="space-y-2">
                {selectedOrderItems && selectedOrderItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm border-b pb-2">
                    <span>{item.product_name} (Size: {item.size}, Color: {item.color}) x{item.quantity}</span>
                    <span>ETB {item.price_at_time * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-1 text-right">
              <div>Subtotal: ETB {selectedOrder.total_amount - selectedOrder.delivery_fee}</div>
              <div>Delivery Fee: ETB {selectedOrder.delivery_fee}</div>
              <div className="font-bold text-lg">Total: ETB {selectedOrder.total_amount}</div>
            </div>

            {/* Delivery info */}
            <div className="border-t mt-4 pt-4 text-sm text-gray-600">
              <p><span className="font-medium">Delivery Address:</span> {selectedOrder.delivery_address}</p>
              <p><span className="font-medium">Payment Method:</span> {selectedOrder.payment_method.toUpperCase()}</p>
              <p><span className="font-medium">Payment Status:</span> <label style={{textTransform: 'capitalize'}}>{selectedOrder.payment_status}</label></p>
              
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main account page with tabs (when no single order selected)
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Account</h1>

        <div className="flex flex-wrap gap-2 border-b mb-8">
          {[
            { id: 'profile', label: 'Profile', icon: FiUser },
            { id: 'addresses', label: 'Addresses', icon: FiMapPin },
            { id: 'orders', label: 'Orders', icon: FiPackage },
            { id: 'wishlist', label: 'Wishlist', icon: FiHeart }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-2 rounded-t-lg transition ${activeTab === tab.id ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
          <button onClick={logout} className="flex items-center gap-2 ml-auto text-red-500 hover:text-red-700 px-3 py-2"><FiLogOut /> Logout</button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
              <form onSubmit={updateProfile} className="space-y-4">
                <div><label className="block font-medium mb-1">Full Name</label><input type="text" value={profile.name || user?.name} onChange={e => setProfile({ ...profile, name: e.target.value })} className="w-full border rounded-lg p-2" required /></div>
                <div><label className="block font-medium mb-1">Email</label><input type="email" value={profile.email || user?.email || ''} onChange={e => setProfile({ ...profile, email: e.target.value })} className="w-full border rounded-lg p-2" /></div>
                <div><label className="block font-medium mb-1">Phone Number</label><input type="tel" value={profile.phone || user?.phone} disabled className="w-full bg-gray-100 border rounded-lg p-2" /><p className="text-xs text-gray-500 mt-1">Phone number cannot be changed</p></div>
                <button type="submit" disabled={loading} className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800">{loading ? 'Saving...' : 'Save Changes'}</button>
              </form>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-xl font-bold mb-4">Change Password</h2>
              <form onSubmit={changePassword} className="space-y-4">
                <div className="relative">
                  <label className="block font-medium mb-1">Current Password</label>
                  <input type={showCurrentPassword ? 'text' : 'password'} value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full border rounded-lg p-2" required placeholder='••••••' />
                  <button type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 pt-8 transform -translate-y-1/2 text-gray-500 hover:text-black"
                  >
                    {showCurrentPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block font-medium mb-1">New Password</label>
                  <input type={showConfirmPassword ? 'text' : 'password'} value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full border rounded-lg p-2" required placeholder='••••••' />
                  <button type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2  pt-8 transform -translate-y-1/2 text-gray-500 hover:text-black"
                  >
                    {showConfirmPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block font-medium mb-1">Confirm New Password</label>
                  <input type={showNewPassword ? 'text' : 'password'} value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full border rounded-lg p-2" required placeholder='••••••' />
                  <button type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2  pt-8 transform -translate-y-1/2 text-gray-500 hover:text-black"
                  >
                    {showNewPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
                <button type="submit" disabled={loading} className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800">{loading ? 'Updating...' : 'Change Password'}</button>
              </form>
              <button onClick={deleteAccount} className="mt-6 text-red-500 text-sm underline">Delete My Account</button>
            </div>
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Saved Addresses</h2><button onClick={() => { resetAddressForm(); setShowAddressModal(true); }} className="bg-black text-white px-4 py-2 rounded-full text-sm flex items-center gap-1"><FiPlus /> Add New</button></div>
            {addresses.length === 0 ? <p className="text-gray-500">No saved addresses yet.</p> : (
              <div className="grid md:grid-cols-2 gap-4">
                {addresses.map(addr => (
                  <div key={addr.id} className="border rounded-xl p-4 relative">
                    {addr.is_default && <span className="absolute top-2 right-2 bg-gray-200 text-xs px-2 py-1 rounded">Default</span>}
                    <p className="font-medium">{addr.address_line}</p><p className="text-sm text-gray-600">{addr.city}</p><p className="text-sm text-gray-500">Zone: {zones.find(z => z.id === addr.zone_id)?.zone_name || 'N/A'}</p>
                    <div className="flex gap-2 mt-3"><button onClick={() => openEditAddress(addr)} className="text-sm flex items-center gap-1 text-blue-600"><FiEdit2 size={14} /> Edit</button><button onClick={() => deleteAddress(addr.id)} className="text-sm flex items-center gap-1 text-red-500"><FiTrash2 size={14} /> Delete</button></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Order History</h2>
            {orders.length === 0 ? <p className="text-gray-500">You haven't placed any orders yet.</p> : (
              <div className="space-y-4">
                {orders.map(order => {
                  const currentStep = statusSteps.indexOf(order.order_status);
                  return (
                    <div key={order.id} className="border rounded-xl p-4 cursor-pointer hover:shadow-md transition" onClick={() => {
                      setSelectedOrder(order);
                      fetchOrderItems(order.id);
                    }}>
                      <div className="flex flex-wrap justify-between items-start mb-2">
                        <div><p className="font-semibold">{order.order_number}</p><p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p></div>
                        <span className={`px-3 py-1 rounded-full text-sm capitalize ${order.order_status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.order_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                          }`}>
                          {order.order_status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="font-bold">ETB {order.total_amount}</p>
                        <p className="text-sm">Payment: {order.payment_method.toUpperCase()}</p>
                      </div>
                      <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-black rounded-full transition-all" style={{ width: `${((currentStep + 1) / statusSteps.length) * 100}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Wishlist Tab */}
        {activeTab === 'wishlist' && (
          <div><h2 className="text-xl font-bold mb-4">Wishlist</h2>
            {wishlist.length === 0 ? <p className="text-gray-500">Your wishlist is empty.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlist.map(item => (
                  <div key={item.product_id} className="border rounded-xl overflow-hidden flex">
                    <img src={item.image_url || 'https://placehold.co/100'} alt={item.name} className="w-24 h-24 object-cover" />
                    <div className="p-3 flex-1">
                      <h3 className="font-semibold text-sm">{item.name}</h3>
                      <p className="text-xs text-gray-500">{item.category_name}</p>
                      <p className="font-bold text-sm mt-1">ETB {item.base_price}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Address Modal with Map */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>
            <form onSubmit={saveAddress} className="space-y-4">
              <div><label className="block font-medium mb-1">Search location</label><div className="flex gap-2"><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="border p-2 flex-1 rounded" placeholder="e.g., Bole Medhanialem, Addis" /><button type="button" onClick={searchLocation} className="bg-gray-200 px-3 rounded">Search</button></div>{searchResults.length > 0 && (<ul className="border mt-1 max-h-40 overflow-auto">{searchResults.map(r => (<li key={r.place_id} onClick={() => selectSearchResult(r)} className="p-2 hover:bg-gray-100 cursor-pointer text-sm">{r.display_name}</li>))}</ul>)}</div>
              <div className="h-64 rounded overflow-hidden"><MapContainer center={[9.03, 38.74]} zoom={13} style={{ height: '100%', width: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><LocationPicker onSelectLocation={(latlng) => { setSelectedLatLng(latlng); }} /></MapContainer></div>
              <div><label className="block font-medium mb-1">Address Line</label><textarea value={addressForm.address_line} onChange={e => setAddressForm({ ...addressForm, address_line: e.target.value })} className="w-full border rounded-lg p-2" rows="2" required /></div>
              <div><label className="block font-medium mb-1">City</label><input type="text" value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} className="w-full border rounded-lg p-2" required /></div>
              <div><label className="block font-medium mb-1">Delivery Zone</label><select value={addressForm.zone_id} onChange={e => setAddressForm({ ...addressForm, zone_id: e.target.value })} className="w-full border rounded-lg p-2" required><option value="">Select zone</option>{zones.map(z => <option key={z.id} value={z.id}>{z.zone_name} (ETB {z.fee_etb})</option>)}</select></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={addressForm.is_default} onChange={e => setAddressForm({ ...addressForm, is_default: e.target.checked })} /> Set as default address</label>
              <div className="flex gap-2 pt-2"><button type="submit" disabled={loading} className="bg-black text-white px-4 py-2 rounded-full flex-1">{loading ? 'Saving...' : 'Save'}</button><button type="button" onClick={() => setShowAddressModal(false)} className="border px-4 py-2 rounded-full">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleDeleteModal}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="No, Keep It"
      />
    </div>
  );
}