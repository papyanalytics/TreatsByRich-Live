export function renderTableRows(tbody, rowsHtml) {
  if (!tbody) return;
  tbody.innerHTML = rowsHtml;
}
