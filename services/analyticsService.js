import {
  collection,
  getDocs,
  onSnapshot,
  query
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { db, configOk } from "../config/firebaseConfig.js";

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function percent(part, whole) {
  if (!whole) return 0;
  return (part / whole) * 100;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function inCurrentDay(value, now) {
  const date = new Date(value);
  return startOfDay(date).getTime() === startOfDay(now).getTime();
}

function inCurrentWeek(value, now) {
  const date = new Date(value);
  const weekStart = startOfDay(now);
  weekStart.setDate(weekStart.getDate() - 6);
  return date >= weekStart && date <= now;
}

function inCurrentMonth(value, now) {
  const date = new Date(value);
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function inCurrentYear(value, now) {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear();
}

function inDateWindow(value, days, now) {
  if (days === "all") return true;
  const date = new Date(value);
  const diff = now - date;
  const dayMs = 1000 * 60 * 60 * 24;
  return diff <= Number(days) * dayMs;
}

function periodRevenue(orders) {
  return sum(orders.map((order) => order.grandTotal));
}

function growth(current, previous) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function normalizeOrder(item) {
  const totals = item.totals || {};
  const createdAt = item.createdAt?.toDate ? item.createdAt.toDate().toISOString() : item.createdAt;
  return {
    ...item,
    id: item.id,
    date: item.date || createdAt || new Date().toISOString(),
    grandTotal: Number(item.grandTotal || totals.grandTotal || item.total || 0),
    payment: item.payment || item.paymentMethod || "Cash",
    deliveryType: item.deliveryType || item.deliveryMethod || "Delivery",
    city: item.city || item.location || "Accra",
    quantity: Number(item.quantity || 1),
    productIds: Array.isArray(item.productIds) ? item.productIds : [],
    extraIds: Array.isArray(item.extraIds) ? item.extraIds : []
  };
}

function normalizeCustomer(item) {
  return {
    id: item.id,
    city: item.city || "Accra",
    customerType: item.customerType || "New",
    totalSpent: Number(item.totalSpent || 0),
    totalOrders: Number(item.totalOrders || 0),
    averageOrderValue: Number(item.averageOrderValue || 0)
  };
}

export function createAnalyticsService() {
  const store = {
    products: [],
    orders: [],
    customers: [],
    sizes: [],
    extras: [],
    categories: [],
    ingredients: []
  };

  let lastDashboard = null;

  async function loadCollection(name) {
    if (!configOk || !db) return [];
    const snapshots = await getDocs(query(collection(db, name)));
    return snapshots.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  }

  async function hydrate() {
    const [products, orders, customers, sizes, extras, categories, ingredients] = await Promise.all([
      loadCollection("products"),
      loadCollection("orders"),
      loadCollection("customers"),
      loadCollection("sizes"),
      loadCollection("extras"),
      loadCollection("categories"),
      loadCollection("ingredients")
    ]);

    store.products = products;
    store.orders = orders.map(normalizeOrder);
    store.customers = customers.map(normalizeCustomer);
    store.sizes = sizes;
    store.extras = extras;
    store.categories = categories;
    store.ingredients = ingredients;
  }

  function watchCoreCollections(onChange) {
    if (!configOk || !db) return () => {};

    const unsubs = ["orders", "products", "customers", "sizes", "extras", "categories", "ingredients"].map((name) =>
      onSnapshot(collection(db, name), (snapshot) => {
        const rows = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
        if (name === "orders") store.orders = rows.map(normalizeOrder);
        if (name === "products") store.products = rows;
        if (name === "customers") store.customers = rows.map(normalizeCustomer);
        if (name === "sizes") store.sizes = rows;
        if (name === "extras") store.extras = rows;
        if (name === "categories") store.categories = rows;
        if (name === "ingredients") store.ingredients = rows;
        onChange?.();
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }

  function byIdMap(items) {
    return new Map((items || []).map((item) => [item.id, item]));
  }

  function getFilterOptions() {
    return {
      dates: [
        { id: "7", label: "Last 7 days" },
        { id: "30", label: "Last 30 days" },
        { id: "90", label: "Last 90 days" },
        { id: "365", label: "Last 12 months" },
        { id: "all", label: "All time" }
      ],
      locations: ["All"].concat(Array.from(new Set(store.customers.map((item) => item.city))).sort()),
      products: [{ id: "all", label: "All" }].concat(store.products.map((item) => ({ id: item.id, label: item.name || item.title || "Product" }))),
      categories: [{ id: "all", label: "All" }].concat(store.categories.map((item) => ({ id: item.id, label: item.name || "Category" }))),
      payments: ["All", "Cash", "Mobile Money", "Card", "Online Payment"],
      customerTypes: ["All", "New", "Returning", "VIP", "Inactive"]
    };
  }

  function normalizePayment(payment) {
    if (payment === "Transfer") return "Online Payment";
    return payment;
  }

  function filterOrders(filters) {
    const now = new Date();
    const dateWindow = filters.date || "30";
    const productMap = byIdMap(store.products);
    const customerMap = byIdMap(store.customers);

    return store.orders.filter((order) => {
      const customer = customerMap.get(order.customerId);
      const productIds = order.productIds || [];
      const payment = normalizePayment(order.payment);

      const dateMatch = inDateWindow(order.date, dateWindow, now);
      const locationMatch = filters.location === "all" || order.city === filters.location;
      const productMatch = filters.productId === "all" || productIds.includes(filters.productId);
      const categoryMatch =
        filters.categoryId === "all" ||
        productIds.some((productId) => productMap.get(productId)?.categoryId === filters.categoryId);
      const paymentMatch = filters.payment === "all" || payment === filters.payment;
      const customerTypeMatch = filters.customerType === "all" || customer?.customerType === filters.customerType;

      return dateMatch && locationMatch && productMatch && categoryMatch && paymentMatch && customerTypeMatch;
    });
  }

  function buildSalesSeries(sourceOrders) {
    const now = new Date();

    const daySeries = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      const value = periodRevenue(
        sourceOrders.filter((order) => startOfDay(order.date).getTime() === startOfDay(date).getTime())
      );
      return { label: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), value };
    });

    const weekSeries = Array.from({ length: 8 }, (_, index) => {
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - (7 * (7 - index)));
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);
      const value = periodRevenue(
        sourceOrders.filter((order) => {
          const date = new Date(order.date);
          return date >= startDate && date <= endDate;
        })
      );
      return { label: `W${index + 1}`, value };
    });

    const monthSeries = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const value = periodRevenue(
        sourceOrders.filter((order) => {
          const orderDate = new Date(order.date);
          return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
        })
      );
      return { label: date.toLocaleDateString("en-GB", { month: "short" }), value };
    });

    const yearSeries = Array.from({ length: 4 }, (_, index) => {
      const year = now.getFullYear() - (3 - index);
      const value = periodRevenue(sourceOrders.filter((order) => new Date(order.date).getFullYear() === year));
      return { label: String(year), value };
    });

    return { daySeries, weekSeries, monthSeries, yearSeries };
  }

  function productAnalytics(sourceOrders) {
    if (!sourceOrders.length) return [];

    const totals = new Map();
    store.products.forEach((product) => {
      totals.set(product.id, { id: product.id, name: product.name || "Product", units: 0, revenue: 0 });
    });

    sourceOrders.forEach((order) => {
      const ids = order.productIds || [];
      if (!ids.length) return;
      const revenueShare = Number(order.grandTotal || 0) / ids.length;
      ids.forEach((id) => {
        const bucket = totals.get(id);
        if (!bucket) return;
        bucket.units += Math.max(1, Math.floor((order.quantity || 1) / ids.length));
        bucket.revenue += revenueShare;
      });
    });

    const ranked = Array.from(totals.values()).sort((a, b) => b.revenue - a.revenue);
    const topRevenue = ranked[0]?.revenue || 1;

    return ranked.map((item) => ({
      ...item,
      popularity: percent(item.revenue, topRevenue),
      growth: Number(store.products.find((product) => product.id === item.id)?.growth || 0),
      rating: Number(store.products.find((product) => product.id === item.id)?.rating || 0),
      repeatPurchase: 0
    }));
  }

  function sizeAnalytics(sourceOrders) {
    if (!sourceOrders.length) return [];

    return store.sizes
      .map((size) => {
        const scoped = sourceOrders.filter((order) => order.sizeId === size.id);
        const revenue = periodRevenue(scoped);
        return {
          id: size.id,
          label: size.label || size.name || "Size",
          units: sum(scoped.map((order) => order.quantity || 0)),
          revenue,
          percentage: percent(revenue, periodRevenue(sourceOrders))
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }

  function extrasAnalytics(sourceOrders) {
    if (!sourceOrders.length) return [];

    return store.extras
      .map((extra) => {
        const scoped = sourceOrders.filter((order) => (order.extraIds || []).includes(extra.id));
        const ordersCount = scoped.length;
        return {
          id: extra.id,
          name: extra.name || "Extra",
          orders: ordersCount,
          revenue: ordersCount * Number(extra.price || 0),
          popularity: percent(ordersCount, sourceOrders.length)
        };
      })
      .sort((a, b) => b.orders - a.orders);
  }

  function locationAnalytics(sourceOrders) {
    const cityMap = new Map();
    sourceOrders.forEach((order) => {
      const key = order.city || "Accra";
      const current = cityMap.get(key) || { city: key, revenue: 0, orders: 0, customers: new Set() };
      current.revenue += Number(order.grandTotal || 0);
      current.orders += 1;
      current.customers.add(order.customerId || order.phone || order.emailAddress);
      cityMap.set(key, current);
    });

    return Array.from(cityMap.values())
      .map((entry) => ({
        city: entry.city,
        revenue: entry.revenue,
        orders: entry.orders,
        customers: entry.customers.size,
        averageSpend: entry.orders ? entry.revenue / entry.orders : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  function statusAnalytics(sourceOrders) {
    if (!sourceOrders.length) return [];

    const statuses = ["Pending", "Preparing", "Quality Check", "Ready for Pickup", "Out For Delivery", "Delivered", "Cancelled"];
    return statuses.map((status) => {
      const count = sourceOrders.filter((order) => order.status === status).length;
      return {
        status,
        count,
        percentage: percent(count, sourceOrders.length)
      };
    });
  }

  function paymentAnalytics(sourceOrders) {
    if (!sourceOrders.length) return [];

    const payments = ["Cash", "Mobile Money", "Card", "Online Payment"];
    return payments.map((payment) => {
      const scoped = sourceOrders.filter((order) => normalizePayment(order.payment) === payment);
      const delivered = scoped.filter((order) => order.status === "Delivered").length;
      return {
        payment,
        orders: scoped.length,
        revenue: periodRevenue(scoped),
        successRate: percent(delivered, scoped.length)
      };
    });
  }

  function customerInsights(sourceOrders) {
    const byType = { New: 0, Returning: 0, VIP: 0, Inactive: 0 };
    const customerMap = byIdMap(store.customers);
    const uniqueCustomerIds = new Set(sourceOrders.map((order) => order.customerId).filter(Boolean));
    let averageOrders = 0;

    const scopedCustomers = store.customers.filter((customer) => uniqueCustomerIds.has(customer.id));
    scopedCustomers.forEach((customer) => {
      byType[customer.customerType] = (byType[customer.customerType] || 0) + 1;
      averageOrders += Number(customer.totalOrders || 0);
    });

    const clv = scopedCustomers.length ? sum(scopedCustomers.map((customer) => customer.totalSpent)) / scopedCustomers.length : 0;
    const avgSpend = scopedCustomers.length
      ? sum(scopedCustomers.map((customer) => customer.averageOrderValue || 0)) / scopedCustomers.length
      : 0;

    averageOrders = scopedCustomers.length ? averageOrders / scopedCustomers.length : 0;

    const repeatCustomers = Array.from(uniqueCustomerIds).filter((id) => {
      const customer = customerMap.get(id);
      return Number(customer?.totalOrders || 0) > 1;
    }).length;

    return {
      ...byType,
      customerLifetimeValue: clv,
      averageSpend: avgSpend,
      averageOrders,
      repeatRate: percent(repeatCustomers, scopedCustomers.length)
    };
  }

  function deliveryAnalytics(sourceOrders) {
    const completed = sourceOrders.filter((order) => order.status === "Delivered").length;
    const delayed = sourceOrders.filter((order) => order.status === "Cancelled").length;
    const pickup = sourceOrders.filter((order) => order.deliveryType === "Pickup").length;
    const delivery = sourceOrders.filter((order) => order.deliveryType !== "Pickup").length;
    const deliveredDurations = sourceOrders
      .filter((order) => order.status === "Delivered")
      .map((order) => {
        const from = new Date(order.createdAt || order.date).getTime();
        const to = new Date(order.updatedAt || order.date).getTime();
        if (!from || !to || Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
        return Math.round((to - from) / 60000);
      })
      .filter((minutes) => minutes > 0);

    const averageDeliveryTime = deliveredDurations.length
      ? sum(deliveredDurations) / deliveredDurations.length
      : 0;

    return {
      completed,
      delayed,
      pickup,
      delivery,
      averageDeliveryTime,
      deliveryRate: percent(delivery, sourceOrders.length),
      pickupRate: percent(pickup, sourceOrders.length)
    };
  }

  function inventoryInsights(topProducts) {
    const lowStock = (store.ingredients || [])
      .filter((item) => Number(item.quantity || 0) <= Number(item.lowStockThreshold || item.threshold || 0))
      .sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0))
      .slice(0, 6)
      .map((item) => ({
        name: item.name || item.id,
        remaining: Number(item.quantity || 0)
      }));

    const mostUsedIngredients = (store.ingredients || [])
      .slice()
      .sort((a, b) => Number(b.usedCount || b.usageCount || 0) - Number(a.usedCount || a.usageCount || 0))
      .slice(0, 6)
      .map((item) => ({
        name: item.name || item.id,
        units: Number(item.usedCount || item.usageCount || 0)
      }));

    const totalUsed = sum(mostUsedIngredients.map((item) => item.units));
    const totalRemaining = sum((store.ingredients || []).map((item) => Number(item.quantity || 0)));

    return {
      lowStock,
      mostUsedIngredients,
      inventoryTurnover: totalRemaining ? totalUsed / totalRemaining : 0,
      projectedRestock: lowStock.length ? "Immediate" : (topProducts.length ? "Monitor weekly" : "Stable")
    };
  }

  function topCustomers(sourceOrders) {
    const customerMap = byIdMap(store.customers);
    const totals = new Map();

    sourceOrders.forEach((order) => {
      const id = order.customerId || "guest";
      const bucket = totals.get(id) || { customerId: id, orders: 0, totalSpent: 0 };
      bucket.orders += 1;
      bucket.totalSpent += Number(order.grandTotal || 0);
      totals.set(id, bucket);
    });

    return Array.from(totals.values())
      .map((entry) => {
        const customer = customerMap.get(entry.customerId);
        return {
          customerId: entry.customerId,
          name: customer?.fullName || customer?.name || "Guest Customer",
          orders: entry.orders,
          totalSpent: entry.totalSpent,
          averageOrderValue: entry.orders ? entry.totalSpent / entry.orders : 0,
          city: customer?.city || "Accra"
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  }

  function recentSales(sourceOrders) {
    const productMap = byIdMap(store.products);

    return sourceOrders
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 12)
      .map((order) => ({
        orderId: order.orderNumber || order.id,
        customerId: order.customerId,
        customerName: order.customerName || order.fullName || "Guest",
        products: (order.productIds || []).map((id) => productMap.get(id)?.name).filter(Boolean),
        city: order.city,
        payment: normalizePayment(order.payment),
        status: order.status,
        total: Number(order.grandTotal || 0),
        date: order.date
      }));
  }

  function revenueAnalytics(sourceOrders) {
    if (!sourceOrders.length) return [];

    const now = new Date();

    const dayCurrent = periodRevenue(sourceOrders.filter((order) => inCurrentDay(order.date, now)));
    const dayPrevStart = new Date(startOfDay(now));
    dayPrevStart.setDate(dayPrevStart.getDate() - 1);
    const dayPrevEnd = new Date(startOfDay(now));

    const dayPrevious = periodRevenue(
      sourceOrders.filter((order) => {
        const date = new Date(order.date);
        return date >= dayPrevStart && date < dayPrevEnd;
      })
    );

    const weekCurrent = periodRevenue(sourceOrders.filter((order) => inCurrentWeek(order.date, now)));
    const previousWeekStart = new Date(now);
    previousWeekStart.setDate(previousWeekStart.getDate() - 13);
    const previousWeekEnd = new Date(now);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);
    const weekPrevious = periodRevenue(
      sourceOrders.filter((order) => {
        const date = new Date(order.date);
        return date >= previousWeekStart && date < previousWeekEnd;
      })
    );

    const monthCurrent = periodRevenue(sourceOrders.filter((order) => inCurrentMonth(order.date, now)));
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthPrevious = periodRevenue(
      sourceOrders.filter((order) => {
        const date = new Date(order.date);
        return (
          date.getMonth() === previousMonthDate.getMonth() &&
          date.getFullYear() === previousMonthDate.getFullYear()
        );
      })
    );

    return [
      { period: "Today", revenue: dayCurrent, previous: dayPrevious, growth: growth(dayCurrent, dayPrevious) },
      { period: "This Week", revenue: weekCurrent, previous: weekPrevious, growth: growth(weekCurrent, weekPrevious) },
      { period: "This Month", revenue: monthCurrent, previous: monthPrevious, growth: growth(monthCurrent, monthPrevious) }
    ];
  }

  function getExecutiveDashboard(filters) {
    const scopedOrders = filterOrders(filters);
    const now = new Date();
    const totalRevenue = periodRevenue(scopedOrders);

    const todayOrders = scopedOrders.filter((order) => inCurrentDay(order.date, now));
    const weeklyOrders = scopedOrders.filter((order) => inCurrentWeek(order.date, now));
    const monthlyOrders = scopedOrders.filter((order) => inCurrentMonth(order.date, now));
    const yearlyOrders = scopedOrders.filter((order) => inCurrentYear(order.date, now));

    const todayRevenue = periodRevenue(todayOrders);
    const weeklyRevenue = periodRevenue(weeklyOrders);
    const monthlyRevenue = periodRevenue(monthlyOrders);
    const yearlyRevenue = periodRevenue(yearlyOrders);

    const averageOrderValue = scopedOrders.length ? totalRevenue / scopedOrders.length : 0;
    const repeatCustomerRate = customerInsights(scopedOrders).repeatRate;
    const conversionRate = 0;
    const grossProfit = totalRevenue;
    const netProfit = totalRevenue;

    const trendModel = revenueAnalytics(scopedOrders);
    const todayRevenueTrend = trendModel.find((entry) => entry.period === "Today")?.growth ?? 0;
    const weeklyRevenueTrend = trendModel.find((entry) => entry.period === "This Week")?.growth ?? 0;
    const monthlyRevenueTrend = trendModel.find((entry) => entry.period === "This Month")?.growth ?? 0;

    const productRanking = productAnalytics(scopedOrders);
    const sizeRanking = sizeAnalytics(scopedOrders);
    const extraRanking = extrasAnalytics(scopedOrders);

    const dashboard = {
      filters,
      kpis: {
        todayRevenue,
        weeklyRevenue,
        monthlyRevenue,
        yearlyRevenue,
        todayOrders: todayOrders.length,
        averageOrderValue,
        repeatCustomerRate,
        conversionRate,
        grossProfit,
        netProfit,
        trends: {
          todayRevenue: todayRevenueTrend,
          weeklyRevenue: weeklyRevenueTrend,
          monthlyRevenue: monthlyRevenueTrend,
          todayOrders: 0,
          averageOrderValue: 0,
          repeatCustomerRate: 0,
          conversionRate: 0,
          grossProfit: 0,
          netProfit: 0
        }
      },
      salesSeries: buildSalesSeries(scopedOrders),
      revenueAnalytics: revenueAnalytics(scopedOrders),
      topProducts: productRanking.slice(0, 8),
      popularSizes: sizeRanking.slice(0, 6),
      popularExtras: extraRanking.slice(0, 8),
      customerAnalytics: customerInsights(scopedOrders),
      locationAnalytics: locationAnalytics(scopedOrders),
      statusAnalytics: statusAnalytics(scopedOrders),
      paymentAnalytics: paymentAnalytics(scopedOrders),
      deliveryAnalytics: deliveryAnalytics(scopedOrders),
      inventoryInsights: inventoryInsights(productRanking),
      productPerformance: productRanking.slice(0, 12),
      topCustomers: topCustomers(scopedOrders),
      recentSales: recentSales(scopedOrders)
    };

    lastDashboard = dashboard;
    return dashboard;
  }

  function getLastDashboard() {
    return lastDashboard;
  }

  return {
    hydrate,
    watchCoreCollections,
    getFilterOptions,
    getExecutiveDashboard,
    getLastDashboard
  };
}
