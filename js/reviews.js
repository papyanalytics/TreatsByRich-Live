/* Customer review submission form. */
import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import { db } from "../config/firebaseConfig.js";

(function initReviewForm() {
  const form = document.getElementById("review-form");
  if (!form) return;

  const nameInput = document.getElementById("review-name");
  const orderInput = document.getElementById("review-order");
  const messageInput = document.getElementById("review-message");
  const ratingGroup = document.getElementById("review-rating");
  const confirmation = document.getElementById("review-confirmation");
  const submitButton = form.querySelector('button[type="submit"]');

  function setFieldError(fieldId, message) {
    const errorNode = form.querySelector(
      `[data-error-for="${fieldId}"]`
    );

    if (errorNode) {
      errorNode.textContent = message || "";
    }

    const field =
      document.getElementById(fieldId) || ratingGroup;

    field?.classList.toggle("is-invalid", Boolean(message));
  }

  function validate() {
    let isValid = true;

    const name = nameInput.value.trim();

    if (name.length < 2) {
      setFieldError(
        "review-name",
        "Please enter your name."
      );
      isValid = false;
    } else {
      setFieldError("review-name", "");
    }

    const selectedRating = form.querySelector(
      'input[name="reviewRating"]:checked'
    );

    if (!selectedRating) {
      setFieldError(
        "review-rating",
        "Please choose a star rating."
      );
      isValid = false;
    } else {
      setFieldError("review-rating", "");
    }

    const message = messageInput.value.trim();

    if (message.length < 10) {
      setFieldError(
        "review-message",
        "Please share a few more details (at least 10 characters)."
      );
      isValid = false;
    } else {
      setFieldError("review-message", "");
    }

    return isValid;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validate()) return;

    const selectedRating = form.querySelector(
      'input[name="reviewRating"]:checked'
    );

    const name = nameInput.value.trim();
    const order = orderInput.value.trim() || "Not provided";
    const rating = Number(selectedRating.value);
    const message = messageInput.value.trim();

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting Review...";
    }

    try {
      await addDoc(collection(db, "reviews"), {
        name,
        order,
        rating,
        message,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log(
        "[Treats By Rich] Review submitted successfully."
      );

      form.reset();

      form
        .querySelectorAll(".field-error")
        .forEach((node) => {
          node.textContent = "";
        });

      form
        .querySelectorAll(".is-invalid")
        .forEach((node) => {
          node.classList.remove("is-invalid");
        });

      if (confirmation) {
        confirmation.hidden = false;
        confirmation.textContent =
          "Thank you! Your review has been submitted and is awaiting approval.";
        confirmation.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }
    } catch (error) {
      console.error(
        "[Treats By Rich] Failed to submit review:",
        error
      );

      if (confirmation) {
        confirmation.hidden = false;
        confirmation.textContent =
          "Sorry, we couldn't submit your review. Please try again.";
        confirmation.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Review";
      }
    }
  });

  [nameInput, orderInput, messageInput].forEach((field) => {
    field?.addEventListener("input", () => {
      if (confirmation && !confirmation.hidden) {
        confirmation.hidden = true;
      }
    });
  });
})();