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
      const errorCode =
        result.error?.code || "";

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
        invalidTokens.push(
          tokens[index]
        );
      }
    }
  });

  return invalidTokens;
}


async function removeInvalidTokens(tokens) {
  if (!tokens.length) {
    return;
  }

  const chunks = [];

  for (
    let i = 0;
    i < tokens.length;
    i += 10
  ) {
    chunks.push(
      tokens.slice(
        i,
        i + 10
      )
    );
  }

  for (const chunk of chunks) {
    const snapshot =
      await db
        .collection(
          "notificationRegistrations"
        )
        .where(
          "token",
          "in",
          chunk
        )
        .get();

    if (snapshot.empty) {
      continue;
    }

    const batch =
      db.batch();

    snapshot.docs.forEach(
      (doc) => {
        batch.delete(
          doc.ref
        );
      }
    );

    await batch.commit();

    console.log(
      `Removed ${snapshot.size} invalid notification registration(s).`
    );
  }
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
      Array.isArray(
        order.statusHistory
      )
        ? order.statusHistory
        : [],

    items:
      Array.isArray(order.items)
        ? order.items.map(
            (item) => ({
              productId:
                item.productId || "",

              productName:
                item.productName ||
                "Treat Item",

              size:
                item.size ||
                "Standard",

              quantity:
                Number(
                  item.quantity || 1
                ),

              extras:
                Array.isArray(
                  item.extras
                )
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
            })
          )
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
      order.estimatedDeliveryTime ||
      "",

    updatedAt:
      order.updatedAt ||
      order.lastUpdated ||
      null,

    createdAt:
      order.createdAt ||
      null
  };
}


// ============================================================
// CUSTOMER TRACKING URL
// ============================================================
//
// IMPORTANT:
// Never use the order number for the customer tracking link.
// The private tracking token is required.
// ============================================================

function buildCustomerTrackingUrl(
  order
) {
  const trackingToken =
    order.trackingToken || "";

  if (!trackingToken) {
    return "/order-tracking.html";
  }

  return `/order-tracking.html?tracking=${encodeURIComponent(
    trackingToken
  )}`;
}


// ============================================================
// SEND CUSTOMER NOTIFICATION
// ============================================================

async function sendCustomerNotification({
  orderNumber,
  trackingToken,
  status,
  tokens
}) {
  if (!tokens.length) {
    return {
      successCount: 0,
      failureCount: 0
    };
  }

  const normalizedStatus =
    normalizeStatus(status) ||
    "pending";

  const messageConfig =
    STATUS_MESSAGES[
      normalizedStatus
    ] ||
    STATUS_MESSAGES.pending;

  const trackingUrl =
    trackingToken
      ? `/order-tracking.html?tracking=${encodeURIComponent(
          trackingToken
        )}`
      : "/order-tracking.html";

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
              orderNumber || ""
            ),

          status:
            String(
              normalizedStatus
            ),

          url:
            trackingUrl
        },

        webpush: {
          fcmOptions: {
            link:
              trackingUrl
          }
        }
      }
    );

  console.log(
    `Customer notification sent for ${orderNumber}: ${response.successCount} successful, ${response.failureCount} failed.`
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

  return response;
}


// ============================================================
// CREATE TRACKING RECORD
// ============================================================

export const createOrderTracking =
  onDocumentCreated(
    "orders/{orderId}",
    async (event) => {
      const orderSnapshot =
        event.data;

      if (!orderSnapshot) {
        console.warn(
          "Tracking creation skipped: no order snapshot."
        );

        return;
      }

      const order =
        orderSnapshot.data() ||
        {};

      const trackingToken =
        order.trackingToken ||
        "";

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
          buildTrackingData(
            order
          );

        await db
          .collection(
            "orderTracking"
          )
          .doc(
            trackingToken
          )
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
        orderSnapshot.data() ||
        {};

      const trackingToken =
        order.trackingToken ||
        "";

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
          buildTrackingData(
            order
          );

        await db
          .collection(
            "orderTracking"
          )
          .doc(
            trackingToken
          )
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
// ============================================================

export const syncCustomerOnOrderCreated =
  onDocumentCreated(
    "orders/{orderId}",
    async (event) => {
      const orderSnapshot =
        event.data;

      if (!orderSnapshot) {
        console.warn(
          "Customer sync skipped: no order snapshot was provided."
        );

        return;
      }

      const order =
        orderSnapshot.data() ||
        {};

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
        order.city ||
        "";

      const region =
        order.region ||
        "";

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
          db.collection(
            "customers"
          );

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
          customerDoc.data() ||
          {};

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
// CUSTOMER INITIAL NOTIFICATION
//
// IMPORTANT:
//
// This runs when a customer's notification device is registered.
//
// This solves the situation where:
//
// 1. Customer places order.
// 2. Order is created.
// 3. Tracking page loads.
// 4. Customer's FCM token is registered.
//
// The order already exists by the time the token is registered,
// so this function sends the initial notification at that point.
// ============================================================

export const notifyCustomerOnNotificationRegistration =
  onDocumentCreated(
    "notificationRegistrations/{registrationId}",
    async (event) => {
      const registrationSnapshot =
        event.data;

      if (!registrationSnapshot) {
        return;
      }

      const registration =
        registrationSnapshot.data() ||
        {};

      const role =
        String(
          registration.role ||
            ""
        )
          .trim()
          .toLowerCase();

      if (
        role !== "customer"
      ) {
        return;
      }

      const orderNumber =
        registration.orderNumber ||
        "";

      const token =
        registration.token ||
        "";

      if (
        !orderNumber ||
        !token
      ) {
        console.log(
          "Customer initial notification skipped: missing orderNumber or token."
        );

        return;
      }

      try {
        const ordersSnapshot =
          await db
            .collection(
              "orders"
            )
            .where(
              "orderNumber",
              "==",
              orderNumber
            )
            .limit(1)
            .get();

        if (
          ordersSnapshot.empty
        ) {
          console.log(
            `Customer initial notification skipped: order ${orderNumber} was not found.`
          );

          return;
        }

        const order =
          ordersSnapshot.docs[0]
            .data() || {};

        const trackingToken =
          order.trackingToken ||
          "";

        const currentStatus =
          normalizeStatus(
            order.status
          ) ||
          "pending";

        await sendCustomerNotification({
          orderNumber,
          trackingToken,
          status:
            currentStatus,
          tokens: [token]
        });

        await registrationSnapshot.ref.update({
          initialNotificationSent:
            true,

          initialNotificationSentAt:
            new Date()
        });

        console.log(
          `Initial customer notification sent for ${orderNumber}.`
        );
      } catch (error) {
        console.error(
          `Initial customer notification failed for ${orderNumber}:`,
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
        beforeSnapshot.data() ||
        {};

      const after =
        afterSnapshot.data() ||
        {};

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
        after.orderNumber ||
        "";

      const trackingToken =
        after.trackingToken ||
        "";

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

        await sendCustomerNotification({
          orderNumber,
          trackingToken,
          status:
            currentStatus,
          tokens
        });
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
        orderSnapshot.data() ||
        {};

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

        const adminUrl =
          `/admin/order-details.html?order=${encodeURIComponent(
            orderNumber
          )}`;

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
                  adminUrl
              },

              webpush: {
                fcmOptions: {
                  link:
                    adminUrl
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

// ============================================================
// EMAIL NOTIFICATION HELPERS
//
// Firebase Trigger Email extension watches the "mail" collection.
// These helpers only queue email documents. The extension handles
// the actual SMTP delivery.
// ============================================================

const ADMIN_EMAIL = "treatsbyrichparfait@gmail.com";
const SITE_URL = "https://treatsbyrich.com";

function escapeEmailHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function getBusinessSettings() {
  const snapshot = await db
    .collection("settings")
    .doc("business")
    .get();

  return snapshot.exists
    ? snapshot.data() || {}
    : {};
}

async function queueAdminEmail({
  subject,
  html,
  text
}) {
  await db.collection("mail").add({
    to: ADMIN_EMAIL,
    message: {
      subject,
      html,
      text
    }
  });

  console.log(
    `[Treats By Rich] Email queued: ${subject}`
  );
}

function getOrderTotal(order) {
  return Number(
    order.totals?.grandTotal ??
    order.grandTotal ??
    0
  );
}

function getOrderItemsText(order) {
  if (!Array.isArray(order.items) || !order.items.length) {
    return "No item details available.";
  }

  return order.items
    .map((item) => {
      const name =
        item.productName ||
        "Treat Item";

      const size =
        item.size ||
        "Standard";

      const quantity =
        Number(item.quantity || 1);

      const total =
        Number(
          item.totalPrice ??
          item.price ??
          0
        );

      return `${name} (${size}) × ${quantity} — GH₵${total.toFixed(2)}`;
    })
    .join("\n");
}

function getOrderItemsHtml(order) {
  if (!Array.isArray(order.items) || !order.items.length) {
    return "<p>No item details available.</p>";
  }

  return `
    <ul style="padding-left:20px;">
      ${order.items
        .map((item) => {
          const name = escapeEmailHtml(
            item.productName || "Treat Item"
          );

          const size = escapeEmailHtml(
            item.size || "Standard"
          );

          const quantity =
            Number(item.quantity || 1);

          const total =
            Number(
              item.totalPrice ??
              item.price ??
              0
            );

          return `
            <li style="margin-bottom:8px;">
              ${name} (${size}) × ${quantity}
              — <strong>GH₵${total.toFixed(2)}</strong>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

function buildAdminOrderEmail({
  order,
  subject,
  heading,
  intro
}) {
  const orderNumber =
    order.orderNumber || "Unknown";

  const customerName =
    order.fullName ||
    order.customerName ||
    "Customer";

  const paymentMethod =
    order.paymentMethod ||
    order.payment ||
    "Not provided";

  const paymentStatus =
    order.paymentStatus ||
    "Not provided";

  const deliveryMethod =
    order.deliveryMethod ||
    "Not provided";

  const total =
    getOrderTotal(order);

  const adminUrl =
    `${SITE_URL}/admin/order-details.html?order=${encodeURIComponent(
      orderNumber
    )}`;

  const safeCustomerName =
    escapeEmailHtml(customerName);

  const safeOrderNumber =
    escapeEmailHtml(orderNumber);

  const safePaymentMethod =
    escapeEmailHtml(paymentMethod);

  const safePaymentStatus =
    escapeEmailHtml(paymentStatus);

  const safeDeliveryMethod =
    escapeEmailHtml(deliveryMethod);

  const safeIntro =
    escapeEmailHtml(intro);

  const text =
`${heading}

${intro}

Order: ${orderNumber}
Customer: ${customerName}
Total: GH₵${total.toFixed(2)}
Payment method: ${paymentMethod}
Payment status: ${paymentStatus}
Delivery method: ${deliveryMethod}

Items:
${getOrderItemsText(order)}

Open order:
${adminUrl}

Treats By Rich
Love at First Scoop.`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#4A2412;max-width:680px;margin:auto;">
      <div style="padding:24px;background:#FFF8E8;border-radius:12px;">
        <h1 style="margin-top:0;">${escapeEmailHtml(heading)}</h1>
        <p>${safeIntro}</p>

        <div style="background:#ffffff;padding:18px;border-radius:10px;">
          <p><strong>Order:</strong> ${safeOrderNumber}</p>
          <p><strong>Customer:</strong> ${safeCustomerName}</p>
          <p><strong>Total:</strong> GH₵${total.toFixed(2)}</p>
          <p><strong>Payment method:</strong> ${safePaymentMethod}</p>
          <p><strong>Payment status:</strong> ${safePaymentStatus}</p>
          <p><strong>Delivery method:</strong> ${safeDeliveryMethod}</p>

          <h3>Items</h3>
          ${getOrderItemsHtml(order)}

          <p style="margin-top:24px;">
            <a
              href="${adminUrl}"
              style="display:inline-block;padding:12px 18px;background:#E85D04;color:#ffffff;text-decoration:none;border-radius:8px;"
            >
              Open Order in Admin
            </a>
          </p>
        </div>

        <p style="margin-bottom:0;margin-top:20px;">
          <strong>Treats By Rich</strong><br>
          Love at First Scoop.
        </p>
      </div>
    </div>
  `;

  return {
    subject,
    html,
    text
  };
}


// ============================================================
// NEW ORDER EMAIL
//
// Runs whenever a new order is created.
// Controlled by settings.business.notifyNewOrder.
// ============================================================

export const emailAdminOnNewOrder =
  onDocumentCreated(
    "orders/{orderId}",
    async (event) => {
      const snapshot =
        event.data;

      if (!snapshot) {
        return;
      }

      const order =
        snapshot.data() || {};

      try {
        const settings =
          await getBusinessSettings();

        if (
          settings.notifyNewOrder === false
        ) {
          console.log(
            "New order email skipped: notifyNewOrder is disabled."
          );

          return;
        }

        const orderNumber =
          order.orderNumber ||
          event.params.orderId;

        const customerName =
          order.fullName ||
          order.customerName ||
          "Customer";

        const total =
          getOrderTotal(order);

        const email =
          buildAdminOrderEmail({
            order,
            subject:
              `New Order ${orderNumber} 🛒 | Treats By Rich`,
            heading:
              "New Order Received 🛒",
            intro:
              `${customerName} has placed a new order worth GH₵${total.toFixed(
                2
              )}.`
          });

        await queueAdminEmail(email);
      } catch (error) {
        console.error(
          "New order email failed:",
          error
        );

        throw error;
      }
    }
  );


// ============================================================
// PAYMENT VERIFICATION EMAIL
//
// Sends when a new order needs manual payment verification,
// and when an existing order changes into a payment-verification
// state. Controlled by settings.business.notifyPayment.
// ============================================================

function isAwaitingPaymentVerification(
  paymentStatus
) {
  const value =
    normalizeStatus(
      paymentStatus
    );

  return (
    value ===
      "awaiting manual payment verification" ||
    value ===
      "payment verification" ||
    value ===
      "awaiting payment verification" ||
    value ===
      "pending payment verification"
  );
}

export const emailAdminOnPaymentVerification =
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

      const paymentChanged =
        normalizeStatus(
          before.paymentStatus
        ) !==
        normalizeStatus(
          after.paymentStatus
        );

      const statusChangedToVerification =
        normalizeStatus(
          before.status
        ) !==
          "payment verification" &&
        normalizeStatus(
          after.status
        ) ===
          "payment verification";

      if (
        !paymentChanged &&
        !statusChangedToVerification
      ) {
        return;
      }

      const needsVerification =
        isAwaitingPaymentVerification(
          after.paymentStatus
        ) ||
        normalizeStatus(
          after.status
        ) ===
          "payment verification";

      if (!needsVerification) {
        return;
      }

      try {
        const settings =
          await getBusinessSettings();

        if (
          settings.notifyPayment === false
        ) {
          console.log(
            "Payment verification email skipped: notifyPayment is disabled."
          );

          return;
        }

        const orderNumber =
          after.orderNumber ||
          event.params.orderId;

        const email =
          buildAdminOrderEmail({
            order: after,
            subject:
              `Payment Verification Needed ${orderNumber} 💳 | Treats By Rich`,
            heading:
              "Payment Verification Needed 💳",
            intro:
              `Order ${orderNumber} is waiting for manual payment verification.`
          });

        await queueAdminEmail(email);
      } catch (error) {
        console.error(
          `Payment verification email failed for ${
            after.orderNumber ||
            event.params.orderId
          }:`,
          error
        );

        throw error;
      }
    }
  );


// ============================================================
// REVIEW EMAIL
//
// Runs whenever a customer submits a new review.
// Controlled by settings.business.notifyReview.
// ============================================================

export const emailAdminOnNewReview =
  onDocumentCreated(
    "reviews/{reviewId}",
    async (event) => {
      const snapshot =
        event.data;

      if (!snapshot) {
        return;
      }

      const review =
        snapshot.data() || {};

      try {
        const settings =
          await getBusinessSettings();

        if (
          settings.notifyReview === false
        ) {
          console.log(
            "Review email skipped: notifyReview is disabled."
          );

          return;
        }

        const name =
          review.name ||
          "Customer";

        const order =
          review.order ||
          "Not provided";

        const rating =
          Number(
            review.rating || 0
          );

        const message =
          review.message ||
          "";

        const safeName =
          escapeEmailHtml(name);

        const safeOrder =
          escapeEmailHtml(order);

        const safeMessage =
          escapeEmailHtml(message)
            .replaceAll(
              "\n",
              "<br>"
            );

        const stars =
          "★".repeat(
            Math.max(
              0,
              Math.min(
                5,
                rating
              )
            )
          ) || "No rating";

        const subject =
          `New Customer Review ⭐ | Treats By Rich`;

        const text =
`New customer review received.

Customer: ${name}
Order: ${order}
Rating: ${rating}/5
Stars: ${stars}

Review:
${message}

Treats By Rich
Love at First Scoop.`;

        const html = `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#4A2412;max-width:680px;margin:auto;">
            <div style="padding:24px;background:#FFF8E8;border-radius:12px;">
              <h1 style="margin-top:0;">New Customer Review ⭐</h1>

              <div style="background:#ffffff;padding:18px;border-radius:10px;">
                <p><strong>Customer:</strong> ${safeName}</p>
                <p><strong>Order:</strong> ${safeOrder}</p>
                <p><strong>Rating:</strong> ${rating}/5 ${stars}</p>

                <h3>Review</h3>
                <p>${safeMessage}</p>
              </div>

              <p style="margin-bottom:0;margin-top:20px;">
                <strong>Treats By Rich</strong><br>
                Love at First Scoop.
              </p>
            </div>
          </div>
        `;

        await queueAdminEmail({
          subject,
          html,
          text
        });
      } catch (error) {
        console.error(
          "New review email failed:",
          error
        );

        throw error;
      }
    }
  );
