import {
  addDoc,
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

import { db, configOk } from "../config/firebaseConfig.js";
import { BUSINESS_CONFIG } from "../config/businessConfig.js";

function toNumber(value) {
  return Number(value || 0);
}

function generateTrackingToken() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2);
  const timePart = Date.now().toString(36);

  return `${timePart}-${randomPart}`;
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

function generateOrderNumber() {
  const now = new Date();

  const yyyy =
    now.getFullYear();

  const mm =
    String(now.getMonth() + 1)
      .padStart(2, "0");

  const dd =
    String(now.getDate())
      .padStart(2, "0");

  const random =
    String(
      Math.floor(
        Math.random() * 9999
      )
    ).padStart(4, "0");

  return `${BUSINESS_CONFIG.orderPrefix}-${yyyy}${mm}${dd}-${random}`;
}

export function createOrderService() {
  function assertConfigured() {
    if (!configOk || !db) {
      throw new Error(
        "Firebase is not configured. Add your Firebase keys first."
      );
    }
  }

  async function createOrder(payload) {
    assertConfigured();

    const orderNumber =
      payload.number ||
      payload.orderNumber ||
      generateOrderNumber();

    const trackingToken =
      payload.trackingToken ||
      generateTrackingToken();

    const nowIso =
      new Date().toISOString();

    const status =
      payload.status ||
      "Pending";

    const normalizedItems =
      Array.isArray(payload.items)
        ? payload.items.map(
            (item, index) => ({
              productId:
                item.productId ||
                item.id ||
                `item-${index + 1}`,

              productName:
                item.productName ||
                item.name ||
                "Product",

              size:
                item.size ||
                "Standard",

              quantity:
                toNumber(
                  item.quantity
                ) || 1,

              extras:
                Array.isArray(
                  item.extras
                )
                  ? item.extras
                  : [],

              price:
                toNumber(
                  item.price ||
                  item.unitPrice ||
                  0
                ),

              unitPrice:
                toNumber(
                  item.unitPrice ||
                  item.price ||
                  0
                ),

              totalPrice:
                toNumber(
                  item.totalPrice ||
                  (
                    toNumber(
                      item.unitPrice ||
                      item.price
                    ) *
                    (
                      toNumber(
                        item.quantity
                      ) || 1
                    )
                  )
                )
            })
          )
        : [];

    const statusHistory =
      Array.isArray(
        payload.statusHistory
      ) &&
      payload.statusHistory.length
        ? payload.statusHistory
        : [
            {
              status,
              at: nowIso,
              note: "Order created"
            }
          ];

    const writeModel = {
      orderNumber,

      trackingToken,

      customerName:
        payload.customerName ||
        payload.fullName ||
        "Guest Customer",

      fullName:
        payload.fullName ||
        payload.customerName ||
        "Guest Customer",

      phone:
        payload.phone ||
        payload.phoneNumber ||
        "",

      phoneNumber:
        payload.phoneNumber ||
        payload.phone ||
        "",

      emailAddress:
        payload.emailAddress ||
        "",

      deliveryMethod:
        payload.deliveryMethod ||
        payload.deliveryType ||
        "Delivery",

      streetAddress:
        payload.streetAddress ||
        "",

      city:
        payload.city ||
        "Accra",

      region:
        payload.region ||
        "",

      address:
        payload.address ||
        [
          payload.streetAddress,
          payload.city,
          payload.region
        ]
          .filter(Boolean)
          .join(", "),

      landmark:
        payload.landmark ||
        "",

      deliveryInstructions:
        payload.deliveryInstructions ||
        "",

      paymentMethod:
        payload.paymentMethod ||
        payload.payment ||
        "Cash",

      payment:
        payload.payment ||
        payload.paymentMethod ||
        "Cash",

      paymentStatus:
        payload.paymentStatus ||
        "Pending",

      status,

      statusHistory,

      promoCode:
        payload.promoCode ||
        "",

      orderNotes:
        payload.orderNotes ||
        "",

      whatsappNumber:
        payload.whatsappNumber ||
        payload.phone ||
        payload.phoneNumber ||
        "",

      gpsLocation:
        payload.gpsLocation ||
        "",

      estimatedDeliveryTime:
        payload.estimatedDeliveryTime ||
        "",

      items:
        normalizedItems,

      productIds:
        Array.isArray(
          payload.productIds
        ) &&
        payload.productIds.length
          ? payload.productIds
          : normalizedItems
              .map(
                (item) =>
                  item.productId
              )
              .filter(Boolean),

      sizeId:
        payload.sizeId ||
        "",

      extraIds:
        Array.isArray(
          payload.extraIds
        )
          ? payload.extraIds
          : [],

      quantity:
        toNumber(
          payload.quantity
        ) ||
        normalizedItems.reduce(
          (sum, item) =>
            sum +
            toNumber(
              item.quantity
            ),
          0
        ),

      totals: {
        subtotal:
          toNumber(
            payload.totals?.subtotal ||
            payload.subtotal
          ),

        deliveryFee:
          toNumber(
            payload.totals?.deliveryFee ||
            payload.deliveryFee
          ),

        discount:
          toNumber(
            payload.totals?.discount ||
            payload.discount
          ),

        grandTotal:
          toNumber(
            payload.totals?.grandTotal ||
            payload.grandTotal ||
            payload.total
          )
      },

      date:
        payload.date ||
        nowIso,

      customerId:
        payload.customerId ||
        null,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()
    };

    const result =
      await addDoc(
        collection(
          db,
          "orders"
        ),
        writeModel
      );

    return {
      firestoreId:
        result.id,

      orderNumber,

      trackingToken
    };
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