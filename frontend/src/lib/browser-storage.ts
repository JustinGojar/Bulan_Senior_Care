// Session identifiers and preferences must still work when storage is blocked or full.
// This fallback lasts only for the current tab; credentials remain in HttpOnly cookies.
const fallback = new Map<string, string | null>();

export function readLocalValue(key: string): string | null {
  if (fallback.has(key)) return fallback.get(key) ?? null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    fallback.delete(key);
  } catch {
    fallback.set(key, value);
  }
}

export function removeLocalValue(key: string) {
  try {
    localStorage.removeItem(key);
    fallback.delete(key);
  } catch {
    // A tombstone also hides an old stored value if storage becomes readable again.
    fallback.set(key, null);
  }
}
