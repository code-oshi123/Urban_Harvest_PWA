import React from 'react';

const tabs = [
  { id: 'events', label: 'Events', icon: '🌱' },
  { id: 'nearby', label: 'Near', icon: '📍' },
  { id: 'bookings', label: 'Book', icon: '📅' },
  { id: 'saved', label: 'Saved', icon: '❤️' },
  { id: 'manage', label: 'Admin', icon: '📝' },
  { id: 'profile', label: 'Me', icon: '👤' },
];

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          aria-label={tab.label}
        >
          <span className="bottom-nav-icon" aria-hidden="true">{tab.icon}</span>
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
