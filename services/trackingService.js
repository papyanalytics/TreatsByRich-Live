import {
  doc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import { db, configOk } from "../config/firebaseConfig.js";

export function createTrackingService() {
  function ensureConfigured() {
    if (!configOk || !db) {
      throw new Error(
        "Firebase is not configured correctly."
      );
    }
  }

  // ==========================================================
  // SUBSCRIBE TO A PRIVATE TRACKING RECORD
  //
  // The tracking token is the document ID inside:
  // orderTracking/{trackingToken}
  //
  // This does NOT query the orders collection.
  // ==========================================================

  function subscribeTracking(
    trackingToken,
    onData,
    onError
  ) {
    const cleanToken =
      String(trackingToken || "").trim();

    console.log(
      "[Treats By Rich] Tracking token requested:",
      cleanToken
    );

    if (!cleanToken) {
      onData?.(null);
      return () => {};
    }

    try {
      ensureConfigured();

      const trackingRef = doc(
        db,
        "orderTracking",
        cleanToken
      );

      return onSnapshot(
        trackingRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            console.warn(
              "[Treats By Rich] No tracking record found for token."
            );

            onData?.(null);
            return;
          }

          const data =
            snapshot.data() || {};

          const order = {
            ...data,

            id: snapshot.id,

            firestoreId:
              snapshot.id,

            number:
              data.orderNumber ||
              "",

            orderNumber:
              data.orderNumber ||
              ""
          };

          console.log(
            "[Treats By Rich] Tracking result:",
            order
          );

          onData?.(order);
        },
        (error) => {
          console.error(
            "[Treats By Rich] Tracking Firestore error:",
            error
          );

          onError?.(error);
        }
      );
    } catch (error) {
      console.error(
        "[Treats By Rich] Tracking subscription failed:",
        error
      );

      onError?.(error);

      return () => {};
    }
  }

  // ==========================================================
  // GET A TRACKING RECORD ONCE
  // ==========================================================

  async function getTrackingOrder(
    trackingToken
  ) {
    const cleanToken =
      String(trackingToken || "").trim();

    console.log(
      "[Treats By Rich] Looking up tracking token:",
      cleanToken
    );

    if (!cleanToken) {
      return null;
    }

    ensureConfigured();

    const trackingRef = doc(
      db,
      "orderTracking",
      cleanToken
    );

    const snapshot =
      await getDoc(trackingRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data =
      snapshot.data() || {};

    return {
      ...data,

      id: snapshot.id,

      firestoreId:
        snapshot.id,

      number:
        data.orderNumber ||
        "",

      orderNumber:
        data.orderNumber ||
        ""
    };
  }

  return {
    subscribeTracking,
    getTrackingOrder
  };
}