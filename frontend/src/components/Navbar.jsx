import React from 'react';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar({ darkMode, setDarkMode, user, onAuthClick }) {
  return (
    <nav className="navbar">
      <h1>🌱 Urban Harvest Hub</h1>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <LanguageSwitcher />
        {user ? (
          <span style={{ fontSize: '14px' }}>👤 {user.name}</span>
        ) : (
          <button onClick={onAuthClick} className="auth-nav-btn">Login</button>
        )}
        <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  );
}