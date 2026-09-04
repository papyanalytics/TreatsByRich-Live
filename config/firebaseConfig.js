import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDlceVDv-sjW8kUJw8xaDmlyjNZ6mhm8Y",
  authDomain: "treats-by-rich.firebaseapp.com",
  databaseURL:
    "https://treats-by-rich-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "treats-by-rich",
  storageBucket: "treats-by-rich.firebasestorage.app",
  messagingSenderId: "1009371345237",
  appId: "1:1009371345237:web:cbf7bf53c4d1c9ca11bfdc",
  measurementId: "G-7W2Z6QXSVJ"
};

function hasFirebaseConfig(config) {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.appId
  );
}

const configOk = hasFirebaseConfig(firebaseConfig);

const app = configOk
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

const auth = app ? getAuth(app) : null;

const db = app ? getFirestore(app) : null;

const storage = app ? getStorage(app) : null;

// Detect whether the website is running locally.
const isLocalEmulator =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost";

// Connect to the local Firestore Emulator before any Firestore operations.
if (db && isLocalEmulator) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// Only use IndexedDB persistence when connected to production Firestore.
// Persistence is intentionally disabled for the local emulator.
if (db && !isLocalEmulator) {
  enableIndexedDbPersistence(db).catch(() => {
    // Multi-tab or unsupported browser: continue without persistence.
  });
}

async function setRememberMePersistence(rememberMe) {
  if (!auth) return;

  await setPersistence(
    auth,
    rememberMe
      ? browserLocalPersistence
      : browserSessionPersistence
  );
}

export {
  app,
  auth,
  db,
  storage,
  firebaseConfig,
  configOk,
  setRememberMePersistence
};