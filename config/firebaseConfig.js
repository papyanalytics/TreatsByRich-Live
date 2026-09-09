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
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// ============================================================
// TREATs BY RICH — FIREBASE CONFIGURATION
// Production Firebase connection
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCDlceVDv-sjW8kUJw8xaDmlyjNZ6mhm8Y",

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
// VALIDATE CONFIG
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
// FIRESTORE PERSISTENCE
// ============================================================
//
// The site now connects directly to the real Firebase project,
// including when running through Live Server.
//
// We are intentionally NOT connecting to the local Firestore
// emulator at 127.0.0.1:8080.
//

if (db) {
  enableIndexedDbPersistence(db).catch((error) => {
    console.warn(
      "[Treats By Rich] Firestore persistence unavailable:",
      error?.message || error
    );
  });
}

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