import { safeIncludes } from "../utils/helpers.js";

export function matchesCustomerQuery(customer, query) {
  if (!query) return true;
  const searchText = [
    customer.fullName,
    customer.phone,
    customer.email,
    customer.city,
    customer.latestOrderId
  ].join(" ");
  return safeIncludes(searchText, query);
}
