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
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// ============================================================
// TREATS BY RICH — FIREBASE CONFIGURATION
// PRODUCTION FIREBASE
// ============================================================

const firebaseConfig = {
  apiKey:
    "AIzaSyCDlceVDv-sjW8kUJw8xaDmlyjNZ6mhm8Y",

  authDomain:
    "treats-by-rich.firebaseapp.com",

  databaseURL:
    "https://treats-by-rich-default-rtdb.europe-west1.firebasedatabase.app",

  projectId:
    "treats-by-rich",

  storageBucket:
    "treats-by-rich.firebasestorage.app",

  messagingSenderId:
    "1009371345237",

  appId:
    "1:1009371345237:web:cbf7bf53c4d1c9ca11bfdc",

  measurementId:
    "G-7W2Z6QXSVJ"
};

// ============================================================
// VALIDATE FIREBASE CONFIG
// ============================================================

function hasFirebaseConfig(config) {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.appId
  );
}

const configOk =
  hasFirebaseConfig(firebaseConfig);

// ============================================================
// INITIALIZE FIREBASE
// ============================================================

const app = configOk
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

// ============================================================
// AUTHENTICATION
// ============================================================

const auth =
  app
    ? getAuth(app)
    : null;

// ============================================================
// FIRESTORE
// ============================================================
//
// IMPORTANT:
// The admin dashboard connects directly to the real Firebase
// Firestore database.
//
// No localhost emulator.
// No IndexedDB persistence.
// This prevents conflicts when another admin module has
// already initialized Firestore.
//

const db =
  app
    ? getFirestore(app)
    : null;

// ============================================================
// STORAGE
// ============================================================

const storage =
  app
    ? getStorage(app)
    : null;

// ============================================================
// REMEMBER ME AUTH PERSISTENCE
// ============================================================

async function setRememberMePersistence(
  rememberMe
) {
  if (!auth) {
    return;
  }

  await setPersistence(
    auth,
    rememberMe
      ? browserLocalPersistence
      : browserSessionPersistence
  );
}

// ============================================================
// EXPORTS
// ============================================================

export {
  app,
  auth,
  db,
  storage,
  firebaseConfig,
  configOk,
  setRememberMePersistence
};