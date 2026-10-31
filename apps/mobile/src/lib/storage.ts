import { openDatabaseAsync } from 'expo-sqlite';
// Preserve the original local database across product renames.
const database = (async () => {
  const db = await openDatabaseAsync('anchorai-v1.sqlite');
  await db.execAsync(
    'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS local_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);',
  );
  return db;
})();
export async function getLocal<T>(key: string): Promise<T | null> {
  const row = await (
    await database
  ).getFirstAsync<{ value: string }>('SELECT value FROM local_state WHERE key = ?', key);
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}
/** One durable SQLite row is the active pack pointer; partial asset writes never change it. */
export async function setLocal<T>(key: string, value: T): Promise<void> {
  const db = await database;
  await db.withExclusiveTransactionAsync(async (transaction) => {
    let next: unknown = value;
    if (key === 'active-region') {
      const row = await transaction.getFirstAsync<{ value: string }>(
        'SELECT value FROM local_state WHERE key = ?',
        key,
      );
      if (row) {
        try {
          const previous = JSON.parse(row.value) as { pack?: { id: string; version: string } };
          const incoming = value as { pack?: { id: string; version: string } };
          if (
            previous.pack?.id === incoming.pack?.id &&
            previous.pack?.version === incoming.pack?.version
          )
            next = { ...previous, ...incoming };
        } catch {
          /* A corrupt old pointer must not prevent saving a verified replacement. */
        }
      }
    }
    await transaction.runAsync(
      'INSERT OR REPLACE INTO local_state (key,value) VALUES (?,?)',
      key,
      JSON.stringify(next),
    );
  });
}
export async function removeLocal(key: string) {
  await (await database).runAsync('DELETE FROM local_state WHERE key = ?', key);
}
