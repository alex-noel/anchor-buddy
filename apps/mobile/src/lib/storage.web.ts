// Web is a development preview. Native builds use SQLite, not browser storage.
// Preserve the original storage prefix so existing profiles and saved searches remain available.
export async function getLocal<T>(key: string): Promise<T | null> {
  const value = globalThis.localStorage?.getItem(`anchorai:v1:${key}`);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
export async function setLocal<T>(key: string, value: T): Promise<void> {
  let next: unknown = value;
  if (key === 'active-region') {
    const previous = await getLocal<{ pack?: { id: string; version: string } }>(key);
    const incoming = value as { pack?: { id: string; version: string } };
    if (
      previous?.pack?.id === incoming.pack?.id &&
      previous?.pack?.version === incoming.pack?.version
    )
      next = { ...previous, ...incoming };
  }
  // Browser setItem replaces this one value atomically or throws, retaining the previous value.
  globalThis.localStorage.setItem(`anchorai:v1:${key}`, JSON.stringify(next));
}
export async function removeLocal(key: string): Promise<void> {
  globalThis.localStorage.removeItem(`anchorai:v1:${key}`);
}
