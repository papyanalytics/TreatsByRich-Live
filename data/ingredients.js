"use strict";

(function registerIngredients(globalScope) {
  const ingredients = [
    { id: "ing-greek-yogurt", name: "Greek Yogurt", image: "", isAvailable: true },
    { id: "ing-granola", name: "Granola", image: "", isAvailable: true },
    { id: "ing-chia-seeds", name: "Chia Seeds", image: "", isAvailable: true },
    { id: "ing-strawberries", name: "Strawberries", image: "", isAvailable: true },
    { id: "ing-blueberries", name: "Blueberries", image: "", isAvailable: true },
    { id: "ing-kiwi", name: "Kiwi", image: "", isAvailable: true },
    { id: "ing-banana", name: "Banana", image: "", isAvailable: true },
    { id: "ing-red-grapes", name: "Red Grapes", image: "", isAvailable: true },
    { id: "ing-green-grapes", name: "Green Grapes", image: "", isAvailable: true },
    { id: "ing-apples", name: "Apples", image: "", isAvailable: true },
    { id: "ing-cashews", name: "Cashews", image: "", isAvailable: true },
    { id: "ing-almonds", name: "Almonds", image: "", isAvailable: true },
    { id: "ing-walnuts", name: "Walnuts", image: "", isAvailable: true },
    { id: "ing-coconut-flakes", name: "Coconut Flakes", image: "", isAvailable: true },
    { id: "ing-chocolate-chunks", name: "Chocolate Chunks", image: "", isAvailable: true },
    { id: "ing-chocolate-drizzle", name: "Chocolate Drizzle", image: "", isAvailable: true },
    { id: "ing-oats", name: "Oats", image: "", isAvailable: true },
    { id: "ing-honey", name: "Honey", image: "", isAvailable: true }
  ];

  globalScope.TBRData = globalScope.TBRData || {};
  globalScope.TBRData.ingredients = ingredients;
})(window);
