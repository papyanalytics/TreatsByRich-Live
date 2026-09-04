export const ROUTES = {
  public: {
    home: "../index.html",
    menu: "../menu.html",
    cart: "../cart.html",
    checkout: "../checkout.html",
    tracking: "../order-tracking.html",
    orderSuccess: "../order-success.html"
  },
  admin: {
    login: "login.html",
    dashboard: "dashboard.html",
    orders: "orders.html",
    products: "products.html",
    customers: "customers.html",
    analytics: "analytics.html",
    settings: "settings.html"
  }
};

export const ROLE_ROUTE_ACCESS = {
  Admin: ["dashboard", "orders", "products", "customers", "analytics", "settings"],
  Manager: ["dashboard", "orders", "products", "customers", "analytics"],
  Staff: ["dashboard", "orders", "customers"]
};
