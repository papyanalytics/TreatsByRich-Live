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


// ============================================================
// CUSTOMER ORDER STATUS MESSAGES
// ============================================================

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


// ============================================================
// HELPERS
// ============================================================

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}


function cleanupInvalidTokens(tokens, response) {
  const invalidTokens = [];

  response.responses.forEach((result, index) => {
    if (!result.success) {
      const errorCode = result.error?.code || "";

      if (
        errorCode.includes(
          "registration-token-not-registered"
        ) ||
        errorCode.includes(
          "invalid-registration-token"
        ) ||
        errorCode.includes(
          "invalid-argument"
        )
      ) {
        invalidTokens.push(tokens[index]);
      }
    }
  });

  return invalidTokens;
}


async function removeInvalidTokens(tokens) {
  if (!tokens.length) {
    return;
  }

  const snapshot = await db
    .collection("notificationRegistrations")
    .where(
      "token",
      "in",
      tokens.slice(0, 10)
    )
    .get();

  if (snapshot.empty) {
    return;
  }

  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  console.log(
    `Removed ${snapshot.size} invalid notification registration(s).`
  );
}


// ============================================================
// BUILD SAFE TRACKING DATA
//
// IMPORTANT:
// This deliberately does NOT copy private customer information
// such as phone number, email, address or payment details.
// ============================================================

function buildTrackingData(order) {
  return {
    orderNumber:
      order.orderNumber || "",

    status:
      order.status || "Pending",

    statusHistory:
      Array.isArray(order.statusHistory)
        ? order.statusHistory
        : [],

    items:
      Array.isArray(order.items)
        ? order.items.map((item) => ({
            productId:
              item.productId || "",

            productName:
              item.productName || "Treat Item",

            size:
              item.size || "Standard",

            quantity:
              Number(item.quantity || 1),

            extras:
              Array.isArray(item.extras)
                ? item.extras
                : [],

            unitPrice:
              Number(
                item.unitPrice ??
                item.price ??
                0
              ),

            totalPrice:
              Number(
                item.totalPrice ??
                0
              )
          }))
        : [],

    totals: {
      subtotal:
        Number(
          order.totals?.subtotal ??
          order.subtotal ??
          0
        ),

      deliveryFee:
        Number(
          order.totals?.deliveryFee ??
          order.deliveryFee ??
          0
        ),

      discount:
        Number(
          order.totals?.discount ??
          order.discount ??
          0
        ),

      grandTotal:
        Number(
          order.totals?.grandTotal ??
          order.grandTotal ??
          0
        )
    },

    deliveryMethod:
      order.deliveryMethod || "",

    estimatedDeliveryTime:
      order.estimatedDeliveryTime || "",

    updatedAt:
      order.updatedAt ||
      order.lastUpdated ||
      null,

    createdAt:
      order.createdAt || null
  };
}


// ============================================================
// CREATE TRACKING RECORD
//
// When a new order is created, create a separate public-safe
// tracking document using the random tracking token as its ID.
// ============================================================

export const createOrderTracking =
  onDocumentCreated(
    "orders/{orderId}",
    async (event) => {
      const orderSnapshot = event.data;

      if (!orderSnapshot) {
        console.warn(
          "Tracking creation skipped: no order snapshot."
        );

        return;
      }

      const order =
        orderSnapshot.data() || {};

      const trackingToken =
        order.trackingToken || "";

      const orderNumber =
        order.orderNumber ||
        event.params.orderId;

      if (!trackingToken) {
        console.warn(
          `Tracking creation skipped for ${orderNumber}: no tracking token.`
        );

        return;
      }

      try {
        const trackingData =
          buildTrackingData(order);

        await db
          .collection("orderTracking")
          .doc(trackingToken)
          .set({
            ...trackingData,

            orderId:
              event.params.orderId,

            trackingToken,

            createdAt:
              trackingData.createdAt ||
              new Date(),

            updatedAt:
              new Date()
          });

        console.log(
          `Tracking record created for ${orderNumber}`
        );
      } catch (error) {
        console.error(
          `Tracking record creation failed for ${orderNumber}:`,
          error
        );

        throw error;
      }
    }
  );


// ============================================================
// UPDATE TRACKING RECORD
//
// Whenever the order changes, keep the safe tracking document
// synchronized with the order.
// ============================================================

export const updateOrderTracking =
  onDocumentUpdated(
    "orders/{orderId}",
    async (event) => {
      const orderSnapshot =
        event.data?.after;

      if (!orderSnapshot) {
        return;
      }

      const order =
        orderSnapshot.data() || {};

      const trackingToken =
        order.trackingToken || "";

      const orderNumber =
        order.orderNumber ||
        event.params.orderId;

      if (!trackingToken) {
        console.warn(
          `Tracking update skipped for ${orderNumber}: no tracking token.`
        );

        return;
      }

      try {
        const trackingData =
          buildTrackingData(order);

        await db
          .collection("orderTracking")
          .doc(trackingToken)
          .set(
            {
              ...trackingData,

              orderId:
                event.params.orderId,

              trackingToken,

              updatedAt:
                new Date()
            },
            {
              merge: true
            }
          );

        console.log(
          `Tracking record updated for ${orderNumber}`
        );
      } catch (error) {
        console.error(
          `Tracking record update failed for ${orderNumber}:`,
          error
        );

        throw error;
      }
    }
  );


// ============================================================
// CUSTOMER SYNC
//
// Creates or updates a customer when a new order is created.
// This runs on the server instead of inside checkout.js.
// ============================================================

export const syncCustomerOnOrderCreated =
  onDocumentCreated(
    "orders/{orderId}",
    async (event) => {
      const orderSnapshot = event.data;

      if (!orderSnapshot) {
        console.warn(
          "Customer sync skipped: no order snapshot was provided."
        );

        return;
      }

      const order =
        orderSnapshot.data() || {};

      const orderId =
        event.params.orderId;

      const fullName =
        order.fullName ||
        order.customerName ||
        order.name ||
        "Customer";

      const phone =
        order.phone ||
        order.phoneNumber ||
        "";

      const email =
        order.emailAddress ||
        order.email ||
        "";

      const address =
        order.address ||
        order.streetAddress ||
        "";

      const city =
        order.city || "";

      const region =
        order.region || "";

      const orderTotal =
        Number(
          order.totals?.grandTotal ??
          order.grandTotal ??
          0
        );

      if (!phone) {
        console.warn(
          `Customer sync skipped for order ${orderId}: no phone number found.`
        );

        return;
      }

      try {
        const customersRef =
          db.collection("customers");

        let customerSnapshot =
          await customersRef
            .where(
              "phone",
              "==",
              phone
            )
            .limit(1)
            .get();

        if (
          customerSnapshot.empty
        ) {
          customerSnapshot =
            await customersRef
              .where(
                "phoneNumber",
                "==",
                phone
              )
              .limit(1)
              .get();
        }

        const now =
          new Date();

        // ------------------------------------------------------
        // CREATE NEW CUSTOMER
        // ------------------------------------------------------

        if (
          customerSnapshot.empty
        ) {
          const newCustomer = {
            fullName,

            name:
              fullName,

            phone,

            phoneNumber:
              phone,

            email,

            address,

            city,

            region,

            totalOrders:
              1,

            totalSpent:
              orderTotal,

            averageOrderValue:
              orderTotal,

            latestOrderId:
              orderId,

            latestOrderNumber:
              order.orderNumber ||
              "",

            lastOrderDate:
              now,

            createdAt:
              now,

            updatedAt:
              now
          };

          const newCustomerRef =
            await customersRef.add(
              newCustomer
            );

          console.log(
            `Customer created: ${newCustomerRef.id} for order ${
              order.orderNumber ||
              orderId
            }`
          );

          return;
        }

        // ------------------------------------------------------
        // UPDATE EXISTING CUSTOMER
        // ------------------------------------------------------

        const customerDoc =
          customerSnapshot.docs[0];

        const existingCustomer =
          customerDoc.data() || {};

        const previousOrders =
          Number(
            existingCustomer.totalOrders ||
            0
          );

        const previousSpent =
          Number(
            existingCustomer.totalSpent ||
            0
          );

        const totalOrders =
          previousOrders + 1;

        const totalSpent =
          previousSpent +
          orderTotal;

        const averageOrderValue =
          totalOrders > 0
            ? totalSpent /
              totalOrders
            : 0;

        await customerDoc.ref.update({
          fullName,

          name:
            fullName,

          phone,

          phoneNumber:
            phone,

          email,

          address,

          city,

          region,

          totalOrders,

          totalSpent,

          averageOrderValue,

          latestOrderId:
            orderId,

          latestOrderNumber:
            order.orderNumber ||
            "",

          lastOrderDate:
            now,

          updatedAt:
            now
        });

        console.log(
          `Customer updated: ${customerDoc.id} for order ${
            order.orderNumber ||
            orderId
          }`
        );
      } catch (error) {
        console.error(
          `Customer sync failed for order ${orderId}:`,
          error
        );

        throw error;
      }
    }
  );


// ============================================================
// CUSTOMER PUSH NOTIFICATION
//
// Runs whenever an order is updated and the order status changes.
// ============================================================

export const notifyCustomerOnOrderStatusChange =
  onDocumentUpdated(
    "orders/{orderId}",
    async (event) => {
      const beforeSnapshot =
        event.data?.before;

      const afterSnapshot =
        event.data?.after;

      if (
        !beforeSnapshot ||
        !afterSnapshot
      ) {
        return;
      }

      const before =
        beforeSnapshot.data() || {};

      const after =
        afterSnapshot.data() || {};

      const previousStatus =
        normalizeStatus(
          before.status
        );

      const currentStatus =
        normalizeStatus(
          after.status
        );

      if (
        !currentStatus ||
        previousStatus ===
          currentStatus
      ) {
        return;
      }

      const orderNumber =
        after.orderNumber || "";

      if (!orderNumber) {
        console.warn(
          "Customer notification skipped: order has no orderNumber."
        );

        return;
      }

      const messageConfig =
        STATUS_MESSAGES[
          currentStatus
        ];

      if (!messageConfig) {
        console.log(
          `No customer notification configured for status: ${currentStatus}`
        );

        return;
      }

      try {
        const registrationsSnapshot =
          await db
            .collection(
              "notificationRegistrations"
            )
            .where(
              "role",
              "==",
              "customer"
            )
            .where(
              "orderNumber",
              "==",
              orderNumber
            )
            .get();

        if (
          registrationsSnapshot.empty
        ) {
          console.log(
            `No customer notification registrations found for ${orderNumber}.`
          );

          return;
        }

        const tokens =
          registrationsSnapshot.docs
            .map(
              (doc) =>
                doc.data()?.token
            )
            .filter(Boolean);

        if (!tokens.length) {
          console.log(
            `No valid notification tokens found for ${orderNumber}.`
          );

          return;
        }

        const response =
          await messaging.sendEachForMulticast(
            {
              tokens,

              notification: {
                title:
                  messageConfig.title,

                body:
                  messageConfig.body
              },

              data: {
                orderNumber:
                  String(
                    orderNumber
                  ),

                status:
                  String(
                    currentStatus
                  ),

                url:
                  `/order-tracking.html?order=${encodeURIComponent(
                    orderNumber
                  )}`
              },

              webpush: {
                fcmOptions: {
                  link:
                    `/order-tracking.html?order=${encodeURIComponent(
                      orderNumber
                    )}`
                }
              }
            }
          );

        console.log(
          `Notification sent for ${orderNumber}: ${response.successCount} successful, ${response.failureCount} failed.`
        );

        const invalidTokens =
          cleanupInvalidTokens(
            tokens,
            response
          );

        if (
          invalidTokens.length
        ) {
          await removeInvalidTokens(
            invalidTokens
          );
        }
      } catch (error) {
        console.error(
          `Customer notification failed for ${orderNumber}:`,
          error
        );

        throw error;
      }
    }
  );


// ============================================================
// ADMIN PUSH NOTIFICATION
//
// Runs whenever a new order is created.
// ============================================================

export const notifyAdminOnNewOrder =
  onDocumentCreated(
    "orders/{orderId}",
    async (event) => {
      const orderSnapshot =
        event.data;

      if (!orderSnapshot) {
        console.warn(
          "Admin notification skipped: no order snapshot."
        );

        return;
      }

      const order =
        orderSnapshot.data() || {};

      const orderNumber =
        order.orderNumber ||
        event.params.orderId;

      const customerName =
        order.fullName ||
        order.customerName ||
        "A customer";

      const grandTotal =
        Number(
          order.totals?.grandTotal ??
          order.grandTotal ??
          0
        );

      try {
        const registrationsSnapshot =
          await db
            .collection(
              "notificationRegistrations"
            )
            .where(
              "role",
              "==",
              "admin"
            )
            .get();

        if (
          registrationsSnapshot.empty
        ) {
          console.log(
            "No admin notification registrations found."
          );

          return;
        }

        const tokens =
          registrationsSnapshot.docs
            .map(
              (doc) =>
                doc.data()?.token
            )
            .filter(Boolean);

        if (!tokens.length) {
          console.log(
            "No valid admin notification tokens found."
          );

          return;
        }

        const response =
          await messaging.sendEachForMulticast(
            {
              tokens,

              notification: {
                title:
                  "New Order Received 🛒",

                body:
                  `${customerName} placed order ${orderNumber} for GH₵${grandTotal.toFixed(
                    2
                  )}`
              },

              data: {
                orderNumber:
                  String(
                    orderNumber
                  ),

                url:
                  `/admin/order-details.html?order=${encodeURIComponent(
                    orderNumber
                  )}`
              },

              webpush: {
                fcmOptions: {
                  link:
                    `/admin/order-details.html?order=${encodeURIComponent(
                      orderNumber
                    )}`
                }
              }
            }
          );

        console.log(
          `Admin notification sent for ${orderNumber}: ${response.successCount} successful, ${response.failureCount} failed.`
        );

        const invalidTokens =
          cleanupInvalidTokens(
            tokens,
            response
          );

        if (
          invalidTokens.length
        ) {
          await removeInvalidTokens(
            invalidTokens
          );
        }
      } catch (error) {
        console.error(
          `Admin notification failed for ${orderNumber}:`,
          error
        );

        throw error;
      }
    }
  );