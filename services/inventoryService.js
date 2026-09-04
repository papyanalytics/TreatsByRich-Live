import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { configOk, db } from "../config/firebaseConfig.js";

const INVENTORY_COLLECTION = "ingredients";

export function createInventoryService() {
  function subscribeInventory(onData, onError) {
    if (!configOk || !db) {
      onData([]);
      return () => {};
    }
    const q = query(collection(db, INVENTORY_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        onData(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      },
      (error) => onError?.(error)
    );
  }

  async function upsertInventoryItem(itemId, payload) {
    if (!configOk || !db) {
      throw new Error("Firebase is not configured.");
    }

    const ref = doc(db, INVENTORY_COLLECTION, itemId);
    await setDoc(
      ref,
      {
        ...payload,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  async function updateInventoryQuantity(itemId, quantity) {
    if (!configOk || !db) {
      throw new Error("Firebase is not configured.");
    }

    await updateDoc(doc(db, INVENTORY_COLLECTION, itemId), {
      quantity: Number(quantity || 0),
      updatedAt: serverTimestamp()
    });
  }

  return {
    subscribeInventory,
    upsertInventoryItem,
    updateInventoryQuantity
  };
}
