import { validateLiveRegionPack } from '@anchor-buddy/domain';

/** Cancellation is accepted only before the durable pointer commit begins. */
export function createPackOperation() {
  const controller = new AbortController();
  let committing = false;
  return {
    signal: controller.signal,
    get committing() {
      return committing;
    },
    cancel(): boolean {
      if (committing) return false;
      controller.abort();
      return true;
    },
    check() {
      if (controller.signal.aborted)
        throw new Error('Regional operation cancelled. Previous pack retained.');
    },
    beginCommit() {
      if (controller.signal.aborted)
        throw new Error('Regional operation cancelled. Previous pack retained.');
      committing = true;
    },
  };
}
/** A malformed or unreadable pointer never authorizes deletion of finalized assets. */
export function pointerReferencesAsset(
  raw: string | null,
  assetKey: string,
): 'referenced' | 'unreferenced' | 'unknown' {
  if (raw === null) return 'unreferenced';
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'unknown';
    const record = value as {
      schemaVersion?: unknown;
      assetKey?: unknown;
      pack?: unknown;
      savedAt?: unknown;
    };
    if (
      !record.pack ||
      (record.schemaVersion !== undefined && record.schemaVersion !== 1) ||
      typeof record.pack !== 'object' ||
      Array.isArray(record.pack) ||
      typeof (record.pack as { id?: unknown }).id !== 'string' ||
      typeof (record.pack as { version?: unknown }).version !== 'string' ||
      typeof record.savedAt !== 'string' ||
      !Number.isFinite(Date.parse(record.savedAt)) ||
      validateLiveRegionPack(record.pack).length > 0 ||
      (record.assetKey !== undefined && (typeof record.assetKey !== 'string' || !record.assetKey))
    )
      return 'unknown';
    return record.assetKey === assetKey ? 'referenced' : 'unreferenced';
  } catch {
    return 'unknown';
  }
}

/** Once begun, settle the write and read back its authoritative pointer even after unmount. */
export async function commitRegionalPointer(options: {
  operation: ReturnType<typeof createPackOperation>;
  assetKey: string;
  write(): Promise<void>;
  readRaw(): Promise<string | null>;
  onBegin(): void;
  assertReplacementAllowed?: () => Promise<void>;
  assertCurrent?: () => void;
}) {
  let previous: string | null;
  try {
    previous = await options.readRaw();
  } catch {
    throw new Error(
      'Could not read the active region. Original data and staged assets are retained.',
    );
  }
  if (pointerReferencesAsset(previous, options.assetKey) === 'unknown')
    throw new Error(
      'The active region is invalid or unsupported. Original data and staged assets are retained.',
    );
  options.operation.check();
  await options.assertReplacementAllowed?.();
  options.operation.check();
  options.assertCurrent?.();
  options.operation.beginCommit();
  options.onBegin();
  let failure: unknown;
  try {
    await options.write();
  } catch (error) {
    failure = error;
  }
  let raw: string | null;
  try {
    raw = await options.readRaw();
  } catch {
    throw new Error(
      'Could not confirm the active region. Staged assets are retained for recovery.',
    );
  }
  const observed = pointerReferencesAsset(raw, options.assetKey);
  if (observed === 'unknown')
    throw new Error(
      'Could not confirm the active region. Staged assets are retained for recovery.',
    );
  if (observed !== 'referenced')
    throw new Error(
      'Regional activation did not become current. ' +
        (failure ? String(failure) : 'Another region is active.'),
    );
}

/** Conservative cleanup: an unreadable or malformed pointer retains finalized assets. */
export async function removeUnreferencedAsset(
  assetKey: string,
  readRaw: () => Promise<string | null>,
  remove: () => Promise<void> | void,
): Promise<boolean> {
  let raw: string | null;
  try {
    raw = await readRaw();
  } catch {
    return false;
  }
  if (pointerReferencesAsset(raw, assetKey) !== 'unreferenced') return false;
  await remove();
  return true;
}

/** One process-wide owner prevents a remounted Settings view from racing an older commit. */
export function createRegionalCoordinator() {
  let active: ReturnType<typeof createPackOperation> | null = null;
  return {
    acquire() {
      if (active) return null;
      active = createPackOperation();
      return active;
    },
    release(operation: ReturnType<typeof createPackOperation>) {
      if (active === operation) active = null;
    },
  };
}
export const regionalCoordinator = createRegionalCoordinator();

export async function fetchRegional<T>(
  url: string,
  timeout: number,
  operation: ReturnType<typeof createPackOperation>,
  read: (response: Response) => Promise<T>,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  operation.signal.addEventListener('abort', cancel);
  const timer = setTimeout(cancel, timeout);
  try {
    operation.check();
    const response = await fetcher(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new Error('Provider returned HTTP ' + response.status + '.');
    const result = await read(response);
    operation.check();
    return result;
  } catch (error) {
    operation.check();
    throw new Error(
      (error instanceof Error ? error.message : 'Provider could not be reached.') +
        ' Check the API address and network. Your previous regional pack is retained.',
    );
  } finally {
    clearTimeout(timer);
    operation.signal.removeEventListener('abort', cancel);
  }
}
