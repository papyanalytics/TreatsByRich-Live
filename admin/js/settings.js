// ============================================================
// Treats By Rich Admin — Settings
// Firestore-backed business, payment and notification settings.
// ============================================================

import {
  requireAuth,
  initLogoutButtons,
  sendResetEmail
} from "./auth.js";

import {
  initSidebar,
  initTopbar,
  renderNotifications
} from "./dashboard.js";

import {
  auth,
  db
} from "./firebase-config.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// ============================================================
// FIRESTORE SETTINGS LOCATION
// ============================================================

const SETTINGS_COLLECTION =
  "settings";

const SETTINGS_DOCUMENT =
  "business";

// ============================================================
// HELPERS
// ============================================================

function getElement(id) {
  return document.getElementById(id);
}

function getValue(id) {
  return (
    getElement(id)?.value?.trim() ||
    ""
  );
}

function getChecked(id) {
  return Boolean(
    getElement(id)?.checked
  );
}

function setValue(
  id,
  value
) {
  const element =
    getElement(id);

  if (!element) {
    return;
  }

  element.value =
    value ?? "";
}

function setChecked(
  id,
  value
) {
  const element =
    getElement(id);

  if (!element) {
    return;
  }

  element.checked =
    Boolean(value);
}

// ============================================================
// REMOVE DELIVERY SETTINGS
// ============================================================

function removeDeliverySettings() {
  const deliveryFee =
    getElement(
      "deliveryFee"
    );

  const deliveryCard =
    deliveryFee?.closest(
      ".card"
    );

  if (deliveryCard) {
    deliveryCard.remove();
  }
}

// ============================================================
// DEFAULT SETTINGS
// ============================================================

const DEFAULT_SETTINGS = {
  businessName:
    "Treats By Rich",

  businessPhone:
    "+233 53 851 7831",

  businessEmail:
    "support@treatsbyrich.com",

  businessAddress:
    "",

  momoNumber:
    "0538517831",

  momoName:
    "Treats by Rich",

  bankName:
    "GCB",

  bankAccountNumber:
    "1011440001239",

  bankAccountName:
    "Treats by Rich",

  pickupAvailable:
    true,

  notifyNewOrder:
    true,

  notifyPayment:
    true,

  notifyReview:
    true
};

// ============================================================
// LOAD SETTINGS
// ============================================================

async function loadSettings() {
  if (!db) {
    console.warn(
      "[Treats By Rich] Firestore is not available."
    );

    return;
  }

  try {
    const settingsRef =
      doc(
        db,
        SETTINGS_COLLECTION,
        SETTINGS_DOCUMENT
      );

    const snapshot =
      await getDoc(
        settingsRef
      );

    const savedSettings =
      snapshot.exists()
        ? snapshot.data()
        : {};

    const settings = {
      ...DEFAULT_SETTINGS,
      ...savedSettings
    };

    // Business
    setValue(
      "businessName",
      settings.businessName
    );

    setValue(
      "businessPhone",
      settings.businessPhone
    );

    setValue(
      "businessEmail",
      settings.businessEmail
    );

    setValue(
      "businessAddress",
      settings.businessAddress
    );

    // Payment
    setValue(
      "momoNumber",
      settings.momoNumber
    );

    setValue(
      "momoName",
      settings.momoName
    );

    setValue(
      "bankName",
      settings.bankName
    );

    setValue(
      "bankAccountNumber",
      settings.bankAccountNumber
    );

    setValue(
      "bankAccountName",
      settings.bankAccountName
    );

    // Pickup
    setChecked(
      "pickupAvailable",
      settings.pickupAvailable
    );

    // Notifications
    setChecked(
      "notifyNewOrder",
      settings.notifyNewOrder
    );

    setChecked(
      "notifyPayment",
      settings.notifyPayment
    );

    setChecked(
      "notifyReview",
      settings.notifyReview
    );

    console.log(
      "[Treats By Rich] Settings loaded from Firestore."
    );

  } catch (error) {
    console.error(
      "[Treats By Rich] Could not load settings:",
      error
    );

    alert(
      "We could not load the saved settings. Please refresh and try again."
    );
  }
}

// ============================================================
// SAVE SETTINGS
// ============================================================

async function saveSettings() {
  if (!db) {
    throw new Error(
      "Firestore is not available."
    );
  }

  const settings = {
    // Business
    businessName:
      getValue(
        "businessName"
      ),

    businessPhone:
      getValue(
        "businessPhone"
      ),

    businessEmail:
      getValue(
        "businessEmail"
      ),

    businessAddress:
      getValue(
        "businessAddress"
      ),

    // Payment
    momoNumber:
      getValue(
        "momoNumber"
      ),

    momoName:
      getValue(
        "momoName"
      ),

    bankName:
      getValue(
        "bankName"
      ),

    bankAccountNumber:
      getValue(
        "bankAccountNumber"
      ),

    bankAccountName:
      getValue(
        "bankAccountName"
      ),

    // Pickup
    pickupAvailable:
      getChecked(
        "pickupAvailable"
      ),

    // Notifications
    notifyNewOrder:
      getChecked(
        "notifyNewOrder"
      ),

    notifyPayment:
      getChecked(
        "notifyPayment"
      ),

    notifyReview:
      getChecked(
        "notifyReview"
      ),

    updatedAt:
      serverTimestamp(),

    updatedBy:
      auth?.currentUser?.uid ||
      null
  };

  const settingsRef =
    doc(
      db,
      SETTINGS_COLLECTION,
      SETTINGS_DOCUMENT
    );

  await setDoc(
    settingsRef,
    settings,
    {
      merge: true
    }
  );

  console.log(
    "[Treats By Rich] Settings saved to Firestore:",
    settings
  );
}

// ============================================================
// FORM
// ============================================================

function initSettingsForm() {
  const form =
    getElement(
      "settingsForm"
    );

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const submitButton =
        form.querySelector(
          'button[type="submit"]'
        );

      const originalText =
        submitButton?.textContent ||
        "Save Settings";

      if (submitButton) {
        submitButton.disabled =
          true;

        submitButton.textContent =
          "Saving...";
      }

      try {
        await saveSettings();

        if (submitButton) {
          submitButton.textContent =
            "✓ Settings Saved";
        }

        alert(
          "Settings saved successfully."
        );

        window.setTimeout(
          () => {
            if (submitButton) {
              submitButton.textContent =
                originalText;

              submitButton.disabled =
                false;
            }
          },
          1200
        );

      } catch (error) {
        console.error(
          "[Treats By Rich] Settings save failed:",
          error
        );

        if (submitButton) {
          submitButton.disabled =
            false;

          submitButton.textContent =
            originalText;
        }

        alert(
          error?.message ||
            "Could not save settings right now."
        );
      }
    }
  );
}

// ============================================================
// PASSWORD RESET
// ============================================================

function initPasswordReset(
  user
) {
  const button =
    getElement(
      "changePasswordBtn"
    );

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    async () => {
      if (!user?.email) {
        return;
      }

      button.disabled =
        true;

      const originalText =
        button.textContent;

      button.textContent =
        "Sending...";

      try {
        await sendResetEmail(
          user.email
        );

        alert(
          `Password reset email sent to ${user.email}.`
        );

      } catch (error) {
        alert(
          error?.message ||
            "Could not send reset email right now."
        );

      } finally {
        button.disabled =
          false;

        button.textContent =
          originalText;
      }
    }
  );
}

// ============================================================
// INIT
// ============================================================

requireAuth(
  async (user) => {
    initSidebar();

    initTopbar();

    initLogoutButtons();

    renderNotifications([]);

    const emailEl =
      getElement(
        "adminAccountEmail"
      );

    if (emailEl) {
      emailEl.textContent =
        user.email ||
        auth?.currentUser?.email ||
        "—";
    }

    /*
     * Delivery is no longer provided by Treats By Rich.
     */
    removeDeliverySettings();

    /*
     * Load existing settings.
     */
    await loadSettings();

    /*
     * Save changes.
     */
    initSettingsForm();

    /*
     * Password reset.
     */
    initPasswordReset(
      user
    );
  }
);