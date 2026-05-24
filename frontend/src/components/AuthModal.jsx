import React, { useState } from 'react';
import axios from 'axios';
import './AuthModal.css';

export default function AuthModal({ API_URL, onLogin, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { email, password } : { email, password, name };
      
      console.log(`Attempting ${isLogin ? 'login' : 'registration'} to:`, `${API_URL}${endpoint}`);
      
      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      console.log('Response:', res.data);

      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLogin(res.data.user);
        onClose();
      }
    } catch (err) {
      console.error('Auth error:', err.response?.data);
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>✕</button>
        
        <div className="auth-modal-header">
          <span className="auth-modal-icon">🌱</span>
          <h2>{isLogin ? 'Welcome Back!' : 'Join Urban Harvest'}</h2>
          <p>{isLogin ? 'Login to save events and get updates' : 'Create an account to get started'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-modal-form">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          {error && <div className="auth-modal-error">{error}</div>}
          
          <button type="submit" disabled={loading} className="auth-modal-submit">
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>

        <div className="auth-modal-footer">
          <button onClick={() => setIsLogin(!isLogin)} className="auth-modal-switch">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}