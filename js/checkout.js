import { createOrderService } from "../services/orderService.js";
import { createCustomerService } from "../services/customerService.js";

// Checkout page behavior for Treats By Rich.
// Order submission is centralized in submitOrderToBackend() below so a future
// backend/API integration can replace the persistence call without touching the UI flow.
const CHECKOUT_CONFIG = {
  orderPrefix: 'TBR',
  cartStorageKey: window.APP_CONFIG?.cartStorageKey || 'tbrCart'
};

// Customer declares payment was made; the backend/admin team verifies it manually later.
const PAYMENT_STATUS_AWAITING_VERIFICATION = 'Awaiting manual payment verification';

const orderService = createOrderService();
const customerService = createCustomerService();

const form = document.getElementById('checkoutForm');
const deliveryFields = document.getElementById('deliveryFields');
const mobileMoneyFields = document.getElementById('mobileMoneyFields');
const bankTransferFields = document.getElementById('bankTransferFields');
const paymentConfirmationSection = document.getElementById('paymentConfirmationSection');
const paymentConfirmationInput = document.getElementById('paymentConfirmation');
const orderSummary = document.getElementById('orderSummary');
const subtotalAmount = document.getElementById('subtotalAmount');
const deliveryFeeElement = document.getElementById('deliveryFee');
const grandTotalElement = document.getElementById('grandTotal');
const placeOrderButton = document.getElementById('placeOrderButton');
const applyPromoButton = document.getElementById('applyPromo');

const errorMap = {
  nameError: 'Please enter your full name.',
  phoneError: 'Please enter a valid phone number.',
  addressError: 'Please complete street address, city, and region for delivery.',
  paymentMethodError: 'Please select a payment method.',
  paymentConfirmationError: 'Please confirm that you have completed this payment.'
};

const DELIVERY_FEE = 30;

function getCart() {
  const raw = localStorage.getItem(CHECKOUT_CONFIG.cartStorageKey);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getItemTotals(item) {
  const quantity = Math.max(1, Number(item.quantity || 1));
  const unitPrice = Number(item.unitPrice || item.price || 0);
  const totalPrice = Number(item.totalPrice || unitPrice * quantity);
  return { quantity, unitPrice, totalPrice };
}

function buildOrderItems(cartItems) {
  return cartItems.map((item, index) => {
    const { quantity, unitPrice, totalPrice } = getItemTotals(item);
    return {
      productId: item.productId || item.id || `cart-item-${index + 1}`,
      productName: item.name || 'Treat Item',
      size: item.size || 'Standard',
      quantity,
      extras: Array.isArray(item.extras) ? item.extras.filter(Boolean) : [],
      price: unitPrice,
      unitPrice,
      totalPrice
    };
  });
}

function estimateDeliveryIso(minutes = 45) {
  return new Date(Date.now() + (minutes * 60 * 1000)).toISOString();
}

function getSubtotal(cartItems) {
  return cartItems.reduce((sum, item) => sum + getItemTotals(item).totalPrice, 0);
}

function formatPrice(value) {
  return `GH₵${Number(value).toFixed(2)}`;
}

function renderSummary() {
  const cart = getCart();
  orderSummary.innerHTML = '';
  if (!cart.length) {
    orderSummary.innerHTML = '<p style="color: var(--text-muted);">Your cart is empty. Add items before checking out.</p>';
    subtotalAmount.textContent = formatPrice(0);
    deliveryFeeElement.textContent = formatPrice(0);
    grandTotalElement.textContent = formatPrice(0);
    placeOrderButton.disabled = true;
    return;
  }
  let subtotal = 0;
  cart.forEach((item) => {
    const itemTotals = getItemTotals(item);
    subtotal += itemTotals.totalPrice;
    const extras = Array.isArray(item.extras) ? item.extras.filter(Boolean) : [];
    const safeName = escapeHtml(item.name || 'Treat Item');
    const safeSize = escapeHtml(item.size || 'Standard');
    const safeExtras = extras.map((extra) => escapeHtml(extra)).join(', ');
    const summary = document.createElement('article');
    summary.className = 'summary-item';
    summary.innerHTML = `
      <img src="${item.image || 'images/product-placeholder.png'}" alt="${safeName}" />
      <div>
        <strong>${safeName}</strong>
        <div class="summary-meta">
          <span>${safeSize}</span>
          ${safeExtras ? `<span>+ ${safeExtras}</span>` : ''}
          <span>Qty ${itemTotals.quantity}</span>
          <span>${formatPrice(itemTotals.totalPrice)}</span>
        </div>
      </div>
    `;
    orderSummary.appendChild(summary);
  });
  const selectedDelivery = form.querySelector('input[name="deliveryMethod"]:checked')?.value;
  const deliveryFee = selectedDelivery === 'Delivery' ? DELIVERY_FEE : 0;
  subtotalAmount.textContent = formatPrice(subtotal);
  deliveryFeeElement.textContent = formatPrice(deliveryFee);
  grandTotalElement.textContent = formatPrice(subtotal + deliveryFee);
  placeOrderButton.disabled = false;
}

function clearErrors() {
  Object.keys(errorMap).forEach((id) => {
    const errorNode = document.getElementById(id);
    if (errorNode) errorNode.textContent = '';
  });
  ['fullName', 'phoneNumber', 'streetAddress', 'city', 'region'].forEach((fieldName) => {
    if (form[fieldName]) {
      form[fieldName].setAttribute('aria-invalid', 'false');
    }
  });
}

function showError(fieldId, inputName) {
  const element = document.getElementById(fieldId);
  if (element) element.textContent = errorMap[fieldId];
  if (inputName && form[inputName]) {
    form[inputName].setAttribute('aria-invalid', 'true');
  }
}

function validateForm() {
  const fullName = form.fullName.value.trim();
  const phoneNumber = form.phoneNumber.value.trim();
  const deliveryMethod = form.deliveryMethod.value;
  const streetAddress = form.streetAddress.value.trim();
  const paymentMethod = form.paymentMethod.value;
  clearErrors();

  let isValid = true;
  if (!fullName) {
    showError('nameError', 'fullName');
    isValid = false;
  }
  if (!/^\+?[0-9\s-]{8,}$/.test(phoneNumber)) {
    showError('phoneError', 'phoneNumber');
    isValid = false;
  }
  if (deliveryMethod === 'Delivery') {
    const city = form.city.value.trim();
    const region = form.region.value.trim();
    if (!streetAddress) {
      showError('addressError', 'streetAddress');
      isValid = false;
    }
    if (!city) {
      showError('addressError', 'city');
      isValid = false;
    }
    if (!region) {
      showError('addressError', 'region');
      isValid = false;
    }
  }
  if (!paymentMethod) {
    showError('paymentMethodError');
    isValid = false;
  } else if (!paymentConfirmationInput?.checked) {
    showError('paymentConfirmationError');
    isValid = false;
  }
  return isValid;
}

// Builds the complete order record. This is the data contract the future
// backend/API is expected to receive for every placed order.
function buildOrderPayload(cartItems) {
  const deliveryMethod = form.deliveryMethod.value;
  const paymentMethod = form.paymentMethod.value;
  const subtotal = getSubtotal(cartItems);
  const deliveryFee = deliveryMethod === 'Delivery' ? DELIVERY_FEE : 0;
  const grandTotal = subtotal + deliveryFee;
  const nowIso = new Date().toISOString();
  const items = buildOrderItems(cartItems);

  return {
    createdAt: nowIso,
    lastUpdated: nowIso,
    fullName: form.fullName.value.trim(),
    customerName: form.fullName.value.trim(),
    phoneNumber: form.phoneNumber.value.trim(),
    phone: form.phoneNumber.value.trim(),
    emailAddress: form.emailAddress.value.trim(),
    deliveryMethod,
    streetAddress: form.streetAddress.value.trim(),
    city: form.city.value.trim(),
    region: form.region.value.trim(),
    address: [form.streetAddress.value.trim(), form.city.value.trim(), form.region.value.trim()].filter(Boolean).join(', '),
    landmark: form.landmark.value.trim(),
    deliveryInstructions: form.deliveryInstructions.value.trim(),
    paymentMethod,
    // The customer is only declaring payment was made; nothing is auto-verified.
    paymentStatus: PAYMENT_STATUS_AWAITING_VERIFICATION,
    paymentConfirmedByCustomer: Boolean(paymentConfirmationInput?.checked),
    promoCode: form.promoCode?.value?.trim() || '',
    orderNotes: form.orderNotes.value.trim(),
    status: 'Pending',
    statusHistory: [{ status: 'Pending', at: nowIso, note: 'Order placed by customer' }],
    items,
    productIds: items.map((item) => item.productId),
    totals: { subtotal, deliveryFee, discount: 0, grandTotal },
    subtotal,
    deliveryFee,
    discount: 0,
    grandTotal,
    estimatedDeliveryTime: estimateDeliveryIso(45)
  };
}

// Single integration point for order persistence. Today this saves the order
// through the existing order/customer data services. When the dedicated
// Treats By Rich backend/API is ready, only this function needs to change
// to call it instead — the rest of the checkout UI stays the same.
async function submitOrderToBackend(orderPayload) {
  const createResult = await orderService.createOrder({
    ...orderPayload,
    payment: orderPayload.paymentMethod,
    status: 'Pending'
  });
  const orderNumber = createResult.orderNumber;

  await customerService.upsertCustomerFromOrder({
    ...orderPayload,
    orderNumber,
    orderId: orderNumber
  });

  return { orderNumber };
}

async function handleOrderSubmit(event) {
  event.preventDefault();
  if (!validateForm()) {
    return;
  }
  const cartItems = getCart();
  if (!cartItems.length) {
    alert('Your cart is empty.');
    return;
  }

  placeOrderButton.classList.add('is-loading');
  placeOrderButton.disabled = true;
  placeOrderButton.textContent = 'Placing Order...';

  const orderPayload = buildOrderPayload(cartItems);

  let createdOrderNumber = '';
  try {
    const result = await submitOrderToBackend(orderPayload);
    createdOrderNumber = result.orderNumber;
  } catch (error) {
    placeOrderButton.classList.remove('is-loading');
    placeOrderButton.disabled = false;
    placeOrderButton.textContent = 'Place Order';
    alert(error?.message || 'Could not place order right now. Please try again.');
    return;
  }

  if (window.TBRCartAPI?.clearCart) {
    window.TBRCartAPI.clearCart();
  } else {
    localStorage.removeItem(CHECKOUT_CONFIG.cartStorageKey);
  }
  window.location.href = `order-success.html?order=${encodeURIComponent(createdOrderNumber)}`;
}

function showPaymentDetails(paymentMethod) {
  const isMobileMoney = paymentMethod === 'Mobile Money';
  const isBankTransfer = paymentMethod === 'Bank Transfer';
  if (mobileMoneyFields) {
    mobileMoneyFields.style.display = isMobileMoney ? 'block' : 'none';
    mobileMoneyFields.setAttribute('aria-hidden', isMobileMoney ? 'false' : 'true');
  }
  if (bankTransferFields) {
    bankTransferFields.style.display = isBankTransfer ? 'block' : 'none';
    bankTransferFields.setAttribute('aria-hidden', isBankTransfer ? 'false' : 'true');
  }
  if (paymentConfirmationSection) {
    const showConfirmation = isMobileMoney || isBankTransfer;
    paymentConfirmationSection.style.display = showConfirmation ? 'block' : 'none';
    paymentConfirmationSection.setAttribute('aria-hidden', showConfirmation ? 'false' : 'true');
  }
}

async function handleCopyClick(button) {
  const value = button.dataset.copyValue || '';
  if (!value) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const tempInput = document.createElement('textarea');
      tempInput.value = value;
      tempInput.style.position = 'fixed';
      tempInput.style.opacity = '0';
      document.body.appendChild(tempInput);
      tempInput.focus();
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }
    const originalLabel = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('is-copied');
    window.setTimeout(() => {
      button.textContent = originalLabel;
      button.classList.remove('is-copied');
    }, 1500);
  } catch (err) {
    button.textContent = 'Copy failed';
    window.setTimeout(() => {
      button.textContent = 'Copy';
    }, 1500);
  }
}

function attachOptionBehavior() {
  const deliveryRadios = Array.from(form.querySelectorAll('input[name="deliveryMethod"]'));
  deliveryRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.value === 'Delivery') {
        deliveryFields.style.display = 'block';
        deliveryFields.setAttribute('aria-hidden', 'false');
      } else {
        deliveryFields.style.display = 'none';
        deliveryFields.setAttribute('aria-hidden', 'true');
      }
      renderSummary();
    });
  });
  form.addEventListener('submit', handleOrderSubmit);
  Array.from(form.querySelectorAll('input[name="paymentMethod"]')).forEach((radio) => {
    const parent = radio.closest('.radio-card');
    if (radio.checked && parent) parent.classList.add('checked');
    radio.addEventListener('change', () => {
      document.querySelectorAll('input[name="paymentMethod"]').forEach((option) => {
        option.closest('.radio-card')?.classList.remove('checked');
      });
      radio.closest('.radio-card')?.classList.add('checked');
      showPaymentDetails(radio.value);
      const methodErrorNode = document.getElementById('paymentMethodError');
      if (methodErrorNode) methodErrorNode.textContent = '';
      const confirmErrorNode = document.getElementById('paymentConfirmationError');
      if (confirmErrorNode) confirmErrorNode.textContent = '';
    });
  });
  paymentConfirmationInput?.addEventListener('change', () => {
    const errorNode = document.getElementById('paymentConfirmationError');
    if (errorNode && paymentConfirmationInput.checked) errorNode.textContent = '';
  });
  Array.from(form.querySelectorAll('.payment-copy-btn')).forEach((button) => {
    button.addEventListener('click', () => handleCopyClick(button));
  });
  Array.from(form.querySelectorAll('input[name="deliveryMethod"]')).forEach((radio) => {
    const parent = radio.closest('.radio-card');
    if (radio.checked && parent) parent.classList.add('checked');
    radio.addEventListener('change', () => {
      document.querySelectorAll('input[name="deliveryMethod"]').forEach((option) => {
        option.closest('.radio-card')?.classList.remove('checked');
      });
      radio.closest('.radio-card')?.classList.add('checked');
    });
  });
  applyPromoButton?.addEventListener('click', () => {
    const promoInput = document.getElementById('promoCode');
    if (!promoInput) return;
    promoInput.classList.add('is-valid');
    applyPromoButton.textContent = 'Applied';
    window.setTimeout(() => {
      applyPromoButton.textContent = 'Apply';
    }, 900);
  });
}

function init() {
  if (!form) return;
  const selectedDelivery = form.querySelector('input[name="deliveryMethod"]:checked')?.value;
  deliveryFields.style.display = selectedDelivery === 'Delivery' ? 'block' : 'none';
  deliveryFields.setAttribute('aria-hidden', selectedDelivery === 'Delivery' ? 'false' : 'true');
  const selectedPayment = form.querySelector('input[name="paymentMethod"]:checked')?.value;
  showPaymentDetails(selectedPayment);
  attachOptionBehavior();
  renderSummary();
}

init();