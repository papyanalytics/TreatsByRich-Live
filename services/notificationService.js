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

import {
  getMessaging,
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging.js";

import {
  configOk,
  db,
  app
} from "../config/firebaseConfig.js";

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

    await updateDoc(
      doc(db, "notifications", notificationId),
      {
        isRead: true,
        readAt: serverTimestamp()
      }
    );
  }

  // =========================================================
  // BROWSER / PHONE PUSH NOTIFICATIONS
  // =========================================================

  async function requestPushPermission() {
    if (!("Notification" in window)) {
      throw new Error(
        "This browser does not support notifications."
      );
    }

    if (Notification.permission === "granted") {
      return "granted";
    }

    const permission =
      await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error(
        "Notification permission was not granted."
      );
    }

    return permission;
  }

  // =========================================================
  // REGISTER PUSH DEVICE
  // =========================================================

  async function registerPushDevice({
    userId = null,
    role = "customer",
    orderNumber = null
  } = {}) {

    if (!configOk || !db || !app) {
      throw new Error(
        "Firebase is not configured."
      );
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

    // -------------------------------------------------------
    // Normalize values
    // -------------------------------------------------------

    const normalizedRole =
      String(role || "customer")
        .trim()
        .toLowerCase();

    const normalizedOrderNumber =
      orderNumber
        ? String(orderNumber).trim()
        : null;

    // -------------------------------------------------------
    // Ask for notification permission
    // -------------------------------------------------------

    if (Notification.permission !== "granted") {
      await requestPushPermission();
    }

    // -------------------------------------------------------
    // Register Firebase messaging service worker
    // -------------------------------------------------------

    const serviceWorkerRegistration =
      await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

    console.log(
      "[Treats By Rich] Firebase messaging service worker registered."
    );

    // -------------------------------------------------------
    // Get FCM token
    // -------------------------------------------------------

    const messaging =
      getMessaging(app);

    const token =
      await getToken(
        messaging,
        {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration
        }
      );

    if (!token) {
      throw new Error(
        "Firebase did not return a push notification token."
      );
    }

    console.log(
      "[Treats By Rich] Push notification token received."
    );

    // =======================================================
    // IMPORTANT FIX
    //
    // We no longer search by TOKEN ONLY.
    //
    // Admin and customer registrations can use the same
    // browser/token without overwriting each other.
    // =======================================================

    const registrationQuery =
      query(
        collection(
          db,
          "notificationRegistrations"
        ),
        where(
          "token",
          "==",
          token
        )
      );

    const existingRegistrations =
      await getDocs(
        registrationQuery
      );

    let matchingRegistration = null;

    for (
      const registrationDoc
      of existingRegistrations.docs
    ) {

      const data =
        registrationDoc.data();

      const existingRole =
        String(
          data.role || "customer"
        )
          .trim()
          .toLowerCase();

      const existingOrderNumber =
        data.orderNumber
          ? String(
              data.orderNumber
            ).trim()
          : null;

      // -----------------------------------------------------
      // ADMIN MATCH
      //
      // Admin has:
      // token + role: admin
      // -----------------------------------------------------

      if (
        normalizedRole === "admin" &&
        existingRole === "admin"
      ) {
        matchingRegistration =
          registrationDoc;

        break;
      }

      // -----------------------------------------------------
      // CUSTOMER MATCH
      //
      // Customer has:
      // token + role: customer + order number
      // -----------------------------------------------------

      if (
        normalizedRole === "customer" &&
        existingRole === "customer" &&
        existingOrderNumber ===
          normalizedOrderNumber
      ) {
        matchingRegistration =
          registrationDoc;

        break;
      }
    }

    // =======================================================
    // DEVICE DATA
    // =======================================================

    const deviceData = {
      token,

      userId:
        userId || null,

      role:
        normalizedRole,

      orderNumber:
        normalizedRole === "customer"
          ? normalizedOrderNumber
          : null,

      platform: "web",

      browser:
        navigator.userAgent,

      permission:
        Notification.permission,

      updatedAt:
        serverTimestamp()
    };

    // =======================================================
    // UPDATE EXISTING REGISTRATION
    // =======================================================

    if (matchingRegistration) {

      await updateDoc(
        doc(
          db,
          "notificationRegistrations",
          matchingRegistration.id
        ),
        deviceData
      );

      console.log(
        "[Treats By Rich] Existing notification device updated.",
        {
          role: normalizedRole,
          orderNumber:
            normalizedOrderNumber
        }
      );

    } else {

      // =====================================================
      // CREATE NEW REGISTRATION
      // =====================================================

      await addDoc(
        collection(
          db,
          "notificationRegistrations"
        ),
        {
          ...deviceData,
          createdAt:
            serverTimestamp()
        }
      );

      console.log(
        "[Treats By Rich] New notification device saved.",
        {
          role: normalizedRole,
          orderNumber:
            normalizedOrderNumber
        }
      );
    }

    return {
      token,

      permission:
        Notification.permission,

      role:
        normalizedRole,

      userId,

      orderNumber:
        normalizedOrderNumber
    };
  }

  // =========================================================
  // FOREGROUND PUSH NOTIFICATIONS
  // =========================================================

  function listenForForegroundMessages(
    onNotification
  ) {
    if (!configOk || !app) {
      return () => {};
    }

    const messaging =
      getMessaging(app);

    return onMessage(
      messaging,
      (payload) => {

        console.log(
          "[Treats By Rich] Foreground push notification:",
          payload
        );

        onNotification?.(
          payload
        );
      }
    );
  }

  // =========================================================
  // RETURN SERVICE
  // =========================================================

  return {
    subscribeNotifications,
    createNotification,
    markAsRead,

    requestPushPermission,
    registerPushDevice,
    listenForForegroundMessages
  };
}