import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

import {
  onDocumentCreated,
  onDocumentUpdated
} from "firebase-functions/v2/firestore";

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

/* =========================================================
   CUSTOMER ORDER STATUS NOTIFICATIONS
   ========================================================= */

const STATUS_MESSAGES = {
  pending: {
    title: "Order Received 🍨",
    body:
      "We received your Treats By Rich order and are waiting for payment verification."
  },

  "payment verification": {
    title: "Payment Verification 💳",
    body:
      "Your payment is being verified by the Treats By Rich team."
  },

  confirmed: {
    title: "Order Confirmed ✅",
    body:
      "Your Treats By Rich order has been confirmed and is queued for preparation."
  },

  preparing: {
    title: "Your Order Is Being Prepared 🍓",
    body:
      "Our team is preparing your parfait with care."
  },

  ready: {
    title: "Your Order Is Ready 🎉",
    body:
      "Your order is ready for pickup or rider handoff."
  },

  "out for delivery": {
    title: "Your Order Is On The Way 🛵",
    body:
      "Your Treats By Rich order is out for delivery."
  },

  completed: {
    title: "Order Completed ❤️",
    body:
      "Your order has been completed. Enjoy your Treats By Rich parfait!"
  },

  cancelled: {
    title: "Order Cancelled",
    body:
      "Your Treats By Rich order has been cancelled."
  }
};

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

/* =========================================================
   CUSTOMER: ORDER STATUS CHANGED
   ========================================================= */

export const notifyCustomerOnOrderStatusChange =
  onDocumentUpdated("orders/{orderId}", async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) {
      return;
    }

    const previousStatus = normalizeStatus(before.status);
    const newStatus = normalizeStatus(after.status);

    // Only notify when the actual status changes.
    if (!newStatus || previousStatus === newStatus) {
      return;
    }

    const messageTemplate = STATUS_MESSAGES[newStatus];

    // Ignore statuses that do not have a customer notification.
    if (!messageTemplate) {
      console.log(
        `No customer notification configured for status: ${newStatus}`
      );
      return;
    }

    const orderNumber =
      after.orderNumber ||
      event.params.orderId;

    console.log(
      `Order ${orderNumber} changed from ${previousStatus} to ${newStatus}`
    );

    // Find every customer device registered for this order.
    const registrationsSnapshot = await db
      .collection("notificationRegistrations")
      .where("orderNumber", "==", orderNumber)
      .get();

    if (registrationsSnapshot.empty) {
      console.log(
        `No notification devices found for order ${orderNumber}`
      );
      return;
    }

    const tokens = registrationsSnapshot.docs
      .map((doc) => doc.data().token)
      .filter(Boolean);

    if (!tokens.length) {
      console.log(
        `No valid notification tokens found for order ${orderNumber}`
      );
      return;
    }

    const trackingUrl =
      `/order-tracking.html?order=${encodeURIComponent(orderNumber)}`;

    const response =
      await messaging.sendEachForMulticast({
        tokens,

        notification: {
          title: messageTemplate.title,
          body: messageTemplate.body
        },

        data: {
          orderNumber: String(orderNumber),
          status: String(newStatus),
          url: trackingUrl
        },

        webpush: {
          fcmOptions: {
            link: trackingUrl
          }
        }
      });

    console.log(
      `Notification sent for ${orderNumber}: ` +
        `${response.successCount} successful, ` +
        `${response.failureCount} failed.`
    );

    // Remove invalid/expired tokens.
    const cleanupPromises = [];

    response.responses.forEach((sendResponse, index) => {
      if (sendResponse.success) {
        return;
      }

      const errorCode = sendResponse.error?.code;

      if (
        errorCode ===
          "messaging/registration-token-not-registered" ||
        errorCode ===
          "messaging/invalid-registration-token"
      ) {
        const registrationDoc =
          registrationsSnapshot.docs.find(
            (doc) =>
              doc.data().token === tokens[index]
          );

        if (registrationDoc) {
          cleanupPromises.push(
            registrationDoc.ref.delete()
          );
        }
      }
    });

    if (cleanupPromises.length) {
      await Promise.all(cleanupPromises);
    }
  });


/* =========================================================
   ADMIN: NEW ORDER NOTIFICATION
   ========================================================= */

export const notifyAdminOnNewOrder =
  onDocumentCreated("orders/{orderId}", async (event) => {
    const order = event.data?.data();

    if (!order) {
      return;
    }

    const orderNumber =
      order.orderNumber ||
      event.params.orderId;

    const customerName =
      order.customerName ||
      order.fullName ||
      "A customer";

    const grandTotal =
      Number(
        order.grandTotal ??
          order.totals?.grandTotal ??
          0
      );

    console.log(
      `New order received: ${orderNumber}`
    );

    // Find every registered ADMIN device.
    const registrationsSnapshot = await db
      .collection("notificationRegistrations")
      .where("role", "==", "admin")
      .get();

    if (registrationsSnapshot.empty) {
      console.log(
        "No admin notification devices found."
      );
      return;
    }

    const tokens = registrationsSnapshot.docs
      .map((doc) => doc.data().token)
      .filter(Boolean);

    if (!tokens.length) {
      console.log(
        "No valid admin notification tokens found."
      );
      return;
    }

    const adminUrl =
      `/admin/order-details.html?order=${encodeURIComponent(orderNumber)}`;

    const response =
      await messaging.sendEachForMulticast({
        tokens,

        notification: {
          title: "New Order Received 🛒",
          body:
            `${customerName} placed order ${orderNumber} ` +
            `for GH₵${grandTotal.toFixed(2)}.`
        },

        data: {
          orderNumber: String(orderNumber),
          status: String(order.status || "pending"),
          url: adminUrl
        },

        webpush: {
          fcmOptions: {
            link: adminUrl
          }
        }
      });

    console.log(
      `Admin notification sent for ${orderNumber}: ` +
        `${response.successCount} successful, ` +
        `${response.failureCount} failed.`
    );

    // Remove invalid/expired admin tokens.
    const cleanupPromises = [];

    response.responses.forEach((sendResponse, index) => {
      if (sendResponse.success) {
        return;
      }

      const errorCode = sendResponse.error?.code;

      if (
        errorCode ===
          "messaging/registration-token-not-registered" ||
        errorCode ===
          "messaging/invalid-registration-token"
      ) {
        const registrationDoc =
          registrationsSnapshot.docs.find(
            (doc) =>
              doc.data().token === tokens[index]
          );

        if (registrationDoc) {
          cleanupPromises.push(
            registrationDoc.ref.delete()
          );
        }
      }
    });

    if (cleanupPromises.length) {
      await Promise.all(cleanupPromises);
    }
  });