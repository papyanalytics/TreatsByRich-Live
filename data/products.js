"use strict";

(function registerProducts(globalScope) {
  const products = [
    {
      id: "prd-heavenly-combo",
      name: "Heavenly Combo",
      description: "Signature layered parfait with fruit and crunchy textures.",
      basePrice: 95,
      image: "",
      isAvailable: true,
      categoryId: "cat-parfait",
      ingredientIds: [
        "ing-greek-yogurt",
        "ing-granola",
        "ing-strawberries",
        "ing-banana",
        "ing-cashews"
      ],
      sizeIds: ["size-255ml", "size-355ml", "size-500ml", "size-700ml"],
      extraIds: ["ext-cashew", "ext-almond", "ext-coco-flakes", "ext-extra-yogurt"]
    },
    {
      id: "prd-fruity-fresh",
      name: "Fruity Fresh",
      description: "Bright fruit-forward parfait with clean sweetness.",
      basePrice: 88,
      image: "",
      isAvailable: true,
      categoryId: "cat-healthy-choice",
      ingredientIds: [
        "ing-greek-yogurt",
        "ing-blueberries",
        "ing-kiwi",
        "ing-green-grapes",
        "ing-honey"
      ],
      sizeIds: ["size-255ml", "size-355ml", "size-500ml"],
      extraIds: ["ext-honey", "ext-extra-yogurt", "ext-coco-flakes"]
    },
    {
      id: "prd-biscuit-bliss",
      name: "Biscuit Bliss",
      description: "Crunch-heavy parfait with rich layers.",
      basePrice: 90,
      image: "",
      isAvailable: true,
      categoryId: "cat-kids",
      ingredientIds: [
        "ing-greek-yogurt",
        "ing-granola",
        "ing-chocolate-chunks",
        "ing-banana"
      ],
      sizeIds: ["size-255ml", "size-355ml", "size-500ml", "size-700ml", "size-750ml"],
      extraIds: ["ext-crispy-bis", "ext-chocolate-drizzle", "ext-extra-yogurt"]
    },
    {
      id: "prd-choco-craze",
      name: "Choco Craze",
      description: "Dessert-style parfait with chocolate richness.",
      basePrice: 98,
      image: "",
      isAvailable: true,
      categoryId: "cat-limited-edition",
      ingredientIds: [
        "ing-greek-yogurt",
        "ing-oats",
        "ing-chocolate-chunks",
        "ing-chocolate-drizzle",
        "ing-almonds"
      ],
      sizeIds: ["size-355ml", "size-500ml", "size-700ml"],
      extraIds: ["ext-chocolate-drizzle", "ext-crispy-bis", "ext-almond"]
    },
    {
      id: "prd-oatmeal-parfait",
      name: "Oatmeal Parfait",
      description: "Balanced, filling parfait ideal for breakfast.",
      basePrice: 84,
      image: "",
      isAvailable: true,
      categoryId: "cat-seasonal",
      ingredientIds: [
        "ing-greek-yogurt",
        "ing-oats",
        "ing-apples",
        "ing-walnuts",
        "ing-honey"
      ],
      sizeIds: ["size-255ml", "size-355ml", "size-500ml"],
      extraIds: ["ext-honey", "ext-cashew", "ext-extra-yogurt"]
    }
  ];

  globalScope.TBRData = globalScope.TBRData || {};
  globalScope.TBRData.products = products;
})(window);
