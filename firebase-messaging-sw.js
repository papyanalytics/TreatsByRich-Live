// Treats By Rich — Firebase Cloud Messaging Service Worker

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyCDlceVDv-sjW8kUJw8xaDmlyjNZ6mhm8Y",
  authDomain: "treats-by-rich.firebaseapp.com",
  databaseURL: "https://treats-by-rich-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "treats-by-rich",
  storageBucket: "treats-by-rich.firebasestorage.app",
  messagingSenderId: "1009371345237",
  appId: "1:1009371345237:web:cbf7bf53c4d1c9ca11bfdc",
  measurementId: "G-7W2Z6QXSVJ"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[Treats By Rich] Background notification received:",
    payload
  );

  const notificationTitle =
    payload.notification?.title || "Treats By Rich";

  const notificationOptions = {
    body:
      payload.notification?.body ||
      "You have a new notification from Treats By Rich.",
    icon: "/images/logo.png",
    badge: "/images/logo.png",
    data: payload.data || {}
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});