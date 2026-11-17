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
type Store = {
  getRaw(key: string): Promise<string | null>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
};
export type SettingsResult =
  | { status: 'committed'; value: LocalRecord<SettingsPayload> }
  | { status: 'failed'; error: string };
export type SettingsRead =
  | { status: 'supported'; value: SettingsPayload }
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
  if ((v.confirmed.vessel && !v.vessel) || (v.confirmed.defaults && !v.searchDefaults))
    return ['Confirmed settings are incomplete'];
  return [];
}

/** Serializes read-modify-write commands; legacy sources are retained, never overwritten. */
export function createSettingsRepository(store: Store) {
  let queue: Promise<unknown> = Promise.resolve();
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
      return { status: 'supported', value: result.value.payload };
    }
    const [vessel, defaults, legacySearch, prefs, profile] = await Promise.all([
      store.get<VesselProfile>('vessel'),
      store.get<SearchRequest>('search-defaults'),
      store.get<SearchRequest>('search'),
      store.get<{ units: UnitSystem; offline: boolean; layers?: SettingsPayload['layers'] }>(
        'preferences',
      ),
      store.get<boolean>('profile-confirmed-v3'),
    ]);
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
