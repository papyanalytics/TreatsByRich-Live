// Treats By Rich Admin — Firebase configuration

import {
  getApps,
  getApp,
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  connectFirestoreEmulator
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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

// Use the local Firestore emulator when running the admin locally.
if (
  db &&
  window.location.hostname === "127.0.0.1"
) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// Keep admin authentication persistent.
async function setRememberMePersistence() {
  if (!auth) return;

  await setPersistence(
    auth,
    browserLocalPersistence
  );
}

export {
  app,
  auth,
  db,
  firebaseConfig,
  configOk,
  setRememberMePersistence
};