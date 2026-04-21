import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { FiHeart } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getProductImage } from '../utils/imageHelper';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart, fetchCart } = useCart();
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(parseInt(id));

  useEffect(() => {
  if (user) {
    api.post('/user/recently-viewed', { productId: id });
    }
  }, [id, user]);

  useEffect(() => {
    const fetchProduct = async () => {
      const res = await api.get(`/products/${id}`);
      
      setProduct(res.data);
      if (res.data.variants?.length) setSelectedVariant(res.data.variants[0]);
    };
    fetchProduct();
  }, [id]);


  const handleAddToCart = async () => {
      if (user === null) {
      toast.error('Please login to add to cart');
      navigate('/login'); 
      return;
    } else{
      if (!selectedVariant || !selectedVariant.color || !selectedVariant.size) return toast.error('Select size and color');
    await addToCart(selectedVariant.id, quantity);
    toast.success('Added to cart');
    await fetchCart();
    }
  };

  const handleWishlist = async () => {
    if (wishlisted) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product.id);
    }
  };

  if (!product) return <div className="container mx-auto px-4 py-20">Loading...</div>;

  const price = product.base_price + (selectedVariant?.price_adjustment || 0);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-12">
        <div className="rounded-2xl overflow-hidden bg-gray-100">
          <img 
            src={getProductImage(product, '600x800')} 
            alt={product.name} 
            className="w-full h-auto object-cover" 
          />
        </div>
        <div>
          <div className="flex justify-between items-start">
            <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
            <button onClick={handleWishlist} className="p-2 border rounded-full hover:bg-gray-100">
              <FiHeart className={wishlisted ? 'fill-red-500 text-red-500' : ''} size={24} />
            </button>
          </div>
          <p className="text-2xl font-semibold text-secondary mb-4">ETB {price}</p>
          <p className="text-gray-600 mb-6">{product.description}</p>

          <div className="mb-4">
            <label className="block font-medium mb-2">Size</label>
            <div className="flex gap-2 flex-wrap">
              {[...new Set(product.variants?.map(v => v.size))].map(size => (
                <button
                  key={size}
                  onClick={() => {setSelectedVariant(product.variants.find(v => v.size === size && (selectedVariant?.color ? v.color === selectedVariant.color : true))), setSelectedVariant(prev => ({ ...prev, size })), setQuantity(1)}}
                  className={`px-4 py-2 border rounded-full ${selectedVariant?.size === size ? 'bg-black text-white' : 'hover:border-black'}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block font-medium mb-2">Color</label>
            <div className="flex gap-2 bg-slate-200 p-2 rounded-lg">
              {product.variants?.filter(v => v.size === selectedVariant?.size).map(variant => (
                <button
                  key={variant.color}
                  onClick={() => setSelectedVariant(variant)}
                  className={`w-10 h-10 ring-2 rounded-full ${selectedVariant?.color === variant.color ? 'ring-black' : 'ring-transparent'}`}
                  style={{ backgroundColor: variant.color.toLowerCase() }}
                  title={variant.color}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex border rounded-full">
              <button onClick={() => setQuantity(Math.max(1, quantity-1))} className="px-4 py-2 border-r">-</button>
              <span className="px-6 py-2">{quantity}</span>
              <button onClick={() => setQuantity(quantity+1)} className="px-4 py-2 border-l">+</button>
            </div>
            <button onClick={handleAddToCart} className="btn-primary flex-1">Add to Cart</button>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-2">Delivery in Addis Ababa</h3>
            <p className="text-sm text-gray-500">Same-day delivery for orders before 2 PM. Free delivery above ETB 2000.</p>
          </div>
        </div>
      </div>
    </div>
  );
}