import { useWishlist } from '../context/WishlistContext';
import { Link } from 'react-router-dom';
import { FiHeart, FiTrash2 } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, fetchWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = async (product) => {
    // Need to fetch variants for this product to get first variant id
    // For simplicity, assume product has variants array (we'd need to fetch full product)
    // We'll add a quick API call or store variant info in wishlist table
    toast.error('Please open product page to select size/color');
  };

  if (wishlist.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <FiHeart size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
        <p className="text-gray-500 mb-6">Save your favorite items here</p>
        <Link to="/shop" className="btn-primary inline-block">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {wishlist.map(item => (
          <div key={item.product_id} className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
            <Link to={`/product/${item.product_id}`}>
              <img src={item.image_url || 'https://placehold.co/400x500'} alt={item.name} className="w-full h-64 object-cover" />
            </Link>
            <div className="p-4">
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-gray-500 text-sm">{item.category_name}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold">ETB {item.base_price}</span>
                <button 
                  onClick={() => removeFromWishlist(item.product_id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
              <button 
                onClick={() => handleAddToCart(item)}
                className="w-full mt-3 bg-black text-white py-2 rounded-full text-sm hover:bg-gray-800"
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}