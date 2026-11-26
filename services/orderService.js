import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-functions.js";

import { app, db, configOk } from "../config/firebaseConfig.js";

const functions =
  app
    ? getFunctions(app, "europe-west1")
    : null;

function toNumber(value) {
  return Number(value || 0);
}

function normalizeOrderDoc(snapshot) {
  const data = snapshot.data() || {};
  const totals = data.totals || {};
  const items = Array.isArray(data.items) ? data.items : [];

  const createdAt = data.createdAt?.toDate
    ? data.createdAt.toDate().toISOString()
    : data.createdAt || new Date().toISOString();

  const updatedAt = data.updatedAt?.toDate
    ? data.updatedAt.toDate().toISOString()
    : data.updatedAt || createdAt;

  const orderId = data.orderNumber || snapshot.id;

  return {
    id: orderId,
    firestoreId: snapshot.id,
    number: orderId,

    trackingToken: data.trackingToken || "",

    customerName:
      data.customerName ||
      data.fullName ||
      "Guest Customer",

    fullName:
      data.fullName ||
      data.customerName ||
      "Guest Customer",

    phone:
      data.phone ||
      data.phoneNumber ||
      "",

    phoneNumber:
      data.phoneNumber ||
      data.phone ||
      "",

    emailAddress:
      data.emailAddress ||
      "",

    whatsappNumber:
      data.whatsappNumber ||
      data.phone ||
      data.phoneNumber ||
      "",

    gpsLocation:
      data.gpsLocation ||
      "",

    address:
      data.address ||
      [
        data.streetAddress,
        data.city,
        data.region
      ]
        .filter(Boolean)
        .join(", "),

    streetAddress:
      data.streetAddress ||
      "",

    city:
      data.city ||
      data.location ||
      "Accra",

    region:
      data.region ||
      "",

    location:
      data.location ||
      data.city ||
      "Accra",

    landmark:
      data.landmark ||
      "",

    deliveryInstructions:
      data.deliveryInstructions ||
      "",

    deliveryType:
      data.deliveryMethod ||
      data.deliveryType ||
      "Delivery",

    deliveryMethod:
      data.deliveryMethod ||
      data.deliveryType ||
      "Delivery",

    payment:
      data.payment ||
      data.paymentMethod ||
      "Cash",

    paymentMethod:
      data.paymentMethod ||
      data.payment ||
      "Cash",

    paymentStatus:
      data.paymentStatus ||
      "Pending",

    status:
      data.status ||
      "Pending",

    statusHistory:
      Array.isArray(data.statusHistory)
        ? data.statusHistory
        : [],

    orderNotes:
      data.orderNotes ||
      "",

    items,

    productIds:
      Array.isArray(data.productIds)
        ? data.productIds
        : items
            .map((item) => item.productId)
            .filter(Boolean),

    sizeId:
      data.sizeId ||
      items[0]?.sizeId ||
      "",

    extraIds:
      Array.isArray(data.extraIds)
        ? data.extraIds
        : [],

    quantity:
      toNumber(data.quantity) ||
      items.reduce(
        (sum, item) =>
          sum + toNumber(item.quantity),
        0
      ),

    subtotal:
      toNumber(
        totals.subtotal ||
        data.subtotal
      ),

    deliveryFee:
      toNumber(
        totals.deliveryFee ||
        data.deliveryFee
      ),

    grandTotal:
      toNumber(
        totals.grandTotal ||
        data.grandTotal ||
        data.total
      ),

    total:
      toNumber(
        data.total ||
        totals.grandTotal ||
        data.grandTotal
      ),

    discount:
      toNumber(
        totals.discount ||
        data.discount
      ),

    promotion:
      data.promotion || null,

    date:
      data.date ||
      createdAt,

    createdAt,

    updatedAt,

    estimatedDeliveryTime:
      data.estimatedDeliveryTime ||
      ""
  };
}

export function createOrderService() {
  function assertConfigured() {
    if (!configOk || !db || !functions) {
      throw new Error(
        "Firebase is not configured. Add your Firebase keys first."
      );
    }
  }

  async function createOrder(payload) {
    assertConfigured();

    const createCustomerOrder =
      httpsCallable(
        functions,
        "createCustomerOrder"
      );

    const result =
      await createCustomerOrder({
        order: payload
      });

    if (
      !result.data?.firestoreId ||
      !result.data?.orderNumber ||
      !result.data?.trackingToken ||
      !result.data?.totals
    ) {
      throw new Error(
        "The order service returned an incomplete order confirmation."
      );
    }

    return result.data;
  }

  function subscribeOrders(
    onData,
    onError
  ) {
    if (!configOk || !db) {
      onData([]);
      return () => {};
    }

    const ordersQuery =
      query(
        collection(
          db,
          "orders"
        ),
        orderBy(
          "createdAt",
          "desc"
        ),
        limit(300)
      );

    return onSnapshot(
      ordersQuery,
      (snapshot) => {
        onData(
          snapshot.docs.map(
            normalizeOrderDoc
          )
        );
      },
      (error) => {
        if (onError) {
          onError(error);
        }
      }
    );
  }

  async function updateOrderStatus(
    orderId,
    status
  ) {
    assertConfigured();

    const entry =
      await findOrder(orderId);

    if (!entry) {
      throw new Error(
        "Order not found"
      );
    }

    const nextHistory =
      Array.isArray(
        entry.statusHistory
      )
        ? [
            ...entry.statusHistory
          ]
        : [];

    nextHistory.push({
      status,
      at:
        new Date().toISOString(),
      note:
        "Updated by admin"
    });

    await updateDoc(
      doc(
        db,
        "orders",
        entry.firestoreId
      ),
      {
        status,

        statusHistory:
          nextHistory,

        lastUpdated:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );
  }

  async function updatePaymentStatus(
    orderId,
    paymentStatus
  ) {
    assertConfigured();

    const entry =
      await findOrder(orderId);

    if (!entry) {
      throw new Error(
        "Order not found"
      );
    }

    await updateDoc(
      doc(
        db,
        "orders",
        entry.firestoreId
      ),
      {
        paymentStatus,

        updatedAt:
          serverTimestamp()
      }
    );
  }

  async function removeOrder(
    orderId
  ) {
    assertConfigured();

    const entry =
      await findOrder(orderId);

    if (!entry) {
      return;
    }

    await deleteDoc(
      doc(
        db,
        "orders",
        entry.firestoreId
      )
    );
  }

  async function duplicateOrder(
    orderId
  ) {
    const entry =
      await findOrder(orderId);

    if (!entry) {
      throw new Error(
        "Order not found"
      );
    }

    const cloned = {
      ...entry,

      status:
        "Pending",

      date:
        new Date().toISOString(),

      number:
        undefined,

      orderNumber:
        undefined,

      firestoreId:
        undefined,

      id:
        undefined,

      trackingToken:
        undefined
    };

    return createOrder(
      cloned
    );
  }

  async function findOrder(
    orderId
  ) {
    assertConfigured();

    const byNumber =
      query(
        collection(
          db,
          "orders"
        ),
        where(
          "orderNumber",
          "==",
          orderId
        ),
        limit(1)
      );

    const byNumberSnap =
      await getDocs(
        byNumber
      );

    if (
      !byNumberSnap.empty
    ) {
      const docSnap =
        byNumberSnap.docs[0];

      return normalizeOrderDoc(
        docSnap
      );
    }

    return null;
  }

  function subscribeOrderByNumber(
    orderNumber,
    onData,
    onError
  ) {
    if (
      !configOk ||
      !db ||
      !orderNumber
    ) {
      onData(null);
      return () => {};
    }

    const orderQuery =
      query(
        collection(
          db,
          "orders"
        ),
        where(
          "orderNumber",
          "==",
          orderNumber
        ),
        limit(1)
      );

    return onSnapshot(
      orderQuery,
      (snapshot) => {
        const match =
          snapshot.empty
            ? null
            : normalizeOrderDoc(
                snapshot.docs[0]
              );

        onData(match);
      },
      (error) => {
        if (onError) {
          onError(error);
        }
      }
    );
  }

  return {
    createOrder,
    subscribeOrders,
    updateOrderStatus,
    updatePaymentStatus,
    removeOrder,
    duplicateOrder,
    findOrder,
    subscribeOrderByNumber
  };
}