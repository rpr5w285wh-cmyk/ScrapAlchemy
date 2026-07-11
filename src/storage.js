// window.storage shim — reproduces the Claude artifact storage API on top of
// localStorage, so scrap-alchemy.jsx runs unmodified outside the artifact
// sandbox. Contract the app relies on (all methods async):
//   get(key)      -> { key, value } | null
//   set(key, val) -> truthy result on success
//   list(prefix)  -> { keys: [...] }
// Keys are namespaced in localStorage so list() never sees other apps' data.

const NS = "scrapalchemy:";

function installStorageShim() {
  if (typeof window === "undefined" || window.storage) return;

  window.storage = {
    async get(key) {
      try {
        const value = window.localStorage.getItem(NS + key);
        return value === null ? null : { key, value };
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        window.localStorage.setItem(NS + key, String(value));
        return { key, value };
      } catch {
        // Quota exceeded / private-mode restrictions: report failure honestly
        // so callers (e.g. the newsletter form) can surface it.
        return null;
      }
    },
    async delete(key) {
      try {
        window.localStorage.removeItem(NS + key);
        return true;
      } catch {
        return false;
      }
    },
    async list(prefix = "") {
      try {
        const keys = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(NS + prefix)) keys.push(k.slice(NS.length));
        }
        return { keys };
      } catch {
        return { keys: [] };
      }
    },
  };
}

installStorageShim();
