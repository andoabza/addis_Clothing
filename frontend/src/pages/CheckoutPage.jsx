import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import MapPicker from '../components/MapPicker';

export default function CheckoutPage() {
  const { cartItems, fetchCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [zones, setZones] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useSavedAddress, setUseSavedAddress] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  
  const [form, setForm] = useState({
    deliveryZoneId: '',
    deliveryAddress: '',
    paymentMethod: 'telebirr',
    promoCode: '',
    totalAmount: 0,
  });

  // Fetch zones and saved addresses
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [zonesRes, addressesRes] = await Promise.all([
          api.get('/delivery-zones'),
          user ? api.get('/user/addresses') : Promise.resolve({ data: [] })
        ]);
        setZones(zonesRes.data);
        if (user) {
          setSavedAddresses(addressesRes.data);
          
          const defaultAddr = addressesRes.data.find(addr => addr.is_default);
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            setForm(prev => ({
              ...prev,
              deliveryZoneId: defaultAddr.city || '',
              deliveryAddress: `${defaultAddr.address_line}, ${defaultAddr.city}`
            }));
          }
        }
      } catch (error) {
        console.error('Failed to load checkout data', error);
      }
    };
    fetchData();
  }, [user]);

  // Update form when a saved address is selected
  useEffect(() => {
    if (selectedAddressId && savedAddresses.length) {
      const addr = savedAddresses.find(a => a.id == selectedAddressId);
      if (addr) {
        setForm(prev => ({
          ...prev,
          deliveryZoneId: addr.city || '',
          deliveryAddress: `${addr.address_line}, ${addr.city}`
        }));
      }
    }
  }, [selectedAddressId, savedAddresses]);

  // Helper to extract zone from OSM address data
  const extractZoneFromAddress = (addressData) => {
    // Priority order for zone/suburb fields
    const possibleFields = ['county', 'neighbourhood', 'state_district', 'road', 'postcode'];
    for (const field of possibleFields) {
      if (addressData[field]) return addressData[field];
    }
    // Fallback: try to get text before 'Addis Ababa' in display_name
    const match = addressData.display_name?.match(/^([^,]+),?\s*([^,]+)?/);
    if (match && match[2]) return match[2].trim();
    return null;
  };

  // Reverse geocode with zone auto-detection
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await res.json();
      if (data.display_name) {
        // Fill address field
        setForm(prev => ({ ...prev, deliveryAddress: data.display_name }));
        console.log(data);
        
        // Extract zone from address details
        const zoneName = data.address ? extractZoneFromAddress(data) : null;
        // insert address into users user_id, address_line, city, zone_id, is_default
        
        try {
            const newAddressRes = await api.post('/user/addresses', {
              address_line: data.display_name,
              city: data.address.county || data.address.state || 'Unknown',
              zone_id: data.address.place_id || null,
              is_default: false,
            });
            const newAddress = newAddressRes.data;
            setSavedAddresses(prev => [...prev, newAddress]);
            setSelectedAddressId(newAddress.id);
            toast.success('Address saved to your account');
          } catch (err) {
            console.error('Failed to save address', err);
          }

        if (zoneName) {
          // Try to match with existing delivery zones (case-insensitive, partial)
          
          zones.find(z => 
            z.zone_name.toLowerCase().includes(z.zone_name.toLowerCase()) ||
            zoneName.toLowerCase().includes(z.zone_name.toLowerCase())
          );
          
          if (zoneName) {
            setZones(prev => {
              if (!prev.some(z => z.zone_name === zoneName)) {
                return [...prev, { id: zoneName, zone_name: zoneName, fee_etb: 100, estimated_hours: 'Unkown' }];
              }
              return prev;
            });
            setForm(prev => ({ ...prev, deliveryZoneId: zoneName }));
            toast.success(`Zone detected: ${zoneName}`);
          } else {
            toast.error(`Zone "${zoneName}" not found. Please select manually.`);
          }
        } else {
          toast.error('Could not detect zone. Please select manually.');
        }
        setShowMapModal(false);
      } else {
        toast.error('Could not find address for this location');
      }
    } catch (error) {
      toast.error('Geocoding failed Please Connect to the internet and try again.');
    }
  };

  const handleMapLocation = useCallback((lat, lng) => {
    reverseGeocode(lat, lng);
  }, [zones]);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.base_price * item.quantity, 0);
  const selectedZone = zones.find(z => z.id == form.deliveryZoneId);
  const deliveryFee = selectedZone?.fee_etb || 50;
  const total = subtotal + deliveryFee;

  if (cartItems.length === 0) {
    navigate('/shop');
    return null;
  }

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!form.deliveryZoneId) return toast.error('Please select a delivery zone');
  if (!form.deliveryAddress.trim()) return toast.error('Please enter delivery address');
  
  setLoading(true);
  try {
    
    const orderRes = await api.post('/orders', {
      deliveryZoneId: form.deliveryZoneId,
      totalAmount: total,
      deliveryAddress: form.deliveryAddress,
      paymentMethod: form.paymentMethod,
      promoCode: form.promoCode || undefined,
      orderNote,
      deliveryDate: deliveryDate || undefined,
    });
    
    const { orderId, orderNumber } = orderRes.data;
    toast.success('Order created! Opening payment window...');

    const paymentRes = await api.post(`/payment/initiate/${orderNumber}`);
    
    if (paymentRes.data.checkoutUrl) {
      // await fetchCart();
      // Open iframe modal instead of redirect
      window.open(paymentRes.data.checkoutUrl, '_blank');
      // Store orderId to check status later
      sessionStorage.setItem('pendingOrderId', orderNumber);
      await fetchCart();
    } else {
      toast.error('Payment gateway error. Please complete payment later.');
      navigate(`/account?order=${orderNumber}`);
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Order failed. Please try again.');
    setLoading(false);
  }
};

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-xl font-bold mb-4">Delivery Information</h2>
              
              {user && savedAddresses.length > 0 && (
                <div className="mb-4">
                  <label className="flex items-center gap-3 mb-2">
                    <input type="radio" checked={useSavedAddress} onChange={() => setUseSavedAddress(true)} className="w-4 h-4" />
                    <span>Use saved address</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="radio" checked={!useSavedAddress} onChange={() => setUseSavedAddress(false)} className="w-4 h-4" />
                    <span>Enter new address</span>
                  </label>
                </div>
              )}
              
              {useSavedAddress && savedAddresses.length > 0 && (
                <div className="mb-4">
                  <label className="block font-medium mb-1">Select Address</label>
                    <select value={selectedAddressId} onChange={(e) => setSelectedAddressId(e.target.value)} className="w-full border rounded-lg p-3" required>
                    <option value="">Choose an address</option>
                    {savedAddresses.map(addr => (
                      <option key={addr.id} value={addr.id}>
                        {addr.address_line}, {addr.city} {addr.is_default && '(Default)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {(!useSavedAddress || savedAddresses.length === 0) && (
                <>
                  <div className="mb-4">
                    <label className="block font-medium mb-1">Delivery Zone</label>
                    <select required className="w-full border rounded-lg p-3" value={form.deliveryZoneId} onChange={(e) => setForm({...form, deliveryZoneId: e.target.value})}>
                      <option value="">Select zone</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.zone_name} - ETB {z.fee_etb} ({z.estimated_hours})</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-medium">Full Address</label>
                      <button
                        type="button"
                        onClick={() => setShowMapModal(true)}
                        className="text-sm bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200"
                      >
                        🗺️ Pick from map
                      </button>
                    </div>
                    <textarea required rows="3" className="w-full border rounded-lg p-3" placeholder="Street, house number, landmark" value={form.deliveryAddress} onChange={(e) => setForm({...form, deliveryAddress: e.target.value})} />
                  </div>
                </>
              )}
              
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block font-medium mb-1">Preferred Delivery Date (optional)</label>
                  <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full border rounded-lg p-3" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Order Note (optional)</label>
                  <textarea rows="1" value={orderNote} onChange={e => setOrderNote(e.target.value)} className="w-full border rounded-lg p-3" placeholder="Special instructions..." />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-xl font-bold mb-4">Payment Method</h2>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="payment" value="telebirr" checked={form.paymentMethod === 'telebirr'} onChange={() => setForm({...form, paymentMethod: 'telebirr'})} />
                  <span className="flex-1">Telebirr (QR code)</span>
                </label>
                <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="payment" value="cbe" checked={form.paymentMethod === 'cbe'} onChange={() => setForm({...form, paymentMethod: 'cbe'})} />
                  <span className="flex-1">CBE Birr</span>
                </label>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-xl font-bold mb-4">Promo Code</h2>
              <input type="text" className="w-full border rounded-lg p-3" placeholder="Enter code (optional)" value={form.promoCode} onChange={(e) => setForm({...form, promoCode: e.target.value})} />
            </div>
            
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-lg disabled:opacity-50">
              {loading ? 'Placing Order...' : `Place Order • ETB ${total}`}
            </button>
          </form>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-gray-50 p-6 rounded-xl shadow-sm border sticky top-24">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.product_name} (x{item.quantity})</span>
                  <span>ETB {item.base_price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between"><span>Subtotal</span><span>ETB {subtotal}</span></div>
              <div className="flex justify-between"><span>Delivery Fee</span><span>ETB {deliveryFee}</span></div>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between font-bold text-xl"><span>Total</span><span>ETB {total}</span></div>
            </div>
            <div className="mt-4 text-xs text-gray-500 text-center">
              <p>✅ Same-day delivery for orders before 2 PM</p>
              <p>📦 Free delivery above ETB 2,000</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-bold">Select your delivery location</h3>
              <button onClick={() => setShowMapModal(false)} className="text-gray-500 hover:text-black text-2xl">&times;</button>
            </div>
            <div className="h-96 rounded-lg overflow-hidden">
              <MapPicker onLocationSelect={handleMapLocation} />
            </div>
            <p className="text-sm text-gray-500 mt-3 text-center">Click on the map to set your delivery address</p>
          </div>
        </div>
      )}
      {/* Chapa Payment Iframe Modal */}
</div>
  );
}