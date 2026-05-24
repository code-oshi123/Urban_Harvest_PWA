import React, { useState, useEffect } from 'react';

export default function Navbar({ darkMode, setDarkMode }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('To install: Click the install icon in the address bar');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <nav className="navbar">
      <h1>🌱 Urban Harvest Hub</h1>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {showInstallBtn && (
          <button onClick={handleInstallClick} className="install-nav-btn">
            📱 Install App
          </button>
        )}
        <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </nav>
  );
}