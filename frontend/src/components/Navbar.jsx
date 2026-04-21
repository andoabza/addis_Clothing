import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { FiShoppingCart, FiUser, FiMenu, FiX } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold tracking-tighter">
          ADDIS<span className="text-secondary">CLOTHING</span>
        </Link>

        <div className="hidden md:flex space-x-8">
          <Link to="/" className="hover:text-secondary">Home</Link>
          <Link to="/shop" className="hover:text-secondary">Shop</Link>
          {user && <Link to='/orders' className='hover:text-secondary'>My Orders</Link>}
          {user?.role === 'admin' && <Link to="/admin" className="hover:text-secondary">Admin</Link>}
        </div>

        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/cart')} className="relative">
            <FiShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          {user ? (
            <div className="relative">
              <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-1">
                <FiUser size={22} />
                <span className="hidden md:inline">{user.name}</span>
              </button>
              {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg py-2">
                  <Link to="/account" className="block px-4 py-2 hover:bg-gray-100">My Account</Link>
                  <Link to="/wishlist" className="w-full text-left py-2 hover:text-secondary block">❤️ Wishlist</Link>

                  <button onClick={logout} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Logout</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary py-2 px-4 text-sm">Login</Link>
          )}
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden bg-white border-t py-4 px-4 flex flex-col space-y-3">
          <Link to="/" onClick={() => setIsOpen(false)}>Home</Link>
          <Link to="/shop" onClick={() => setIsOpen(false)}>Shop</Link>
          {user?.role === 'admin' && <Link to="/admin" onClick={() => setIsOpen(false)}>Admin</Link>}
          {user && <Link to='/orders' onClick={() => setIsOpen(false)}>My Orders</Link>}
        </div>
      )}
    </nav>
  );
}