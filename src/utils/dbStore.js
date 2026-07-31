// src/utils/dbStore.js
// Decoupled Database Storage Layer for Firebase Firestore and Offline Caching

import { db } from './firebase.js';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export const dbStore = {
  // Save an AI prediction record to Firestore
  async savePrediction(logEntry) {
    if (!db) {
      console.warn("[DB Store] Firebase not active. Saving only to local cache.");
      return false;
    }

    try {
      const logsRef = collection(db, "prediction_logs");
      await addDoc(logsRef, {
        timestamp: logEntry.timestamp || new Date().toISOString(),
        classification: logEntry.classification,
        confidence: parseFloat(logEntry.confidence).toFixed(1),
        heartRate: parseInt(logEntry.heartRate) || 72,
        spo2: parseInt(logEntry.spo2) || 97,
        breathingRate: parseInt(logEntry.breathingRate) || 16,
        riskLevel: logEntry.riskLevel
      });
      console.log("[DB Store] Successfully saved prediction record to Firestore.");
      return true;
    } catch (err) {
      console.error("[DB Store] Firestore save failed:", err);
      return false;
    }
  },

  // Fetch all historical records from Firestore
  async getPredictions() {
    if (!db) {
      console.warn("[DB Store] Firebase Firestore not active.");
      return [];
    }

    try {
      const querySnapshot = await getDocs(collection(db, "prediction_logs"));
      const records = [];
      querySnapshot.forEach((doc) => {
        records.push(doc.data());
      });

      // Sort by timestamp descending (most recent first)
      records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return records;
    } catch (err) {
      console.error("[DB Store] Firestore fetch failed:", err);
      throw err;
    }
  }
};
