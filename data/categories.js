"use strict";

(function registerCategories(globalScope) {
  const categories = [
    { id: "cat-parfait", name: "Parfait", isAvailable: true },
    { id: "cat-seasonal", name: "Seasonal", isAvailable: true },
    { id: "cat-limited-edition", name: "Limited Edition", isAvailable: true },
    { id: "cat-healthy-choice", name: "Healthy Choice", isAvailable: true },
    { id: "cat-kids", name: "Kids", isAvailable: true }
  ];

  globalScope.TBRData = globalScope.TBRData || {};
  globalScope.TBRData.categories = categories;
})(window);
