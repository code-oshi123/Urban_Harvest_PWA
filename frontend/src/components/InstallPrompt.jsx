import React, { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Check if app is already installed
  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS Safari
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Check if user dismissed prompt recently
    const dismissedTime = localStorage.getItem('installPromptDismissed');
    if (dismissedTime && (Date.now() - parseInt(dismissedTime)) < 30 * 24 * 60 * 60 * 1000) {
      return; // Don't show for 30 days
    }

    // Show prompt after delay (not immediately on load)
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 5000); // 5 seconds delay

    return () => clearTimeout(timer);
  }, []);

  // Listen for beforeinstallprompt event (Chrome/Edge/Samsung Internet)
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show our custom prompt banner
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback for iOS or browsers without beforeinstallprompt
      showIOSInstructions();
      return;
    }

    // Show the native install prompt
    deferredPrompt.prompt();
    
    // Wait for user's choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User ${outcome} the installation`);
    
    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
  };

  const showIOSInstructions = () => {
    alert('To install: Tap Share button → "Add to Home Screen"');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember dismissal for 30 days
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  // Don't show if already installed
  if (isInstalled) return null;
  if (!showPrompt) return null;

  return (
    <div className="install-prompt-banner">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">🌱</div>
        <div className="install-prompt-text">
          <h4>Install Urban Harvest Hub</h4>
          <p>Get quick access to events, workshops, and products - even offline!</p>
        </div>
        <div className="install-prompt-buttons">
          <button onClick={handleInstall} className="install-btn">
            Install
          </button>
          <button onClick={handleDismiss} className="dismiss-btn">
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;