import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { auth, db, configOk, setRememberMePersistence } from "../config/firebaseConfig.js";
import { BUSINESS_CONFIG } from "../config/businessConfig.js";

function mapUserProfile(user, profileDoc) {
  const profile = profileDoc || {};
  return {
    uid: user.uid,
    email: user.email || "",
    displayName: profile.displayName || user.displayName || "",
    role: profile.role || BUSINESS_CONFIG.defaultRole,
    phone: profile.phone || "",
    isActive: profile.isActive !== false
  };
}

export function createAuthService() {
  function waitForAuthRestore(options = {}) {
    if (!auth) return Promise.resolve(null);

    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 12000;

    return new Promise((resolve, reject) => {
      let settled = false;

      const finish = (payload, isError = false) => {
        if (settled) return;
        settled = true;

        if (typeof unsubscribe === "function") {
          unsubscribe();
        }

        if (timeoutHandle) {
          globalThis.clearTimeout(timeoutHandle);
        }

        if (isError) {
          reject(payload);
          return;
        }

        resolve(payload);
      };

      let timeoutHandle = globalThis.setTimeout(() => {
        finish(new Error("Firebase auth restore timed out."), true);
      }, timeoutMs);

      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => finish(user || null, false),
        (error) => finish(error, true)
      );
    });
  }

  async function getUserProfile(uid) {
    if (!db) return null;
    const adminRef = doc(db, "admins", uid);
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      return adminSnap.data();
    }

    const adminQuery = query(collection(db, "admins"), where("uid", "==", uid));
    const adminMatches = await getDocs(adminQuery);
    if (!adminMatches.empty) return adminMatches.docs[0].data();

    // Backward compatibility fallback for existing projects still using staff docs.
    const staffRef = doc(db, "staff", uid);
    const staffSnap = await getDoc(staffRef);
    if (staffSnap.exists()) {
      return staffSnap.data();
    }

    const staffQuery = query(collection(db, "staff"), where("uid", "==", uid));
    const staffMatches = await getDocs(staffQuery);
    if (staffMatches.empty) return null;
    return staffMatches.docs[0].data();
  }

  async function login(email, password, rememberMe) {
    if (!configOk || !auth) {
      throw new Error("Firebase is not configured. Add your Firebase keys before login.");
    }

    await setRememberMePersistence(Boolean(rememberMe));
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(credential.user.uid);
    if (!profile) {
      await signOut(auth);
      throw new Error("You do not have admin access for this dashboard.");
    }

    const mapped = mapUserProfile(credential.user, profile);
    if (!mapped.isActive) {
      await signOut(auth);
      throw new Error("Your account is disabled. Contact an administrator.");
    }

    return mapped;
  }

  async function logout() {
    if (!auth) return;
    await signOut(auth);
  }

  async function requestPasswordReset(email) {
    if (!auth) {
      throw new Error("Firebase is not configured.");
    }
    await sendPasswordResetEmail(auth, email);
  }

  function observeAuth(callback) {
    if (!auth) {
      callback(null);
      return () => {};
    }

    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        callback(null);
        return;
      }
      const profile = await getUserProfile(user.uid);
      callback(profile ? mapUserProfile(user, profile) : null);
    });
  }

  async function requireAuth(options = {}) {
    if (!auth) return null;
    const user = await waitForAuthRestore(options);
    if (!user) return null;
    const profile = await getUserProfile(user.uid);
    return profile ? mapUserProfile(user, profile) : null;
  }

  return {
    login,
    logout,
    observeAuth,
    requireAuth,
    waitForAuthRestore,
    requestPasswordReset
  };
}
