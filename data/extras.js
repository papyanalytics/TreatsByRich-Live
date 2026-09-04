"use strict";

(function registerExtras(globalScope) {
  const extras = [
    { id: "ext-cashew", name: "Cashew", price: 8, isAvailable: true },
    { id: "ext-almond", name: "Almond", price: 8, isAvailable: true },
    { id: "ext-coco-flakes", name: "Coco Flakes", price: 6, isAvailable: true },
    { id: "ext-crispy-bis", name: "Crispy Bis", price: 6, isAvailable: true },
    { id: "ext-extra-yogurt", name: "Extra Yogurt", price: 10, isAvailable: true },
    { id: "ext-honey", name: "Honey", price: 5, isAvailable: true },
    { id: "ext-chocolate-drizzle", name: "Chocolate Drizzle", price: 7, isAvailable: true }
  ];

  globalScope.TBRData = globalScope.TBRData || {};
  globalScope.TBRData.extras = extras;
})(window);
