
import test from "node:test";
import assert from "node:assert/strict";

import {
  calculatePromotionTotals,
  priceOrderItem
} from "./orderPricing.js";

test("the promotion applies only when product subtotal is strictly above GH₵200", () => {
  const cases = [
    [180, 0],
    [200, 0],
    [200.01, 10],
    [250, 12.5],
    [300, 15],
    [400, 20]
  ];

  for (const [subtotal, expectedDiscount] of cases) {
    assert.equal(
      calculatePromotionTotals(subtotal).discount,
      expectedDiscount,
      `subtotal GH₵${subtotal}`
    );
  }
});

test("server pricing ignores client prices and calculates extras before discount", () => {
  const item = priceOrderItem(
    {
      productId: "untrusted-id",
      productName: "Untrusted name",
      size: "500ml",
      quantity: 2,
      extras: ["Cashew"],
      unitPrice: 0.01,
      totalPrice: 0.02
    },
    { id: "heavenly-combo", name: "Heavenly Combo" }
  );

  assert.equal(item.unitPrice, 180);
  assert.equal(item.totalPrice, 360);

  // 5% of GH₵360 = GH₵18
  assert.equal(
    calculatePromotionTotals(item.totalPrice).discount,
    18
  );
});

test("server pricing rejects unknown sizes, extras, and invalid quantities", () => {
  const product = {
    id: "fruity-fresh",
    name: "Fruity Fresh"
  };

  assert.throws(
    () => priceOrderItem(
      { size: "1L", quantity: 1 },
      product
    ),
    /size.*not available/
  );

  assert.throws(
    () => priceOrderItem(
      { size: "255ml", quantity: 1, extras: ["Gold"] },
      product
    ),
    /extra.*not available/
  );

  assert.throws(
    () => priceOrderItem(
      { size: "255ml", quantity: 1.5 },
      product
    ),
    /whole number/
  );
});

test("delivery fees remain outside the percentage discount", () => {
  assert.deepEqual(
    calculatePromotionTotals(250, 30),
    {
      subtotal: 250,
      deliveryFee: 30,
      discount: 12.5,
      grandTotal: 267.5,
      promotion: {
        id: "christmas-5-percent-over-200",
        name: "Christmas discount",
        rate: 5,
        threshold: 200,
        applied: true
      }
    }
  );
});
