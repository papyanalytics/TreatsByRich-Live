
/* =========================================================
   Treats By Rich
   Cart Data Layer + Cart Page
   Complete corrected version
   ========================================================= */

(function initCart() {
  "use strict";

  /*
   * STORAGE
   */

  const storageKey =
    window.APP_CONFIG?.cartStorageKey || "tbrCart";


  /*
   * PRODUCT OPTIONS
   */

  const SIZE_OPTIONS = [
    { value: "255ml", price: 80 },
    { value: "355ml", price: 110 },
    { value: "500ml", price: 155 },
    { value: "700ml", price: 299 },
    { value: "750ml", price: 310 }
  ];

  const EXTRA_OPTIONS = [
    { name: "Cashew", price: 25 },
    { name: "Almond", price: 25 },
    { name: "Coco Flakes", price: 25 },
    { name: "Crispy Bis", price: 25 },
    { name: "Extra Yogurt", price: 25 }
  ];


  /*
   * CHRISTMAS PROMOTION
   *
   * 5% discount when subtotal is above GH₵200.
   * Available immediately to cart.js and checkout.js.
   */

  function calculateChristmasDiscount(subtotal) {
    const safeSubtotal = Math.max(
      0,
      Number(subtotal) || 0
    );

    const subtotalPesewas = Math.round(
      safeSubtotal * 100
    );

    if (subtotalPesewas <= 20000) {
      return 0;
    }

    return Math.round(
      subtotalPesewas * 0.05
    ) / 100;
  }

  window.TBRPromotion = Object.assign(
    {},
    window.TBRPromotion || {},
    { calculateChristmasDiscount }
  );


  /*
   * HELPERS
   */

  function toSafeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function toSafeQuantity(value) {
    return Math.max(
      1,
      Math.floor(toSafeNumber(value, 1))
    );
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(
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
   * CART STORAGE
   */

  function parseCart() {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch (error) {
      console.warn(
        "[Treats By Rich] Could not read cart:",
        error
      );

      return [];
    }
  }

  function persistCart(items) {
    localStorage.setItem(
      storageKey,
      JSON.stringify(
        Array.isArray(items) ? items : []
      )
    );

    window.dispatchEvent(
      new CustomEvent("tbr:cart-updated")
    );
  }


  /*
   * NORMALIZE CART ITEM
   */

  function normalizeItem(input) {
    input = input || {};

    const quantity = toSafeQuantity(
      input.quantity ?? 1
    );

    const unitPrice = toSafeNumber(
      input.unitPrice ?? input.price ?? 0
    );

    const totalPrice = toSafeNumber(
      input.totalPrice,
      unitPrice * quantity
    );

    function toText(value, fallback) {
      return value === undefined || value === null
        ? fallback
        : String(value);
    }

    const id =
      input.id !== undefined &&
      input.id !== null &&
      String(input.id).trim() !== ""
        ? String(input.id)
        : `${
            input.name || "item"
          }-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

    return {
      id,

      productId: toText(
        input.productId,
        ""
      ),

      name: toText(
        input.name,
        "Treat Item"
      ),

      image: toText(
        input.image,
        "images/menu/heavenly-combo.png"
      ),

      size: toText(
        input.size,
        "255ml"
      ),

      extras: Array.isArray(input.extras)
        ? input.extras.filter(Boolean)
        : [],

      quantity,
      unitPrice,
      totalPrice
    };
  }


  /*
   * PRICE FORMAT
   */

  function formatPrice(value) {
    const amount = toSafeNumber(value);

    if (typeof window.formatCurrency === "function") {
      return window.formatCurrency(amount);
    }

    return `GH₵${amount.toFixed(2)}`;
  }


  /*
   * PUBLIC CART FUNCTIONS
   */

  function getCart() {
    return parseCart();
  }

  function saveCart(items) {
    const normalizedItems = (
      Array.isArray(items) ? items : []
    ).map(normalizeItem);

    persistCart(normalizedItems);
  }

  function clearCart() {
    localStorage.removeItem(storageKey);

    window.dispatchEvent(
      new CustomEvent("tbr:cart-updated")
    );
  }

  function getCartCount() {
    return getCart().reduce(
      (total, item) =>
        total + toSafeQuantity(item.quantity),
      0
    );
  }

  function getCartTotal() {
    return getCart().reduce(
      (total, item) => {
        const quantity = toSafeQuantity(item.quantity);

        const unitPrice = toSafeNumber(
          item.unitPrice ?? item.price ?? 0
        );

        const itemTotal = toSafeNumber(
          item.totalPrice,
          unitPrice * quantity
        );

        return total + itemTotal;
      },
      0
    );
  }


  /*
   * ADD ITEM
   */

  function addItem(item) {
    const cart = getCart();
    const next = normalizeItem(item);

    const existingIndex = cart.findIndex(
      (cartItem) =>
        cartItem.name === next.name &&
        cartItem.size === next.size &&
        JSON.stringify(cartItem.extras || []) ===
          JSON.stringify(next.extras || [])
    );

    if (existingIndex >= 0) {
      const existing = normalizeItem(
        cart[existingIndex]
      );

      existing.quantity += next.quantity;

      existing.totalPrice =
        existing.unitPrice * existing.quantity;

      cart[existingIndex] = existing;
    } else {
      cart.push(next);
    }

    saveCart(cart);

    console.log(
      "[Treats By Rich] Item added to cart:",
      next
    );

    return getCart();
  }


  /*
   * REMOVE ITEM
   */

  function removeItem(itemId) {
    const id = String(itemId);

    const next = getCart().filter(
      (item) => String(item.id) !== id
    );

    saveCart(next);

    return next;
  }


  /*
   * UPDATE QUANTITY
   */

  function updateQuantity(itemId, quantity) {
    const id = String(itemId);

    const nextQuantity = toSafeQuantity(quantity);

    const cart = getCart().map((item) => {
      if (String(item.id) !== id) {
        return item;
      }

      const normalized = normalizeItem(item);

      normalized.quantity = nextQuantity;

      normalized.totalPrice =
        normalized.unitPrice * nextQuantity;

      return normalized;
    });

    saveCart(cart);

    return cart;
  }


  /*
   * UPDATE ITEM
   */

  function updateItem(itemId, changes) {
    const id = String(itemId);

    const cart = getCart().map((item) => {
      if (String(item.id) !== id) {
        return item;
      }

      return normalizeItem(
        Object.assign(
          {},
          item,
          changes,
          { id: item.id }
        )
      );
    });

    saveCart(cart);

    return getCart();
  }


  /*
   * EDIT MODAL REFERENCES
   */

  let editingItemId = null;
  let editFocusReturnTarget = null;

  function getEditModalRefs() {
    return {
      modal: document.getElementById(
        "edit-item-modal"
      ),

      sizeGroup: document.querySelector(
        '[data-role="edit-size-options"]'
      ),

      extrasGroup: document.querySelector(
        '[data-role="edit-extra-options"]'
      ),

      quantityInput: document.getElementById(
        "edit-quantity"
      ),

      totalPriceNode: document.getElementById(
        "edit-total-price"
      )
    };
  }


  /*
   * RECALCULATE EDIT PRICE
   */

  function recalcEditPrice() {
    const {
      sizeGroup,
      extrasGroup,
      quantityInput,
      totalPriceNode
    } = getEditModalRefs();

    if (!sizeGroup || !totalPriceNode) {
      return;
    }

    const selectedSize = sizeGroup.querySelector(
      'input[name="edit-size"]:checked'
    );

    const sizePrice = selectedSize
      ? toSafeNumber(selectedSize.dataset.price)
      : 0;

    const extrasTotal = Array.from(
      extrasGroup
        ? extrasGroup.querySelectorAll(
            'input[type="checkbox"]'
          )
        : []
    )
      .filter((checkbox) => checkbox.checked)
      .reduce(
        (total, checkbox) =>
          total + toSafeNumber(checkbox.dataset.price),
        0
      );

    const quantity = toSafeQuantity(
      quantityInput?.value ?? 1
    );

    const total =
      (sizePrice + extrasTotal) * quantity;

    totalPriceNode.textContent = formatPrice(total);
  }


  /*
   * OPEN EDIT MODAL
   */

  function openEditModal(itemId, triggerElement) {
    const id = String(itemId);

    const item = getCart().find(
      (entry) => String(entry.id) === id
    );

    const {
      modal,
      sizeGroup,
      extrasGroup,
      quantityInput
    } = getEditModalRefs();

    if (
      !item ||
      !modal ||
      !sizeGroup ||
      !extrasGroup ||
      !quantityInput
    ) {
      console.warn(
        "[Treats By Rich] Edit modal or cart item could not be found."
      );

      return;
    }

    editingItemId = id;

    editFocusReturnTarget = triggerElement || null;


    /*
     * SIZE OPTIONS
     */

    sizeGroup.innerHTML = SIZE_OPTIONS.map(
      (option) => {
        const selected = option.value === item.size;

        return `
          <label class="option-card${
            selected ? " is-selected" : ""
          }">

            <input
              type="radio"
              name="edit-size"
              value="${escapeHtml(option.value)}"
              data-price="${option.price}"
              ${selected ? "checked" : ""}
            />

            <span class="option-title">
              ${escapeHtml(option.value)}
            </span>

            <small>
              ${formatPrice(option.price)}
            </small>

          </label>
        `;
      }
    ).join("");


    /*
     * EXTRA OPTIONS
     */

    extrasGroup.innerHTML = EXTRA_OPTIONS.map(
      (extra) => {
        const checked = item.extras.includes(
          extra.name
        );

        return `
          <label class="checkbox-card">

            <input
              type="checkbox"
              data-extra="${escapeHtml(extra.name)}"
              data-price="${extra.price}"
              ${checked ? "checked" : ""}
            />

            <span>
              ${escapeHtml(extra.name)}
            </span>

            <small>
              +${formatPrice(extra.price)}
            </small>

          </label>
        `;
      }
    ).join("");


    /*
     * QUANTITY
     */

    quantityInput.value = String(
      toSafeQuantity(item.quantity)
    );

    recalcEditPrice();


    /*
     * OPEN MODAL
     */

    modal.classList.add("open");

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add("modal-open");

    modal.querySelector(".icon-button")?.focus();
  }


  /*
   * CLOSE EDIT MODAL
   */

  function closeEditModal() {
    const { modal } = getEditModalRefs();

    if (!modal) {
      return;
    }

    modal.classList.remove("open");

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove("modal-open");

    editingItemId = null;

    if (
      editFocusReturnTarget &&
      typeof editFocusReturnTarget.focus === "function"
    ) {
      editFocusReturnTarget.focus();
    }

    editFocusReturnTarget = null;
  }


  /*
   * SAVE EDIT
   */

  function saveEditModal() {
    if (!editingItemId) {
      return;
    }

    const {
      sizeGroup,
      extrasGroup,
      quantityInput
    } = getEditModalRefs();

    const selectedSize = sizeGroup?.querySelector(
      'input[name="edit-size"]:checked'
    );

    if (!selectedSize) {
      console.warn(
        "[Treats By Rich] Please select a product size."
      );

      return;
    }

    const size = selectedSize.value;

    const sizePrice = toSafeNumber(
      selectedSize.dataset.price
    );

    const selectedExtras = Array.from(
      extrasGroup
        ? extrasGroup.querySelectorAll(
            'input[type="checkbox"]'
          )
        : []
    ).filter((checkbox) => checkbox.checked);

    const extras = selectedExtras.map(
      (checkbox) => checkbox.dataset.extra
    );

    const extrasTotal = selectedExtras.reduce(
      (total, checkbox) =>
        total + toSafeNumber(checkbox.dataset.price),
      0
    );

    const quantity = toSafeQuantity(
      quantityInput?.value ?? 1
    );

    const unitPrice = sizePrice + extrasTotal;

    updateItem(editingItemId, {
      size,
      extras,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity
    });

    closeEditModal();

    renderCartPage();

    updateGlobalCartCount();
  }


  /*
   * INITIALIZE EDIT MODAL EVENTS
   */

  function initEditModal() {
    const {
      modal,
      quantityInput
    } = getEditModalRefs();

    if (
      !modal ||
      modal.dataset.eventsBound === "true"
    ) {
      return;
    }

    modal.dataset.eventsBound = "true";


    /*
     * CLOSE BUTTONS AND BACKDROP
     */

    modal.addEventListener("click", (event) => {
      const closeButton = event.target.closest(
        '[data-action="close-edit"]'
      );

      if (
        closeButton &&
        modal.contains(closeButton)
      ) {
        event.preventDefault();

        closeEditModal();

        return;
      }

      if (event.target === modal) {
        closeEditModal();
      }
    });


    /*
     * SAVE
     */

    modal
      .querySelector('[data-action="save-edit"]')
      ?.addEventListener("click", (event) => {
        event.preventDefault();

        saveEditModal();
      });


    /*
     * DECREASE QUANTITY
     */

    modal
      .querySelector('[data-action="edit-decrease"]')
      ?.addEventListener("click", (event) => {
        event.preventDefault();

        if (!quantityInput) {
          return;
        }

        quantityInput.value = String(
          Math.max(
            1,
            toSafeQuantity(quantityInput.value) - 1
          )
        );

        recalcEditPrice();
      });


    /*
     * INCREASE QUANTITY
     */

    modal
      .querySelector('[data-action="edit-increase"]')
      ?.addEventListener("click", (event) => {
        event.preventDefault();

        if (!quantityInput) {
          return;
        }

        quantityInput.value = String(
          toSafeQuantity(quantityInput.value) + 1
        );

        recalcEditPrice();
      });


    /*
     * SIZE AND EXTRAS EVENTS
     */

    modal.addEventListener("change", (event) => {
      if (
        event.target.matches(
          'input[name="edit-size"]'
        )
      ) {
        modal
          .querySelectorAll(".option-card")
          .forEach((card) => {
            const input = card.querySelector("input");

            card.classList.toggle(
              "is-selected",
              Boolean(input?.checked)
            );
          });

        recalcEditPrice();
      }

      if (
        event.target.matches(
          '[data-role="edit-extra-options"] input[type="checkbox"]'
        )
      ) {
        recalcEditPrice();
      }
    });


    /*
     * MANUAL QUANTITY INPUT
     */

    quantityInput?.addEventListener(
      "input",
      recalcEditPrice
    );


    /*
     * ESC CLOSES MODAL
     */

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        modal.classList.contains("open")
      ) {
        closeEditModal();
      }
    });
  }


  /*
   * RENDER CART PAGE
   */

  function renderCartPage() {
    const cartContainer = document.getElementById(
      "cart-items"
    );

    const savedItemsContainer = document.getElementById(
      "saved-items"
    );

    const emptyState = document.querySelector(
      ".cart-empty-state"
    );

    const subtotalNode = document.querySelector(
      '[data-summary="subtotal"]'
    );

    const totalNode = document.querySelector(
      '[data-summary="estimated-total"]'
    );

    const discountNode = document.querySelector(
      '[data-summary="discount"]'
    );

    const deliveryNode = document.querySelector(
      '[data-summary="delivery"]'
    );

    const checkoutButton = document.querySelector(
      '[data-action="checkout"]'
    );

    const continueShoppingButton = document.querySelector(
      '[data-action="continue-shopping"]'
    );


    /*
     * STOP IF THIS IS NOT THE CART PAGE
     */

    if (
      !cartContainer ||
      !subtotalNode ||
      !totalNode
    ) {
      return;
    }

    const cart = getCart();

    cartContainer.innerHTML = "";


    /*
     * SAVED ITEMS PLACEHOLDER
     */

    if (savedItemsContainer) {
      savedItemsContainer.innerHTML =
        '<p class="empty-note">Saved items feature coming soon.</p>';
    }


    /*
     * EMPTY CART
     */

    if (cart.length === 0) {
      emptyState?.classList.remove("is-hidden");

      if (checkoutButton) {
        checkoutButton.disabled = true;

        checkoutButton.setAttribute(
          "aria-disabled",
          "true"
        );
      }
    } else {
      emptyState?.classList.add("is-hidden");

      if (checkoutButton) {
        checkoutButton.disabled = false;

        checkoutButton.removeAttribute(
          "aria-disabled"
        );
      }


      /*
       * CART ITEMS
       */

      cart.forEach((rawItem) => {
        const item = normalizeItem(rawItem);

        const row = document.createElement("article");

        row.className = "cart-item";

        row.innerHTML = `
          <img
            src="${escapeHtml(item.image)}"
            alt="${escapeHtml(item.name)}"
          />

          <div class="cart-item-body">

            <div class="cart-item-header">

              <div>
                <h3>
                  ${escapeHtml(item.name)}
                </h3>

                <p>
                  ${escapeHtml(item.size)}
                </p>
              </div>

              <div class="cart-item-actions">

                <button
                  class="text-button"
                  type="button"
                  data-action="edit"
                  data-id="${escapeHtml(item.id)}"
                >
                  Edit
                </button>

                <button
                  class="text-button"
                  type="button"
                  data-action="remove"
                  data-id="${escapeHtml(item.id)}"
                >
                  Remove
                </button>

              </div>

            </div>

            ${
              item.extras.length
                ? `
                  <p class="cart-item-extras">
                    + ${item.extras.map(escapeHtml).join(", ")}
                  </p>
                `
                : ""
            }

            <div class="cart-item-footer">

              <div
                class="cart-quantity-controls"
                role="group"
                aria-label="Change quantity"
              >

                <button
                  class="quantity-btn"
                  type="button"
                  data-action="decrease"
                  data-id="${escapeHtml(item.id)}"
                  aria-label="Decrease quantity"
                >
                  −
                </button>

                <span class="quantity-pill">
                  ${item.quantity}
                </span>

                <button
                  class="quantity-btn"
                  type="button"
                  data-action="increase"
                  data-id="${escapeHtml(item.id)}"
                  aria-label="Increase quantity"
                >
                  +
                </button>

              </div>

              <div class="cart-price-block">

                <small>
                  ${formatPrice(item.unitPrice)} each
                </small>

                <strong>
                  ${formatPrice(item.totalPrice)}
                </strong>

              </div>

            </div>

          </div>
        `;

        cartContainer.appendChild(row);
      });
    }


    /*
     * TOTALS
     *
     * Customers arrange and pay their own rider.
     * Treats By Rich does not charge a delivery fee.
     */

    const subtotal = getCartTotal();

    const discount =
      calculateChristmasDiscount(subtotal);

    const deliveryFee = 0;

    const estimatedTotal = Math.max(
      0,
      subtotal - discount + deliveryFee
    );

    subtotalNode.textContent = formatPrice(subtotal);

    if (discountNode) {
      discountNode.textContent =
        `−${formatPrice(discount)}`;
    }

    if (deliveryNode) {
      deliveryNode.textContent =
        formatPrice(deliveryFee);
    }

    totalNode.textContent =
      formatPrice(estimatedTotal);


    /*
     * CONTINUE SHOPPING
     */

    if (continueShoppingButton) {
      continueShoppingButton.disabled = false;
    }
  }


  /*
   * CART BUTTON EVENTS
   *
   * Event delegation keeps buttons working after
   * cart rows are re-rendered.
   */

  function handleCartClick(event) {
    const button = event.target.closest(
      "[data-action]"
    );

    if (!button) {
      return;
    }

    const action = button.dataset.action;

    const itemId = button.dataset.id;

    if (
      ![
        "edit",
        "remove",
        "decrease",
        "increase"
      ].includes(action)
    ) {
      return;
    }

    const cartContainer = document.getElementById(
      "cart-items"
    );

    if (
      !cartContainer ||
      !cartContainer.contains(button)
    ) {
      return;
    }

    event.preventDefault();


    /*
     * REMOVE
     */

    if (action === "remove") {
      if (itemId === undefined) {
        return;
      }

      removeItem(itemId);

      updateGlobalCartCount();

      return;
    }


    /*
     * EDIT
     */

    if (action === "edit") {
      if (itemId === undefined) {
        return;
      }

      openEditModal(itemId, button);

      return;
    }


    /*
     * FIND ITEM FOR QUANTITY UPDATE
     */

    const item = getCart().find(
      (entry) =>
        String(entry.id) === String(itemId)
    );

    if (!item) {
      return;
    }


    /*
     * DECREASE
     */

    if (action === "decrease") {
      updateQuantity(
        itemId,
        Math.max(
          1,
          toSafeQuantity(item.quantity) - 1
        )
      );

      updateGlobalCartCount();

      return;
    }


    /*
     * INCREASE
     */

    if (action === "increase") {
      updateQuantity(
        itemId,
        toSafeQuantity(item.quantity) + 1
      );

      updateGlobalCartCount();
    }
  }


  /*
   * CHECKOUT + CONTINUE SHOPPING
   */

  function handlePageActionClick(event) {
    const checkoutButton = event.target.closest(
      '[data-action="checkout"]'
    );

    if (checkoutButton) {
      event.preventDefault();

      const currentCart = getCart();

      if (
        !currentCart.length ||
        checkoutButton.disabled
      ) {
        return;
      }

      window.location.assign("checkout.html");

      return;
    }


    const continueButton = event.target.closest(
      '[data-action="continue-shopping"]'
    );

    if (continueButton) {
      event.preventDefault();

      window.location.assign("menu.html");
    }
  }


  /*
   * GLOBAL CART COUNT
   */

  function updateGlobalCartCount() {
    const count = getCartCount();

    document
      .querySelectorAll(".cart-count")
      .forEach((element) => {
        element.textContent = String(count);
      });
  }


  /*
   * CART UPDATE LISTENER
   */

  window.addEventListener(
    "tbr:cart-updated",
    () => {
      updateGlobalCartCount();

      if (
        document.getElementById("cart-items")
      ) {
        renderCartPage();
      }
    }
  );


  /*
   * PUBLIC API
   */

  window.getCart = getCart;

  window.saveCart = saveCart;

  window.clearCart = clearCart;

  window.addToCart = addItem;

  window.getCartTotal = getCartTotal;

  window.formatCartPrice = formatPrice;

  window.TBRCartAPI = {
    getCart,
    saveCart,
    clearCart,
    addItem,
    removeItem,
    updateQuantity,
    updateItem,
    getCartCount,
    getCartTotal
  };


  /*
   * INITIALIZE
   */

  function initCartPage() {
    initEditModal();

    const cartContainer = document.getElementById(
      "cart-items"
    );

    if (
      cartContainer &&
      cartContainer.dataset.eventsBound !== "true"
    ) {
      cartContainer.dataset.eventsBound = "true";

      cartContainer.addEventListener(
        "click",
        handleCartClick
      );
    }

    if (
      document.documentElement.dataset.cartPageActionsBound !==
      "true"
    ) {
      document.documentElement.dataset.cartPageActionsBound =
        "true";

      document.addEventListener(
        "click",
        handlePageActionClick
      );
    }

    renderCartPage();

    updateGlobalCartCount();
  }


  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initCartPage,
      { once: true }
    );
  } else {
    initCartPage();
  }

})();
