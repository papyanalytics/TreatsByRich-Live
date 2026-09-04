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
import { configOk, db } from "../config/firebaseConfig.js";

function normalize(snapshot) {
  const data = snapshot.data() || {};
  const appId = data.id || snapshot.id;
  return {
    ...data,
    id: appId,
    firestoreId: snapshot.id
  };
}

export function createCustomerService() {
  function ensureConfigured() {
    if (!configOk || !db) {
      throw new Error("Firebase is not configured.");
    }
  }

  function subscribeCustomers(onData, onError) {
    if (!configOk || !db) {
      onData([]);
      return () => {};
    }

    const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => onData(snapshot.docs.map(normalize)),
      (error) => onError?.(error)
    );
  }

  async function createCustomer(payload) {
    ensureConfigured();
    const result = await addDoc(collection(db, "customers"), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return result.id;
  }

  async function findCustomerByPhone(phone) {
    ensureConfigured();
    const normalized = String(phone || "").trim();
    if (!normalized) return null;

    const phoneQuery = query(
      collection(db, "customers"),
      where("phone", "==", normalized),
      limit(1)
    );
    const snapshots = await getDocs(phoneQuery);
    if (!snapshots.empty) {
      return normalize(snapshots.docs[0]);
    }

    const altQuery = query(
      collection(db, "customers"),
      where("phoneNumber", "==", normalized),
      limit(1)
    );
    const altSnapshots = await getDocs(altQuery);
    return altSnapshots.empty ? null : normalize(altSnapshots.docs[0]);
  }

  async function upsertCustomerFromOrder(payload) {
    ensureConfigured();

    const fullName = payload.fullName || payload.customerName || "Guest Customer";
    const phone = payload.phone || payload.phoneNumber || "";
    const email = payload.emailAddress || payload.email || "";
    const address = payload.address || [payload.streetAddress, payload.city, payload.region].filter(Boolean).join(", ");
    const city = payload.city || "Accra";
    const country = payload.country || "Ghana";
    const orderTotal = Number(payload.grandTotal || payload.total || 0);
    const orderId = payload.orderNumber || payload.orderId || "";
    const orderDate = payload.createdAt || new Date().toISOString();

    const existing = await findCustomerByPhone(phone);

    if (!existing) {
      const totalOrders = 1;
      const totalSpent = orderTotal;
      await createCustomer({
        fullName,
        phone,
        phoneNumber: phone,
        email,
        address,
        city,
        country,
        totalOrders,
        totalSpent,
        averageOrderValue: totalOrders ? totalSpent / totalOrders : 0,
        latestOrderId: orderId,
        lastSeen: orderDate,
        customerType: "New",
        status: "Active",
        registrationDate: orderDate
      });
      return;
    }

    const totalOrders = Number(existing.totalOrders || 0) + 1;
    const totalSpent = Number(existing.totalSpent || 0) + orderTotal;

    await updateCustomer(existing.firestoreId || existing.id, {
      fullName,
      phone,
      phoneNumber: phone,
      email,
      address,
      city,
      country,
      totalOrders,
      totalSpent,
      averageOrderValue: totalOrders ? totalSpent / totalOrders : 0,
      latestOrderId: orderId,
      lastSeen: orderDate,
      customerType: totalOrders > 1 ? "Returning" : "New",
      status: "Active"
    });
  }

  async function updateCustomer(customerId, updates) {
    ensureConfigured();
    await updateDoc(doc(db, "customers", customerId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  async function removeCustomer(customerId) {
    ensureConfigured();
    await deleteDoc(doc(db, "customers", customerId));
  }

  return {
    subscribeCustomers,
    createCustomer,
    findCustomerByPhone,
    upsertCustomerFromOrder,
    updateCustomer,
    removeCustomer
  };
}
