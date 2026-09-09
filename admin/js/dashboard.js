// Treats By Rich Admin — dashboard shell
// Sidebar, topbar, KPIs, notifications, modals and admin push notifications.

import { auth, db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { createRealtimeNotificationService } from "../../services/notificationService.js";

const notificationService = createRealtimeNotificationService();

/**
 * Wires the mobile hamburger, close button and scrim for the off-canvas sidebar.
 */
function initSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const toggleBtn = document.querySelector(".sidebar-toggle");
  const closeBtn = document.querySelector(".sidebar-close");
  const scrim = document.querySelector(".sidebar-scrim");

  if (!sidebar) return;

  function openSidebar() {
    sidebar.classList.add("is-open");
    scrim?.classList.add("is-visible");
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    scrim?.classList.remove("is-visible");
  }

  function toggleSidebar() {
    if (sidebar.classList.contains("is-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  toggleBtn?.addEventListener("click", toggleSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  scrim?.addEventListener("click", closeSidebar);

  sidebar.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });
}

/**
 * Shows a browser push notification when the admin receives
 * a foreground FCM message.
 */
function showAdminBrowserNotification(payload) {
  if (!("Notification" in window)) return;

  if (Notification.permission !== "granted") return;

  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "Treats By Rich Admin";

  const body =
    payload?.notification?.body ||
    payload?.data?.body ||
    "You have a new Treats By Rich notification.";

  const url =
    payload?.data?.url ||
    payload?.fcmOptions?.link ||
    "/admin/dashboard.html";

  try {
    const notification = new Notification(title, {
      body,
      icon: "/images/logo.png",
      badge: "/images/logo.png",
      tag: `treats-admin-${Date.now()}`
    });

    notification.onclick = () => {
      window.focus();

      if (url) {
        window.location.href = url;
      }

      notification.close();
    };
  } catch (error) {
    console.warn(
      "[Treats By Rich] Could not display foreground browser notification:",
      error
    );
  }
}

/**
 * Registers this browser/device as an admin push device.
 *
 * Each browser/device receives its own FCM token, so the same
 * admin can use a laptop, phone, tablet, etc.
 */
async function registerAdminPushDevice() {
  if (!auth?.currentUser) {
    console.log(
      "[Treats By Rich] Admin push registration waiting for authentication."
    );
    return;
  }

  if (!("Notification" in window)) {
    console.warn(
      "[Treats By Rich] This browser does not support notifications."
    );
    return;
  }

  try {
    // If permission was already granted, register immediately.
    if (Notification.permission === "granted") {
      const result = await notificationService.registerPushDevice({
        userId: auth.currentUser.uid,
        role: "admin",
        orderNumber: null
      });

      console.log(
        "[Treats By Rich] Admin push device registered:",
        result
      );

      return;
    }

    // If the user has not decided yet, don't interrupt them
    // with a permission popup automatically.
    if (Notification.permission === "default") {
      console.log(
        "[Treats By Rich] Admin push notifications are available. Click the notification bell to enable them."
      );
      return;
    }

    console.log(
      "[Treats By Rich] Browser notification permission is denied."
    );
  } catch (error) {
    console.error(
      "[Treats By Rich] Admin push registration failed:",
      error
    );
  }
}

/**
 * Loads recent customer orders for the admin notification bell.
 *
 * These are database notifications shown inside the bell panel.
 * Push notifications remain handled separately by FCM.
 */
function initAdminOrderNotifications() {
  if (!db) {
    console.warn(
      "[Treats By Rich] Firestore is not available for admin notifications."
    );
    return;
  }

  const ordersQuery = query(
    collection(db, "orders"),
    orderBy("createdAt", "desc"),
    limit(10)
  );

  onSnapshot(
    ordersQuery,
    (snapshot) => {
      const notifications = snapshot.docs.map((docSnap) => {
        const order = docSnap.data();

        return {
          id: docSnap.id,

          orderNumber:
            order.orderNumber || docSnap.id,

          customerName:
            order.customerName ||
            order.fullName ||
            "Customer",

          total: Number(
            order.grandTotal ||
            order.totals?.grandTotal ||
            0
          ),

          status:
            order.status || "Pending",

          createdAt:
            order.createdAt || null
        };
      });

      renderNotifications(notifications);
    },
    (error) => {
      console.error(
        "[Treats By Rich] Could not load admin order notifications:",
        error
      );
    }
  );
}

/**
 * Sets up the admin notification bell.
 *
 * If notifications have not been enabled yet, clicking the bell
 * will request permission and register this device.
 */
function initTopbar() {
  const notificationBtn =
    document.querySelector(".notification-btn");

  const notificationPanel =
    document.querySelector(".notification-panel");

  notificationBtn?.addEventListener(
    "click",
    async () => {
      notificationPanel?.classList.toggle("is-open");

      if (
        "Notification" in window &&
        Notification.permission === "default" &&
        auth?.currentUser
      ) {
        try {
          const result =
            await notificationService.registerPushDevice({
              userId: auth.currentUser.uid,
              role: "admin",
              orderNumber: null
            });

          console.log(
            "[Treats By Rich] Admin notifications enabled:",
            result
          );
        } catch (error) {
          console.error(
            "[Treats By Rich] Could not enable admin notifications:",
            error
          );
        }
      }
    }
  );

  document.addEventListener("click", (event) => {
    if (!notificationPanel || !notificationBtn) return;

    if (
      notificationPanel.contains(event.target) ||
      notificationBtn.contains(event.target)
    ) {
      return;
    }

    notificationPanel.classList.remove("is-open");
  });

  const avatar =
    document.querySelector(".admin-avatar");

  const nameEl =
    document.querySelector(".admin-profile-meta strong");

  const user = auth?.currentUser;

  if (user) {
    const label = user.email || "Admin";

    if (avatar) {
      avatar.textContent =
        label.charAt(0).toUpperCase();
    }

    if (nameEl) {
      nameEl.textContent =
        label.split("@")[0];
    }
  }

  // If permission was already granted from an earlier visit,
  // register this device automatically.
  registerAdminPushDevice();

  // Load recent customer orders into the notification bell.
  initAdminOrderNotifications();
}

/**
 * Listens for foreground FCM messages on the admin device.
 */
function initAdminPushListener() {
  try {
    notificationService.listenForForegroundMessages(
      (payload) => {
        console.log(
          "[Treats By Rich] Admin foreground push received:",
          payload
        );

        const title =
          payload?.notification?.title ||
          payload?.data?.title ||
          "Treats By Rich";

        const body =
          payload?.notification?.body ||
          payload?.data?.body ||
          "You have a new notification.";

        showAdminBrowserNotification(payload);

        showToast(
          `${title}: ${body}`,
          "success"
        );
      }
    );
  } catch (error) {
    console.error(
      "[Treats By Rich] Could not initialize admin push listener:",
      error
    );
  }
}

/**
 * Renders the five KPI cards.
 */
function renderKPIs(values = {}) {
  const defaults = {
    totalSales: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    pendingPayments: 0
  };

  const data = {
    ...defaults,
    ...values
  };

  const map = {
    totalSales: "#kpiTotalSales",
    totalOrders: "#kpiTotalOrders",
    pendingOrders: "#kpiPendingOrders",
    completedOrders: "#kpiCompletedOrders",
    pendingPayments: "#kpiPendingPayments"
  };

  Object.entries(map).forEach(
    ([key, selector]) => {
      const node =
        document.querySelector(selector);

      if (!node) return;

      node.textContent =
        key === "totalSales"
          ? `GH₵${Number(data[key]).toFixed(2)}`
          : String(data[key]);
    }
  );
}

/**
 * Renders the recent orders table.
 */
function renderRecentOrders(orders = []) {
  const tableWrap =
    document.getElementById(
      "recentOrdersTable"
    );

  const emptyState =
    document.getElementById(
      "recentOrdersEmpty"
    );

  const tbody =
    document.getElementById(
      "recentOrdersBody"
    );

  if (
    !tableWrap ||
    !emptyState ||
    !tbody
  ) {
    return;
  }

  if (!orders.length) {
    tableWrap.style.display = "none";
    emptyState.style.display = "grid";
    return;
  }

  tableWrap.style.display = "block";
  emptyState.style.display = "none";

  tbody.innerHTML = orders
    .map(
      (order) => `
        <tr>
          <td>${order.id}</td>
          <td>${order.customer}</td>
          <td>${order.items}</td>
          <td>${order.total}</td>
          <td>${order.payment}</td>
          <td>${order.status}</td>
          <td>${order.date}</td>
          <td>
            <a
              class="btn btn-ghost"
              href="order-details.html?order=${encodeURIComponent(
                order.id
              )}"
            >
              View
            </a>
          </td>
        </tr>
      `
    )
    .join("");
}

/**
 * Renders the notification list.
 */
function renderNotifications(
  notifications = []
) {
  const panelBody =
    document.getElementById(
      "notificationBody"
    );

  const dot =
    document.querySelector(
      ".notification-dot"
    );

  if (!panelBody) return;

  dot?.classList.toggle(
    "is-visible",
    notifications.length > 0
  );

  if (!notifications.length) {
    panelBody.innerHTML = `
      <div class="empty-state">
        <span class="icon empty-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </span>

        <span>No new notifications</span>
      </div>
    `;

    return;
  }

  panelBody.innerHTML =
    notifications
      .map((note) => {
        const amount =
          `GH₵${Number(
            note.total || 0
          ).toFixed(2)}`;

        return `
          <a
            class="notification-item"
            href="order-details.html?order=${encodeURIComponent(
              note.orderNumber
            )}"
          >
            <div>
              <strong>New Order</strong>

              <div>
                ${note.orderNumber}
              </div>

              <div>
                ${note.customerName} · ${amount}
              </div>

              <small>
                Status: ${note.status}
              </small>
            </div>
          </a>
        `;
      })
      .join("");
}

/**
 * Shows a brief, auto-dismissing toast.
 */
function showToast(
  message,
  type = "success"
) {
  let stack =
    document.querySelector(
      ".toast-stack"
    );

  if (!stack) {
    stack =
      document.createElement("div");

    stack.className =
      "toast-stack";

    document.body.appendChild(
      stack
    );
  }

  const toast =
    document.createElement(
      "div"
    );

  toast.className =
    `toast toast-${type}`;

  toast.textContent = message;

  stack.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 5000);
}

/**
 * Wires a modal overlay's shared open/close behavior.
 */
function initModal(
  overlayId,
  { onOpen, onClose } = {}
) {
  const overlay =
    document.getElementById(
      overlayId
    );

  if (!overlay) {
    return {
      open: () => {},
      close: () => {}
    };
  }

  function open() {
    overlay.classList.add(
      "is-open"
    );

    document.body.classList.add(
      "modal-open"
    );

    onOpen?.();
  }

  function close() {
    overlay.classList.remove(
      "is-open"
    );

    document.body.classList.remove(
      "modal-open"
    );

    onClose?.();
  }

  overlay
    .querySelectorAll(
      "[data-modal-close]"
    )
    .forEach((btn) => {
      btn.addEventListener(
        "click",
        close
      );
    });

  overlay.addEventListener(
    "click",
    (event) => {
      if (
        event.target === overlay
      ) {
        close();
      }
    }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        overlay.classList.contains(
          "is-open"
        )
      ) {
        close();
      }
    }
  );

  return {
    open,
    close
  };
}

// Start admin push listener as soon as this shared dashboard
// module is loaded.
initAdminPushListener();

export {
  initSidebar,
  initTopbar,
  renderKPIs,
  renderRecentOrders,
  renderNotifications,
  showToast,
  initModal,
  registerAdminPushDevice
};