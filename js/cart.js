/* Cart data layer + cart page rendering for Treats By Rich. */
(function initCart() {
  const storageKey =
    window.APP_CONFIG?.cartStorageKey || "tbrCart";

  // Mirrors the size/extras options offered on every product detail page.
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

  function parseCart() {
    const raw = localStorage.getItem(storageKey);

    try {
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  }

  function persistCart(items) {
    localStorage.setItem(
      storageKey,
      JSON.stringify(items)
    );

    window.dispatchEvent(
      new CustomEvent("tbr:cart-updated")
    );
  }

  function normalizeItem(input) {
    const quantity = Math.max(
      1,
      Number(input.quantity || 1)
    );

    const unitPrice = Number(
      input.unitPrice ||
        input.price ||
        0
    );

    const totalPrice = Number(
      input.totalPrice ||
        unitPrice * quantity
    );

    const toText = function (value, fallback) {
      return value === undefined ||
        value === null
        ? fallback
        : String(value);
    };

    return {
      id: toText(
        input.id,
        `${input.name || "item"}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`
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

  function formatPrice(value) {
    if (window.formatCurrency) {
      return window.formatCurrency(value);
    }

    return `GH₵${Number(value || 0).toFixed(2)}`;
  }

  function getCart() {
    return parseCart();
  }

  function saveCart(items) {
    persistCart(
      (items || []).map(normalizeItem)
    );
  }

  function clearCart() {
    localStorage.removeItem(storageKey);

    window.dispatchEvent(
      new CustomEvent("tbr:cart-updated")
    );
  }

  function getCartCount() {
    return getCart().reduce(
      (sum, item) =>
        sum +
        Math.max(
          1,
          Number(item.quantity || 1)
        ),
      0
    );
  }

  function getCartTotal() {
    return getCart().reduce(
      (sum, item) => {
        const total = Number(
          item.totalPrice ||
            Number(
              item.unitPrice ||
                item.price ||
                0
            ) *
              Number(
                item.quantity || 1
              )
        );

        return sum + total;
      },
      0
    );
  }

  function addItem(item) {
    const cart = getCart();

    const next = normalizeItem(
      item || {}
    );

    const existingIndex =
      cart.findIndex(
        (cartItem) =>
          cartItem.name === next.name &&
          cartItem.size === next.size &&
          JSON.stringify(
            cartItem.extras || []
          ) ===
            JSON.stringify(
              next.extras || []
            )
      );

    if (existingIndex >= 0) {
      const existing =
        normalizeItem(
          cart[existingIndex]
        );

      existing.quantity +=
        next.quantity;

      existing.totalPrice =
        existing.unitPrice *
        existing.quantity;

      cart[existingIndex] =
        existing;
    } else {
      cart.push(next);
    }

    saveCart(cart);

    return cart;
  }

  function removeItem(itemId) {
    const next = getCart().filter(
      (item) =>
        item.id !== itemId
    );

    saveCart(next);
  }

  function updateQuantity(
    itemId,
    quantity
  ) {
    const nextQty = Math.max(
      1,
      Number(quantity || 1)
    );

    const cart = getCart().map(
      (item) => {
        if (
          item.id !== itemId
        ) {
          return item;
        }

        const normalized =
          normalizeItem(item);

        normalized.quantity =
          nextQty;

        normalized.totalPrice =
          normalized.unitPrice *
          nextQty;

        return normalized;
      }
    );

    saveCart(cart);
  }

  function updateItem(
    itemId,
    changes
  ) {
    const cart = getCart().map(
      (item) => {
        if (
          item.id !== itemId
        ) {
          return item;
        }

        return normalizeItem(
          Object.assign(
            {},
            item,
            changes,
            {
              id: item.id
            }
          )
        );
      }
    );

    saveCart(cart);

    return cart;
  }

  function renderCartPage() {
    const cartContainer =
      document.getElementById(
        "cart-items"
      );

    const savedItemsContainer =
      document.getElementById(
        "saved-items"
      );

    const emptyState =
      document.querySelector(
        ".cart-empty-state"
      );

    const subtotalNode =
      document.querySelector(
        '[data-summary="subtotal"]'
      );

    const totalNode =
      document.querySelector(
        '[data-summary="estimated-total"]'
      );

    const checkoutButton =
      document.querySelector(
        '[data-action="checkout"]'
      );

    if (
      !cartContainer ||
      !subtotalNode ||
      !totalNode
    ) {
      return;
    }

    const cart = getCart();

    cartContainer.innerHTML = "";

    if (savedItemsContainer) {
      savedItemsContainer.innerHTML =
        '<p class="empty-note">Saved items feature coming soon.</p>';
    }

    if (!cart.length) {
      if (emptyState) {
        emptyState.classList.remove(
          "is-hidden"
        );
      }

      if (checkoutButton) {
        checkoutButton.disabled =
          true;
      }
    } else {
      if (emptyState) {
        emptyState.classList.add(
          "is-hidden"
        );
      }

      if (checkoutButton) {
        checkoutButton.disabled =
          false;
      }

      cart.forEach((item) => {
        const row =
          document.createElement(
            "article"
          );

        row.className =
          "cart-item";

        row.innerHTML = `
          <img
            src="${item.image}"
            alt="${item.name}"
          />

          <div class="cart-item-body">

            <div class="cart-item-header">
              <div>
                <h3>${item.name}</h3>
                <p>${item.size}</p>
              </div>

              <div class="cart-item-actions">
                <button
                  class="text-button"
                  type="button"
                  data-action="edit"
                  data-id="${item.id}"
                >
                  Edit
                </button>

                <button
                  class="text-button"
                  type="button"
                  data-action="remove"
                  data-id="${item.id}"
                >
                  Remove
                </button>
              </div>
            </div>

            ${
              item.extras.length
                ? `
                  <p class="cart-item-extras">
                    + ${item.extras.join(", ")}
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
                  data-id="${item.id}"
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
                  data-id="${item.id}"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <div class="cart-price-block">
                <small>
                  ${formatPrice(
                    item.unitPrice
                  )} each
                </small>

                <strong>
                  ${formatPrice(
                    item.totalPrice
                  )}
                </strong>
              </div>

            </div>
          </div>
        `;

        cartContainer.appendChild(row);
      });
    }

    /*
     * Treats By Rich does NOT provide delivery.
     * Customers arrange and pay for their own
     * preferred delivery service.
     *
     * Therefore:
     * Total = Subtotal
     *
     * No delivery fee is added here.
     */

    const subtotal =
      getCartTotal();

    subtotalNode.textContent =
      formatPrice(subtotal);

    totalNode.textContent =
      formatPrice(subtotal);

    /*
     * Remove item
     */
    cartContainer
      .querySelectorAll(
        '[data-action="remove"]'
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            removeItem(
              button.dataset.id
            );

            renderCartPage();
          }
        );
      });

    /*
     * Edit item
     */
    cartContainer
      .querySelectorAll(
        '[data-action="edit"]'
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            openEditModal(
              button.dataset.id,
              button
            );
          }
        );
      });

    /*
     * Decrease quantity
     */
    cartContainer
      .querySelectorAll(
        '[data-action="decrease"]'
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const item =
              getCart().find(
                (entry) =>
                  entry.id ===
                  button.dataset.id
              );

            if (!item) {
              return;
            }

            updateQuantity(
              button.dataset.id,
              Math.max(
                1,
                item.quantity - 1
              )
            );

            renderCartPage();
          }
        );
      });

    /*
     * Increase quantity
     */
    cartContainer
      .querySelectorAll(
        '[data-action="increase"]'
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const item =
              getCart().find(
                (entry) =>
                  entry.id ===
                  button.dataset.id
              );

            if (!item) {
              return;
            }

            updateQuantity(
              button.dataset.id,
              item.quantity + 1
            );

            renderCartPage();
          }
        );
      });

    /*
     * Checkout
     */
    if (checkoutButton) {
      checkoutButton.onclick =
        function () {
          if (!getCart().length) {
            return;
          }

          window.location.href =
            "checkout.html";
        };
    }
  }

  let editingItemId = null;
  let editFocusReturnTarget =
    null;

  function getEditModalRefs() {
    return {
      modal:
        document.getElementById(
          "edit-item-modal"
        ),

      sizeGroup:
        document.querySelector(
          '[data-role="edit-size-options"]'
        ),

      extrasGroup:
        document.querySelector(
          '[data-role="edit-extra-options"]'
        ),

      quantityInput:
        document.getElementById(
          "edit-quantity"
        ),

      totalPriceNode:
        document.getElementById(
          "edit-total-price"
        )
    };
  }

  function recalcEditPrice() {
    const {
      sizeGroup,
      extrasGroup,
      quantityInput,
      totalPriceNode
    } =
      getEditModalRefs();

    if (
      !sizeGroup ||
      !totalPriceNode
    ) {
      return;
    }

    const selectedSize =
      sizeGroup.querySelector(
        'input[name="edit-size"]:checked'
      );

    const sizePrice =
      selectedSize
        ? Number(
            selectedSize.dataset
              .price || 0
          )
        : 0;

    const extrasTotal =
      Array.from(
        extrasGroup
          ? extrasGroup.querySelectorAll(
              'input[type="checkbox"]'
            )
          : []
      )
        .filter(
          (checkbox) =>
            checkbox.checked
        )
        .reduce(
          (sum, checkbox) =>
            sum +
            Number(
              checkbox.dataset
                .price || 0
            ),
          0
        );

    const quantity =
      Math.max(
        1,
        Number(
          quantityInput?.value ||
            1
        )
      );

    totalPriceNode.textContent =
      formatPrice(
        (sizePrice +
          extrasTotal) *
          quantity
      );
  }

  function openEditModal(
    itemId,
    triggerElement
  ) {
    const item =
      getCart().find(
        (entry) =>
          entry.id === itemId
      );

    const {
      modal,
      sizeGroup,
      extrasGroup,
      quantityInput
    } =
      getEditModalRefs();

    if (
      !item ||
      !modal ||
      !sizeGroup ||
      !extrasGroup ||
      !quantityInput
    ) {
      return;
    }

    editingItemId =
      itemId;

    editFocusReturnTarget =
      triggerElement || null;

    sizeGroup.innerHTML =
      SIZE_OPTIONS.map(
        (option) => {
          const isSelected =
            option.value ===
            item.size;

          return `
            <label
              class="option-card${
                isSelected
                  ? " is-selected"
                  : ""
              }"
            >
              <input
                type="radio"
                name="edit-size"
                value="${option.value}"
                data-price="${option.price}"
                ${
                  isSelected
                    ? "checked"
                    : ""
                }
              />

              <span class="option-title">
                ${option.value}
              </span>

              <small>
                ${formatPrice(
                  option.price
                )}
              </small>
            </label>
          `;
        }
      ).join("");

    extrasGroup.innerHTML =
      EXTRA_OPTIONS.map(
        (extra) => {
          const isChecked =
            item.extras.includes(
              extra.name
            );

          return `
            <label class="checkbox-card">

              <input
                type="checkbox"
                data-extra="${extra.name}"
                data-price="${extra.price}"
                ${
                  isChecked
                    ? "checked"
                    : ""
                }
              />

              <span>
                ${extra.name}
              </span>

              <small>
                +${formatPrice(
                  extra.price
                )}
              </small>

            </label>
          `;
        }
      ).join("");

    quantityInput.value =
      String(item.quantity);

    sizeGroup
      .querySelectorAll(
        'input[name="edit-size"]'
      )
      .forEach((input) => {
        input.addEventListener(
          "change",
          () => {
            sizeGroup
              .querySelectorAll(
                ".option-card"
              )
              .forEach(
                (card) => {
                  card.classList.toggle(
                    "is-selected",
                    card.querySelector(
                      "input"
                    )?.checked
                  );
                }
              );

            recalcEditPrice();
          }
        );
      });

    extrasGroup
      .querySelectorAll(
        'input[type="checkbox"]'
      )
      .forEach((checkbox) => {
        checkbox.addEventListener(
          "change",
          recalcEditPrice
        );
      });

    recalcEditPrice();

    modal.classList.add(
      "open"
    );

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "modal-open"
    );

    modal
      .querySelector(
        ".icon-button"
      )
      ?.focus();
  }

  function closeEditModal() {
    const { modal } =
      getEditModalRefs();

    if (!modal) {
      return;
    }

    modal.classList.remove(
      "open"
    );

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "modal-open"
    );

    editingItemId = null;

    editFocusReturnTarget?.focus();

    editFocusReturnTarget =
      null;
  }

  function saveEditModal() {
    if (!editingItemId) {
      return;
    }

    const {
      sizeGroup,
      extrasGroup,
      quantityInput
    } =
      getEditModalRefs();

    const selectedSize =
      sizeGroup?.querySelector(
        'input[name="edit-size"]:checked'
      );

    const size =
      selectedSize
        ? selectedSize.value
        : "255ml";

    const sizePrice =
      selectedSize
        ? Number(
            selectedSize.dataset
              .price || 0
          )
        : 0;

    const extras =
      Array.from(
        extrasGroup
          ? extrasGroup.querySelectorAll(
              'input[type="checkbox"]'
            )
          : []
      )
        .filter(
          (checkbox) =>
            checkbox.checked
        )
        .map(
          (checkbox) =>
            checkbox.dataset.extra
        );

    const extrasTotal =
      Array.from(
        extrasGroup
          ? extrasGroup.querySelectorAll(
              'input[type="checkbox"]'
            )
          : []
      )
        .filter(
          (checkbox) =>
            checkbox.checked
        )
        .reduce(
          (sum, checkbox) =>
            sum +
            Number(
              checkbox.dataset
                .price || 0
            ),
          0
        );

    const quantity =
      Math.max(
        1,
        Number(
          quantityInput?.value ||
            1
        )
      );

    const unitPrice =
      sizePrice +
      extrasTotal;

    updateItem(
      editingItemId,
      {
        size,
        extras,
        quantity,
        unitPrice,
        totalPrice:
          unitPrice *
          quantity
      }
    );

    closeEditModal();

    renderCartPage();
  }

  function initEditModal() {
    const {
      modal,
      quantityInput
    } =
      getEditModalRefs();

    if (!modal) {
      return;
    }

    modal
      .querySelectorAll(
        '[data-action="close-edit"]'
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          closeEditModal
        );
      });

    modal
      .querySelector(
        '[data-action="save-edit"]'
      )
      ?.addEventListener(
        "click",
        saveEditModal
      );

    modal
      .querySelector(
        '[data-action="edit-decrease"]'
      )
      ?.addEventListener(
        "click",
        () => {
          if (!quantityInput) {
            return;
          }

          quantityInput.value =
            String(
              Math.max(
                1,
                Number(
                  quantityInput.value ||
                    1
                ) - 1
              )
            );

          recalcEditPrice();
        }
      );

    modal
      .querySelector(
        '[data-action="edit-increase"]'
      )
      ?.addEventListener(
        "click",
        () => {
          if (!quantityInput) {
            return;
          }

          quantityInput.value =
            String(
              Math.max(
                1,
                Number(
                  quantityInput.value ||
                    1
                ) + 1
              )
            );

          recalcEditPrice();
        }
      );

    quantityInput?.addEventListener(
      "input",
      recalcEditPrice
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          modal.classList.contains(
            "open"
          )
        ) {
          closeEditModal();
        }
      }
    );
  }

  /*
   * Public Cart API
   */
  window.getCart =
    getCart;

  window.saveCart =
    saveCart;

  window.clearCart =
    clearCart;

  window.addToCart =
    addItem;

  window.getCartTotal =
    getCartTotal;

  window.formatCartPrice =
    formatPrice;

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

  function initCartPage() {
    initEditModal();
    renderCartPage();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initCartPage
    );
  } else {
    initCartPage();
  }
})();