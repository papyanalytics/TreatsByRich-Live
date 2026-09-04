export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function isValidGhanaPhone(value) {
  return /^\+233\s?(20|23|24|25|26|27|50|53|54|55|56|57|59)\s?\d{7}$/.test(String(value || "").trim());
}

export function isRequired(value) {
  return Boolean(String(value || "").trim());
}
