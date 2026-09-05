// Treats By Rich Admin — Customers page controller.
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { requireAuth, initLogoutButtons } from "./auth.js";
import { initSidebar, initTopbar, renderNotifications } from "./dashboard.js";

let CUSTOMERS = [];

function formatMoney(value) {
  const amount = Number(value || 0);
  return `GH₵${amount.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";

  try {
    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "—";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeCustomer(docSnapshot) {
  const data = docSnapshot.data() || {};

  return {
    id: docSnapshot.id,
    name:
      data.name ||
      data.fullName ||
      data.customerName ||
      "Unknown Customer",

    phone:
      data.phone ||
      data.phoneNumber ||
      "—",

    email:
      data.email ||
      data.emailAddress ||
      "—",

    orders: Number(
      data.orders ??
      data.orderCount ??
      data.totalOrders ??
      0
    ),

    totalSpent: Number(
      data.totalSpent ??
      data.lifetimeSpend ??
      data.totalSpentAmount ??
      0
    ),

    lastOrder:
      data.lastOrder ||
      data.lastOrderDate ||
      data.lastOrderAt ||
      data.updatedAt ||
      data.createdAt ||
      null
  };
}

function renderCustomersList(searchTerm = "") {
  const tableWrap = document.getElementById("customersTable");
  const emptyState = document.getElementById("customersEmpty");
  const tbody = document.getElementById("customersBody");

  if (!tableWrap || !emptyState || !tbody) return;

  const term = searchTerm.trim().toLowerCase();

  const filtered = CUSTOMERS.filter((customer) => {
    const name = String(customer.name || "").toLowerCase();
    const phone = String(customer.phone || "").toLowerCase();

    return !term || name.includes(term) || phone.includes(term);
  });

  if (!filtered.length) {
    tableWrap.style.display = "none";
    emptyState.style.display = "grid";
    return;
  }

  tableWrap.style.display = "block";
  emptyState.style.display = "none";

  tbody.innerHTML = filtered
    .map(
      (customer) => `
        <tr>
          <td>${escapeHtml(customer.name)}</td>
          <td>${escapeHtml(customer.phone)}</td>
          <td>${escapeHtml(customer.email)}</td>
          <td>${customer.orders}</td>
          <td>${formatMoney(customer.totalSpent)}</td>
          <td>${formatDate(customer.lastOrder)}</td>
          <td>
            <button
              class="btn btn-ghost"
              type="button"
              data-customer-id="${escapeHtml(customer.id)}"
            >
              View
            </button>
          </td>
        </tr>
      `
    )
    .join("");
}

function subscribeCustomers() {
  const customersQuery = query(
    collection(db, "customers"),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    customersQuery,
    (snapshot) => {
      CUSTOMERS = snapshot.docs.map(normalizeCustomer);

      console.log(
        `[Treats By Rich] Loaded ${CUSTOMERS.length} customer record(s).`
      );

      renderCustomersList(
        document.getElementById("customerSearch")?.value || ""
      );
    },
    (error) => {
      console.error(
        "[Treats By Rich] Failed to load customers:",
        error
      );

      CUSTOMERS = [];
      renderCustomersList(
        document.getElementById("customerSearch")?.value || ""
      );
    }
  );
}

requireAuth(() => {
  initSidebar();
  initTopbar();
  initLogoutButtons();
  renderNotifications([]);

  document
    .getElementById("customerSearch")
    ?.addEventListener("input", (event) => {
      renderCustomersList(event.target.value);
    });

  subscribeCustomers();
});