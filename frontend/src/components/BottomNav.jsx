import React from 'react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'events', label: 'Events', icon: '🌱', activeIcon: '🌿' },
    { id: 'nearby', label: 'Nearby', icon: '📍', activeIcon: '📍' },
    { id: 'saved', label: 'Saved', icon: '🤍', activeIcon: '❤️' },
    { id: 'profile', label: 'Profile', icon: '👤', activeIcon: '👤' }
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">HarvestHub</span>
        </div>
        
        <nav className="sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="sidebar-icon">
                {activeTab === tab.id ? tab.activeIcon : tab.icon}
              </span>
              <span className="sidebar-label">{tab.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <div className="sidebar-credit">
            <small>Sustainable Living</small>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="bottom-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="bottom-nav-icon">
              {activeTab === tab.id ? tab.activeIcon : tab.icon}
            </span>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}