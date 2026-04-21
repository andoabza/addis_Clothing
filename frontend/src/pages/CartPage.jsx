import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';
import { getProductImage } from '../utils/imageHelper';
import { useEffect, useState } from 'react';
import { use } from 'react';
import ConfirmModal from '../components/ConfirmModal';

export default function CartPage() {
  const { cartItems, updateQuantity, removeItem } = useCart();  
  
  const subtotal = cartItems.reduce((sum, item) => sum + item.base_price * item.quantity, 0);
  const deliveryFee = subtotal > 2000 ? 0 : 50;
  const total = subtotal + deliveryFee;
  const Total = cartItems.map(item => (item.base_price + item.price_adjustment) * item.quantity).reduce((a, b) => a + b, 0);
  const [removeModal, setRemoveModal] = useState({ isOpen: false, itemId: null });
  
  const removeItemWithConfirmation = (itemId) => {
    setRemoveModal({ isOpen: true, itemId });
  };

  const confirmRemoveItem = () => {
    removeItem(removeModal.itemId);
    setRemoveModal({ isOpen: false, itemId: null });
  };  

  const handleCloseModal = () => {
    setRemoveModal({ isOpen: false, itemId: null });
  };

  if (cartItems.length === 0) {
    return (
      <>
         <div className="container mx-auto px-4 py-20 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-300 rounded w-1/3 mx-auto"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
          <div className="h-10 bg-gray-300 rounded w-1/4 mx-auto"></div>
        </div>
      </div>  
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <Link to="/shop" className="btn-primary inline-block">Continue Shopping</Link>
      </div>
      </>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map(item => (
            <div key={item.id} className="flex gap-4 border rounded-xl p-4">
              <img 
                src={getProductImage({ id: item.product_id, image_url: item.image_url })} 
                alt={item.product_name} 
                className="w-24 h-24 object-cover rounded-lg" 
              />
              <div className="flex-1">
                <h3 className="font-semibold">{item.product_name}</h3>
                <p className="text-sm text-gray-500">Size: {item.size} | Color: {item.color}</p>
                <p className="font-bold">ETB {item.base_price}</p>
                <div className="flex items-center gap-3 mt-2">
                  <select value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))} className="border rounded px-2 py-1">
                    {[1,2,3,4,5].map(q => <option key={q}>{q}</option>)}
                  </select>
                  <button onClick={() => removeItemWithConfirmation(item.id)} className="text-red-500"><FiTrash2 size={18} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 p-6 rounded-xl h-fit">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          <div className="space-y-2 border-b pb-4">
            <div className="flex justify-between"><span>Subtotal</span><span>ETB {subtotal}</span></div>
            <div className="flex justify-between"><span>Delivery Fee</span><span>ETB {deliveryFee}</span></div>
          </div>
          <div className="flex justify-between font-bold text-xl mt-4"><span>Total</span><span>ETB {total}</span></div>
          <Link to="/checkout" className="btn-primary w-full text-center mt-6 block">Proceed to Checkout</Link>
        </div>
      </div>
            <ConfirmModal
              isOpen={removeModal.isOpen}
              onClose={handleCloseModal}
              onConfirm={confirmRemoveItem}
              title="Remove Item"
              message="Are you sure you want to remove this item from your cart?"
              confirmText="Yes, Remove"
              cancelText="No, Keep It"
            />
    </div>
  );
}