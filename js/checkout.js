import {
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  db
} from "../config/firebaseConfig.js";

import {
  createOrderService
} from "../services/orderService.js";

import {
  createRealtimeNotificationService
} from "../services/notificationService.js";

// =========================================================
// CHECKOUT CONFIG
// =========================================================

const CHECKOUT_CONFIG = {
  orderPrefix: "TBR",
  cartStorageKey:
    window.APP_CONFIG?.cartStorageKey ||
    "tbrCart"
};

const PAYMENT_STATUS_AWAITING_VERIFICATION =
  "Awaiting manual payment verification";

const TRACKING_HISTORY_KEY =
  "tbr_tracking_history_v1";

const orderService =
  createOrderService();

const notificationService =
  createRealtimeNotificationService();

// =========================================================
// DOM
// =========================================================

const form =
  document.getElementById(
    "checkoutForm"
  );

const deliveryFields =
  document.getElementById(
    "deliveryFields"
  );

const deliveryNotice =
  document.getElementById(
    "deliveryNotice"
  );

const mobileMoneyFields =
  document.getElementById(
    "mobileMoneyFields"
  );

const bankTransferFields =
  document.getElementById(
    "bankTransferFields"
  );

const paymentConfirmationSection =
  document.getElementById(
    "paymentConfirmationSection"
  );

const paymentConfirmationInput =
  document.getElementById(
    "paymentConfirmation"
  );

const orderSummary =
  document.getElementById(
    "orderSummary"
  );

const subtotalAmount =
  document.getElementById(
    "subtotalAmount"
  );

const grandTotalElement =
  document.getElementById(
    "grandTotal"
  );

const placeOrderButton =
  document.getElementById(
    "placeOrderButton"
  );

// =========================================================
// ERRORS
// =========================================================

const errorMap = {
  nameError:
    "Please enter your full name.",

  phoneError:
    "Please enter a valid phone number.",

  addressError:
    "Please complete your delivery address.",

  paymentMethodError:
    "Please select a payment method.",

  paymentConfirmationError:
    "Please confirm that you have completed this payment."
};

// =========================================================
// PAYMENT SETTINGS
// =========================================================

const DEFAULT_PAYMENT_SETTINGS = {
  momoNumber:
    "0538517831",

  momoName:
    "Treats by Rich",

  bankName:
    "GCB",

  bankAccountNumber:
    "1011440001239",

  bankAccountName:
    "Treats by Rich"
};

let paymentSettings = {
  ...DEFAULT_PAYMENT_SETTINGS
};

// =========================================================
// CART
// =========================================================

function getCart() {
  const raw =
    localStorage.getItem(
      CHECKOUT_CONFIG.cartStorageKey
    );

  try {
    return raw
      ? JSON.parse(raw)
      : [];
  } catch (error) {
    console.warn(
      "[Treats By Rich] Could not read cart:",
      error
    );

    return [];
  }
}

// =========================================================
// HELPERS
// =========================================================

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPrice(value) {
  return `GH₵${Number(
    value || 0
  ).toFixed(2)}`;
}

function getItemTotals(item) {
  const quantity =
    Math.max(
      1,
      Number(
        item.quantity || 1
      )
    );

  const unitPrice =
    Number(
      item.unitPrice ||
        item.price ||
        0
    );

  const totalPrice =
    Number(
      item.totalPrice ||
        unitPrice * quantity
    );

  return {
    quantity,
    unitPrice,
    totalPrice
  };
}

// =========================================================
// FIRESTORE PAYMENT SETTINGS
// =========================================================

async function loadPaymentSettings() {
  try {
    if (!db) {
      console.warn(
        "[Treats By Rich] Firestore is unavailable. Using default payment details."
      );

      return;
    }

    const settingsRef =
      doc(
        db,
        "settings",
        "business"
      );

    const snapshot =
      await getDoc(
        settingsRef
      );

    if (!snapshot.exists()) {
      console.warn(
        "[Treats By Rich] No saved business settings found. Using defaults."
      );

      return;
    }

    const data =
      snapshot.data() || {};

    paymentSettings = {
      momoNumber:
        data.momoNumber ||
        DEFAULT_PAYMENT_SETTINGS.momoNumber,

      momoName:
        data.momoName ||
        DEFAULT_PAYMENT_SETTINGS.momoName,

      bankName:
        data.bankName ||
        DEFAULT_PAYMENT_SETTINGS.bankName,

      bankAccountNumber:
        data.bankAccountNumber ||
        DEFAULT_PAYMENT_SETTINGS.bankAccountNumber,

      bankAccountName:
        data.bankAccountName ||
        DEFAULT_PAYMENT_SETTINGS.bankAccountName
    };

    console.log(
      "[Treats By Rich] Payment settings loaded from Firestore:",
      paymentSettings
    );

  } catch (error) {
    console.warn(
      "[Treats By Rich] Could not load payment settings. Using defaults.",
      error
    );
  }
}

// =========================================================
// APPLY FIREBASE PAYMENT SETTINGS
// =========================================================

function applyPaymentSettings() {
  const momoNumberValue =
    document.getElementById(
      "momoNumberValue"
    );

  const momoAccountNameValue =
    document.getElementById(
      "momoAccountNameValue"
    );

  const bankNameValue =
    document.getElementById(
      "bankNameValue"
    );

  const bankAccountNumberValue =
    document.getElementById(
      "bankAccountNumberValue"
    );

  const bankAccountNameValue =
    document.getElementById(
      "bankAccountNameValue"
    );

  const momoCopyButton =
    document.querySelector(
      '#mobileMoneyFields .payment-copy-btn'
    );

  const bankCopyButton =
    document.querySelector(
      '#bankTransferFields .payment-copy-btn'
    );

  if (momoNumberValue) {
    momoNumberValue.textContent =
      paymentSettings.momoNumber;
  }

  if (momoAccountNameValue) {
    momoAccountNameValue.textContent =
      paymentSettings.momoName;
  }

  if (bankNameValue) {
    bankNameValue.textContent =
      paymentSettings.bankName;
  }

  if (bankAccountNumberValue) {
    bankAccountNumberValue.textContent =
      paymentSettings.bankAccountNumber;
  }

  if (bankAccountNameValue) {
    bankAccountNameValue.textContent =
      paymentSettings.bankAccountName;
  }

  if (momoCopyButton) {
    momoCopyButton.dataset.copyValue =
      paymentSettings.momoNumber;
  }

  if (bankCopyButton) {
    bankCopyButton.dataset.copyValue =
      paymentSettings.bankAccountNumber;
  }
}

// =========================================================
// RECEIVING METHOD
// =========================================================

function getReceivingMethod() {
  return (
    form?.querySelector(
      'input[name="deliveryMethod"]:checked'
    )?.value ||
    "Pickup"
  );
}

function updateDeliveryFields() {
  const receivingMethod =
    getReceivingMethod();

  const isDelivery =
    receivingMethod ===
    "Delivery";

  if (deliveryFields) {
    deliveryFields.style.display =
      isDelivery
        ? "block"
        : "none";

    deliveryFields.setAttribute(
      "aria-hidden",
      isDelivery
        ? "false"
        : "true"
    );
  }

  /*
   * Delivery has NO fee.
   * The customer simply selects Delivery,
   * provides their address and arranges their own rider.
   */
  if (deliveryNotice) {
    deliveryNotice.style.display =
      "flex";
  }

  const streetAddress =
    document.getElementById(
      "streetAddress"
    );

  if (streetAddress) {
    if (isDelivery) {
      streetAddress.setAttribute(
        "required",
        "required"
      );
    } else {
      streetAddress.removeAttribute(
        "required"
      );
    }
  }
}

// =========================================================
// CART TOTALS
// =========================================================

function getSubtotal(
  cartItems
) {
  return cartItems.reduce(
    (sum, item) =>
      sum +
      getItemTotals(item)
        .totalPrice,
    0
  );
}

// =========================================================
// ORDER ITEMS
// =========================================================

function buildOrderItems(
  cartItems
) {
  return cartItems.map(
    (item, index) => {
      const {
        quantity,
        unitPrice,
        totalPrice
      } = getItemTotals(item);

      return {
        productId:
          item.productId ||
          item.id ||
          `cart-item-${index + 1}`,

        productName:
          item.name ||
          "Treat Item",

        size:
          item.size ||
          "Standard",

        quantity,

        extras:
          Array.isArray(
            item.extras
          )
            ? item.extras.filter(
                Boolean
              )
            : [],

        price:
          unitPrice,

        unitPrice,

        totalPrice
      };
    }
  );
}

// =========================================================
// ORDER SUMMARY
// =========================================================

function renderSummary() {
  const cart =
    getCart();

  if (!orderSummary) {
    return;
  }

  orderSummary.innerHTML =
    "";

  if (!cart.length) {
    orderSummary.innerHTML = `
      <p style="color: var(--text-muted);">
        Your cart is empty. Add items before checking out.
      </p>
    `;

    if (subtotalAmount) {
      subtotalAmount.textContent =
        formatPrice(0);
    }

    if (grandTotalElement) {
      grandTotalElement.textContent =
        formatPrice(0);
    }

    if (placeOrderButton) {
      placeOrderButton.disabled =
        true;
    }

    return;
  }

  let subtotal = 0;

  cart.forEach(
    (item) => {
      const itemTotals =
        getItemTotals(item);

      subtotal +=
        itemTotals.totalPrice;

      const extras =
        Array.isArray(
          item.extras
        )
          ? item.extras.filter(
              Boolean
            )
          : [];

      const safeName =
        escapeHtml(
          item.name ||
            "Treat Item"
        );

      const safeSize =
        escapeHtml(
          item.size ||
            "Standard"
        );

      const safeExtras =
        extras
          .map(
            (extra) =>
              escapeHtml(
                extra
              )
          )
          .join(", ");

      const summary =
        document.createElement(
          "article"
        );

      summary.className =
        "summary-item";

      summary.innerHTML = `
        <img
          src="${
            item.image ||
            "images/product-placeholder.png"
          }"
          alt="${safeName}"
        />

        <div>
          <strong>
            ${safeName}
          </strong>

          <div class="summary-meta">

            <span>
              ${safeSize}
            </span>

            ${
              safeExtras
                ? `
                  <span>
                    + ${safeExtras}
                  </span>
                `
                : ""
            }

            <span>
              Qty ${itemTotals.quantity}
            </span>

            <span>
              ${formatPrice(
                itemTotals.totalPrice
              )}
            </span>

          </div>
        </div>
      `;

      orderSummary.appendChild(
        summary
      );
    }
  );

  /*
   * IMPORTANT:
   * There is deliberately NO delivery fee.
   */
  if (subtotalAmount) {
    subtotalAmount.textContent =
      formatPrice(
        subtotal
      );
  }

  if (grandTotalElement) {
    grandTotalElement.textContent =
      formatPrice(
        subtotal
      );
  }

  if (placeOrderButton) {
    placeOrderButton.disabled =
      false;
  }
}

// =========================================================
// FORM ERRORS
// =========================================================

function clearErrors() {
  Object.keys(
    errorMap
  ).forEach(
    (id) => {
      const node =
        document.getElementById(
          id
        );

      if (node) {
        node.textContent =
          "";
      }
    }
  );
}

function showError(
  fieldId
) {
  const element =
    document.getElementById(
      fieldId
    );

  if (element) {
    element.textContent =
      errorMap[fieldId];
  }
}

// =========================================================
// VALIDATION
// =========================================================

function validateForm() {
  if (!form) {
    return false;
  }

  clearErrors();

  const fullName =
    form.fullName.value.trim();

  const phoneNumber =
    form.phoneNumber.value.trim();

  const receivingMethod =
    getReceivingMethod();

  const paymentMethod =
    form.paymentMethod.value;

  let isValid =
    true;

  if (!fullName) {
    showError(
      "nameError"
    );

    isValid =
      false;
  }

  if (
    !/^\+?[0-9\s-]{8,}$/.test(
      phoneNumber
    )
  ) {
    showError(
      "phoneError"
    );

    isValid =
      false;
  }

  /*
   * Delivery address is required only when
   * the customer chooses Delivery.
   */
  if (
    receivingMethod ===
    "Delivery"
  ) {
    const streetAddress =
      form.streetAddress?.value.trim();

    if (!streetAddress) {
      showError(
        "addressError"
      );

      isValid =
        false;
    }
  }

  if (!paymentMethod) {
    showError(
      "paymentMethodError"
    );

    isValid =
      false;
  }

  if (
    !paymentConfirmationInput?.checked
  ) {
    showError(
      "paymentConfirmationError"
    );

    isValid =
      false;
  }

  return isValid;
}

// =========================================================
// ORDER PAYLOAD
// =========================================================

function buildOrderPayload(
  cartItems
) {
  const paymentMethod =
    form.paymentMethod.value;

  const receivingMethod =
    getReceivingMethod();

  const isDelivery =
    receivingMethod ===
    "Delivery";

  const subtotal =
    getSubtotal(
      cartItems
    );

  /*
   * Delivery is NEVER charged.
   */
  const deliveryFee =
    0;

  const grandTotal =
    subtotal;

  const nowIso =
    new Date().toISOString();

  const items =
    buildOrderItems(
      cartItems
    );

  return {
    createdAt:
      nowIso,

    lastUpdated:
      nowIso,

    fullName:
      form.fullName.value.trim(),

    customerName:
      form.fullName.value.trim(),

    phoneNumber:
      form.phoneNumber.value.trim(),

    phone:
      form.phoneNumber.value.trim(),

    emailAddress:
      form.emailAddress.value.trim(),

    /*
     * THIS NOW SAVES THE CUSTOMER'S ACTUAL CHOICE.
     */
    deliveryMethod:
      receivingMethod,

    streetAddress:
      isDelivery
        ? form.streetAddress.value.trim()
        : "",

    city:
      isDelivery
        ? form.city.value.trim()
        : "",

    region:
      isDelivery
        ? form.region.value.trim()
        : "",

    address:
      isDelivery
        ? form.streetAddress.value.trim()
        : "",

    landmark:
      isDelivery
        ? form.landmark.value.trim()
        : "",

    deliveryInstructions:
      isDelivery
        ? form.deliveryInstructions.value.trim()
        : "",

    /*
     * Payment
     */
    paymentMethod,

    paymentStatus:
      PAYMENT_STATUS_AWAITING_VERIFICATION,

    paymentConfirmedByCustomer:
      Boolean(
        paymentConfirmationInput?.checked
      ),

    orderNotes:
      form.orderNotes.value.trim(),

    status:
      "Pending",

    statusHistory: [
      {
        status:
          "Pending",

        at:
          nowIso,

        note:
          "Order placed by customer"
      }
    ],

    items,

    productIds:
      items.map(
        (item) =>
          item.productId
      ),

    totals: {
      subtotal,

      deliveryFee: 0,

      discount: 0,

      grandTotal
    },

    subtotal,

    deliveryFee: 0,

    discount: 0,

    grandTotal,

    estimatedDeliveryTime:
      null
  };
}

// =========================================================
// SAVE ORDER
// =========================================================

async function submitOrderToBackend(
  orderPayload
) {
  const createResult =
    await orderService.createOrder({
      ...orderPayload,

      payment:
        orderPayload.paymentMethod,

      status:
        "Pending"
    });

  const orderNumber =
    createResult.orderNumber;

  const trackingToken =
    createResult.trackingToken;

  // =======================================================
  // SAVE TRACKING HISTORY
  // =======================================================

  try {
    const existingHistory =
      JSON.parse(
        localStorage.getItem(
          TRACKING_HISTORY_KEY
        ) || "[]"
      );

    const updatedHistory = [
      {
        trackingToken,

        orderNumber,

        savedAt:
          new Date().toISOString()
      },

      ...existingHistory.filter(
        (entry) =>
          entry?.trackingToken !==
          trackingToken
      )
    ].slice(
      0,
      10
    );

    localStorage.setItem(
      TRACKING_HISTORY_KEY,
      JSON.stringify(
        updatedHistory
      )
    );

    console.log(
      "[Treats By Rich] Order saved to tracking history:",
      orderNumber
    );

  } catch (
    historyError
  ) {
    console.warn(
      "[Treats By Rich] Could not save tracking history:",
      historyError
    );
  }

  // =======================================================
  // CUSTOMER PUSH REGISTRATION
  // =======================================================

  try {
    const notificationResult =
      await notificationService.registerPushDevice({
        role:
          "customer",

        orderNumber
      });

    console.log(
      "[Treats By Rich] Customer notification registration:",
      notificationResult
    );

  } catch (
    notificationError
  ) {
    console.warn(
      "[Treats By Rich] Customer push notification registration failed:",
      notificationError
    );
  }

  return {
    orderNumber,

    trackingToken,

    firestoreId:
      createResult.firestoreId
  };
}

// =========================================================
// SUBMIT ORDER
// =========================================================

async function handleOrderSubmit(
  event
) {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  const cartItems =
    getCart();

  if (!cartItems.length) {
    alert(
      "Your cart is empty."
    );

    return;
  }

  placeOrderButton.disabled =
    true;

  placeOrderButton.textContent =
    "Placing Order...";

  const orderPayload =
    buildOrderPayload(
      cartItems
    );

  let createdOrderNumber =
    "";

  let createdTrackingToken =
    "";

  try {
    const result =
      await submitOrderToBackend(
        orderPayload
      );

    createdOrderNumber =
      result.orderNumber;

    createdTrackingToken =
      result.trackingToken;

  } catch (error) {
    placeOrderButton.disabled =
      false;

    placeOrderButton.textContent =
      "Place Order";

    console.error(
      "[Treats By Rich] Order placement failed:",
      error
    );

    alert(
      error?.message ||
        "Could not place your order right now. Please try again."
    );

    return;
  }

  // =======================================================
  // CLEAR CART ONLY AFTER SUCCESS
  // =======================================================

  if (
    window.TBRCartAPI?.clearCart
  ) {
    window.TBRCartAPI.clearCart();

  } else {
    localStorage.removeItem(
      CHECKOUT_CONFIG.cartStorageKey
    );
  }

  // =======================================================
  // REDIRECT
  // =======================================================

  window.location.href =
    `order-success.html?order=${encodeURIComponent(
      createdOrderNumber
    )}&tracking=${encodeURIComponent(
      createdTrackingToken
    )}`;
}

// =========================================================
// PAYMENT DETAILS
// =========================================================

function showPaymentDetails(
  paymentMethod
) {
  const isMobileMoney =
    paymentMethod ===
    "Mobile Money";

  const isBankTransfer =
    paymentMethod ===
    "Bank Transfer";

  if (mobileMoneyFields) {
    mobileMoneyFields.style.display =
      isMobileMoney
        ? "block"
        : "none";

    mobileMoneyFields.setAttribute(
      "aria-hidden",
      isMobileMoney
        ? "false"
        : "true"
    );
  }

  if (bankTransferFields) {
    bankTransferFields.style.display =
      isBankTransfer
        ? "block"
        : "none";

    bankTransferFields.setAttribute(
      "aria-hidden",
      isBankTransfer
        ? "false"
        : "true"
    );
  }

  if (
    paymentConfirmationSection
  ) {
    const showConfirmation =
      isMobileMoney ||
      isBankTransfer;

    paymentConfirmationSection.style.display =
      showConfirmation
        ? "block"
        : "none";

    paymentConfirmationSection.setAttribute(
      "aria-hidden",
      showConfirmation
        ? "false"
        : "true"
    );
  }
}

// =========================================================
// COPY PAYMENT DETAILS
// =========================================================

async function handleCopyClick(
  button
) {
  const value =
    button.dataset.copyValue ||
    "";

  if (!value) {
    return;
  }

  try {
    if (
      navigator.clipboard?.writeText
    ) {
      await navigator.clipboard.writeText(
        value
      );

    } else {
      const tempInput =
        document.createElement(
          "textarea"
        );

      tempInput.value =
        value;

      tempInput.style.position =
        "fixed";

      tempInput.style.opacity =
        "0";

      document.body.appendChild(
        tempInput
      );

      tempInput.focus();

      tempInput.select();

      document.execCommand(
        "copy"
      );

      document.body.removeChild(
        tempInput
      );
    }

    const originalLabel =
      button.textContent;

    button.textContent =
      "Copied!";

    button.classList.add(
      "is-copied"
    );

    window.setTimeout(
      () => {
        button.textContent =
          originalLabel;

        button.classList.remove(
          "is-copied"
        );
      },
      1500
    );

  } catch (error) {
    console.warn(
      "[Treats By Rich] Copy failed:",
      error
    );

    button.textContent =
      "Copy failed";

    window.setTimeout(
      () => {
        button.textContent =
          "Copy";
      },
      1500
    );
  }
}

// =========================================================
// RADIO BEHAVIOR
// =========================================================

function updateRadioCardStates(
  selector
) {
  form
    ?.querySelectorAll(
      selector
    )
    .forEach(
      (radio) => {
        radio
          .closest(
            ".radio-card"
          )
          ?.classList.toggle(
            "checked",
            radio.checked
          );
      }
    );
}

function attachOptionBehavior() {
  if (!form) {
    return;
  }

  // =======================================================
  // RECEIVING METHOD
  // =======================================================

  form
    .querySelectorAll(
      'input[name="deliveryMethod"]'
    )
    .forEach(
      (radio) => {
        radio.addEventListener(
          "change",
          () => {
            updateRadioCardStates(
              'input[name="deliveryMethod"]'
            );

            updateDeliveryFields();

            const addressError =
              document.getElementById(
                "addressError"
              );

            if (
              addressError
            ) {
              addressError.textContent =
                "";
            }
          }
        );
      }
    );

  // =======================================================
  // PAYMENT METHODS
  // =======================================================

  form
    .querySelectorAll(
      'input[name="paymentMethod"]'
    )
    .forEach(
      (radio) => {
        radio.addEventListener(
          "change",
          () => {
            updateRadioCardStates(
              'input[name="paymentMethod"]'
            );

            showPaymentDetails(
              radio.value
            );

            const methodErrorNode =
              document.getElementById(
                "paymentMethodError"
              );

            if (
              methodErrorNode
            ) {
              methodErrorNode.textContent =
                "";
            }

            const confirmErrorNode =
              document.getElementById(
                "paymentConfirmationError"
              );

            if (
              confirmErrorNode
            ) {
              confirmErrorNode.textContent =
                "";
            }
          }
        );
      }
    );

  // =======================================================
  // PAYMENT CONFIRMATION
  // =======================================================

  paymentConfirmationInput?.addEventListener(
    "change",
    () => {
      const errorNode =
        document.getElementById(
          "paymentConfirmationError"
        );

      if (
        errorNode &&
        paymentConfirmationInput.checked
      ) {
        errorNode.textContent =
          "";
      }
    }
  );

  // =======================================================
  // COPY BUTTONS
  // =======================================================

  form
    .querySelectorAll(
      ".payment-copy-btn"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            handleCopyClick(
              button
            )
        );
      }
    );

  // =======================================================
  // SUBMIT
  // =======================================================

  form.addEventListener(
    "submit",
    handleOrderSubmit
  );
}

// =========================================================
// INIT
// =========================================================

async function init() {
  if (!form) {
    return;
  }

  // Load Firebase settings first.
  await loadPaymentSettings();

  // Apply saved payment information.
  applyPaymentSettings();

  // Set initial receiving method.
  updateRadioCardStates(
    'input[name="deliveryMethod"]'
  );

  updateDeliveryFields();

  // Set initial payment method.
  const selectedPayment =
    form.querySelector(
      'input[name="paymentMethod"]:checked'
    )?.value;

  showPaymentDetails(
    selectedPayment
  );

  attachOptionBehavior();

  renderSummary();

  console.log(
    "[Treats By Rich] Checkout initialized."
  );
}

init();