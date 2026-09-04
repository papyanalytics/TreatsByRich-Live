// Treats By Rich Admin — Settings page controller.
import { requireAuth, initLogoutButtons, sendResetEmail } from "./auth.js";
import { initSidebar, initTopbar, renderNotifications } from "./dashboard.js";
import { auth } from "./firebase-config.js";

requireAuth((user) => {
  initSidebar();
  initTopbar();
  initLogoutButtons();
  renderNotifications([]);

  const emailEl = document.getElementById("adminAccountEmail");
  if (emailEl) emailEl.textContent = user.email || auth?.currentUser?.email || "—";

  document.getElementById("changePasswordBtn")?.addEventListener("click", async () => {
    if (!user.email) return;
    try {
      await sendResetEmail(user.email);
      alert(`Password reset email sent to ${user.email}.`);
    } catch (error) {
      alert(error?.message || "Could not send reset email right now.");
    }
  });

  document.getElementById("settingsForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    // Settings persistence is enabled once this page is connected to Firestore.
    alert("Settings will be saved once this page is connected to Firestore.");
  });
});
