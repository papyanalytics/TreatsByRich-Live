import { clamp } from "../utils/helpers.js";

export function paginate(items, page, rowsPerPage) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const safePage = clamp(page, 1, totalPages);
  const start = (safePage - 1) * rowsPerPage;
  return {
    pageItems: items.slice(start, start + rowsPerPage),
    total,
    totalPages,
    page: safePage,
    start: total ? start + 1 : 0,
    end: Math.min(total, start + rowsPerPage)
  };
}
