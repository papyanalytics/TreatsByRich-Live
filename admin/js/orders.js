// Treats By Rich Admin — Orders page controller.
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { requireAuth, initLogoutButtons } from "./auth.js";
import { initSidebar, initTopbar, renderNotifications, showToast, initModal } from "./dashboard.js";
import { db, configOk } from "./firebase-config.js";
import { createOrderService } from "../../services/orderService.js";

// Legacy localStorage key, kept only to migrate any records saved before Firestore was connected.
const LEGACY_PAYMENT_METHODS_KEY = "treatsByRichPaymentMethods";
// Base methods already live on the customer checkout; admin-added ones are appended to these.
const BASE_PAYMENT_METHODS = ["Mobile Money", "Bank Transfer"];
// Payment types that need real account/number details to be usable.
const PAYMENT_TYPES_REQUIRING_NUMBER = ["Mobile Money", "Bank Transfer"];

let currentPaymentMethods = [];

// Real customer orders, kept in sync via the shared orderService (same Firestore project/collection as checkout.js).
const orderService = createOrderService();
let ORDERS = [];

let activeStatus = "all";
let searchTerm = "";
let paymentFilter = "all";

// ---- Payment methods Firestore data layer ----
function subscribePaymentMethods(onData) {
  if (!configOk || !db) {
    onData([]);
    return () => {};
  }
  const q = query(collection(db, "paymentMethods"), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
    () => {
      showToast("Could not load payment methods from the database.", "error");
      onData([]);
    }
  );
}

async function createPaymentMethodDoc(payload) {
  if (!configOk || !db) throw new Error("Firestore is not connected. The payment method was not saved.");
  await addDoc(collection(db, "paymentMethods"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

/** One-time upload of any payment methods saved locally before Firestore was connected. */
async function migrateLegacyPaymentMethods() {
  if (!configOk || !db) return;
  let legacy = [];
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_PAYMENT_METHODS_KEY) || "[]");
  } catch (error) {
    legacy = [];
  }
  if (!Array.isArray(legacy) || !legacy.length) return;

  for (const item of legacy) {
    const { id, ...rest } = item;
    try {
      await createPaymentMethodDoc(rest);
    } catch (error) {
      return;
    }
  }
  localStorage.removeItem(LEGACY_PAYMENT_METHODS_KEY);
}

function renderPaymentMethodOptions() {
  const select = document.getElementById("orderPaymentFilter");
  if (!select) return;
  const previousValue = select.value;
  const customMethods = currentPaymentMethods.filter((method) => method.active).map((method) => method.name);

  select.innerHTML = "";
  const allOption = new Option("All Payment Methods", "all");
  select.appendChild(allOption);
  [...BASE_PAYMENT_METHODS, ...customMethods].forEach((name) => {
    select.appendChild(new Option(name, name));
  });
  select.value = [...select.options].some((option) => option.value === previousValue) ? previousValue : "all";
}


function getFilteredOrders() {
  return ORDERS.filter((order) => {
    const matchesStatus = activeStatus === "all" || order.status === activeStatus;
    const matchesPayment = paymentFilter === "all" || order.paymentMethod === paymentFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || order.id.toLowerCase().includes(term) || order.customerName.toLowerCase().includes(term);
    return matchesStatus && matchesPayment && matchesSearch;
  });
}

function renderTabCounts() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const status = btn.dataset.status;
    const count = status === "all" ? ORDERS.length : ORDERS.filter((order) => order.status === status).length;
    const countEl = btn.querySelector(".tab-count");
    if (countEl) countEl.textContent = String(count);
  });
}

function formatOrderDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function renderOrdersList() {
  const orders = getFilteredOrders();
  const tableWrap = document.getElementById("ordersTable");
  const emptyState = document.getElementById("ordersEmpty");
  const emptyTitle = document.getElementById("ordersEmptyTitle");
  const tbody = document.getElementById("ordersBody");
  if (!tableWrap || !emptyState || !tbody) return;

  if (!orders.length) {
    tableWrap.style.display = "none";
    emptyState.style.display = "grid";
    if (emptyTitle) {
      emptyTitle.textContent = activeStatus === "all" ? "No orders yet" : `No ${activeStatus.toLowerCase()} orders`;
    }
    return;
  }

  tableWrap.style.display = "block";
  emptyState.style.display = "none";
  tbody.innerHTML = orders
    .map(
      (order) => `
      <tr>
        <td>${order.id}</td>
        <td>${order.customerName}</td>
        <td>${(order.items || []).length} item${(order.items || []).length === 1 ? "" : "s"}</td>
        <td>GH₵${Number(order.grandTotal || 0).toFixed(2)}</td>
        <td>${order.paymentMethod}</td>
        <td>${order.status}</td>
        <td>${formatOrderDate(order.createdAt)}</td>
        <td><a class="btn btn-ghost" href="order-details.html?order=${encodeURIComponent(order.id)}">View</a></td>
      </tr>`
    )
    .join("");
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeStatus = btn.dataset.status;
      renderOrdersList();
    });
  });
}

function initFilters() {
  document.getElementById("orderSearch")?.addEventListener("input", (event) => {
    searchTerm = event.target.value.trim();
    renderOrdersList();
  });

  document.getElementById("orderPaymentFilter")?.addEventListener("change", (event) => {
    paymentFilter = event.target.value;
    renderOrdersList();
  });
}

function initPaymentMethodModal() {
  const modal = initModal("paymentMethodModal");
  const form = document.getElementById("paymentMethodForm");
  const errorBox = document.getElementById("paymentMethodError");
  const nameInput = document.getElementById("paymentMethodName");
  const typeInput = document.getElementById("paymentMethodType");
  const numberInput = document.getElementById("paymentMethodNumber");
  const accountNameInput = document.getElementById("paymentMethodAccountName");
  const instructionsInput = document.getElementById("paymentMethodInstructions");
  const activeInput = document.getElementById("paymentMethodActive");

  function resetForm() {
    form.reset();
    errorBox.classList.remove("is-visible");
  }

  document.getElementById("addPaymentMethodBtn")?.addEventListener("click", () => {
    resetForm();
    modal.open();
    nameInput.focus();
  });

  typeInput?.addEventListener("change", () => {
    errorBox.classList.remove("is-visible");
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const type = typeInput.value;
    const number = numberInput.value.trim();
    const numberRequired = PAYMENT_TYPES_REQUIRING_NUMBER.includes(type);

    if (!name || !type) {
      errorBox.textContent = "Payment method name and type are required.";
      errorBox.classList.add("is-visible");
      return;
    }

    if (numberRequired && !number) {
      errorBox.textContent = `${type} needs an account/number so customers know where to send payment.`;
      errorBox.classList.add("is-visible");
      return;
    }

    try {
      await createPaymentMethodDoc({
        name,
        type,
        number,
        accountName: accountNameInput.value.trim(),
        instructions: instructionsInput.value.trim(),
        active: activeInput.checked
      });
      modal.close();
      showToast("Payment method saved.");
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.add("is-visible");
    }
  });
}

requireAuth(() => {
  initSidebar();
  initTopbar();
  initLogoutButtons();
  renderNotifications([]);
  initTabs();
  initFilters();
  initPaymentMethodModal();
  renderTabCounts();
  renderOrdersList();
  migrateLegacyPaymentMethods().finally(() => {
    subscribePaymentMethods((methods) => {
      currentPaymentMethods = methods;
      renderPaymentMethodOptions();
    });
  });
  orderService.subscribeOrders((orders) => {
    ORDERS = orders;
    renderTabCounts();
    renderOrdersList();
  }, () => {
    showToast("Could not load orders from the database.", "error");
  });
});
