// Treats By Rich Admin — Reviews page controller.
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import { db } from "./firebase-config.js";
import { requireAuth, initLogoutButtons } from "./auth.js";
import {
  initSidebar,
  initTopbar,
  renderNotifications,
  showToast
} from "./dashboard.js";

let REVIEWS = [];
let activeTab = "pending";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function normalizeReview(snapshot) {
  const data = snapshot.data() || {};

  return {
    id: snapshot.id,

    name:
      data.name ||
      data.customerName ||
      data.fullName ||
      "Guest",

    rating: Math.max(
      0,
      Math.min(5, Number(data.rating || 0))
    ),

    text:
      data.message ||
      data.text ||
      data.review ||
      "",

    product:
      data.product ||
      data.productName ||
      data.order ||
      "—",

    status: data.status || "pending",

    createdAt: data.createdAt || null
  };
}

function renderReviewCard(review) {
  const rating = Math.max(
    0,
    Math.min(5, Number(review.rating || 0))
  );

  const stars =
    "★".repeat(rating) +
    "☆".repeat(5 - rating);

  const actions =
    review.status === "pending"
      ? `
        <div class="review-actions">
          <button
            type="button"
            class="btn btn-approve approve-review-btn"
            data-id="${escapeHtml(review.id)}"
          >
            Approve
          </button>

          <button
            type="button"
            class="btn btn-reject reject-review-btn"
            data-id="${escapeHtml(review.id)}"
          >
            Reject
          </button>
        </div>
      `
      : "";

  return `
    <article class="review-card">
      <div class="review-card-header">
        <strong>${escapeHtml(review.name)}</strong>
        <span class="review-stars">${stars}</span>
      </div>

      <p>${escapeHtml(review.text)}</p>

      <span style="color: var(--muted); font-size: 0.85rem;">
        Order / Product: ${escapeHtml(review.product)}
      </span>

      ${actions}
    </article>
  `;
}

function renderReviewsPanel(tab, reviews) {
  const grid = document.getElementById(
    `${tab}ReviewsGrid`
  );

  const emptyState = document.getElementById(
    `${tab}ReviewsEmpty`
  );

  if (!grid || !emptyState) return;

  if (!reviews.length) {
    grid.style.display = "none";
    emptyState.style.display = "grid";
    return;
  }

  grid.style.display = "grid";
  emptyState.style.display = "none";

  grid.innerHTML = reviews
    .map(renderReviewCard)
    .join("");
}

function renderAllReviews() {
  const grouped = {
    pending: REVIEWS.filter(
      (review) => review.status === "pending"
    ),

    approved: REVIEWS.filter(
      (review) => review.status === "approved"
    ),

    rejected: REVIEWS.filter(
      (review) => review.status === "rejected"
    )
  };

  renderReviewsPanel(
    "pending",
    grouped.pending
  );

  renderReviewsPanel(
    "approved",
    grouped.approved
  );

  renderReviewsPanel(
    "rejected",
    grouped.rejected
  );

  document
    .querySelectorAll("[data-review-tab]")
    .forEach((button) => {
      const tab = button.dataset.reviewTab;
      const count = button.querySelector(".tab-count");

      if (count) {
        count.textContent = String(
          grouped[tab]?.length || 0
        );
      }
    });
}

function subscribeReviews() {
  const reviewsRef = collection(db, "reviews");

  return onSnapshot(
    reviewsRef,
    (snapshot) => {
      REVIEWS = snapshot.docs.map(normalizeReview);

      console.log(
        `[Treats By Rich] Loaded ${REVIEWS.length} review(s).`
      );

      renderAllReviews();
    },
    (error) => {
      console.error(
        "[Treats By Rich] Failed to load reviews:",
        error
      );

      REVIEWS = [];
      renderAllReviews();

      showToast(
        "Could not load reviews from Firestore."
      );
    }
  );
}

async function updateReviewStatus(id, status) {
  try {
    await updateDoc(
      doc(db, "reviews", id),
      {
        status,
        updatedAt: serverTimestamp()
      }
    );

    showToast(
      status === "approved"
        ? "Review approved."
        : "Review rejected."
    );
  } catch (error) {
    console.error(
      "[Treats By Rich] Failed to update review:",
      error
    );

    showToast(
      "Could not update the review."
    );
  }
}

function initReviewTabs() {
  document
    .querySelectorAll("[data-review-tab]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        activeTab = button.dataset.reviewTab;

        document
          .querySelectorAll("[data-review-tab]")
          .forEach((item) =>
            item.classList.remove("active")
          );

        document
          .querySelectorAll("[data-review-panel]")
          .forEach((panel) =>
            panel.classList.remove("active")
          );

        button.classList.add("active");

        document
          .querySelector(
            `[data-review-panel="${activeTab}"]`
          )
          ?.classList.add("active");
      });
    });
}

function initModeration() {
  document
    .querySelector(".card-body")
    ?.addEventListener("click", async (event) => {
      const approveButton =
        event.target.closest(
          ".approve-review-btn"
        );

      const rejectButton =
        event.target.closest(
          ".reject-review-btn"
        );

      if (approveButton) {
        approveButton.disabled = true;

        await updateReviewStatus(
          approveButton.dataset.id,
          "approved"
        );

        return;
      }

      if (rejectButton) {
        rejectButton.disabled = true;

        await updateReviewStatus(
          rejectButton.dataset.id,
          "rejected"
        );
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

  subscribeReviews();
});