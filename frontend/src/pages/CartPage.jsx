import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';
import { getProductImage } from '../utils/imageHelper';
import { useEffect, useState, useRef } from 'react';
import { use } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { FiShoppingCart } from 'react-icons/fi';
import * as THREE from 'three';


export default function CartPage() {
  const { cartItems, updateQuantity, removeItem } = useCart();  

  
  const subtotal = cartItems.reduce((sum, item) => sum + item.base_price * item.quantity, 0);
  const deliveryFee = subtotal > 2000 ? 0 : 50;
  const total = subtotal + deliveryFee;
  const Total = cartItems.map(item => (item.base_price + item.price_adjustment) * item.quantity).reduce((a, b) => a + b, 0);
  const [removeModal, setRemoveModal] = useState({ isOpen: false, itemId: null });
  
  const canvasRef = useRef(null);
  
    useEffect(() => {
      const canvas = canvasRef.current;
  
      const scene = new THREE.Scene();
  
      const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );
      camera.position.z = 5;
  
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true
      });
  
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
      // Geometry (wave grid)
      const geometry = new THREE.PlaneGeometry(12, 12, 64, 64);
  
      const material = new THREE.MeshBasicMaterial({
        color: 0x222222,
        wireframe: true
      });
  
      const plane = new THREE.Mesh(geometry, material);
      plane.rotation.x = -0.6;
      scene.add(plane);
  
      const clock = new THREE.Clock();
  
      const animate = () => {
        const t = clock.getElapsedTime();
        const pos = geometry.attributes.position;
  
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
  
          const wave =
            Math.sin(x * 1.5 + t) * 0.25 +
            Math.cos(y * 1.5 + t * 0.8) * 0.25;
  
          pos.setZ(i, wave);
        }
  
        pos.needsUpdate = true;
  
        plane.rotation.z += 0.001;
  
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };
  
      animate();
  
      // Resize
      const handleResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      };
  
      window.addEventListener('resize', handleResize);
  
      return () => {
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
        geometry.dispose();
        material.dispose();
      };
    }, []);
  

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
       <main className="relative min-h-screen flex items-center justify-center bg-black text-white px-4 overflow-hidden">
      
            {/* Canvas Background */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full opacity-40"
            />
      
            {/* Overlay gradient (important for readability) */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/90 z-0" />
      
            {/* Content */}
            <div className="z-10 text-center max-w-md">
      
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-6 rounded-full border border-gray-700">
                  <FiShoppingCart className="text-5xl text-gray-400" />
                </div>
              </div>
      
              {/* Title */}
              <h1 className="text-4xl font-bold mb-3">
                Your cart is empty
              </h1>
      
              {/* Subtitle */}
              <p className="text-gray-400 mb-6">
                …and your cart doesn’t exist either
              </p>
      
              {/* CTA */}
              <Link
                to="/shop"
                className="inline-block bg-[#d4af37] text-black px-6 py-3 rounded-md font-medium transition hover:scale-105 active:scale-95"
              >
                Start Shopping
              </Link>
      
            </div>
          </main>
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