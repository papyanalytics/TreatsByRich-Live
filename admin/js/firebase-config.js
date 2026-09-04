// Treats By Rich Admin — Firebase initialization.
// This is the Firebase Web app config (public client identifiers, not a secret).
// Actual protection comes from Firebase Authentication + Firestore/Storage security rules.

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  connectFirestoreEmulator
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Same Treats By Rich Firebase project used by the customer website,
// so the admin dashboard can read/write the same orders/products/customers data.
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

// When running the website locally, use the Firebase Firestore Emulator.
// Production/online website continues using the real Firestore database.
if (db && window.location.hostname === "127.0.0.1") {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export {
  app,
  auth,
  db,
  storage,
  configOk
};