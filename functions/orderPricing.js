
export const PRODUCT_SIZE_PRICES = Object.freeze({
  "255ml": 80,
  "355ml": 110,
  "500ml": 155,
  "700ml": 299,
  "750ml": 310
});

export const PRODUCT_EXTRAS = Object.freeze({
  Cashew: 25,
  Almond: 25,
  "Coco Flakes": 25,
  "Crispy Bis": 25,
  "Extra Yogurt": 25
});

export const STATIC_PRODUCTS = Object.freeze([
  { id: "heavenly-combo", name: "Heavenly Combo" },
  { id: "fruity-fresh", name: "Fruity Fresh" },
  { id: "biscuit-bliss", name: "Biscuit Bliss" },
  { id: "choco-craze", name: "Choco Craze" },
  { id: "oatmeal-parfait", name: "Oatmeal Parfait" }
]);

// Christmas promotion: 5% off product subtotals above GH₵200
export const CHRISTMAS_PROMOTION = Object.freeze({
  id: "christmas-5-percent-over-200",
  name: "Christmas discount",
  rate: 5,
  threshold: 200
});

export function findStaticProduct(productId, productName) {
  const normalizedId =
    String(productId || "").trim().toLowerCase();

  const normalizedName =
    String(productName || "").trim().toLowerCase();

  return STATIC_PRODUCTS.find(
    (product) =>
      product.id === normalizedId ||
      product.name.toLowerCase() === normalizedName
  ) || null;
}

export function priceOrderItem(item, product) {
  if (!item || typeof item !== "object" || !product) {
    throw new Error("An order item could not be matched to a product.");
  }

  const size = String(item.size || "").trim();
  const sizePrice = PRODUCT_SIZE_PRICES[size];

  if (sizePrice === undefined) {
    throw new Error(`The selected size "${size}" is not available.`);
  }

  const quantity = Number(item.quantity ?? 1);

  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 1000
  ) {
    throw new Error(
      "Each item quantity must be a whole number from 1 to 1000."
    );
  }

  const requestedExtras = item.extras ?? [];

  if (!Array.isArray(requestedExtras)) {
    throw new Error("Selected extras are invalid.");
  }

  const extras = requestedExtras.map((value) => {
    const requested = String(value || "").trim().toLowerCase();

    const canonicalName = Object.keys(PRODUCT_EXTRAS).find(
      (name) => name.toLowerCase() === requested
    );

    if (!canonicalName) {
      throw new Error(`The selected extra "${value}" is not available.`);
    }

    return canonicalName;
  });

  if (new Set(extras).size !== extras.length) {
    throw new Error("An extra cannot be selected more than once.");
  }

  const unitPrice =
    sizePrice +
    extras.reduce(
      (sum, extra) => sum + PRODUCT_EXTRAS[extra],
      0
    );

  return {
    productId: product.id,
    productName: product.name,
    size,
    quantity,
    extras,
    price: unitPrice,
    unitPrice,
    totalPrice: unitPrice * quantity
  };
}

export function calculatePromotionTotals(
  subtotal,
  deliveryFee = 0
) {
  const subtotalCents = Math.max(
    0,
    Math.round(Number(subtotal) * 100)
  );

  const deliveryFeeCents = Math.max(
    0,
    Math.round(Number(deliveryFee) * 100)
  );

  // Promotion applies only when subtotal is strictly above GH₵200.
  const qualifies =
    subtotalCents > CHRISTMAS_PROMOTION.threshold * 100;

  const discountCents = qualifies
    ? Math.round(
        subtotalCents * CHRISTMAS_PROMOTION.rate / 100
      )
    : 0;

  return {
    subtotal: subtotalCents / 100,
    deliveryFee: deliveryFeeCents / 100,
    discount: discountCents / 100,
    grandTotal:
      (subtotalCents + deliveryFeeCents - discountCents) / 100,
    promotion: {
      ...CHRISTMAS_PROMOTION,
      applied: discountCents > 0
    }
  };
}
