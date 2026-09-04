import { collection, onSnapshot, query } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { db, configOk } from "../config/firebaseConfig.js";

// Menu page behavior for Treats By Rich. Scoped in an IIFE so its variables
// never collide with other scripts sharing this page (cart.js, app.js).
(function initMenuPage() {
const header = document.querySelector('.site-header');
const backToTopButton = document.querySelector('.back-to-top');
const revealItems = document.querySelectorAll('.reveal');
const cartCountElements = document.querySelectorAll('.cart-count');
const searchBox = document.getElementById('menu-search');
const filterChips = document.querySelectorAll('.chip');
const quantityInput = document.getElementById('quantity');
const quantityButtons = document.querySelectorAll('.quantity-btn');
const sizeOptions = document.querySelectorAll('input[name="size"]');
const extraOptions = document.querySelectorAll('.checkbox-card input');
const totalPriceElement = document.getElementById('total-price');
const priceCaptionElement = document.getElementById('price-caption');

let activeFilter = 'all';
let currentSearch = '';
let basePrice = 80;
let quantity = 1;

function updateCartCount() {
  const count = window.TBRCartAPI?.getCartCount ? window.TBRCartAPI.getCartCount() : 0;
  cartCountElements.forEach((element) => {
    element.textContent = String(count);
  });
}

function setActiveChip(selectedChip) {
  filterChips.forEach((chip) => chip.classList.toggle('is-active', chip === selectedChip));
}

function applyMenuFilters() {
  document.querySelectorAll('.menu-card').forEach((card) => {
    const matchesCategory = activeFilter === 'all' || card.dataset.category.includes(activeFilter);
    const text = (card.dataset.search || '').toLowerCase();
    const matchesSearch = text.includes(currentSearch.toLowerCase());
    const isVisible = matchesCategory && matchesSearch;
    card.classList.toggle('is-hidden', !isVisible);
    card.dataset.hidden = String(!isVisible);
    card.style.display = isVisible ? 'flex' : 'none';
  });
}

// Category values line up with the admin product form's Category/Type field.
const CATEGORY_LABELS = {
  'best-seller': 'Best Seller',
  fruit: 'Fruit',
  chocolate: 'Chocolate',
  healthy: 'Healthy',
  crunchy: 'Crunchy'
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function buildFirestoreCardHtml(product) {
  const category = product.category || 'fruit';
  const badgeLabel = CATEGORY_LABELS[category] || 'New';
  const categories = [category];
  if (product.featured === 'yes' && category !== 'best-seller') categories.push('best-seller');
  const searchText = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  const image = product.imageDataUrl || 'images/menu/heavenly-combo.png';
  const price = Number(product.basePrice || 0);
  const safeName = escapeHtml(product.name || 'Treat Item');

  return `
    <article class="menu-card" data-category="${escapeHtml(categories.join(' '))}" data-search="${escapeHtml(searchText)}" data-firestore-id="${product.id}">
      <div class="menu-card-media">
        <img src="${image}" alt="${safeName}" loading="lazy" />
        <span class="floating-badge">${escapeHtml(badgeLabel)}</span>
      </div>
      <div class="menu-card-body">
        <h3>${safeName}</h3>
        <p>${escapeHtml(product.description || '')}</p>
        <div class="menu-card-meta">
          <strong>Starting at ₵${price}</strong>
          <div class="menu-actions">
            <button class="button button-ghost-dark button-small add-to-cart" type="button" data-product="${safeName}" data-price="${price}" data-image="${image}">Add to Cart</button>
          </div>
        </div>
      </div>
    </article>`;
}

function renderFirestoreProducts(products) {
  const container = document.getElementById('firestoreMenuCards');
  if (!container) return;
  container.innerHTML = products.map(buildFirestoreCardHtml).join('');
  applyMenuFilters();
}

/** Firestore /products is the single source of truth; only available items show here. */
function subscribeFirestoreProducts() {
  if (!configOk || !db) return;
  onSnapshot(
    query(collection(db, 'products')),
    (snapshot) => {
      const products = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((product) => product.availability !== 'unavailable');
      renderFirestoreProducts(products);
    },
    () => {
      // Firestore unreachable: keep showing the existing static menu items only.
    }
  );
}

function updatePrice() {
  if (!totalPriceElement) return;

  const selectedSize = document.querySelector('input[name="size"]:checked');
  const base = selectedSize ? Number(selectedSize.dataset.price) : basePrice;
  const extrasTotal = Array.from(extraOptions).reduce((total, checkbox) => {
    return checkbox.checked ? total + Number(checkbox.dataset.price || 0) : total;
  }, 0);

  const total = (base + extrasTotal) * quantity;
  totalPriceElement.textContent = `₵${total}`;

  if (priceCaptionElement) {
    const sizeLabel = selectedSize ? selectedSize.value : '255ml';
    priceCaptionElement.textContent = `For ${sizeLabel}`;
  }

  if (window.TBRProductDetails?.refresh) {
    window.TBRProductDetails.refresh();
  }
}

function attachProductInteractions() {
  if (quantityInput) {
    quantityInput.addEventListener('input', () => {
      quantity = Math.max(1, Number(quantityInput.value) || 1);
      updatePrice();
    });
  }

  quantityButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      quantity = Math.max(1, quantity + (action === 'increase' ? 1 : -1));
      if (quantityInput) {
        quantityInput.value = quantity;
      }
      updatePrice();
    });
  });

  sizeOptions.forEach((option) => {
    option.addEventListener('change', () => {
      document.querySelectorAll('.option-card').forEach((card) => {
        card.classList.toggle('is-selected', card.querySelector('input')?.checked);
      });
      updatePrice();
    });
  });

  extraOptions.forEach((option) => {
    option.addEventListener('change', updatePrice);
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.add-to-cart');
    if (!button) return;

    const selectedSize = document.querySelector('input[name="size"]:checked');
    const selectedSizeValue = selectedSize?.value || button.dataset.size || '255ml';
    const selectedBasePrice = Number(selectedSize?.dataset.price || button.dataset.price || 80);
    const selectedExtras = Array.from(extraOptions)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.dataset.extra || checkbox.parentElement?.textContent?.trim());
    const selectedQuantity = Number(quantityInput?.value || quantity || 1);
    const extrasTotal = Array.from(extraOptions).reduce((total, checkbox) => {
      return checkbox.checked ? total + Number(checkbox.dataset.price || 0) : total;
    }, 0);
    const imageSource = button.dataset.image || document.querySelector('.product-media img')?.getAttribute('src') || document.querySelector('.menu-card img')?.getAttribute('src') || 'images/menu/heavenly-combo.png';
    const normalizedImage = imageSource.replace(/^\.\//, '').replace(/^\.\.\//, '');

    window.TBRCartAPI?.addItem({
      name: button.dataset.product || document.querySelector('h1')?.textContent?.trim() || 'Treats By Rich Parfait',
      image: normalizedImage,
      size: selectedSizeValue,
      extras: selectedExtras,
      unitPrice: selectedBasePrice + extrasTotal / Math.max(selectedQuantity, 1),
      quantity: selectedQuantity,
      totalPrice: (selectedBasePrice + extrasTotal) * selectedQuantity
    });

    updateCartCount();
    button.classList.add('is-loading');
    button.textContent = 'Added';
    window.setTimeout(() => {
      button.classList.remove('is-loading');
      button.textContent = button.dataset.product ? 'Add To Cart' : 'Add to Cart';
    }, 900);
  });
}

function updateHeaderState() {
  if (header) {
    header.classList.toggle('scrolled', window.scrollY > 24);
  }

  if (backToTopButton) {
    backToTopButton.classList.toggle('is-visible', window.scrollY > 700);
  }
}

if (searchBox) {
  searchBox.addEventListener('input', (event) => {
    currentSearch = event.target.value.trim();
    applyMenuFilters();
    searchBox.classList.toggle('is-valid', currentSearch.length > 0);
  });
}

filterChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    activeFilter = chip.dataset.filter || 'all';
    setActiveChip(chip);
    applyMenuFilters();
  });
});

// Nav toggle is handled globally in app.js; avoid a second listener that double-toggles it here.

if (backToTopButton) {
  backToTopButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

window.addEventListener('scroll', updateHeaderState, { passive: true });
updateHeaderState();
updateCartCount();
attachProductInteractions();
updatePrice();
applyMenuFilters();
subscribeFirestoreProducts();
})();
