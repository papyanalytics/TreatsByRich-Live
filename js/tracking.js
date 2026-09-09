import { createTrackingService } from "../services/trackingService.js";
import { createRealtimeNotificationService } from "../services/notificationService.js";

const TRACKING_FORM =
  document.getElementById("trackingForm");

const TRACKING_INPUT =
  document.getElementById("trackingNumber");

const TRACKING_CONTENT =
  document.getElementById("trackingContent");

const trackingService =
  createTrackingService();

const notificationService =
  createRealtimeNotificationService();

const SAVED_TRACKING_KEY =
  "tbr_last_tracking_token";

const TRACKING_HISTORY_KEY =
  "tbr_tracking_history_v1";

const MAX_TRACKING_HISTORY =
  10;

const TRACKING_STEPS = [
  {
    key: "pending",
    label: "Order Received",
    detail:
      "Your order has been received and is awaiting payment verification."
  },
  {
    key: "payment-verification",
    label: "Payment Verification",
    detail:
      "Our team is manually verifying your payment."
  },
  {
    key: "confirmed",
    label: "Confirmed",
    detail:
      "Your order is confirmed and queued for preparation."
  },
  {
    key: "preparing",
    label: "Preparing",
    detail:
      "Our team is crafting your parfait with care."
  },
  {
    key: "ready",
    label: "Ready",
    detail:
      "Your order is ready for pickup or rider handoff."
  },
  {
    key: "out-for-delivery",
    label: "Out For Delivery",
    detail:
      "Your order is on the move."
  },
  {
    key: "completed",
    label: "Completed",
    detail:
      "Your parfait has arrived. Enjoy!"
  }
];

let activeSubscription = null;
let activeTrackingToken = null;
let activeOrderNumber = null;
let historyRequestId = 0;


// ============================================================
// INPUT PROTECTION
// ============================================================

function clearTrackingInput() {
  if (!TRACKING_INPUT) {
    return;
  }

  TRACKING_INPUT.value = "";

  TRACKING_INPUT.placeholder =
    "Enter your tracking number";
}


// ============================================================
// STATUS MAPPING
// ============================================================

const STATUS_KEY_MAP = {
  pending: "pending",

  "payment verification":
    "payment-verification",

  confirmed: "confirmed",

  preparing: "preparing",

  ready: "ready",

  "out for delivery":
    "out-for-delivery",

  completed: "completed",

  cancelled: "cancelled"
};


function mapStatus(status) {
  const value =
    String(
      status || "Pending"
    )
      .trim()
      .toLowerCase();

  return (
    STATUS_KEY_MAP[value] ||
    "pending"
  );
}


// ============================================================
// DISPLAY HELPERS
// ============================================================

function formatPrice(value) {
  return window.formatCurrency
    ? window.formatCurrency(value)
    : `GH₵${Number(value || 0).toFixed(2)}`;
}


function formatDate(value) {
  if (!value) {
    return "-";
  }

  let date;

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  ).format(date);
}


function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  let date;

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(date);
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}


// ============================================================
// TRACKING HISTORY
// ============================================================

function getTrackingHistory() {
  let history = [];

  try {
    const stored =
      localStorage.getItem(
        TRACKING_HISTORY_KEY
      );

    history =
      stored
        ? JSON.parse(stored)
        : [];
  } catch (error) {
    console.warn(
      "[Treats By Rich] Could not read tracking history:",
      error
    );

    history = [];
  }

  if (!Array.isArray(history)) {
    history = [];
  }

  history = history.filter(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      String(
        entry.trackingToken || ""
      ).trim()
  );

  /*
   * Migrate the previous single saved
   * tracking token into the new history.
   */
  const legacyToken =
    String(
      localStorage.getItem(
        SAVED_TRACKING_KEY
      ) || ""
    ).trim();

  if (
    legacyToken &&
    !history.some(
      (entry) =>
        entry.trackingToken ===
        legacyToken
    )
  ) {
    history.unshift({
      trackingToken:
        legacyToken,

      orderNumber:
        "",

      savedAt:
        new Date().toISOString()
    });
  }

  history =
    history.slice(
      0,
      MAX_TRACKING_HISTORY
    );

  try {
    localStorage.setItem(
      TRACKING_HISTORY_KEY,
      JSON.stringify(history)
    );
  } catch (error) {
    console.warn(
      "[Treats By Rich] Could not save tracking history:",
      error
    );
  }

  return history;
}


function saveTrackingHistoryEntry(
  trackingToken,
  orderNumber = ""
) {
  const cleanToken =
    String(
      trackingToken || ""
    ).trim();

  if (!cleanToken) {
    return;
  }

  /*
   * Never store an order number as
   * a tracking token.
   */
  if (
    /^TBR-\d{8}-\d+$/i.test(
      cleanToken
    )
  ) {
    return;
  }

  const history =
    getTrackingHistory();

  const updatedHistory = [
    {
      trackingToken:
        cleanToken,

      orderNumber:
        String(
          orderNumber || ""
        ).trim(),

      savedAt:
        new Date().toISOString()
    },

    ...history.filter(
      (entry) =>
        entry.trackingToken !==
        cleanToken
    )
  ].slice(
    0,
    MAX_TRACKING_HISTORY
  );

  try {
    localStorage.setItem(
      TRACKING_HISTORY_KEY,
      JSON.stringify(
        updatedHistory
      )
    );

    console.log(
      "[Treats By Rich] Tracking history updated:",
      orderNumber || cleanToken
    );
  } catch (error) {
    console.warn(
      "[Treats By Rich] Could not save tracking history:",
      error
    );
  }
}


function removeTrackingHistoryEntry(
  trackingToken
) {
  const cleanToken =
    String(
      trackingToken || ""
    ).trim();

  if (!cleanToken) {
    return;
  }

  const history =
    getTrackingHistory();

  const updatedHistory =
    history.filter(
      (entry) =>
        entry.trackingToken !==
        cleanToken
    );

  try {
    localStorage.setItem(
      TRACKING_HISTORY_KEY,
      JSON.stringify(
        updatedHistory
      )
    );
  } catch (error) {
    console.warn(
      "[Treats By Rich] Could not update tracking history:",
      error
    );
  }
}


// ============================================================
// EMPTY STATE
// ============================================================

function createEmptyState(
  message = "We couldn't find that order."
) {
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

      <h3>
        ${escapeHtml(message)}
      </h3>

      <p>
        Please check your private tracking code and try again.
      </p>

      <a
        class="button button-primary"
        href="menu.html"
      >
        Back to Menu
      </a>

    </div>
  `;
}


// ============================================================
// TRACKING HISTORY EMPTY STATE
// ============================================================

function createHistoryEmptyState() {
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

      <h3>
        No orders yet
      </h3>

      <p>
        Orders you place on this device will appear here automatically.
      </p>

      <a
        class="button button-primary"
        href="menu.html"
      >
        Browse Menu
      </a>

    </div>
  `;
}


// ============================================================
// TRACKING HISTORY CARD
// ============================================================

function renderHistoryCard(
  order,
  historyEntry
) {
  const orderNumber =
    order?.orderNumber ||
    historyEntry.orderNumber ||
    "Order";

  const status =
    String(
      order?.status ||
        "Pending"
    );

  const total =
    Number(
      order?.totals?.grandTotal ??
        0
    );

  const date =
    order?.createdAt ||
    historyEntry.savedAt;

  const statusClass =
    mapStatus(status);

  return `
    <article
      class="tracking-card reveal history-order-card"
      data-tracking-token="${escapeHtml(
        historyEntry.trackingToken
      )}"
    >

      <div
        class="tracking-card-header"
      >

        <div>

          <h3>
            Order #${escapeHtml(
              orderNumber
            )}
          </h3>

          <p>
            ${formatDate(date)}
          </p>

        </div>

        <span
          class="status-badge ${escapeHtml(
            statusClass
          )}"
        >
          ${escapeHtml(status)}
        </span>

      </div>

      <div
        class="summary-row"
        style="
          margin-top: 0.75rem;
        "
      >

        <span>
          Order Total
        </span>

        <strong>
          ${formatPrice(total)}
        </strong>

      </div>

      <button
        type="button"
        class="button button-primary history-track-button"
        data-tracking-token="${escapeHtml(
          historyEntry.trackingToken
        )}"
        style="
          width:100%;
          margin-top:1rem;
        "
      >
        Track Order
      </button>

    </article>
  `;
}


// ============================================================
// RENDER MY ORDERS
// ============================================================

async function renderTrackingHistory() {
  if (!TRACKING_CONTENT) {
    return;
  }

  if (
    activeSubscription
  ) {
    activeSubscription();
    activeSubscription =
      null;
  }

  activeTrackingToken =
    null;

  activeOrderNumber =
    null;

  clearTrackingInput();

  const currentRequestId =
    ++historyRequestId;

  const history =
    getTrackingHistory();

  if (!history.length) {
    createHistoryEmptyState();
    return;
  }

  TRACKING_CONTENT.innerHTML = `
    <section class="tracking-card reveal">

      <div
        class="tracking-card-header"
      >

        <div>

          <h3>
            Your Orders
          </h3>

          <p>
            Your recent orders on this device
          </p>

        </div>

        <span class="status-badge">
          ${history.length}
          ${
            history.length === 1
              ? "Order"
              : "Orders"
          }
        </span>

      </div>

    </section>

    <div
      id="trackingHistoryList"
      style="
        display:grid;
        gap:1rem;
        margin-top:1rem;
      "
    >
      <div class="empty-card">

        <h3>
          Loading your orders...
        </h3>

        <p>
          Please wait while we retrieve your recent orders.
        </p>

      </div>
    </div>

    <section
      class="tracking-card reveal"
      style="
        margin-top:1rem;
      "
    >

      <h3>
        Track Another Order
      </h3>

      <p class="muted">
        Have a tracking code from another device? Enter it above to track that order.
      </p>

    </section>
  `;

  const historyList =
    document.getElementById(
      "trackingHistoryList"
    );

  if (!historyList) {
    return;
  }

  const cards = [];

  for (
    const entry of history
  ) {
    try {

      const order =
        await trackingService.getTrackingOrder(
          entry.trackingToken
        );

      if (
        currentRequestId !==
        historyRequestId
      ) {
        return;
      }

      if (!order) {

        removeTrackingHistoryEntry(
          entry.trackingToken
        );

        continue;
      }

      cards.push(
        renderHistoryCard(
          order,
          entry
        )
      );

    } catch (error) {

      console.warn(
        "[Treats By Rich] Could not load history order:",
        error
      );

      removeTrackingHistoryEntry(
        entry.trackingToken
      );
    }
  }

  if (
    currentRequestId !==
    historyRequestId
  ) {
    return;
  }

  if (!cards.length) {
    createHistoryEmptyState();
    return;
  }

  historyList.innerHTML =
    cards.join("");

  historyList
    .querySelectorAll(
      ".history-track-button"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const token =
              button.dataset
                .trackingToken;

            subscribeToTrackingToken(
              token
            );
          }
        );
      }
    );
}


// ============================================================
// TIMELINE
// ============================================================

function buildTimeline(
  statusKey,
  isCancelled
) {
  const currentIndex =
    TRACKING_STEPS.findIndex(
      (step) =>
        step.key === statusKey
    );

  const normalizedIndex =
    currentIndex >= 0
      ? currentIndex
      : 0;

  const timelineIcon = (
    stateClass
  ) => {

    if (
      stateClass === "completed"
    ) {
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

    if (
      stateClass === "current"
    ) {
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
          <circle
            cx="12"
            cy="12"
            r="7"
          ></circle>

          <circle
            cx="12"
            cy="12"
            r="2"
          ></circle>
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
        <circle
          cx="12"
          cy="12"
          r="7"
        ></circle>
      </svg>
    `;
  };

  return TRACKING_STEPS
    .map(
      (
        step,
        index
      ) => {

        let stateClass =
          "pending";

        if (
          !isCancelled &&
          index < normalizedIndex
        ) {
          stateClass =
            "completed";
        }

        if (
          !isCancelled &&
          index === normalizedIndex
        ) {
          stateClass =
            "current";
        }

        return `
          <div
            class="timeline-item ${stateClass}"
          >

            <div class="timeline-icon">
              ${timelineIcon(
                stateClass
              )}
            </div>

            <div class="timeline-content">

              <strong>
                ${escapeHtml(
                  step.label
                )}
              </strong>

              <span>
                ${escapeHtml(
                  step.detail
                )}
              </span>

            </div>

          </div>
        `;
      }
    )
    .join("");
}


// ============================================================
// ORDER ITEMS
// ============================================================

function renderItems(items) {
  if (!Array.isArray(items)) {
    return "";
  }

  return items
    .map(
      (item) => {

        const productName =
          item.productName ||
          item.name ||
          "Parfait";

        const size =
          item.size ||
          "Standard";

        const quantity =
          Number(
            item.quantity || 1
          );

        const extras =
          Array.isArray(
            item.extras
          )
            ? item.extras.filter(Boolean)
            : [];

        const unitPrice =
          Number(
            item.unitPrice ??
              item.price ??
              0
          );

        const totalPrice =
          Number(
            item.totalPrice ??
              unitPrice *
                quantity
          );

        return `
          <article class="item-card">

            <div
              class="item-card-image"
              aria-hidden="true"
            >
              🍨
            </div>

            <div>

              <h4>
                ${escapeHtml(
                  productName
                )}
              </h4>

              <p>
                ${escapeHtml(
                  size
                )}
              </p>

              <p>
                ${
                  extras.length
                    ? `Extras: ${escapeHtml(
                        extras.join(", ")
                      )}`
                    : "No extras added"
                }
              </p>

              <p>
                Qty ${quantity}
              </p>

            </div>

            <strong>
              ${formatPrice(
                totalPrice
              )}
            </strong>

          </article>
        `;
      }
    )
    .join("");
}


// ============================================================
// STATUS HISTORY
// ============================================================

function renderStatusHistory(
  history
) {
  if (
    !Array.isArray(history) ||
    !history.length
  ) {
    return `
      <p class="muted">
        Your order status updates will appear here.
      </p>
    `;
  }

  return history
    .slice()
    .reverse()
    .map(
      (entry) => {

        const status =
          entry.status ||
          "Updated";

        const note =
          entry.note ||
          "";

        const timestamp =
          entry.at ||
          entry.createdAt ||
          null;

        return `
          <div
            class="summary-row"
            style="
              align-items: flex-start;
              gap: 1rem;
            "
          >

            <div>

              <strong>
                ${escapeHtml(
                  status
                )}
              </strong>

              ${
                note
                  ? `
                    <div
                      style="
                        margin-top: 0.2rem;
                        opacity: 0.75;
                      "
                    >
                      ${escapeHtml(
                        note
                      )}
                    </div>
                  `
                  : ""
              }

            </div>

            <small>
              ${formatDateTime(
                timestamp
              )}
            </small>

          </div>
        `;
      }
    )
    .join("");
}


// ============================================================
// RENDER TRACKING ORDER
// ============================================================

function renderOrder(order) {

  if (!order) {
    createEmptyState();
    return;
  }

  const status =
    mapStatus(order.status);

  const rawStatus =
    String(
      order.status || ""
    )
      .trim()
      .toLowerCase();

  const isCancelled =
    rawStatus === "cancelled";

  const currentStep =
    isCancelled
      ? {
          label: "Cancelled",
          detail:
            "This order has been cancelled."
        }
      : TRACKING_STEPS.find(
          (step) =>
            step.key === status
        ) ||
        TRACKING_STEPS[0];

  const subtotal =
    Number(
      order.totals?.subtotal ??
        0
    );

  const deliveryFee =
    Number(
      order.totals?.deliveryFee ??
        0
    );

  const discount =
    Number(
      order.totals?.discount ??
        0
    );

  const grandTotal =
    Number(
      order.totals?.grandTotal ??
        subtotal +
          deliveryFee -
          discount
    );

  const items =
    Array.isArray(order.items)
      ? order.items
      : [];

  const deliveryMethod =
    order.deliveryMethod ||
    "Pickup";

  const estimatedDelivery =
    order.estimatedDeliveryTime;

  const orderNumber =
    order.orderNumber ||
    order.number ||
    "Order";

  activeOrderNumber =
    orderNumber;

  /*
   * Save this order into history.
   */
  saveTrackingHistoryEntry(
    activeTrackingToken,
    orderNumber
  );

  TRACKING_CONTENT.innerHTML = `
    <button
      type="button"
      id="backToOrderHistory"
      class="button button-secondary"
      style="
        margin-bottom:1rem;
        width:100%;
        max-width:220px;
      "
    >
      ← My Orders
    </button>

    <section
      class="tracking-card reveal"
    >

      <div
        class="tracking-card-header"
      >

        <div>

          <h3>
            Order #${escapeHtml(
              orderNumber
            )}
          </h3>

          <p>
            Live order tracking
          </p>

        </div>

        <span class="status-badge">
          ${escapeHtml(
            currentStep.label
          )}
        </span>

      </div>

      <div class="order-meta-grid">

        <div class="meta-block">

          <small>
            Date Ordered
          </small>

          <strong>
            ${formatDate(
              order.createdAt
            )}
          </strong>

        </div>

        <div class="meta-block">

          <small>
            Estimated Delivery
          </small>

          <strong>
            ${
              estimatedDelivery
                ? formatDateTime(
                    estimatedDelivery
                  )
                : "25–35 mins"
            }
          </strong>

        </div>

        <div class="meta-block">

          <small>
            Order Type
          </small>

          <strong>
            ${escapeHtml(
              deliveryMethod
            )}
          </strong>

        </div>

      </div>

    </section>


    <section class="tracking-layout">

      <div
        class="timeline-card reveal"
      >

        <h3>
          Live Progress
        </h3>

        <div class="timeline-list">
          ${buildTimeline(
            status,
            isCancelled
          )}
        </div>

      </div>


      <div
        class="map-card reveal"
      >

        <h3>
          Live Delivery Tracking
        </h3>

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
                <path
                  d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z"
                ></path>

                <circle
                  cx="12"
                  cy="11"
                  r="2.3"
                ></circle>

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

      <div
        class="tracking-card-header"
      >

        <h3>
          Order Items
        </h3>

        <span class="status-badge">
          ${escapeHtml(
            deliveryMethod
          )}
        </span>

      </div>

      <div
        class="grid"
        style="
          display:grid;
          gap:0.75rem;
        "
      >

        ${
          items.length
            ? renderItems(items)
            : `
              <p>
                No items found for this order.
              </p>
            `
        }

      </div>

    </section>


    <section class="tracking-layout">

      <div
        class="tracking-card reveal"
      >

        <h3>
          Order Updates
        </h3>

        <div
          style="
            margin-top: 0.75rem;
          "
        >
          ${renderStatusHistory(
            order.statusHistory
          )}
        </div>

      </div>


      <div
        class="tracking-card reveal"
      >

        <h3>
          Order Summary
        </h3>

        <div class="summary-row">

          <span>
            Subtotal
          </span>

          <strong>
            ${formatPrice(
              subtotal
            )}
          </strong>

        </div>

        <div class="summary-row">

          <span>
            Delivery Fee
          </span>

          <strong>
            ${formatPrice(
              deliveryFee
            )}
          </strong>

        </div>

        <div class="summary-row">

          <span>
            Discount
          </span>

          <strong>
            ${formatPrice(
              discount
            )}
          </strong>

        </div>

        <div
          class="summary-row"
          style="
            font-size:1.05rem;
            margin-top:0.4rem;
          "
        >

          <span>
            Grand Total
          </span>

          <strong>
            ${formatPrice(
              grandTotal
            )}
          </strong>

        </div>

      </div>

    </section>
  `;

  /*
   * Save the active tracking token
   * for backwards compatibility.
   */
  if (activeTrackingToken) {
    localStorage.setItem(
      SAVED_TRACKING_KEY,
      activeTrackingToken
    );
  }

  /*
   * Back to My Orders.
   */
  const backButton =
    document.getElementById(
      "backToOrderHistory"
    );

  backButton?.addEventListener(
    "click",
    () => {
      renderTrackingHistory();
    }
  );

  /*
   * Register customer notifications.
   */
  registerCustomerNotifications(
    orderNumber
  );
}


// ============================================================
// CUSTOMER PUSH NOTIFICATIONS
// ============================================================

async function registerCustomerNotifications(
  orderNumber
) {
  if (!orderNumber) {
    return;
  }

  try {

    const result =
      await notificationService.registerPushDevice(
        {
          role: "customer",
          orderNumber
        }
      );

    console.log(
      "[Treats By Rich] Customer notification registration:",
      result
    );

    updateNotificationButton(
      true
    );

  } catch (error) {

    console.warn(
      "[Treats By Rich] Customer notification registration failed:",
      error
    );

    updateNotificationButton(
      false
    );
  }
}


function updateNotificationButton(
  enabled
) {
  const button =
    document.getElementById(
      "enableCustomerNotifications"
    );

  if (!button) {
    return;
  }

  if (enabled) {

    button.textContent =
      "🔔 Notifications Enabled";

    button.disabled =
      true;

  } else {

    button.textContent =
      "🔔 Enable Notifications";

    button.disabled =
      false;
  }
}


function setupCustomerPushNotifications() {

  if (!TRACKING_FORM) {
    return;
  }

  const existingButton =
    document.getElementById(
      "enableCustomerNotifications"
    );

  if (existingButton) {
    return;
  }

  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.id =
    "enableCustomerNotifications";

  button.className =
    "button button-primary";

  button.textContent =
    "🔔 Enable Notifications";

  button.style.marginTop =
    "1rem";

  button.style.width =
    "100%";

  button.style.maxWidth =
    "320px";

  TRACKING_FORM.insertAdjacentElement(
    "afterend",
    button
  );

  button.addEventListener(
    "click",
    async () => {

      if (!activeOrderNumber) {

        alert(
          "Please load your order first."
        );

        return;
      }

      button.disabled =
        true;

      button.textContent =
        "Enabling notifications...";

      try {

        const result =
          await notificationService.registerPushDevice(
            {
              role: "customer",
              orderNumber:
                activeOrderNumber
            }
          );

        console.log(
          "[Treats By Rich] Customer push registration successful:",
          result
        );

        button.textContent =
          "🔔 Notifications Enabled";

        button.disabled =
          true;

      } catch (error) {

        console.error(
          "[Treats By Rich] Customer push registration failed:",
          error
        );

        button.disabled =
          false;

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


// ============================================================
// SUBSCRIBE TO PRIVATE TRACKING RECORD
// ============================================================

function subscribeToTrackingToken(
  trackingToken
) {

  if (
    activeSubscription
  ) {

    activeSubscription();

    activeSubscription =
      null;
  }

  const cleanToken =
    String(
      trackingToken || ""
    ).trim();

  /*
   * Order numbers are NOT valid
   * tracking tokens.
   */
  if (
    /^TBR-\d{8}-\d+$/i.test(
      cleanToken
    )
  ) {
    console.warn(
      "[Treats By Rich] Ignoring order number as tracking token:",
      cleanToken
    );

    renderTrackingHistory();

    return;
  }

  if (!cleanToken) {

    createEmptyState(
      "No tracking code was provided."
    );

    return;
  }

  activeTrackingToken =
    cleanToken;

  activeOrderNumber =
    null;

  /*
   * Save immediately.
   */
  localStorage.setItem(
    SAVED_TRACKING_KEY,
    cleanToken
  );

  /*
   * Always clear the visible field.
   */
  clearTrackingInput();

  TRACKING_CONTENT.innerHTML = `
    <div class="empty-card">

      <h3>
        Loading your order...
      </h3>

      <p>
        Please wait while we connect to your live tracking record.
      </p>

    </div>
  `;

  activeSubscription =
    trackingService.subscribeTracking(
      cleanToken,

      (order) => {

        if (!order) {

          createEmptyState();

          return;
        }

        renderOrder(order);
      },

      (error) => {

        console.error(
          "[Treats By Rich] Tracking error:",
          error
        );

        createEmptyState(
          "We couldn't load this tracking record."
        );
      }
    );
}


// ============================================================
// FORM SUBMISSION
// ============================================================

function handleTrack(
  event
) {
  event.preventDefault();

  const query =
    TRACKING_INPUT?.value.trim();

  if (!query) {

    createEmptyState(
      "Please enter your tracking code."
    );

    return;
  }

  subscribeToTrackingToken(
    query
  );

  clearTrackingInput();
}


TRACKING_FORM?.addEventListener(
  "submit",
  handleTrack
);


if (TRACKING_INPUT) {

  TRACKING_INPUT.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        handleTrack(event);
      }
    }
  );
}


// ============================================================
// INITIALIZE
// ============================================================

setupCustomerPushNotifications();

const urlParams =
  new URLSearchParams(
    window.location.search
  );

const urlTracking =
  urlParams.get(
    "tracking"
  );

const urlOrder =
  urlParams.get(
    "order"
  );

/*
 * Always clear the visible field.
 */
clearTrackingInput();

/*
 * Also clear it whenever the browser restores
 * the page from its history/cache.
 */
window.addEventListener(
  "pageshow",
  () => {
    clearTrackingInput();
  }
);


/*
 * ============================================================
 * PRIORITY 1:
 * NEW ORDER TRACKING LINK
 * ============================================================
 *
 * Example:
 *
 * order-tracking.html?tracking=PRIVATE_TOKEN
 *
 * The token stays private and is never
 * displayed in the input.
 */

if (urlTracking) {

  clearTrackingInput();

  subscribeToTrackingToken(
    urlTracking
  );


/*
 * ============================================================
 * PRIORITY 2:
 * OLD ORDER-ONLY LINK
 * ============================================================
 */

} else if (urlOrder) {

  clearTrackingInput();

  createEmptyState(
    "This tracking link is outdated."
  );


/*
 * ============================================================
 * PRIORITY 3:
 * MY ORDERS
 * ============================================================
 *
 * Do NOT automatically reopen the previous
 * order anymore.
 *
 * Instead, show the customer's saved orders.
 */

} else {

  renderTrackingHistory();
}