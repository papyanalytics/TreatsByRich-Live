export function debounce(callback, wait = 250) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), wait);
  };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function toKeyedMap(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

export function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((word) => word[0]).join("");
  return initials.toUpperCase() || "CU";
}

export function safeIncludes(value, query) {
  return String(value || "").toLowerCase().includes(String(query || "").toLowerCase());
}
