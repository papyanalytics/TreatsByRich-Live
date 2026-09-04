export function createStorageAdapter(prefix = "tbr") {
  const makeKey = (key) => `${prefix}.${key}`;

  return {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(makeKey(key));
        return raw ? JSON.parse(raw) : fallback;
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      window.localStorage.setItem(makeKey(key), JSON.stringify(value));
    },
    remove(key) {
      window.localStorage.removeItem(makeKey(key));
    }
  };
}
