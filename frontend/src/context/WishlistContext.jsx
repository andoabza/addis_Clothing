import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const { user } = useAuth();

  const fetchWishlist = async () => {
    if (!user) return;
    try {
      const res = await api.get('/wishlist');
      setWishlist(res.data);
    } catch (error) {
      console.error('Failed to fetch wishlist', error);
    }
  };

  useEffect(() => {
    if (user) fetchWishlist();
    else setWishlist([]);
  }, [user]);

  const addToWishlist = async (productId) => {
    if (!user) {
      toast.error('Please login to add to wishlist');
      return false;
    }
    try {
      await api.post('/wishlist/add', { productId });
      await fetchWishlist();
      toast.success('Added to wishlist');
      return true;
    } catch (error) {
      toast.error('Failed to add');
      return false;
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      await api.delete(`/wishlist/remove/${productId}`);
      await fetchWishlist();
      toast.success('Removed from wishlist');
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  const isWishlisted = (productId) => {
    return wishlist.some(item => item.product_id === productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isWishlisted, fetchWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};