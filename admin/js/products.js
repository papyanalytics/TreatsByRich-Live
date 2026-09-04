// Treats By Rich Admin — Products page controller.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { requireAuth, initLogoutButtons } from "./auth.js";
import { initSidebar, initTopbar, renderNotifications, showToast, initModal } from "./dashboard.js";
import { db, configOk } from "./firebase-config.js";

// Legacy localStorage key, kept only to migrate any records saved before Firestore was connected.
const LEGACY_PRODUCTS_KEY = "treatsByRichProducts";

let currentProducts = [];
let editingProductId = null;
let searchTerm = "";

// ---- Firestore data layer ----
function subscribeProducts(onData) {
  if (!configOk || !db) {
    onData([]);
    return () => {};
  }
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
    () => {
      showToast("Could not load products from the database.", "error");
      onData([]);
    }
  );
}

async function createProductDoc(payload) {
  if (!configOk || !db) throw new Error("Firestore is not connected. The product was not saved.");
  await addDoc(collection(db, "products"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

async function updateProductDoc(id, changes) {
  if (!configOk || !db) throw new Error("Firestore is not connected. The change was not saved.");
  await updateDoc(doc(db, "products", id), { ...changes, updatedAt: serverTimestamp() });
}

async function deleteProductDoc(id) {
  if (!configOk || !db) throw new Error("Firestore is not connected. The product was not deleted.");
  await deleteDoc(doc(db, "products", id));
}

/** One-time upload of any products saved locally before Firestore was connected. */
async function migrateLegacyProducts() {
  if (!configOk || !db) return;
  let legacy = [];
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_PRODUCTS_KEY) || "[]");
  } catch (error) {
    legacy = [];
  }
  if (!Array.isArray(legacy) || !legacy.length) return;

  for (const item of legacy) {
    const { id, ...rest } = item;
    try {
      await createProductDoc(rest);
    } catch (error) {
      // Leave the legacy copy in place if migration fails; try again next load.
      return;
    }
  }
  localStorage.removeItem(LEGACY_PRODUCTS_KEY);
}

// ---- Rendering ----
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function renderProductsList() {
  const tableWrap = document.getElementById("productsTable");
  const emptyState = document.getElementById("productsEmpty");
  const tbody = document.getElementById("productsBody");
  if (!tableWrap || !emptyState || !tbody) return;

  const term = searchTerm.toLowerCase();
  const products = currentProducts.filter((product) => !term || product.name.toLowerCase().includes(term));

  if (!products.length) {
    tableWrap.style.display = "none";
    emptyState.style.display = "grid";
    return;
  }

  tableWrap.style.display = "block";
  emptyState.style.display = "none";
  tbody.innerHTML = products
    .map((product) => {
      const image = product.imageDataUrl
        ? `<img src="${product.imageDataUrl}" alt="${escapeHtml(product.name)}" style="width: 44px; height: 44px; border-radius: 10px; object-fit: cover;" />`
        : `<span style="width: 44px; height: 44px; border-radius: 10px; background: var(--cream); display: inline-block;"></span>`;
      const available = product.availability !== "unavailable";
      return `
      <tr data-product-id="${product.id}">
        <td>${image}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>GH₵${Number(product.basePrice || 0).toFixed(2)}</td>
        <td>${(product.sizes || []).map(escapeHtml).join(", ") || "&mdash;"}</td>
        <td>${product.featured === "yes" ? "Yes" : "No"}</td>
        <td>
          <button type="button" class="btn btn-ghost availability-toggle-btn" data-id="${product.id}">
            ${available ? "Available" : "Unavailable"}
          </button>
        </td>
        <td style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-ghost edit-product-btn" data-id="${product.id}">Edit</button>
          <button type="button" class="btn btn-ghost delete-product-btn" data-id="${product.id}">Delete</button>
        </td>
      </tr>`;
    })
    .join("");
}

// ---- Add/Edit modal ----
function getCheckedValues(groupId) {
  return Array.from(document.querySelectorAll(`#${groupId} input:checked`)).map((input) => input.value);
}

function setCheckedValues(groupId, values = []) {
  document.querySelectorAll(`#${groupId} input`).forEach((input) => {
    input.checked = values.includes(input.value);
    input.closest(".chip-checkbox")?.classList.toggle("is-checked", input.checked);
  });
}

function initChipCheckboxes() {
  document.querySelectorAll(".chip-checkbox input").forEach((input) => {
    input.addEventListener("change", () => {
      input.closest(".chip-checkbox")?.classList.toggle("is-checked", input.checked);
    });
  });
}

function readImageAsDataUrl(fileInput) {
  return new Promise((resolve) => {
    const file = fileInput.files?.[0];
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function fillProductForm(product) {
  document.getElementById("productName").value = product.name || "";
  document.getElementById("productCategory").value = product.category || "best-seller";
  document.getElementById("productDescription").value = product.description || "";
  document.getElementById("productBasePrice").value = product.basePrice ?? "";
  document.getElementById("productAvailability").value = product.availability || "available";
  document.getElementById("productFeatured").value = product.featured || "no";
  setCheckedValues("sizesGroup", product.sizes || []);
  setCheckedValues("extrasGroup", product.extras || []);
}

function resetProductForm() {
  document.getElementById("productForm").reset();
  setCheckedValues("sizesGroup", []);
  setCheckedValues("extrasGroup", []);
  document.getElementById("productFormError").classList.remove("is-visible");
  document.getElementById("productImage").value = "";
}

function initProductModal() {
  const modal = initModal("productModal");
  const form = document.getElementById("productForm");
  const errorBox = document.getElementById("productFormError");
  const modalTitle = document.getElementById("productModalTitle");
  const imageInput = document.getElementById("productImage");

  initChipCheckboxes();

  document.getElementById("addProductBtn")?.addEventListener("click", () => {
    editingProductId = null;
    resetProductForm();
    modalTitle.textContent = "Add Product";
    modal.open();
  });

  document.getElementById("productsBody")?.addEventListener("click", async (event) => {
    const editBtn = event.target.closest(".edit-product-btn");
    const deleteBtn = event.target.closest(".delete-product-btn");
    const availabilityBtn = event.target.closest(".availability-toggle-btn");

    if (editBtn) {
      const product = currentProducts.find((item) => item.id === editBtn.dataset.id);
      if (!product) return;
      editingProductId = product.id;
      resetProductForm();
      fillProductForm(product);
      modalTitle.textContent = "Edit Product";
      modal.open();
    }

    if (deleteBtn) {
      if (!confirm("Delete this product? This cannot be undone.")) return;
      try {
        await deleteProductDoc(deleteBtn.dataset.id);
        showToast("Product deleted.");
      } catch (error) {
        showToast(error.message, "error");
      }
    }

    if (availabilityBtn) {
      const product = currentProducts.find((item) => item.id === availabilityBtn.dataset.id);
      if (!product) return;
      const nextAvailability = product.availability === "unavailable" ? "available" : "unavailable";
      try {
        await updateProductDoc(product.id, { availability: nextAvailability });
        showToast(`Marked ${nextAvailability}.`);
      } catch (error) {
        showToast(error.message, "error");
      }
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("productName").value.trim();
    const basePrice = document.getElementById("productBasePrice").value;
    const sizes = getCheckedValues("sizesGroup");

    if (!name || !basePrice || !sizes.length) {
      errorBox.textContent = "Product name, base price and at least one size are required.";
      errorBox.classList.add("is-visible");
      return;
    }

    const existing = editingProductId ? currentProducts.find((item) => item.id === editingProductId) : null;
    const imageDataUrl = (await readImageAsDataUrl(imageInput)) || existing?.imageDataUrl || null;

    const productData = {
      name,
      category: document.getElementById("productCategory").value,
      description: document.getElementById("productDescription").value.trim(),
      basePrice: Number(basePrice),
      availability: document.getElementById("productAvailability").value,
      featured: document.getElementById("productFeatured").value,
      sizes,
      extras: getCheckedValues("extrasGroup"),
      imageDataUrl
    };

    try {
      if (editingProductId) {
        await updateProductDoc(editingProductId, productData);
        showToast("Product updated.");
      } else {
        await createProductDoc(productData);
        showToast("Product added.");
      }
      modal.close();
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.add("is-visible");
    }
  });
}

function initSearch() {
  document.getElementById("productSearch")?.addEventListener("input", (event) => {
    searchTerm = event.target.value.trim();
    renderProductsList();
  });
}

requireAuth(() => {
  initSidebar();
  initTopbar();
  initLogoutButtons();
  renderNotifications([]);
  initProductModal();
  initSearch();
  migrateLegacyProducts().finally(() => {
    subscribeProducts((products) => {
      currentProducts = products;
      renderProductsList();
    });
  });
});
