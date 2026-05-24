const translations = {
  en: {
    app_name: 'Urban Harvest Hub',
    events: 'Events',
    workshops: 'Workshops',
    products: 'Products',
    search: 'Search events, workshops...',
    all_categories: 'All Categories',
    no_events: 'No events found',
    loading: 'Loading sustainable events...',
    enable_notifications: 'Enable Notifications',
    find_near_me: 'Find Events Near Me',
    dark_mode: 'Dark Mode',
    light_mode: 'Light Mode',
    saved: 'Saved',
    profile: 'Profile',
    nearby: 'Nearby',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    welcome_back: 'Welcome Back! 🌱',
    join_us: 'Join Urban Harvest 🌿',
    email: 'Email',
    password: 'Password',
    name: 'Your Name'
  },
  es: {
    app_name: 'Cosecha Urbana',
    events: 'Eventos',
    workshops: 'Talleres',
    products: 'Productos',
    search: 'Buscar eventos, talleres...',
    all_categories: 'Todas las categorías',
    no_events: 'No se encontraron eventos',
    loading: 'Cargando eventos sostenibles...',
    enable_notifications: 'Activar Notificaciones',
    find_near_me: 'Encontrar Cerca de Mí',
    dark_mode: 'Modo Oscuro',
    light_mode: 'Modo Claro',
    saved: 'Guardados',
    profile: 'Perfil',
    nearby: 'Cercanos',
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    logout: 'Cerrar Sesión',
    welcome_back: '¡Bienvenido de nuevo! 🌱',
    join_us: 'Únete a Cosecha Urbana 🌿',
    email: 'Correo electrónico',
    password: 'Contraseña',
    name: 'Tu Nombre'
  },
  fr: {
    app_name: 'Récolte Urbaine',
    events: 'Événements',
    workshops: 'Ateliers',
    products: 'Produits',
    search: 'Rechercher des événements...',
    all_categories: 'Toutes les catégories',
    no_events: 'Aucun événement trouvé',
    loading: 'Chargement...',
    enable_notifications: 'Activer Notifications',
    find_near_me: 'Trouver Près de Moi',
    dark_mode: 'Mode Sombre',
    light_mode: 'Mode Clair',
    saved: 'Sauvegardés',
    profile: 'Profil',
    nearby: 'À Proximité',
    login: 'Connexion',
    register: "S'inscrire",
    logout: 'Déconnexion',
    welcome_back: 'Bon retour! 🌱',
    join_us: 'Rejoignez Récolte Urbaine 🌿',
    email: 'E-mail',
    password: 'Mot de passe',
    name: 'Votre Nom'
  }
};

let currentLanguage = localStorage.getItem('language') || 'en';

export const t = (key) => {
  return translations[currentLanguage][key] || translations['en'][key] || key;
};

export const setLanguage = (lang) => {
  if (translations[lang]) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    return true;
  }
  return false;
};

export const getCurrentLanguage = () => currentLanguage;

export const getAvailableLanguages = () => Object.keys(translations);