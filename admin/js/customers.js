// Treats By Rich Admin — Customers page controller.
import { requireAuth, initLogoutButtons } from "./auth.js";
import { initSidebar, initTopbar, renderNotifications } from "./dashboard.js";

// Empty until Firestore customer data is connected in the next phase.
const CUSTOMERS = [];

function renderCustomersList(searchTerm = "") {
  const tableWrap = document.getElementById("customersTable");
  const emptyState = document.getElementById("customersEmpty");
  const tbody = document.getElementById("customersBody");
  if (!tableWrap || !emptyState || !tbody) return;

  const term = searchTerm.trim().toLowerCase();
  const filtered = CUSTOMERS.filter(
    (customer) => !term || customer.name.toLowerCase().includes(term) || customer.phone.includes(term)
  );

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
        <td>${customer.name}</td>
        <td>${customer.phone}</td>
        <td>${customer.email}</td>
        <td>${customer.orders}</td>
        <td>${customer.totalSpent}</td>
        <td>${customer.lastOrder}</td>
        <td><button class="btn btn-ghost" type="button">View</button></td>
      </tr>`
    )
    .join("");
}

requireAuth(() => {
  initSidebar();
  initTopbar();
  initLogoutButtons();
  renderNotifications([]);
  document.getElementById("customerSearch")?.addEventListener("input", (event) => {
    renderCustomersList(event.target.value);
  });
  renderCustomersList();
});
