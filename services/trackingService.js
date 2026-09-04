import { createOrderService } from "./orderService.js";

export function createTrackingService() {
  const orderService = createOrderService();

  function subscribeTracking(orderNumber, onData, onError) {
    const cleanOrderNumber = String(orderNumber || "").trim();

    console.log("[Treats By Rich] Tracking requested:", cleanOrderNumber);

    if (!cleanOrderNumber) {
      onData?.(null);
      return () => {};
    }

    return orderService.subscribeOrderByNumber(
      cleanOrderNumber,
      (order) => {
        console.log("[Treats By Rich] Tracking result:", order);

        if (!order) {
          console.warn(
            "[Treats By Rich] No order found for:",
            cleanOrderNumber
          );
        }

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
  }

  async function getTrackingOrder(orderNumber) {
    const cleanOrderNumber = String(orderNumber || "").trim();

    console.log(
      "[Treats By Rich] Looking up order:",
      cleanOrderNumber
    );

    return orderService.findOrder(cleanOrderNumber);
  }

  return {
    subscribeTracking,
    getTrackingOrder
  };
}