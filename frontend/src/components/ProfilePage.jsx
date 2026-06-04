import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProfilePage.css';
import { setLanguage } from '../utils/i18n';

export default function ProfilePage({ user, onLogout, API_URL, savedCount, totalEvents, onUpdate, darkMode, setDarkMode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: ''
  });
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications_enabled: true,
    language: 'en'
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadActivities();
  }, []);

  const loadSettings = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await axios.get(`${API_URL}/auth/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.settings) {
        setSettings(res.data.settings);
        if (res.data.settings.theme) {
          localStorage.setItem('theme', res.data.settings.theme);
          setDarkMode?.(res.data.settings.theme === 'dark');
        }
        if (res.data.settings.language) {
          setLanguage(res.data.settings.language);
        }
      }
    } catch (error) {
      console.error('Failed to load settings');
    }
  };

  const loadActivities = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await axios.get(`${API_URL}/auth/activities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(res.data.activities || []);
    } catch (error) {
      console.error('Failed to load activities');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await axios.put(
        `${API_URL}/auth/profile`,
        { name: formData.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const updatedUser = { ...user, name: formData.name };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingUpdate = async (key, value) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await axios.put(
        `${API_URL}/auth/settings`,
        { [key]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSettings({ ...settings, [key]: value });
      
      if (key === 'theme') {
        localStorage.setItem('theme', value);
        setDarkMode?.(value === 'dark');
      }

      if (key === 'language') {
        setLanguage(value);
        window.location.reload();
      }

      if (key === 'notifications_enabled') {
        if (value) {
          // If enabled, request permission and subscribe
          if ('Notification' in window && 'serviceWorker' in navigator) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const registration = await navigator.serviceWorker.ready;
              // Fetch VAPID public key
              const response = await axios.get(`${API_URL}/notify/vapid-key`);
              const vapidPublicKey = response.data.publicKey;
              
              // Helper to convert key
              const padding = '='.repeat((4 - vapidPublicKey.length % 4) % 4);
              const base64 = (vapidPublicKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
              const rawData = window.atob(base64);
              const outputArray = new Uint8Array(rawData.length);
              for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
              }

              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: outputArray
              });
              
              await axios.post(`${API_URL}/notify/subscribe`, { subscription }, {
                headers: { Authorization: `Bearer ${token}` }
              });
            }
          }
        } else {
          // If disabled, delete subscription from backend and unsubscribe locally
          if ('serviceWorker' in navigator && 'PushManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
              await axios.post(`${API_URL}/notify/unsubscribe`, {
                endpoint: subscription.endpoint
              });
              await subscription.unsubscribe();
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const getActivityIcon = (type) => {
    const icons = {
      login: '🔐',
      logout: '🚪',
      register: '✨',
      save: '❤️',
      unsave: '💔',
      view: '👁️',
      create: '📝'
    };
    return icons[type] || '📌';
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar-large">
          {user?.name?.charAt(0) || '🌱'}
        </div>
        {!isEditing ? (
          <div className="profile-info">
            <h2>{user?.name}</h2>
            <p className="profile-email">{user?.email}</p>
            <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
              ✏️ Edit Profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleProfileUpdate} className="edit-profile-form">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your Name"
              required
            />
            <div className="edit-actions">
              <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" disabled={loading}>Save Changes</button>
            </div>
          </form>
        )}
      </div>

      <div className="profile-stats-grid">
        <div className="stat-card">
          <div className="stat-value">{savedCount}</div>
          <div className="stat-label">Saved Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalEvents}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{activities.length}</div>
          <div className="stat-label">Activities</div>
        </div>
      </div>

      <div className="profile-section">
        <h3>⚙️ Preferences</h3>
        <div className="settings-list">
          <div className="setting-item">
            <span>🌙 Dark Mode</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.theme === 'dark'}
                onChange={(e) => handleSettingUpdate('theme', e.target.checked ? 'dark' : 'light')}
              />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <span>🔔 Notifications</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.notifications_enabled}
                onChange={(e) => handleSettingUpdate('notifications_enabled', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <span>🌐 Language</span>
            <select
              value={settings.language}
              onChange={(e) => handleSettingUpdate('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h3>📜 Recent Activity</h3>
        <div className="activities-list">
          {activities.slice(0, 10).map(activity => (
            <div key={activity.id} className="activity-item">
              <span className="activity-icon">{getActivityIcon(activity.action_type)}</span>
              <div className="activity-details">
                <p className="activity-action">
                  {activity.action_type.toUpperCase()}
                  {activity.event_id && ` - Event #${activity.event_id}`}
                </p>
                <p className="activity-time">
                  {new Date(activity.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="no-activities">No activities yet. Start saving events!</p>
          )}
        </div>
      </div>

      <button className="logout-btn-large" onClick={onLogout}>
        🚪 Logout
      </button>
    </div>
  );
}