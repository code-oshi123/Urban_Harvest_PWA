// LanguageSwitcher.jsx
import React from 'react';
import { setLanguage, getCurrentLanguage, getAvailableLanguages, t } from '../utils/i18n';

export default function LanguageSwitcher({ onLanguageChange }) {
  const [currentLang, setCurrentLang] = React.useState(getCurrentLanguage());
  
  const changeLanguage = (lang) => {
    setLanguage(lang);
    setCurrentLang(lang);
    onLanguageChange();
    // Force re-render
    window.location.reload();
  };
  
  return (
    <div className="language-switcher">
      <select value={currentLang} onChange={(e) => changeLanguage(e.target.value)}>
        <option value="en">🇬🇧 English</option>
        <option value="es">🇪🇸 Español</option>
        <option value="fr">🇫🇷 Français</option>
      </select>
    </div>
  );
}