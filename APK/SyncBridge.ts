/**
 * SANCTUARY APK SYNC BRIDGE
 * -------------------------
 * Integrate this service into the mobile app (services/syncBridge.ts).
 * This service runs periodically to push local state to the cloud dashboard.
 */

import { storageService } from './storageService';
import { Device } from '@capacitor/device';

const API_BASE_URL = 'https://sanctuary-admin.onrender.com/api'; // Replace with your Render URL

export const syncBridge = {
  getDeviceId: async () => {
    const info = await Device.getId();
    return info.identifier;
  },

  /**
   * Pushes the entire local state (Books, Shelves, Habits) to the cloud.
   */
  syncFull: async (activeStatus: string = 'Idle') => {
    try {
      const deviceId = await syncBridge.getDeviceId();
      const books = storageService.getBooks();
      const shelves = storageService.getShelves();
      const habit = storageService.getHabitData();

      // We only send summaries to the backend to keep it lightweight
      const bookSummaries = books.map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        stars: b.stars,
        lastReadAt: b.lastReadAt,
        addedAt: b.addedAt,
        timeSpentSeconds: b.timeSpentSeconds
      }));

      const payload = {
        deviceId,
        data: {
          activeStatus,
          shelves,
          books: bookSummaries,
          habit
        }
      };

      const response = await fetch(`${API_BASE_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (err) {
      console.error('Sync error:', err);
      return false;
    }
  },

  /**
   * Pushes a specific reading update (minutes read).
   */
  pushReadingUpdate: async (bookId: string, bookTitle: string, seconds: number) => {
    try {
      const deviceId = await syncBridge.getDeviceId();
      const payload = {
        deviceId,
        data: {
          activeStatus: `Reading: ${bookTitle}`,
          readingUpdate: {
            seconds,
            bookId,
            bookTitle
          }
        }
      };

      await fetch(`${API_BASE_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Reading push error:', err);
    }
  }
};

// --- Integration Guide ---
// 1. In storageService.ts, add syncBridge.syncFull() call inside saveBooks/saveShelves.
// 2. In updateBookStats(bookId, seconds), add syncBridge.pushReadingUpdate(...) call.
// 3. Setup a background interval in App.tsx to call syncBridge.syncFull() every 10 mins.
