import {
  collection,
  onSnapshot,
  query
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  db,
  configOk
} from "../config/firebaseConfig.js";

// Treats By Rich — Menu Page
// Handles product display, filters, product options,
// quantity, pricing and reliable Add To Cart behavior.

(function initMenuPage() {
  "use strict";

  const header =
    document.querySelector(".site-header");

  const backToTopButton =
    document.querySelector(".back-to-top");

  const revealItems =
    document.querySelectorAll(".reveal");

  const cartCountElements =
    document.querySelectorAll(".cart-count");

  const searchBox =
    document.getElementById("menu-search");

  const filterChips =
    document.querySelectorAll(".chip");

  const quantityInput =
    document.getElementById("quantity");

  const quantityButtons =
    document.querySelectorAll(".quantity-btn");

  const sizeOptions =
    document.querySelectorAll(
      'input[name="size"]'
    );

  const extraOptions =
    document.querySelectorAll(
      ".checkbox-card input"
    );

  const totalPriceElement =
    document.getElementById("total-price");

  const priceCaptionElement =
    document.getElementById("price-caption");

  let activeFilter = "all";
  let currentSearch = "";
  let basePrice = 80;
  let quantity = 1;

  /*
   * =========================================================
   * CART
   * =========================================================
   */

  function getCartAPI() {
    if (
      window.TBRCartAPI &&
      typeof window.TBRCartAPI.addItem === "function"
    ) {
      return window.TBRCartAPI;
    }

    if (
      typeof window.addToCart === "function"
    ) {
      return {
        addItem: window.addToCart,
        getCartCount:
          typeof window.getCartCount === "function"
            ? window.getCartCount
            : null
      };
    }

    return null;
  }

  function updateCartCount() {
    const api = getCartAPI();

    let count = 0;

    if (
      api &&
      typeof api.getCartCount === "function"
    ) {
      count = api.getCartCount();
    } else if (
      window.TBRCartAPI &&
      typeof window.TBRCartAPI.getCartCount ===
        "function"
    ) {
      count =
        window.TBRCartAPI.getCartCount();
    }

    cartCountElements.forEach((element) => {
      element.textContent = String(count);
    });
  }

  /*
   * =========================================================
   * CART SUCCESS TOAST
   * =========================================================
   */

  function showCartToast(productName) {
    let toast =
      document.getElementById(
        "tbr-cart-toast"
      );

    if (!toast) {
      toast = document.createElement("div");

      toast.id =
        "tbr-cart-toast";

      toast.innerHTML = `
        <span class="tbr-cart-toast-icon">✓</span>

        <div>
          <strong>Added to Cart</strong>
          <span class="tbr-cart-toast-message"></span>
        </div>
      `;

      Object.assign(toast.style, {
        position: "fixed",
        right: "24px",
        bottom: "24px",
        zIndex: "99999",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "15px 20px",
        background: "#3f2418",
        color: "#ffffff",
        borderRadius: "14px",
        boxShadow:
          "0 12px 30px rgba(0,0,0,0.2)",
        fontFamily:
          "Poppins, sans-serif",
        fontSize: "14px",
        opacity: "0",
        transform:
          "translateY(20px)",
        transition:
          "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents: "none"
      });

      const icon =
        toast.querySelector(
          ".tbr-cart-toast-icon"
        );

      Object.assign(icon.style, {
        width: "30px",
        height: "30px",
        display: "grid",
        placeItems: "center",
        borderRadius: "50%",
        background: "#d99a3d",
        color: "#ffffff",
        fontWeight: "700",
        fontSize: "17px",
        flexShrink: "0"
      });

      const message =
        toast.querySelector(
          ".tbr-cart-toast-message"
        );

      Object.assign(message.style, {
        display: "block",
        marginTop: "2px",
        opacity: "0.85",
        fontSize: "12px"
      });

      document.body.appendChild(
        toast
      );
    }

    const message =
      toast.querySelector(
        ".tbr-cart-toast-message"
      );

    if (message) {
      message.textContent =
        `${productName} has been added to your cart.`;
    }

    toast.style.opacity = "1";

    toast.style.transform =
      "translateY(0)";

    clearTimeout(
      toast._hideTimer
    );

    toast._hideTimer =
      setTimeout(() => {
        toast.style.opacity = "0";

        toast.style.transform =
          "translateY(20px)";
      }, 2500);
  }

  function showCartSuccess(button) {
    if (!button) return;

    const originalText =
      button.dataset.originalText ||
      button.textContent ||
      "Add To Cart";

    button.dataset.originalText =
      originalText;

    button.classList.add(
      "is-loading"
    );

    button.classList.add(
      "added"
    );

    button.textContent =
      "✓ Added to Cart";

    window.setTimeout(() => {
      button.classList.remove(
        "is-loading"
      );

      button.classList.remove(
        "added"
      );

      button.textContent =
        originalText;
    }, 1600);
  }

  function showCartError(button) {
    if (!button) return;

    const originalText =
      button.dataset.originalText ||
      button.textContent ||
      "Add To Cart";

    button.dataset.originalText =
      originalText;

    button.classList.add(
      "is-loading"
    );

    button.textContent =
      "Unable to add";

    window.setTimeout(() => {
      button.classList.remove(
        "is-loading"
      );

      button.textContent =
        originalText;
    }, 1600);
  }

  /*
   * =========================================================
   * FILTERS
   * =========================================================
   */

  function setActiveChip(selectedChip) {
    filterChips.forEach((chip) => {
      chip.classList.toggle(
        "is-active",
        chip === selectedChip
      );
    });
  }

  function applyMenuFilters() {
    document
      .querySelectorAll(".menu-card")
      .forEach((card) => {
        const category =
          card.dataset.category || "";

        const matchesCategory =
          activeFilter === "all" ||
          category.includes(
            activeFilter
          );

        const text =
          card.dataset.search || "";

        const matchesSearch =
          text
            .toLowerCase()
            .includes(
              currentSearch.toLowerCase()
            );

        const isVisible =
          matchesCategory &&
          matchesSearch;

        card.classList.toggle(
          "is-hidden",
          !isVisible
        );

        card.dataset.hidden =
          String(!isVisible);

        card.style.display =
          isVisible
            ? "flex"
            : "none";
      });
  }

  /*
   * =========================================================
   * CATEGORIES
   * =========================================================
   */

  const CATEGORY_LABELS = {
    "best-seller": "Best Seller",
    fruit: "Fruit",
    chocolate: "Chocolate",
    healthy: "Healthy",
    crunchy: "Crunchy"
  };

  /*
   * =========================================================
   * SECURITY / HTML ESCAPING
   * =========================================================
   */

  function escapeHtml(value) {
    return String(
      value ?? ""
    ).replace(
      /[&<>"']/g,
      (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char])
    );
  }

  /*
   * =========================================================
   * FIRESTORE PRODUCT CARD
   * =========================================================
   */

  function buildFirestoreCardHtml(
    product
  ) {
    const category =
      product.category || "fruit";

    const badgeLabel =
      CATEGORY_LABELS[
        category
      ] || "New";

    const categories = [
      category
    ];

    if (
      product.featured === "yes" &&
      category !== "best-seller"
    ) {
      categories.push(
        "best-seller"
      );
    }

    const searchText =
      `${product.name || ""} ${
        product.description || ""
      }`.toLowerCase();

    const image =
      product.imageDataUrl ||
      "images/menu/heavenly-combo.png";

    const price =
      Number(
        product.basePrice || 0
      );

    const safeName =
      escapeHtml(
        product.name ||
          "Treat Item"
      );

    return `
      <article
        class="menu-card"
        data-category="${escapeHtml(
          categories.join(" ")
        )}"
        data-search="${escapeHtml(
          searchText
        )}"
        data-firestore-id="${escapeHtml(
          product.id
        )}"
      >

        <div class="menu-card-media">

          <img
            src="${escapeHtml(image)}"
            alt="${safeName}"
            loading="lazy"
          />

          <span class="floating-badge">
            ${escapeHtml(
              badgeLabel
            )}
          </span>

        </div>

        <div class="menu-card-body">

          <h3>${safeName}</h3>

          <p>
            ${escapeHtml(
              product.description || ""
            )}
          </p>

          <div class="menu-card-meta">

            <strong>
              Starting at ₵${price}
            </strong>

            <div class="menu-actions">

              <a
                class="button button-primary button-small"
                href="product.html?id=${encodeURIComponent(product.id)}"
              >
                View Details
              </a>

              <button
                class="button button-ghost-dark button-small add-to-cart"
                type="button"
                data-product="${safeName}"
                data-price="${price}"
                data-image="${escapeHtml(
                  image
                )}"
              >
                Add To Cart
              </button>

            </div>

          </div>

        </div>

      </article>
    `;
  }

  function renderFirestoreProducts(
    products
  ) {
    const container =
      document.getElementById(
        "firestoreMenuCards"
      );

    if (!container) return;

    container.innerHTML =
      products
        .map(
          buildFirestoreCardHtml
        )
        .join("");

    applyMenuFilters();
  }

  /*
   * =========================================================
   * FIRESTORE PRODUCTS
   * =========================================================
   */

  function subscribeFirestoreProducts() {
    if (
      !configOk ||
      !db
    ) {
      return;
    }

    onSnapshot(
      query(
        collection(
          db,
          "products"
        )
      ),
      (snapshot) => {
        const products =
          snapshot.docs
            .map(
              (docSnap) => ({
                id: docSnap.id,
                ...docSnap.data()
              })
            )
            .filter(
              (product) =>
                product.availability !==
                "unavailable"
            );

        renderFirestoreProducts(
          products
        );
      },
      () => {
        // Keep existing static products
        // if Firestore cannot be reached.
      }
    );
  }

  /*
   * =========================================================
   * PRICE CALCULATION
   * =========================================================
   */

  function updatePrice() {
    if (
      !totalPriceElement
    ) {
      return;
    }

    const selectedSize =
      document.querySelector(
        'input[name="size"]:checked'
      );

    const base =
      selectedSize
        ? Number(
            selectedSize.dataset.price ||
              0
          )
        : basePrice;

    const extrasTotal =
      Array.from(
        extraOptions
      ).reduce(
        (total, checkbox) => {
          return checkbox.checked
            ? total +
                Number(
                  checkbox.dataset.price ||
                    0
                )
            : total;
        },
        0
      );

    const total =
      (base + extrasTotal) *
      quantity;

    totalPriceElement.textContent =
      `₵${total}`;

    if (
      priceCaptionElement
    ) {
      const sizeLabel =
        selectedSize
          ? selectedSize.value
          : "255ml";

      priceCaptionElement.textContent =
        `For ${sizeLabel}`;
    }

    if (
      window.TBRProductDetails &&
      typeof window.TBRProductDetails
        .refresh === "function"
    ) {
      window.TBRProductDetails.refresh();
    }
  }

  /*
   * =========================================================
   * ADD TO CART
   * =========================================================
   */

  function handleAddToCart(button) {
    if (!button) {
      return;
    }

    const cartAPI =
      getCartAPI();

    if (
      !cartAPI ||
      typeof cartAPI.addItem !==
        "function"
    ) {
      console.error(
        "[Treats By Rich] Cart API is not available."
      );

      showCartError(button);

      return;
    }

    const selectedSize =
      document.querySelector(
        'input[name="size"]:checked'
      );

    const selectedSizeValue =
      selectedSize?.value ||
      button.dataset.size ||
      "255ml";

    const selectedBasePrice =
      Number(
        selectedSize?.dataset.price ||
          button.dataset.price ||
          80
      );

    const selectedExtras =
      Array.from(
        extraOptions
      )
        .filter(
          (checkbox) =>
            checkbox.checked
        )
        .map(
          (checkbox) =>
            checkbox.dataset.extra ||
            checkbox.parentElement
              ?.textContent
              ?.trim()
        )
        .filter(Boolean);

    const selectedQuantity =
      Math.max(
        1,
        Number(
          quantityInput?.value ||
            quantity ||
            1
        )
      );

    const extrasTotal =
      Array.from(
        extraOptions
      ).reduce(
        (total, checkbox) => {
          return checkbox.checked
            ? total +
                Number(
                  checkbox.dataset.price ||
                    0
                )
            : total;
        },
        0
      );

    const imageSource =
      button.dataset.image ||
      document
        .querySelector(
          ".product-media img"
        )
        ?.getAttribute(
          "src"
        ) ||
      document
        .querySelector(
          ".menu-card img"
        )
        ?.getAttribute(
          "src"
        ) ||
      "images/menu/heavenly-combo.png";

    const normalizedImage =
      imageSource
        .replace(
          /^\.\//,
          ""
        )
        .replace(
          /^\.\.\//,
          ""
        );

    const productName =
      button.dataset.product ||
      document
        .querySelector("h1")
        ?.textContent
        ?.trim() ||
      "Treats By Rich Parfait";

    const unitPrice =
      selectedBasePrice +
      extrasTotal;

    const totalPrice =
      unitPrice *
      selectedQuantity;

    try {
      cartAPI.addItem({
        name: productName,
        image: normalizedImage,
        size: selectedSizeValue,
        extras: selectedExtras,
        unitPrice,
        quantity: selectedQuantity,
        totalPrice
      });

      updateCartCount();

      showCartSuccess(
        button
      );

      // Show visible confirmation popup
      showCartToast(
        productName
      );

      console.log(
        "[Treats By Rich] Added to cart:",
        {
          name: productName,
          size: selectedSizeValue,
          quantity: selectedQuantity,
          extras: selectedExtras,
          totalPrice
        }
      );

    } catch (error) {
      console.error(
        "[Treats By Rich] Add to cart failed:",
        error
      );

      showCartError(
        button
      );
    }
  }

  /*
   * =========================================================
   * PRODUCT INTERACTIONS
   * =========================================================
   */

  function attachProductInteractions() {

    if (quantityInput) {
      quantityInput.addEventListener(
        "input",
        () => {
          quantity =
            Math.max(
              1,
              Number(
                quantityInput.value
              ) || 1
            );

          quantityInput.value =
            quantity;

          updatePrice();
        }
      );
    }

    quantityButtons.forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const action =
              button.dataset.action;

            quantity =
              Math.max(
                1,
                quantity +
                  (
                    action ===
                    "increase"
                      ? 1
                      : -1
                  )
              );

            if (
              quantityInput
            ) {
              quantityInput.value =
                quantity;
            }

            updatePrice();
          }
        );
      }
    );

    sizeOptions.forEach(
      (option) => {
        option.addEventListener(
          "change",
          () => {
            document
              .querySelectorAll(
                ".option-card"
              )
              .forEach(
                (card) => {
                  card.classList.toggle(
                    "is-selected",
                    card
                      .querySelector(
                        "input"
                      )
                      ?.checked
                  );
                }
              );

            updatePrice();
          }
        );
      }
    );

    extraOptions.forEach(
      (option) => {
        option.addEventListener(
          "change",
          updatePrice
        );
      }
    );

    /*
     * Event delegation means this also
     * works for products loaded from
     * Firestore after page load.
     */

    document.addEventListener(
      "click",
      (event) => {
        const button =
          event.target.closest(
            ".add-to-cart"
          );

        if (!button) {
          return;
        }

        event.preventDefault();

        handleAddToCart(
          button
        );
      }
    );
  }

  /*
   * =========================================================
   * HEADER
   * =========================================================
   */

  function updateHeaderState() {
    if (header) {
      header.classList.toggle(
        "scrolled",
        window.scrollY > 24
      );
    }

    if (
      backToTopButton
    ) {
      backToTopButton.classList.toggle(
        "is-visible",
        window.scrollY > 700
      );
    }
  }

  /*
   * =========================================================
   * SEARCH
   * =========================================================
   */

  if (searchBox) {
    searchBox.addEventListener(
      "input",
      (event) => {
        currentSearch =
          event.target.value.trim();

        applyMenuFilters();

        searchBox.classList.toggle(
          "is-valid",
          currentSearch.length >
            0
        );
      }
    );
  }

  /*
   * =========================================================
   * CATEGORY FILTERS
   * =========================================================
   */

  filterChips.forEach(
    (chip) => {
      chip.addEventListener(
        "click",
        () => {
          activeFilter =
            chip.dataset.filter ||
            "all";

          setActiveChip(
            chip
          );

          applyMenuFilters();
        }
      );
    }
  );

  /*
   * =========================================================
   * BACK TO TOP
   * =========================================================
   */

  if (
    backToTopButton
  ) {
    backToTopButton.addEventListener(
      "click",
      () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    );
  }

  /*
   * =========================================================
   * REVEAL ANIMATIONS
   * =========================================================
   */

  if (
    "IntersectionObserver" in
    window
  ) {
    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (
                entry.isIntersecting
              ) {
                entry.target.classList.add(
                  "is-visible"
                );

                observer.unobserve(
                  entry.target
                );
              }
            }
          );
        },
        {
          threshold: 0.15
        }
      );

    revealItems.forEach(
      (item) =>
        observer.observe(item)
    );
  }

  /*
   * =========================================================
   * CART COUNT SYNC
   * =========================================================
   */

  window.addEventListener(
    "tbr:cart-updated",
    updateCartCount
  );

  window.addEventListener(
    "storage",
    updateCartCount
  );

  window.addEventListener(
    "scroll",
    updateHeaderState,
    {
      passive: true
    }
  );

  /*
   * =========================================================
   * INITIALIZE
   * =========================================================
   */

  updateHeaderState();

  updateCartCount();

  attachProductInteractions();

  updatePrice();

  applyMenuFilters();

  subscribeFirestoreProducts();

})();