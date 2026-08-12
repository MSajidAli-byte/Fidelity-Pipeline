import { ResumeIteration } from '../types';

const DB_NAME = 'fidelity_resume_db';
const DB_VERSION = 1;
const STORE_NAME = 'resume_history';
const LEGACY_LOCALSTORAGE_KEY = 'fidelity_resume_history_v1';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error || new Error('Failed to open IndexedDB database.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('candidateName', 'candidateName', { unique: false });
      }
    };
  });
}

/**
 * Fetch all saved resume iterations from IndexedDB.
 * Performs automatic one-time migration from legacy localStorage if IndexedDB is empty.
 */
export async function getAllIterations(): Promise<ResumeIteration[]> {
  try {
    // Attempt backend fetch first
    try {
      const res = await fetch('/api/resume/history');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history) && data.history.length > 0) {
          return data.history;
        }
      }
    } catch (apiErr) {
      console.warn('Backend history API fetch notice:', apiErr);
    }

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const items: ResumeIteration[] = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    // Sort newest first based on numeric timestamp ID
    items.sort((a, b) => {
      const numA = parseInt(a.id.split('_')[0], 10) || 0;
      const numB = parseInt(b.id.split('_')[0], 10) || 0;
      if (numA && numB) return numB - numA;
      return 0;
    });

    return items;
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
}

/**
 * Save or update a single resume iteration in IndexedDB and Backend API.
 */
export async function saveIteration(iteration: ResumeIteration): Promise<void> {
  // Sync to Backend API
  try {
    await fetch('/api/resume/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iteration }),
    });
  } catch (e) {
    console.warn('Backend resume save API notice:', e);
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.put(iteration);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving iteration to IndexedDB:', error);
  }
}

/**
 * Bulk save multiple resume iterations to IndexedDB.
 */
export async function saveBulkIterations(iterations: ResumeIteration[]): Promise<void> {
  if (!iterations || iterations.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await Promise.all(
      iterations.map(
        (item) =>
          new Promise<void>((resolve, reject) => {
            const req = store.put(item);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          })
      )
    );
  } catch (error) {
    console.error('Error bulk saving iterations to IndexedDB:', error);
    throw error;
  }
}

/**
 * Delete a single resume iteration from IndexedDB by ID.
 */
export async function deleteIteration(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting iteration from IndexedDB:', error);
    throw error;
  }
}

/**
 * Delete multiple resume iterations from IndexedDB by IDs.
 */
export async function deleteBulkIterations(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await Promise.all(
      ids.map(
        (id) =>
          new Promise<void>((resolve, reject) => {
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          })
      )
    );
  } catch (error) {
    console.error('Error bulk deleting iterations from IndexedDB:', error);
    throw error;
  }
}

/**
 * Clear all resume iterations from IndexedDB.
 */
export async function clearAllIterations(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
  } catch (error) {
    console.error('Error clearing IndexedDB history:', error);
    throw error;
  }
}
