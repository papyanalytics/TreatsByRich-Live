// Treats By Rich Admin — Reviews page controller.
import { requireAuth, initLogoutButtons } from "./auth.js";
import { initSidebar, initTopbar, renderNotifications, showToast } from "./dashboard.js";

const REVIEWS_KEY = "treatsByRichReviews";

// ---- Data layer (localStorage today, swappable for Firestore later) ----
function loadReviews() {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function updateReviewStatus(id, status) {
  const reviews = loadReviews().map((review) => (review.id === id ? { ...review, status } : review));
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
  return reviews;
}

function groupReviewsByStatus() {
  const reviews = loadReviews();
  return {
    pending: reviews.filter((review) => (review.status || "pending") === "pending"),
    approved: reviews.filter((review) => review.status === "approved"),
    rejected: reviews.filter((review) => review.status === "rejected")
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function renderReviewCard(review) {
  const stars = "★".repeat(Math.max(0, Math.min(5, review.rating || 0))) + "☆".repeat(5 - Math.max(0, Math.min(5, review.rating || 0)));
  const actions = review.status === "pending" || !review.status
    ? `
      <div class="review-actions">
        <button type="button" class="btn btn-approve approve-review-btn" data-id="${review.id}">Approve</button>
        <button type="button" class="btn btn-reject reject-review-btn" data-id="${review.id}">Reject</button>
      </div>`
    : "";

  return `
    <article class="review-card">
      <div class="review-card-header">
        <strong>${escapeHtml(review.customerName || "Guest")}</strong>
        <span class="review-stars">${stars}</span>
      </div>
      <p>${escapeHtml(review.text || "")}</p>
      <span style="color: var(--muted); font-size: 0.85rem;">Product: ${escapeHtml(review.product || "—")}</span>
      ${actions}
    </article>`;
}

function renderReviewsPanel(tab, reviews) {
  const grid = document.getElementById(`${tab}ReviewsGrid`);
  const emptyState = document.getElementById(`${tab}ReviewsEmpty`);
  if (!grid || !emptyState) return;

  if (!reviews.length) {
    grid.style.display = "none";
    emptyState.style.display = "grid";
    return;
  }

  grid.style.display = "grid";
  emptyState.style.display = "none";
  grid.innerHTML = reviews.map(renderReviewCard).join("");
}

function renderAllReviews() {
  const grouped = groupReviewsByStatus();
  renderReviewsPanel("pending", grouped.pending);
  renderReviewsPanel("approved", grouped.approved);
  renderReviewsPanel("rejected", grouped.rejected);

  document.querySelectorAll("[data-review-tab]").forEach((btn) => {
    const tab = btn.dataset.reviewTab;
    const countEl = btn.querySelector(".tab-count");
    if (countEl) countEl.textContent = String(grouped[tab]?.length || 0);
  });
}

function initReviewTabs() {
  document.querySelectorAll("[data-review-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-review-tab]").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll("[data-review-panel]").forEach((panel) => panel.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`[data-review-panel="${btn.dataset.reviewTab}"]`)?.classList.add("active");
    });
  });
}

function initModeration() {
  document.querySelector(".card-body")?.addEventListener("click", (event) => {
    const approveBtn = event.target.closest(".approve-review-btn");
    const rejectBtn = event.target.closest(".reject-review-btn");

    if (approveBtn) {
      updateReviewStatus(approveBtn.dataset.id, "approved");
      renderAllReviews();
      showToast("Review approved.");
    }

    if (rejectBtn) {
      updateReviewStatus(rejectBtn.dataset.id, "rejected");
      renderAllReviews();
      showToast("Review rejected.");
    }
  });
}

requireAuth(() => {
  initSidebar();
  initTopbar();
  initLogoutButtons();
  renderNotifications([]);
  initReviewTabs();
  initModeration();
  renderAllReviews();
});
