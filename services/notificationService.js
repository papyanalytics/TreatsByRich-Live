import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging.js";

import { configOk, db, app } from "../config/firebaseConfig.js";

const VAPID_KEY =
  "BKpmI8zjxyGEyg4-uQWm-o982AC89FHTSGZhFGaOU9S481JPKuDA1u-od1prGiRJb5ls-tB6M3voWUwrElhvFMY";

export function createRealtimeNotificationService() {
  // =========================================================
  // EXISTING IN-APP NOTIFICATION SYSTEM
  // =========================================================

  function subscribeNotifications(userId, onData, onError) {
    if (!configOk || !db || !userId) {
      onData([]);
      return () => {};
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        onData(
          snapshot.docs.map((entry) => ({
            id: entry.id,
            ...entry.data()
          }))
        );
      },
      (error) => onError?.(error)
    );
  }

  async function createNotification(payload) {
    if (!configOk || !db) {
      throw new Error("Firebase is not configured.");
    }

    await addDoc(collection(db, "notifications"), {
      ...payload,
      isRead: false,
      createdAt: serverTimestamp()
    });
  }

  async function markAsRead(notificationId) {
    if (!configOk || !db) return;

    await updateDoc(doc(db, "notifications", notificationId), {
      isRead: true,
      readAt: serverTimestamp()
    });
  }

  // =========================================================
  // NEW: BROWSER / PHONE PUSH NOTIFICATIONS
  // =========================================================

  async function requestPushPermission() {
    if (!("Notification" in window)) {
      throw new Error(
        "This browser does not support notifications."
      );
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error(
        "Notification permission was not granted."
      );
    }

    return permission;
  }

  async function registerPushDevice({
    userId = null,
    role = "customer",
    orderNumber = null
  } = {}) {
    if (!configOk || !db || !app) {
      throw new Error("Firebase is not configured.");
    }

    if (!("Notification" in window)) {
      throw new Error(
        "This browser does not support notifications."
      );
    }

    if (!("serviceWorker" in navigator)) {
      throw new Error(
        "This browser does not support service workers."
      );
    }

    // Ask the user for permission if needed.
    if (Notification.permission !== "granted") {
      await requestPushPermission();
    }

    // Register the Treats By Rich FCM service worker.
    const serviceWorkerRegistration =
      await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

    console.log(
      "[Treats By Rich] Firebase messaging service worker registered."
    );

    // Create the Firebase Messaging instance.
    const messaging = getMessaging(app);

    // Get the unique push registration token for this browser/device.
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration
    });

    if (!token) {
      throw new Error(
        "Firebase did not return a push notification token."
      );
    }

    console.log(
      "[Treats By Rich] Push notification token received."
    );

    // Store this device separately.
    const registrationQuery = query(
      collection(db, "notificationRegistrations"),
      where("token", "==", token)
    );

    const existingRegistrations =
      await getDocs(registrationQuery);

    const deviceData = {
      token,
      userId,
      role,
      orderNumber,
      platform: "web",
      browser: navigator.userAgent,
      permission: Notification.permission,
      updatedAt: serverTimestamp()
    };

    if (existingRegistrations.empty) {
      await addDoc(
        collection(db, "notificationRegistrations"),
        {
          ...deviceData,
          createdAt: serverTimestamp()
        }
      );

      console.log(
        "[Treats By Rich] New notification device saved."
      );
    } else {
      const existingDoc =
        existingRegistrations.docs[0];

      await updateDoc(
        doc(
          db,
          "notificationRegistrations",
          existingDoc.id
        ),
        deviceData
      );

      console.log(
        "[Treats By Rich] Existing notification device updated."
      );
    }

    return {
      token,
      permission: Notification.permission,
      role,
      userId,
      orderNumber
    };
  }

  // Receive notifications while the website is currently open.
  function listenForForegroundMessages(onNotification) {
    if (!configOk || !app) {
      return () => {};
    }

    const messaging = getMessaging(app);

    return onMessage(messaging, (payload) => {
      console.log(
        "[Treats By Rich] Foreground push notification:",
        payload
      );

      onNotification?.(payload);
    });
  }

  return {
    // Existing notification functions
    subscribeNotifications,
    createNotification,
    markAsRead,

    // New push notification functions
    requestPushPermission,
    registerPushDevice,
    listenForForegroundMessages
  };
}