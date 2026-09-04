import { escapeHtml } from "../utils/dom.js";

export function renderKpiCard({ icon, iconHtml, label, value, trend }) {
  const iconMarkup = iconHtml
    ? `<span class="kpi-icon" aria-hidden="true">${iconHtml}</span>`
    : `<span class="kpi-icon">${escapeHtml(icon || "")}</span>`;

  return `
    <article class="kpi-card reveal skeleton-target">
      <div class="kpi-head">${iconMarkup}<p>${escapeHtml(label)}</p></div>
      <h3>${escapeHtml(String(value))}</h3>
      <div class="kpi-foot"><span class="trend up">${escapeHtml(trend)}</span><div class="sparkline" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div></div>
    </article>
  `;
}
