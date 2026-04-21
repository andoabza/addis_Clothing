import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../services/api';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState('request'); // 'request', 'verify', 'reset'
  const [sendingOtp, setSendingOtp] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(phone, password);
      toast.success('Logged in!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!resetPhone) return toast.error('Enter your phone number');
    setSendingOtp(true);
    try {
      await api.post('/auth/forgot-password', { phone: resetPhone });
      toast.success('OTP sent to your phone');
      setStep('verify');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return toast.error('Enter OTP');
    setSendingOtp(true);
    try {
      await api.post('/auth/verify-otp', { phone: resetPhone, otp });
      toast.success('OTP verified. Set new password.');
      setStep('reset');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) return toast.error('Enter new password');
    setSendingOtp(true);
    try {
      await api.post('/auth/reset-password', { phone: resetPhone, newPassword });
      toast.success('Password reset. Please login.');
      setShowForgotModal(false);
      setStep('request');
      setResetPhone('');
      setOtp('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setSendingOtp(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>
        <p className="text-center text-gray-500 mb-8">Sign in to your account</p>
        {error && <p className="text-center text-red-500 mb-4">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border rounded-lg p-3"
              placeholder="09XXXXXXXX"
            />
          </div>
          
          <div>
            <label className="block font-medium mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border rounded-lg p-3 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
          </div>
          
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-sm text-secondary hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p className="text-center mt-6 text-sm">
          Don't have an account? <Link to="/register" className="text-secondary font-semibold">Register</Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Reset Password</h3>
            
            {step === 'request' && (
              <>
                <p className="text-gray-600 mb-4">Enter your phone number to receive OTP.</p>
                <input
                  type="tel"
                  value={resetPhone}
                  onChange={e => setResetPhone(e.target.value)}
                  className="w-full border rounded-lg p-3 mb-4"
                  placeholder="09XXXXXXXX"
                />
                <div className="flex gap-2">
                  <button onClick={handleSendOtp} disabled={sendingOtp} className="btn-primary flex-1">
                    {sendingOtp ? 'Sending...' : 'Send OTP'}
                  </button>
                  <button onClick={() => setShowForgotModal(false)} className="border px-4 py-2 rounded-full">
                    Cancel
                  </button>
                </div>
              </>
            )}
            
            {step === 'verify' && (
              <>
                <p className="text-gray-600 mb-4">Enter the OTP sent to {resetPhone}</p>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  className="w-full border rounded-lg p-3 mb-4"
                  placeholder="6-digit code"
                />
                <div className="flex gap-2">
                  <button onClick={handleVerifyOtp} disabled={sendingOtp} className="btn-primary flex-1">
                    {sendingOtp ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <button onClick={() => setStep('request')} className="text-sm text-blue-600">
                    Back
                  </button>
                </div>
              </>
            )}
            
            {step === 'reset' && (
              <>
                <p className="text-gray-600 mb-4">Enter new password for {resetPhone}</p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border rounded-lg p-3 mb-4"
                  placeholder="New password"
                />
                <div className="flex gap-2">
                  <button onClick={handleResetPassword} disabled={sendingOtp} className="btn-primary flex-1">
                    {sendingOtp ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button onClick={() => setShowForgotModal(false)} className="border px-4 py-2 rounded-full">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}