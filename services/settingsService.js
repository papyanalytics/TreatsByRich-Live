import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { configOk, db } from "../config/firebaseConfig.js";

const SETTINGS_DOC_ID = "global";

export function createSettingsService() {
  function subscribeSettings(onData, onError) {
    if (!configOk || !db) {
      onData({});
      return () => {};
    }

    return onSnapshot(
      doc(db, "settings", SETTINGS_DOC_ID),
      (snapshot) => onData(snapshot.exists() ? snapshot.data() : {}),
      (error) => onError?.(error)
    );
  }

  async function getSettings() {
    if (!configOk || !db) return {};
    const snapshot = await getDoc(doc(db, "settings", SETTINGS_DOC_ID));
    return snapshot.exists() ? snapshot.data() : {};
  }

  async function updateSettings(payload) {
    if (!configOk || !db) {
      throw new Error("Firebase is not configured.");
    }

    await setDoc(
      doc(db, "settings", SETTINGS_DOC_ID),
      {
        ...payload,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  return {
    subscribeSettings,
    getSettings,
    updateSettings
  };
}
