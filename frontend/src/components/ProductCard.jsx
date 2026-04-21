import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { FiHeart, FiShoppingCart } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getProductImage } from '../utils/imageHelper';


export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(product.id);
  const navigate = useNavigate();  

  let variants = product.variants;  
  if (typeof variants === 'string') {
    try { variants = JSON.parse(variants); } catch(e) { variants = []; }
  }
  const firstVariant = variants?.[0] || null;

  // const handleAddToCart = async (e) => {
  //   e.preventDefault();
  //   if (!firstVariant) return toast.error('No size/color available');
  //   await addToCart(firstVariant.id, 1);
  //   toast.success('Added to cart');
  // };
  
  const handleWishlist = async (e) => {
    e.preventDefault();
    if (wishlisted) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product.id);
    }
  };
  

  return (
    <motion.div whileHover={{ y: -5 }} className="product-card group relative">
      <Link to={`/product/${product.id}`}>
        <div className="relative overflow-hidden h-80 bg-gray-100">
          {/* if image is loading placeholder use FiShoopingCart */}
          <img 
            src={getProductImage(product)} 
            alt={product.name} 
            placeholder={<FiShoppingCart size={40} className="text-gray-300" />}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
          />
          <button 
            onClick={handleWishlist}
            className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-md hover:scale-110 transition"
          >
            <FiHeart className={`${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} size={20} />
          </button>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg truncate">{product.name}</h3>
          <p className="text-gray-500 text-sm">{product.category_name}</p>
          <div className="flex justify-between items-center mt-2">
            <span className="font-bold text-xl">ETB {product.base_price}</span>
            <button onClick={() => navigate(`/product/${product.id}`)} className="bg-black text-white px-4 py-2 rounded-full text-sm hover:bg-gray-800 transition">
              Add to Cart
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}