// Treats By Rich Admin — Analytics page controller.
import { requireAuth, initLogoutButtons } from "./auth.js";
import { initSidebar, initTopbar, renderNotifications } from "./dashboard.js";

requireAuth(() => {
  initSidebar();
  initTopbar();
  initLogoutButtons();
  renderNotifications([]);
  // Sales analytics/charts are built once Firestore order data is wired up.
});
