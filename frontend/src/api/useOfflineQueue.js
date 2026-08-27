import { useState, useEffect, useCallback, useRef } from 'react';
import {
  enqueueCheckin,
  getPendingCount,
  retryAllPending,
} from './offlineQueue';
import api from './axios';

/**
 * React hook for the offline check-in queue.
 *
 * Features:
 * - Tracks pending count reactively
 * - Auto-retries all pending entries when connectivity returns
 * - Provides enqueueCheckin() for forms to queue failed submissions
 * - Provides retryNow() for manual retry
 * - Shows progress during sync via onProgress callback
 */
export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null); // { current, total }
  const [lastSyncResult, setLastSyncResult] = useState(null); // { succeeded, failed }
  const retryingRef = useRef(false);

  // Load initial count
  useEffect(() => {
    getPendingCount().then(setPendingCount).catch(() => {});
  }, []);

  // The actual API call for submitting a check-in
  const submitCheckin = useCallback(async (formData) => {
    return api.post('/geotagging/checkins/create/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }, []);

  // Retry all pending entries
  const retryNow = useCallback(async () => {
    if (retryingRef.current) return null;
    retryingRef.current = true;
    setSyncing(true);
    setSyncProgress(null);
    setLastSyncResult(null);

    try {
      const result = await retryAllPending(submitCheckin, (current, total) => {
        setSyncProgress({ current, total });
      });
      setLastSyncResult(result);
      const newCount = await getPendingCount();
      setPendingCount(newCount);
      return result;
    } finally {
      setSyncing(false);
      setSyncProgress(null);
      retryingRef.current = false;
    }
  }, [submitCheckin]);

  // Enqueue a failed check-in submission
  const enqueue = useCallback(async (payload) => {
    await enqueueCheckin(payload);
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  // Auto-retry when connectivity returns
  useEffect(() => {
    const handleOnline = async () => {
      // Small delay to let connection stabilize
      await new Promise((r) => setTimeout(r, 1500));
      const count = await getPendingCount();
      if (count > 0) {
        retryNow();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [retryNow]);

  // Periodic count refresh (every 30s) to catch external changes
  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    pendingCount,
    syncing,
    syncProgress,
    lastSyncResult,
    enqueue,
    retryNow,
  };
}
