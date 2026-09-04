import { escapeHtml } from "../utils/dom.js";

export function statusBadge(status) {
  const key = String(status || "").toLowerCase().replaceAll(" ", "-");
  return `<span class="status status-${key}">${escapeHtml(status || "-")}</span>`;
}
