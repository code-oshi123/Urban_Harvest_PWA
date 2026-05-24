import React from 'react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'events', label: 'Events', icon: '🌱' },
    { id: 'nearby', label: 'Nearby', icon: '📍' },
    { id: 'saved', label: 'Saved', icon: '❤️' },
    { id: 'profile', label: 'Profile', icon: '👤' }
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="bottom-nav-icon">{tab.icon}</span>
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}