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
  getDownloadURL,
  ref,
  uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import { configOk, db, storage } from "../config/firebaseConfig.js";

function normalize(snapshot) {
  const data = snapshot.data() || {};
  const appId = data.id || snapshot.id;
  return {
    ...data,
    id: appId,
    firestoreId: snapshot.id
  };
}

export function createProductService() {
  function ensureConfigured() {
    if (!configOk || !db) {
      throw new Error("Firebase is not configured.");
    }
  }

  function subscribeProducts(onData, onError) {
    if (!configOk || !db) {
      onData([]);
      return () => {};
    }

    const q = query(collection(db, "products"), orderBy("name", "asc"));
    return onSnapshot(
      q,
      (snapshot) => onData(snapshot.docs.map(normalize)),
      (error) => onError?.(error)
    );
  }

  async function createProduct(payload) {
    ensureConfigured();
    const result = await addDoc(collection(db, "products"), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return result.id;
  }

  async function updateProduct(productId, updates) {
    ensureConfigured();
    await updateDoc(doc(db, "products", productId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  async function uploadProductImage(file, productId) {
    if (!storage) {
      throw new Error("Firebase Storage is not configured.");
    }
    const imageRef = ref(storage, `products/${productId}/${Date.now()}-${file.name}`);
    const task = uploadBytesResumable(imageRef, file);

    return new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        null,
        reject,
        async () => {
          const downloadUrl = await getDownloadURL(task.snapshot.ref);
          resolve(downloadUrl);
        }
      );
    });
  }

  async function listCollection(collectionName) {
    if (!configOk || !db) return [];
    const snaps = await getDocs(query(collection(db, collectionName)));
    return snaps.docs.map(normalize);
  }

  async function getProductByCustomId(customId) {
    if (!configOk || !db) return null;
    const q = query(collection(db, "products"), where("id", "==", customId));
    const snaps = await getDocs(q);
    return snaps.empty ? null : normalize(snaps.docs[0]);
  }

  return {
    subscribeProducts,
    createProduct,
    updateProduct,
    uploadProductImage,
    listCollection,
    getProductByCustomId
  };
}
