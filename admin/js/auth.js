// Treats By Rich Admin — Firebase Authentication helpers, shared by every page.
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { auth, configOk } from "./firebase-config.js";

const LOGIN_PAGE = "index.html";
const DASHBOARD_PAGE = "dashboard.html";

function assertConfigured() {
  if (!configOk || !auth) {
    throw new Error("Firebase is not configured for Treats By Rich Admin.");
  }
}

/**
 * Signs an admin in with email/password. Persistence controls whether the
 * session survives closing the browser (Remember me) or ends with the tab.
 */
async function loginWithEmail(email, password, rememberMe) {
  assertConfigured();
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

async function sendResetEmail(email) {
  assertConfigured();
  await sendPasswordResetEmail(auth, email);
}

async function logout() {
  if (!configOk || !auth) {
    window.location.href = LOGIN_PAGE;
    return;
  }
  await signOut(auth);
  window.location.href = LOGIN_PAGE;
}

/**
 * Gate for every protected admin page. Calls onAuthenticated(user) once a
 * signed-in admin is confirmed; otherwise redirects to the login page.
 */
function requireAuth(onAuthenticated) {
  if (!configOk || !auth) {
    window.location.replace(LOGIN_PAGE);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.replace(LOGIN_PAGE);
      return;
    }
    onAuthenticated?.(user);
  });
}

/** Gate for the login page itself: bounce already-signed-in admins forward. */
function redirectIfAuthenticated() {
  if (!configOk || !auth) return () => {};
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.replace(DASHBOARD_PAGE);
    }
  });
}

function initLogoutButtons() {
  document.querySelectorAll('[data-action="logout"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      logout();
    });
  });
}

function friendlyAuthError(error) {
  const code = error?.code || "";
  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This admin account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return error?.message || "Unable to sign in right now. Please try again.";
  }
}

export {
  loginWithEmail,
  sendResetEmail,
  logout,
  requireAuth,
  redirectIfAuthenticated,
  initLogoutButtons,
  friendlyAuthError
};
