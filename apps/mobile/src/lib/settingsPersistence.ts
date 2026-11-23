import {
  readLocalRecord,
  validateSearch,
  validateVessel,
  type LocalRecord,
  type SettingsPayload,
  type SearchRequest,
  type VesselProfile,
  type UnitSystem,
} from '@anchor-buddy/domain';

export const SETTINGS_KEY = 'settings-v2';
export type MobileSettingsPayload = SettingsPayload & { setupComplete: boolean };
type Store = {
  getRaw(key: string): Promise<string | null>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
};
export type SettingsResult =
  | { status: 'committed'; value: LocalRecord<SettingsPayload> }
  | { status: 'failed'; error: string };
export type SettingsRead =
  | { status: 'supported'; value: MobileSettingsPayload; source: 'record' | 'legacy' | 'absent' }
  | { status: 'invalid' | 'unsupported-version'; error: string };

function validateSettings(value: unknown): string[] {
  if (!value || typeof value !== 'object') return ['Invalid settings payload'];
  const v = value as SettingsPayload;
  if (
    !['nautical', 'metric', 'imperial'].includes(v.units) ||
    typeof v.offline !== 'boolean' ||
    v.language !== 'en' ||
    !v.layers ||
    !['depth', 'bedding', 'marks'].every(
      (k) => typeof v.layers[k as keyof typeof v.layers] === 'boolean',
    ) ||
    !v.confirmed ||
    typeof v.confirmed.vessel !== 'boolean' ||
    typeof v.confirmed.defaults !== 'boolean'
  )
    return ['Invalid settings fields'];
  if (v.vessel !== null && (!v.vessel || validateVessel(v.vessel).length))
    return ['Invalid vessel'];
  if (v.searchDefaults !== null && (!v.searchDefaults || validateSearch(v.searchDefaults).length))
    return ['Invalid defaults'];
  const completion = (v as SettingsPayload & { setupComplete?: unknown }).setupComplete;
  if (completion !== undefined && typeof completion !== 'boolean')
    return ['Invalid setup completion'];
  if (
    completion === true &&
    (!v.confirmed.vessel || !v.confirmed.defaults || !v.vessel || !v.searchDefaults)
  )
    return ['Completed setup requires confirmed vessel and defaults'];
  if ((v.confirmed.vessel && !v.vessel) || (v.confirmed.defaults && !v.searchDefaults))
    return ['Confirmed settings are incomplete'];
  return [];
}

/** Serializes read-modify-write commands; legacy sources are retained, never overwritten. */
export function createSettingsRepository(store: Store) {
  let queue: Promise<unknown> = Promise.resolve();
  const legacyCompletion = async (): Promise<
    | { status: 'supported'; value: boolean }
    | { status: 'invalid' | 'unsupported-version'; error: string }
  > => {
    const raw = await store.getRaw('setup-complete-v2');
    if (raw === null) return { status: 'supported', value: false };
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return { status: 'invalid', error: 'Legacy setup marker is corrupt; original retained.' };
    }
    if (
      value &&
      typeof value === 'object' &&
      'schemaVersion' in value &&
      typeof value.schemaVersion === 'number' &&
      value.schemaVersion > 2
    )
      return {
        status: 'unsupported-version',
        error: 'Legacy setup marker has an unsupported version; original retained.',
      };
    return typeof value === 'boolean'
      ? { status: 'supported', value }
      : { status: 'invalid', error: 'Legacy setup marker is invalid; original retained.' };
  };
  const read = async (): Promise<SettingsRead> => {
    const raw = await store.getRaw(SETTINGS_KEY);
    if (raw !== null) {
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        return { status: 'invalid', error: 'Settings record is corrupt; original retained.' };
      }
      const result = readLocalRecord<SettingsPayload>(value, 'settings', validateSettings);
      if (result.status !== 'supported')
        return { status: result.status, error: result.errors.join(' ') };
      if (result.value.id !== 'local-settings')
        return { status: 'invalid', error: 'Unexpected settings identity; original retained.' };
      const payload = result.value.payload as SettingsPayload & { setupComplete?: boolean };
      if (payload.setupComplete !== undefined)
        return {
          status: 'supported',
          value: { ...payload, setupComplete: payload.setupComplete },
          source: 'record',
        };
      const marker = await legacyCompletion();
      if (marker.status !== 'supported') return marker;
      return {
        status: 'supported',
        value: {
          ...payload,
          setupComplete:
            marker.value &&
            payload.confirmed.vessel &&
            payload.confirmed.defaults &&
            !!payload.vessel &&
            !!payload.searchDefaults,
        },
        source: 'record',
      };
    }
    const keys = [
      'vessel',
      'search-defaults',
      'search',
      'preferences',
      'profile-confirmed-v3',
    ] as const;
    const legacyRaw = await Promise.all(keys.map((key) => store.getRaw(key)));
    const parsed: unknown[] = [];
    for (let i = 0; i < legacyRaw.length; i++) {
      if (legacyRaw[i] === null) {
        parsed.push(null);
        continue;
      }
      try {
        parsed.push(JSON.parse(legacyRaw[i]!));
      } catch {
        return { status: 'invalid', error: `Legacy ${keys[i]} is corrupt; original retained.` };
      }
    }
    for (let i = 0; i < parsed.length; i++) {
      if (legacyRaw[i] !== null && parsed[i] === null)
        return { status: 'invalid', error: `Legacy ${keys[i]} is invalid; original retained.` };
      const item = parsed[i];
      if (
        item &&
        typeof item === 'object' &&
        'schemaVersion' in item &&
        typeof item.schemaVersion === 'number' &&
        item.schemaVersion > 2
      )
        return {
          status: 'unsupported-version',
          error: `Legacy ${keys[i]} has an unsupported version; original retained.`,
        };
    }
    const [vessel, defaults, legacySearch, prefs, profile] = parsed as [
      VesselProfile | null,
      SearchRequest | null,
      SearchRequest | null,
      { units: UnitSystem; offline: boolean; layers?: SettingsPayload['layers'] } | null,
      boolean | null,
    ];
    if (
      (vessel !== null && validateVessel(vessel).length) ||
      (defaults !== null && validateSearch(defaults).length) ||
      (legacySearch !== null && validateSearch(legacySearch).length) ||
      (profile !== null && typeof profile !== 'boolean') ||
      (prefs !== null &&
        (!prefs ||
          typeof prefs !== 'object' ||
          !['nautical', 'metric', 'imperial'].includes(prefs.units) ||
          typeof prefs.offline !== 'boolean' ||
          (prefs.layers !== undefined &&
            (!prefs.layers ||
              !['depth', 'bedding', 'marks'].every(
                (k) => typeof prefs.layers?.[k as keyof SettingsPayload['layers']] === 'boolean',
              )))))
    )
      return { status: 'invalid', error: 'Legacy settings are invalid; original retained.' };
    const marker = await legacyCompletion();
    if (marker.status !== 'supported') return marker;
    const boat = vessel && !validateVessel(vessel).length ? vessel : null;
    const search = defaults ?? legacySearch;
    const validSearch = search && !validateSearch(search).length ? search : null;
    const layers =
      prefs?.layers &&
      ['depth', 'bedding', 'marks'].every(
        (k) => typeof prefs.layers?.[k as keyof SettingsPayload['layers']] === 'boolean',
      )
        ? prefs.layers
        : { depth: true, bedding: true, marks: true };
    return {
      status: 'supported',
      source: legacyRaw.every((value) => value === null) ? 'absent' : 'legacy',
      value: {
        vessel: boat,
        searchDefaults: validSearch,
        units:
          prefs && ['nautical', 'metric', 'imperial'].includes(prefs.units)
            ? prefs.units
            : 'nautical',
        offline: prefs?.offline === true,
        layers,
        language: 'en',
        confirmed: { vessel: profile === true && !!boat, defaults: !!validSearch },
        setupComplete: marker.value && profile === true && !!boat && !!validSearch,
      },
    };
  };
  const commit = (
    patch: Partial<SettingsPayload> | ((current: SettingsPayload) => Partial<SettingsPayload>),
  ): Promise<SettingsResult> => {
    const run = async (): Promise<SettingsResult> => {
      try {
        const current = await read();
        if (current.status !== 'supported') return { status: 'failed', error: current.error };
        const payload = {
          ...current.value,
          ...(typeof patch === 'function' ? patch(current.value) : patch),
        };
        const errors = validateSettings(payload);
        if (errors.length) return { status: 'failed', error: errors.join(' ') };
        const now = new Date().toISOString();
        const record: LocalRecord<SettingsPayload> = {
          schemaVersion: 2,
          kind: 'settings',
          id: 'local-settings',
          revision: `${now}-${Math.random().toString(36).slice(2)}`,
          savedAt: now,
          payload,
        };
        await store.set(SETTINGS_KEY, record);
        return { status: 'committed', value: record };
      } catch (error) {
        return { status: 'failed', error: String(error) };
      }
    };
    const result = queue.then(run, run);
    queue = result;
    return result;
  };
  return { read, commit };
}
