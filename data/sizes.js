"use strict";

(function registerSizes(globalScope) {
  const sizes = [
    { id: "size-255ml", label: "255ml", capacity: 255, priceAdjustment: 0, isAvailable: true },
    { id: "size-355ml", label: "355ml", capacity: 355, priceAdjustment: 8, isAvailable: true },
    { id: "size-500ml", label: "500ml", capacity: 500, priceAdjustment: 18, isAvailable: true },
    { id: "size-700ml", label: "700ml", capacity: 700, priceAdjustment: 28, isAvailable: true },
    { id: "size-750ml", label: "750ml", capacity: 750, priceAdjustment: 34, isAvailable: true }
  ];

  globalScope.TBRData = globalScope.TBRData || {};
  globalScope.TBRData.sizes = sizes;
})(window);
