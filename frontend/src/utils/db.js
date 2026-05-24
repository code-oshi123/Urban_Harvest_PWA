// IndexedDB wrapper for advanced offline storage
const DB_NAME = 'UrbanHarvestDB';
const DB_VERSION = 1;
const STORES = {
  events: 'events',
  cache: 'api_cache',
  offlineActions: 'offline_actions'
};

let db = null;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Events store
      if (!db.objectStoreNames.contains(STORES.events)) {
        const eventsStore = db.createObjectStore(STORES.events, { keyPath: 'id' });
        eventsStore.createIndex('category', 'category', { unique: false });
        eventsStore.createIndex('date', 'date', { unique: false });
      }
      
      // API cache store
      if (!db.objectStoreNames.contains(STORES.cache)) {
        const cacheStore = db.createObjectStore(STORES.cache, { keyPath: 'url' });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Offline actions store
      if (!db.objectStoreNames.contains(STORES.offlineActions)) {
        db.createObjectStore(STORES.offlineActions, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

// Cache API response
export const cacheAPIResponse = async (url, data) => {
  if (!db) await initDB();
  
  const transaction = db.transaction([STORES.cache], 'readwrite');
  const store = transaction.objectStore(STORES.cache);
  
  store.put({
    url,
    data,
    timestamp: Date.now()
  });
};

// Get cached API response
export const getCachedAPIResponse = async (url, maxAge = 3600000) => { // 1 hour default
  if (!db) await initDB();
  
  const transaction = db.transaction([STORES.cache], 'readonly');
  const store = transaction.objectStore(STORES.cache);
  
  return new Promise((resolve) => {
    const request = store.get(url);
    request.onsuccess = () => {
      const cached = request.result;
      if (cached && (Date.now() - cached.timestamp) < maxAge) {
        resolve(cached.data);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => resolve(null);
  });
};

// Save events offline
export const saveEventsOffline = async (events) => {
  if (!db) await initDB();
  
  const transaction = db.transaction([STORES.events], 'readwrite');
  const store = transaction.objectStore(STORES.events);
  
  for (const event of events) {
    store.put(event);
  }
};

// Get events from offline storage
export const getEventsOffline = async () => {
  if (!db) await initDB();
  
  const transaction = db.transaction([STORES.events], 'readonly');
  const store = transaction.objectStore(STORES.events);
  
  return new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });
};

// Queue action for offline sync
export const queueOfflineAction = async (action) => {
  if (!db) await initDB();
  
  const transaction = db.transaction([STORES.offlineActions], 'readwrite');
  const store = transaction.objectStore(STORES.offlineActions);
  
  store.add({
    ...action,
    queuedAt: Date.now()
  });
};

// Process queued actions when online
export const processQueuedActions = async (API_URL) => {
  if (!db) await initDB();
  
  const transaction = db.transaction([STORES.offlineActions], 'readwrite');
  const store = transaction.objectStore(STORES.offlineActions);
  
  const actions = await new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
  });
  
  for (const action of actions) {
    try {
      await fetch(`${API_URL}${action.endpoint}`, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data)
      });
      store.delete(action.id);
    } catch (e) {
      console.log('Still offline, keeping action');
    }
  }
};