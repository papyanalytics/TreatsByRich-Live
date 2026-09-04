import { createTrackingService } from "../services/trackingService.js";
import { createRealtimeNotificationService } from "../services/notificationService.js";

const TRACKING_FORM = document.getElementById("trackingForm");
const TRACKING_INPUT = document.getElementById("trackingNumber");
const TRACKING_CONTENT = document.getElementById("trackingContent");

const trackingService = createTrackingService();
const notificationService = createRealtimeNotificationService();

const TRACKING_STEPS = [
  {
    key: "pending",
    label: "Order Received",
    detail: "Your order has been received and is awaiting payment verification."
  },
  {
    key: "payment-verification",
    label: "Payment Verification",
    detail: "Our team is manually verifying your payment."
  },
  {
    key: "confirmed",
    label: "Confirmed",
    detail: "Your order is confirmed and queued for preparation."
  },
  {
    key: "preparing",
    label: "Preparing",
    detail: "Our team is crafting your parfait with care."
  },
  {
    key: "ready",
    label: "Ready",
    detail: "Your order is ready for pickup or rider handoff."
  },
  {
    key: "out-for-delivery",
    label: "Out For Delivery",
    detail: "Your order is on the move."
  },
  {
    key: "completed",
    label: "Completed",
    detail: "Your parfait has arrived. Enjoy!"
  }
];

let activeSubscription = null;
let activeOrderNumber = null;

// Matches the exact status strings written by checkout.js and admin/order-details.html.
const STATUS_KEY_MAP = {
  pending: "pending",
  "payment verification": "payment-verification",
  confirmed: "confirmed",
  preparing: "preparing",
  ready: "ready",
  "out for delivery": "out-for-delivery",
  completed: "completed"
};

function mapStatus(status) {
  const value = String(status || "Pending").trim().toLowerCase();
  return STATUS_KEY_MAP[value] || "pending";
}

function formatPrice(value) {
  return window.formatCurrency
    ? window.formatCurrency(value)
    : `GH₵${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function createEmptyState() {
  TRACKING_CONTENT.innerHTML = `
    <div class="empty-card">
      <div class="empty-illustration">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z"></path>
          <path d="M3 7.5V16.5L12 21"></path>
          <path d="M21 7.5V16.5L12 21"></path>
          <path d="M12 12v9"></path>
        </svg>
      </div>

      <h3>We couldn't find that order.</h3>

      <p>
        Please check your tracking number and try again.
      </p>

      <a class="button button-primary" href="menu.html">
        Back to Menu
      </a>
    </div>
  `;
}

function buildTimeline(statusKey, isCancelled) {
  const currentIndex = TRACKING_STEPS.findIndex(
    (step) => step.key === statusKey
  );

  const normalizedIndex = currentIndex >= 0 ? currentIndex : 0;

  const timelineIcon = (stateClass) => {
    if (stateClass === "completed") {
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m5 12 4 4L19 6"></path>
        </svg>
      `;
    }

    if (stateClass === "current") {
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="7"></circle>
          <circle cx="12" cy="12" r="2"></circle>
        </svg>
      `;
    }

    return `
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="7"></circle>
      </svg>
    `;
  };

  return TRACKING_STEPS
    .map((step, index) => {
      let stateClass = "pending";

      if (!isCancelled && index < normalizedIndex) {
        stateClass = "completed";
      }

      if (!isCancelled && index === normalizedIndex) {
        stateClass = "current";
      }

      return `
        <div class="timeline-item ${stateClass}">
          <div class="timeline-icon">
            ${timelineIcon(stateClass)}
          </div>

          <div class="timeline-content">
            <strong>${step.label}</strong>
            <span>${step.detail}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderOrder(order) {
  if (!order) {
    createEmptyState();
    return;
  }

  const status = mapStatus(order.status);

  const isCancelled =
    String(order.status || "").trim().toLowerCase() === "cancelled";

  const deliveryMethod =
    order.deliveryMethod ||
    order.deliveryType ||
    "Pickup";

  const currentStep = isCancelled
    ? {
        label: "Cancelled",
        detail: "This order has been cancelled."
      }
    : TRACKING_STEPS.find(
        (step) => step.key === status
      ) || TRACKING_STEPS[0];

  const subTotal = Number(
    order.totals?.subtotal ||
      order.subtotal ||
      0
  );

  const deliveryFee = Number(
    order.totals?.deliveryFee ||
      order.deliveryFee ||
      0
  );

  const discount = Number(
    order.totals?.discount || 0
  );

  const grandTotal = Number(
    order.totals?.grandTotal ||
      order.grandTotal ||
      subTotal + deliveryFee - discount
  );

  const items = Array.isArray(order.items)
    ? order.items
    : [];

  TRACKING_CONTENT.innerHTML = `
    <section class="tracking-card reveal">
      <div class="tracking-card-header">
        <div>
          <h3>${order.number || order.id}</h3>
          <p>
            ${order.fullName || order.customerName || "Guest Customer"}
          </p>
        </div>

        <span class="status-badge">
          ${currentStep.label}
        </span>
      </div>

      <div class="order-meta-grid">
        <div class="meta-block">
          <small>Date Ordered</small>
          <strong>
            ${formatDate(order.createdAt || order.date)}
          </strong>
        </div>

        <div class="meta-block">
          <small>Estimated Delivery</small>
          <strong>25-35 mins</strong>
        </div>

        <div class="meta-block">
          <small>Payment</small>
          <strong>
            ${order.paymentMethod || order.payment || "Cash on Delivery"}
          </strong>
        </div>
      </div>

      <div class="meta-block">
        <small>Delivery Address</small>

        <strong>
          ${
            deliveryMethod === "Delivery"
              ? `${order.streetAddress || "-"}, ${order.city || ""}, ${order.region || ""}`.trim()
              : "Pickup at store"
          }
        </strong>
      </div>
    </section>

    <section class="tracking-layout">
      <div class="timeline-card reveal">
        <h3>Live Progress</h3>

        <div class="timeline-list">
          ${buildTimeline(status, isCancelled)}
        </div>
      </div>

      <div class="map-card reveal">
        <h3>Live Delivery Tracking</h3>

        <div class="map-placeholder">
          <div>
            <div class="pin">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z"></path>
                <circle cx="12" cy="11" r="2.3"></circle>
              </svg>
            </div>

            <strong>
              Real-time delivery map will appear here when GPS integration is added.
            </strong>
          </div>
        </div>
      </div>
    </section>

    <section class="tracking-card">
      <div class="tracking-card-header">
        <h3>Order Items</h3>

        <span class="status-badge">
          ${deliveryMethod}
        </span>
      </div>

      <div
        class="grid"
        style="display:grid; gap: 0.75rem;"
      >
        ${items
          .map(
            (item) => `
              <article class="item-card">
                <img
                  src="${item.image || "images/menu/heavenly-combo.png"}"
                  alt="${item.name || "Parfait"}"
                />

                <div>
                  <h4>${item.name || "Parfait"}</h4>

                  <p>
                    ${item.size || "Standard"}
                  </p>

                  <p>
                    ${
                      (item.extras || []).length
                        ? `Extras: ${item.extras.join(", ")}`
                        : "No extras added"
                    }
                  </p>

                  <p>
                    Qty ${item.quantity || 1}
                  </p>
                </div>

                <strong>
                  ${formatPrice(
                    item.totalPrice ||
                      Number(
                        item.unitPrice ||
                          item.price ||
                          0
                      ) *
                        Number(
                          item.quantity || 1
                        )
                  )}
                </strong>
              </article>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="tracking-layout">
      <div class="tracking-card reveal">
        <h3>Delivery Details</h3>

        <div
          class="order-meta-grid"
          style="margin-top: 0.75rem;"
        >
          <div class="meta-block">
            <small>Driver</small>
            <strong>
              ${order.driverName || "Dispatch Team"}
            </strong>
          </div>

          <div class="meta-block">
            <small>Driver Phone</small>
            <strong>
              ${order.driverPhone || "+233 53 851 7831"}
            </strong>
          </div>

          <div class="meta-block">
            <small>Arrival</small>
            <strong>
              ${order.estimatedArrival || "On the way"}
            </strong>
          </div>
        </div>
      </div>

      <div class="tracking-card reveal">
        <h3>Order Summary</h3>

        <div class="summary-row">
          <span>Subtotal</span>
          <strong>${formatPrice(subTotal)}</strong>
        </div>

        <div class="summary-row">
          <span>Delivery Fee</span>
          <strong>${formatPrice(deliveryFee)}</strong>
        </div>

        <div class="summary-row">
          <span>Discount</span>
          <strong>${formatPrice(discount)}</strong>
        </div>

        <div
          class="summary-row"
          style="font-size: 1.05rem; margin-top: 0.4rem;"
        >
          <span>Grand Total</span>
          <strong>${formatPrice(grandTotal)}</strong>
        </div>
      </div>
    </section>
  `;
}

// =========================================================
// CUSTOMER PUSH NOTIFICATION
// =========================================================

function setupCustomerPushNotifications() {
  if (!TRACKING_FORM) return;

  const existingButton =
    document.getElementById(
      "enableCustomerNotifications"
    );

  if (existingButton) return;

  const button = document.createElement("button");

  button.type = "button";
  button.id = "enableCustomerNotifications";
  button.className = "button button-primary";
  button.textContent = "🔔 Enable Notifications";

  button.style.marginTop = "1rem";
  button.style.width = "100%";
  button.style.maxWidth = "320px";

  TRACKING_FORM.insertAdjacentElement(
    "afterend",
    button
  );

  button.addEventListener(
    "click",
    async () => {
      button.disabled = true;
      button.textContent =
        "Enabling notifications...";

      try {
        const result =
          await notificationService.registerPushDevice(
            {
              role: "customer",
              orderNumber: activeOrderNumber
            }
          );

        console.log(
          "[Treats By Rich] Customer push registration successful:",
          result
        );

        button.textContent =
          "🔔 Notifications Enabled";

        button.disabled = true;
      } catch (error) {
        console.error(
          "[Treats By Rich] Customer push registration failed:",
          error
        );

        button.disabled = false;

        button.textContent =
          "🔔 Enable Notifications";

        alert(
          error?.message ||
            "We could not enable notifications. Please try again."
        );
      }
    }
  );
}

function subscribeToOrder(orderNumber) {
  if (activeSubscription) {
    activeSubscription();
    activeSubscription = null;
  }

  activeOrderNumber = orderNumber;

  activeSubscription =
    trackingService.subscribeTracking(
      orderNumber,
      (order) => {
        if (!order) {
          createEmptyState();
          return;
        }

        renderOrder(order);
      },
      () => {
        createEmptyState();
      }
    );
}

function handleTrack(event) {
  event.preventDefault();

  const query =
    TRACKING_INPUT?.value.trim();

  if (!query) return;

  subscribeToOrder(query);
}

TRACKING_FORM?.addEventListener(
  "submit",
  handleTrack
);

if (TRACKING_INPUT) {
  TRACKING_INPUT.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleTrack(event);
      }
    }
  );
}

// Set up the notification button.
setupCustomerPushNotifications();

const urlOrder =
  new URLSearchParams(
    window.location.search
  ).get("order");

if (urlOrder) {
  TRACKING_INPUT.value = urlOrder;
  subscribeToOrder(urlOrder);
} else {
  createEmptyState();
}