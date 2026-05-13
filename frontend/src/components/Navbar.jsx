import React from 'react';

export default function Navbar({ darkMode, setDarkMode }) {
  return (
    <nav className="navbar">
      <h1>🌱 Urban Harvest Hub</h1>
      <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? '☀️ Light' : '🌙 Dark'}
      </button>
    </nav>
  );
}