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

  TRACKING_CONTENT.innerHTML = `
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
   * Save the active tracking token.
   *
   * This ensures that if the customer leaves the page
   * and returns later, their latest order can load again.
   */
  if (activeTrackingToken) {
    localStorage.setItem(
      SAVED_TRACKING_KEY,
      activeTrackingToken
    );
  }

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

  // Order numbers are NOT valid tracking tokens.
  if (/^TBR-\d{8}-\d+$/i.test(cleanToken)) {
    console.warn(
      "[Treats By Rich] Ignoring order number as tracking token:",
      cleanToken
    );

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

  /*
   * Subscribe to the manually entered token.
   */
  subscribeToTrackingToken(
    query
  );

  /*
   * Immediately hide the token.
   */
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
 * The token stays in the URL and is never shown
 * in the input.
 */

if (urlTracking) {

  localStorage.setItem(
    SAVED_TRACKING_KEY,
    urlTracking
  );

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
 * RETURNING CUSTOMER
 * ============================================================
 *
 * If the customer previously tracked an order,
 * automatically restore it.
 */

} else {

  const savedTrackingToken =
    localStorage.getItem(
      SAVED_TRACKING_KEY
    );

  if (savedTrackingToken) {

    clearTrackingInput();

    subscribeToTrackingToken(
      savedTrackingToken
    );

  } else {

    clearTrackingInput();

    createEmptyState(
      "Enter your private tracking code to track your order."
    );
  }
}