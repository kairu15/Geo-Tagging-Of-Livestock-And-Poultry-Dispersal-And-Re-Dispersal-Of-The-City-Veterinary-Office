/**
 * Offline Queue — IndexedDB-backed queue for failed check-in submissions.
 *
 * Why IndexedDB over localStorage:
 * - Can store binary data (photo Blobs) directly
 * - Larger storage quota (typically 50%+ of disk vs 5-10MB for localStorage)
 * - Async API won't block the main thread
 *
 * Why hand-rolled over Workbox:
 * - This app has a single queued operation (check-in form submission)
 * - Workbox adds ~15KB gzipped and a service worker registration flow
 * - IndexedDB is well-supported in all target browsers (Chrome 58+, Safari 14+, Firefox 76+)
 */

const DB_NAME = 'cvo-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'checkins';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a check-in payload to the offline queue.
 * @param {Object} payload - { custodianship_id, latitude, longitude, source, notes, photo (File|null) }
 * @returns {Promise<number>} The queue entry ID
 */
export async function enqueueCheckin(payload) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const entry = {
      payload: {
        custodianship_id: payload.custodianship_id,
        latitude: payload.latitude,
        longitude: payload.longitude,
        source: payload.source || 'FIELD_VISIT',
        notes: payload.notes || '',
      },
      // Store photo as File object (IndexedDB can serialize structured clones)
      photo: payload.photo || null,
      status: 'pending', // pending | syncing | failed
      createdAt: new Date().toISOString(),
      retryCount: 0,
      lastError: null,
    };

    const request = store.add(entry);
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Get all pending queue entries, ordered by creation time.
 * @returns {Promise<Array>}
 */
export async function getPendingCheckins() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll('pending');

    request.onsuccess = () => {
      db.close();
      // Sort by createdAt ascending (oldest first)
      const results = request.result.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
      resolve(results);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Get count of all pending entries.
 * @returns {Promise<number>}
 */
export async function getPendingCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.count('pending');

    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Update the status of a queue entry.
 * @param {number} id
 * @param {string} status - 'pending' | 'syncing' | 'failed'
 * @param {string|null} error
 */
export async function updateEntryStatus(id, status, error = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const entry = getReq.result;
      if (!entry) {
        db.close();
        resolve();
        return;
      }
      entry.status = status;
      entry.lastError = error;
      if (status === 'failed') entry.retryCount += 1;
      store.put(entry);
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Remove a queue entry by ID (after successful sync).
 * @param {number} id
 */
export async function removeEntry(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Build a FormData from a queue entry's payload and photo.
 * @param {Object} entry
 * @returns {FormData}
 */
function buildFormData(entry) {
  const formData = new FormData();
  const p = entry.payload;
  formData.append('custodianship_id', p.custodianship_id);
  formData.append('latitude', p.latitude);
  formData.append('longitude', p.longitude);
  formData.append('source', p.source);
  if (p.notes) formData.append('notes', p.notes);
  if (entry.photo) formData.append('photo', entry.photo);
  return formData;
}

/**
 * Retry all pending entries. Calls the provided submitFn for each.
 * Returns { succeeded: number, failed: number }.
 *
 * @param {Function} submitFn - async (formData) => void — the API call to make
 * @param {Function} onProgress - optional (current, total) progress callback
 * @returns {Promise<{ succeeded: number, failed: number }>}
 */
export async function retryAllPending(submitFn, onProgress) {
  const entries = await getPendingCheckins();
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Skip entries that have failed 3+ times (permanent failure)
    if (entry.retryCount >= 3) {
      failed++;
      continue;
    }

    if (onProgress) onProgress(i + 1, entries.length);

    try {
      await updateEntryStatus(entry.id, 'syncing');
      const formData = buildFormData(entry);
      await submitFn(formData);
      await removeEntry(entry.id);
      succeeded++;
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err.message || 'Unknown error';
      await updateEntryStatus(entry.id, 'failed', errorMsg);
      failed++;
    }
  }

  return { succeeded, failed };
}

/**
 * Clear all entries (for debug/reset purposes).
 */
export async function clearAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}
