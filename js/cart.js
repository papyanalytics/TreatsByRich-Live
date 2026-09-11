/* =========================================================
   Treats By Rich
   Cart Data Layer + Cart Page
   ========================================================= */

(function initCart() {
  "use strict";

  /*
   * =========================================================
   * STORAGE
   * =========================================================
   */

  const storageKey =
    window.APP_CONFIG?.cartStorageKey ||
    "tbrCart";


  /*
   * =========================================================
   * PRODUCT OPTIONS
   * =========================================================
   */

  const SIZE_OPTIONS = [
    {
      value: "255ml",
      price: 80
    },
    {
      value: "355ml",
      price: 110
    },
    {
      value: "500ml",
      price: 155
    },
    {
      value: "700ml",
      price: 299
    },
    {
      value: "750ml",
      price: 310
    }
  ];


  const EXTRA_OPTIONS = [
    {
      name: "Cashew",
      price: 25
    },
    {
      name: "Almond",
      price: 25
    },
    {
      name: "Coco Flakes",
      price: 25
    },
    {
      name: "Crispy Bis",
      price: 25
    },
    {
      name: "Extra Yogurt",
      price: 25
    }
  ];


  /*
   * =========================================================
   * CART STORAGE
   * =========================================================
   */

  function parseCart() {
    const raw =
      localStorage.getItem(
        storageKey
      );

    try {
      return raw
        ? JSON.parse(raw)
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
      JSON.stringify(items)
    );

    window.dispatchEvent(
      new CustomEvent(
        "tbr:cart-updated"
      )
    );
  }


  /*
   * =========================================================
   * NORMALIZE CART ITEM
   * =========================================================
   */

  function normalizeItem(input) {
    input =
      input || {};

    const quantity =
      Math.max(
        1,
        Number(
          input.quantity || 1
        )
      );


    const unitPrice =
      Number(
        input.unitPrice ??
          input.price ??
          0
      );


    const totalPrice =
      Number(
        input.totalPrice ??
          unitPrice * quantity
      );


    function toText(
      value,
      fallback
    ) {
      return value ===
        undefined ||
        value === null
        ? fallback
        : String(value);
    }


    return {
      id: toText(
        input.id,
        `${
          input.name ||
          "item"
        }-${Date.now()}-${Math.random()
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

      extras:
        Array.isArray(
          input.extras
        )
          ? input.extras.filter(
              Boolean
            )
          : [],

      quantity,

      unitPrice,

      totalPrice
    };
  }


  /*
   * =========================================================
   * PRICE FORMAT
   * =========================================================
   */

  function formatPrice(value) {
    if (
      typeof window.formatCurrency ===
      "function"
    ) {
      return window.formatCurrency(
        value
      );
    }

    return `GH₵${Number(
      value || 0
    ).toFixed(2)}`;
  }


  /*
   * =========================================================
   * PUBLIC CART FUNCTIONS
   * =========================================================
   */

  function getCart() {
    return parseCart();
  }


  function saveCart(items) {
    persistCart(
      (items || []).map(
        normalizeItem
      )
    );
  }


  function clearCart() {
    localStorage.removeItem(
      storageKey
    );

    window.dispatchEvent(
      new CustomEvent(
        "tbr:cart-updated"
      )
    );
  }


  function getCartCount() {
    return getCart().reduce(
      (
        total,
        item
      ) =>
        total +
        Math.max(
          1,
          Number(
            item.quantity || 1
          )
        ),
      0
    );
  }


  function getCartTotal() {
    return getCart().reduce(
      (
        total,
        item
      ) => {
        const itemTotal =
          Number(
            item.totalPrice ??
              Number(
                item.unitPrice ||
                  item.price ||
                  0
              ) *
                Number(
                  item.quantity ||
                    1
                )
          );

        return (
          total +
          itemTotal
        );
      },
      0
    );
  }


  /*
   * =========================================================
   * ADD ITEM
   * =========================================================
   */

  function addItem(item) {
    const cart =
      getCart();

    const next =
      normalizeItem(
        item
      );


    const existingIndex =
      cart.findIndex(
        (
          cartItem
        ) =>
          cartItem.name ===
            next.name &&
          cartItem.size ===
            next.size &&
          JSON.stringify(
            cartItem.extras ||
              []
          ) ===
            JSON.stringify(
              next.extras ||
                []
            )
      );


    if (
      existingIndex >= 0
    ) {
      const existing =
        normalizeItem(
          cart[
            existingIndex
          ]
        );

      existing.quantity +=
        next.quantity;

      existing.totalPrice =
        existing.unitPrice *
        existing.quantity;

      cart[
        existingIndex
      ] = existing;
    } else {
      cart.push(
        next
      );
    }


    saveCart(
      cart
    );


    console.log(
      "[Treats By Rich] Item added to cart:",
      next
    );


    return cart;
  }


  /*
   * =========================================================
   * REMOVE ITEM
   * =========================================================
   */

  function removeItem(
    itemId
  ) {
    const next =
      getCart().filter(
        (item) =>
          item.id !==
          itemId
      );

    saveCart(
      next
    );
  }


  /*
   * =========================================================
   * UPDATE QUANTITY
   * =========================================================
   */

  function updateQuantity(
    itemId,
    quantity
  ) {
    const nextQuantity =
      Math.max(
        1,
        Number(
          quantity || 1
        )
      );


    const cart =
      getCart().map(
        (item) => {
          if (
            item.id !==
            itemId
          ) {
            return item;
          }


          const normalized =
            normalizeItem(
              item
            );


          normalized.quantity =
            nextQuantity;


          normalized.totalPrice =
            normalized.unitPrice *
            nextQuantity;


          return normalized;
        }
      );


    saveCart(
      cart
    );
  }


  /*
   * =========================================================
   * UPDATE ITEM
   * =========================================================
   */

  function updateItem(
    itemId,
    changes
  ) {
    const cart =
      getCart().map(
        (item) => {
          if (
            item.id !==
            itemId
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


    saveCart(
      cart
    );


    return cart;
  }


  /*
   * =========================================================
   * RENDER CART
   * =========================================================
   */

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

    const continueShoppingButton =
      document.querySelector(
        '[data-action="continue-shopping"]'
      );


    /*
     * Stop if this page does not
     * contain the cart elements.
     */

    if (
      !cartContainer ||
      !subtotalNode ||
      !totalNode
    ) {
      return;
    }


    const cart =
      getCart();


    /*
     * Clear old rendered items.
     */

    cartContainer.innerHTML =
      "";


    /*
     * Saved items placeholder.
     */

    if (
      savedItemsContainer
    ) {
      savedItemsContainer.innerHTML =
        '<p class="empty-note">Saved items feature coming soon.</p>';
    }


    /*
     * =======================================================
     * EMPTY CART
     * =======================================================
     */

    if (
      !cart.length
    ) {
      if (
        emptyState
      ) {
        emptyState.classList.remove(
          "is-hidden"
        );
      }


      if (
        checkoutButton
      ) {
        checkoutButton.disabled =
          true;
      }


      /*
       * Continue Shopping should
       * still work when the cart
       * is empty.
       */

      if (
        continueShoppingButton
      ) {
        continueShoppingButton.disabled =
          false;
      }
    }


    /*
     * =======================================================
     * CART WITH ITEMS
     * =======================================================
     */

    else {
      if (
        emptyState
      ) {
        emptyState.classList.add(
          "is-hidden"
        );
      }


      if (
        checkoutButton
      ) {
        checkoutButton.disabled =
          false;
      }


      cart.forEach(
        (item) => {
          const row =
            document.createElement(
              "article"
            );


          row.className =
            "cart-item";


          row.innerHTML = `
            <img
              src="${escapeHtml(
                item.image
              )}"
              alt="${escapeHtml(
                item.name
              )}"
            />

            <div class="cart-item-body">

              <div class="cart-item-header">

                <div>
                  <h3>
                    ${escapeHtml(
                      item.name
                    )}
                  </h3>

                  <p>
                    ${escapeHtml(
                      item.size
                    )}
                  </p>
                </div>

                <div class="cart-item-actions">

                  <button
                    class="text-button"
                    type="button"
                    data-action="edit"
                    data-id="${escapeHtml(
                      item.id
                    )}"
                  >
                    Edit
                  </button>

                  <button
                    class="text-button"
                    type="button"
                    data-action="remove"
                    data-id="${escapeHtml(
                      item.id
                    )}"
                  >
                    Remove
                  </button>

                </div>

              </div>


              ${
                item.extras &&
                item.extras.length
                  ? `
                    <p class="cart-item-extras">
                      + ${item.extras
                        .map(
                          escapeHtml
                        )
                        .join(
                          ", "
                        )}
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
                    data-id="${escapeHtml(
                      item.id
                    )}"
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
                    data-id="${escapeHtml(
                      item.id
                    )}"
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


          cartContainer.appendChild(
            row
          );
        }
      );
    }


    /*
     * =======================================================
     * TOTALS
     * =======================================================
     *
     * Treats By Rich does NOT charge
     * a delivery fee.
     *
     * Customers arrange and pay
     * their own rider.
     */

    const subtotal =
      getCartTotal();


    subtotalNode.textContent =
      formatPrice(
        subtotal
      );


    totalNode.textContent =
      formatPrice(
        subtotal
      );


    /*
     * =======================================================
     * REMOVE BUTTONS
     * =======================================================
     */

    cartContainer
      .querySelectorAll(
        '[data-action="remove"]'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              removeItem(
                button.dataset.id
              );

              renderCartPage();

              updateGlobalCartCount();
            }
          );
        }
      );


    /*
     * =======================================================
     * EDIT BUTTONS
     * =======================================================
     */

    cartContainer
      .querySelectorAll(
        '[data-action="edit"]'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              openEditModal(
                button.dataset.id,
                button
              );
            }
          );
        }
      );


    /*
     * =======================================================
     * DECREASE QUANTITY
     * =======================================================
     */

    cartContainer
      .querySelectorAll(
        '[data-action="decrease"]'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              const item =
                getCart().find(
                  (
                    entry
                  ) =>
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
                  item.quantity -
                    1
                )
              );


              renderCartPage();

              updateGlobalCartCount();
            }
          );
        }
      );


    /*
     * =======================================================
     * INCREASE QUANTITY
     * =======================================================
     */

    cartContainer
      .querySelectorAll(
        '[data-action="increase"]'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              const item =
                getCart().find(
                  (
                    entry
                  ) =>
                    entry.id ===
                    button.dataset.id
                );


              if (!item) {
                return;
              }


              updateQuantity(
                button.dataset.id,
                item.quantity +
                  1
              );


              renderCartPage();

              updateGlobalCartCount();
            }
          );
        }
      );


    /*
     * =======================================================
     * CHECKOUT
     * =======================================================
     */

    if (
      checkoutButton
    ) {
      checkoutButton.onclick =
        () => {
          const currentCart =
            getCart();


          if (
            !currentCart.length
          ) {
            return;
          }


          window.location.href =
            "checkout.html";
        };
    }


    /*
     * =======================================================
     * CONTINUE SHOPPING
     * =======================================================
     *
     * IMPORTANT:
     * This does NOT clear the cart.
     *
     * The customer returns to Menu
     * with everything still in the cart.
     */

    if (
      continueShoppingButton
    ) {
      continueShoppingButton.onclick =
        () => {
          window.location.href =
            "menu.html";
        };
    }
  }


  /*
   * =========================================================
   * ESCAPE HTML
   * =========================================================
   */

  function escapeHtml(
    value
  ) {
    return String(
      value ?? ""
    ).replace(
      /[&<>"']/g,
      (char) => ({
        "&":
          "&amp;",
        "<":
          "&lt;",
        ">":
          "&gt;",
        '"':
          "&quot;",
        "'":
          "&#39;"
      }[char])
    );
  }


  /*
   * =========================================================
   * EDIT MODAL
   * =========================================================
   */

  let editingItemId =
    null;

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


  /*
   * =========================================================
   * EDIT PRICE
   * =========================================================
   */

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
          (
            checkbox
          ) =>
            checkbox.checked
        )
        .reduce(
          (
            total,
            checkbox
          ) =>
            total +
            Number(
              checkbox.dataset
                .price ||
                0
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


    const total =
      (sizePrice +
        extrasTotal) *
      quantity;


    totalPriceNode.textContent =
      formatPrice(
        total
      );
  }


  /*
   * =========================================================
   * OPEN EDIT MODAL
   * =========================================================
   */

  function openEditModal(
    itemId,
    triggerElement
  ) {
    const item =
      getCart().find(
        (
          entry
        ) =>
          entry.id ===
          itemId
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
      triggerElement ||
      null;


    /*
     * SIZE OPTIONS
     */

    sizeGroup.innerHTML =
      SIZE_OPTIONS.map(
        (option) => {
          const selected =
            option.value ===
            item.size;


          return `
            <label
              class="option-card${
                selected
                  ? " is-selected"
                  : ""
              }"
            >

              <input
                type="radio"
                name="edit-size"
                value="${escapeHtml(
                  option.value
                )}"
                data-price="${option.price}"
                ${
                  selected
                    ? "checked"
                    : ""
                }
              />

              <span class="option-title">
                ${escapeHtml(
                  option.value
                )}
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


    /*
     * EXTRA OPTIONS
     */

    extrasGroup.innerHTML =
      EXTRA_OPTIONS.map(
        (extra) => {
          const checked =
            item.extras.includes(
              extra.name
            );


          return `
            <label class="checkbox-card">

              <input
                type="checkbox"
                data-extra="${escapeHtml(
                  extra.name
                )}"
                data-price="${extra.price}"
                ${
                  checked
                    ? "checked"
                    : ""
                }
              />

              <span>
                ${escapeHtml(
                  extra.name
                )}
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


    /*
     * QUANTITY
     */

    quantityInput.value =
      String(
        item.quantity
      );


    /*
     * SIZE EVENTS
     */

    sizeGroup
      .querySelectorAll(
        'input[name="edit-size"]'
      )
      .forEach(
        (input) => {
          input.addEventListener(
            "change",
            () => {
              sizeGroup
                .querySelectorAll(
                  ".option-card"
                )
                .forEach(
                  (
                    card
                  ) => {
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


              recalcEditPrice();
            }
          );
        }
      );


    /*
     * EXTRA EVENTS
     */

    extrasGroup
      .querySelectorAll(
        'input[type="checkbox"]'
      )
      .forEach(
        (
          checkbox
        ) => {
          checkbox.addEventListener(
            "change",
            recalcEditPrice
          );
        }
      );


    recalcEditPrice();


    /*
     * OPEN MODAL
     */

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


  /*
   * =========================================================
   * CLOSE EDIT MODAL
   * =========================================================
   */

  function closeEditModal() {
    const {
      modal
    } =
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


    editingItemId =
      null;


    if (
      editFocusReturnTarget &&
      typeof editFocusReturnTarget.focus ===
        "function"
    ) {
      editFocusReturnTarget.focus();
    }


    editFocusReturnTarget =
      null;
  }


  /*
   * =========================================================
   * SAVE EDIT
   * =========================================================
   */

  function saveEditModal() {
    if (
      !editingItemId
    ) {
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
              .price ||
              0
          )
        : 0;


    const selectedExtras =
      Array.from(
        extrasGroup
          ? extrasGroup.querySelectorAll(
              'input[type="checkbox"]'
            )
          : []
      ).filter(
        (
          checkbox
        ) =>
          checkbox.checked
      );


    const extras =
      selectedExtras.map(
        (
          checkbox
        ) =>
          checkbox.dataset
            .extra
      );


    const extrasTotal =
      selectedExtras.reduce(
        (
          total,
          checkbox
        ) =>
          total +
          Number(
            checkbox.dataset
              .price ||
              0
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


    updateGlobalCartCount();
  }


  /*
   * =========================================================
   * EDIT MODAL EVENTS
   * =========================================================
   */

  function initEditModal() {
    const {
      modal,
      quantityInput
    } =
      getEditModalRefs();


    if (!modal) {
      return;
    }


    /*
     * Close buttons
     */

    modal
      .querySelectorAll(
        '[data-action="close-edit"]'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            closeEditModal
          );
        }
      );


    /*
     * Save
     */

    modal
      .querySelector(
        '[data-action="save-edit"]'
      )
      ?.addEventListener(
        "click",
        saveEditModal
      );


    /*
     * Decrease
     */

    modal
      .querySelector(
        '[data-action="edit-decrease"]'
      )
      ?.addEventListener(
        "click",
        () => {
          if (
            !quantityInput
          ) {
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


    /*
     * Increase
     */

    modal
      .querySelector(
        '[data-action="edit-increase"]'
      )
      ?.addEventListener(
        "click",
        () => {
          if (
            !quantityInput
          ) {
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


    /*
     * Manual quantity input
     */

    quantityInput?.addEventListener(
      "input",
      recalcEditPrice
    );


    /*
     * ESC closes modal
     */

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
            "Escape" &&
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
   * =========================================================
   * GLOBAL CART COUNT
   * =========================================================
   */

  function updateGlobalCartCount() {
    const count =
      getCartCount();


    document
      .querySelectorAll(
        ".cart-count"
      )
      .forEach(
        (element) => {
          element.textContent =
            String(
              count
            );
        }
      );
  }


  /*
   * =========================================================
   * CART UPDATE LISTENER
   * =========================================================
   */

  window.addEventListener(
    "tbr:cart-updated",
    () => {
      updateGlobalCartCount();


      /*
       * If we're currently
       * on the cart page,
       * refresh the cart.
       */

      if (
        document.getElementById(
          "cart-items"
        )
      ) {
        renderCartPage();
      }
    }
  );


  /*
   * =========================================================
   * PUBLIC API
   * =========================================================
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


  /*
   * =========================================================
   * INITIALIZE
   * =========================================================
   */

  function initCartPage() {
    initEditModal();

    renderCartPage();

    updateGlobalCartCount();
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