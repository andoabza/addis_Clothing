import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AccountPage from './pages/AccountPage';
import AdminDashboard from './pages/AdminDashboard';
import OrdersPage from './pages/OrdersPage';
import PaymentStatusPage from './pages/PaymentStatusPage';
import WishlistPage from './pages/WishlistPage';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import NotFoundPage from './components/404';

function App() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        {user && <Route path="/orders" element={<OrdersPage />} />}
        <Route path="/cart" element={<CartPage />} />
        {user && <Route path="/checkout" element={<CheckoutPage />} />}
        {user && <Route path="/payment-status" element={<PaymentStatusPage />} />}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {user && <Route path="/wishlist" element={<WishlistPage />} />}
        {user && <Route path="/account" element={<AccountPage />} />}
        {user?.role === 'admin' && <Route path="/admin/*" element={<AdminDashboard />} />}
        {/* custom 404 icon or image */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;