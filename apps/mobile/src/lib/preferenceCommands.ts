import type { SettingsPayload } from '@anchor-buddy/domain';
import type { SettingsResult } from './settingsPersistence';

export type PreferenceKey = 'units' | 'offline' | 'depth' | 'bedding' | 'marks';
type Values = {
  units: SettingsPayload['units'];
  offline: boolean;
  depth: boolean;
  bedding: boolean;
  marks: boolean;
};
export type PreferenceStatus = { state: 'pending' } | { state: 'error'; message: string };
export type PreferenceStatuses = Partial<Record<PreferenceKey, PreferenceStatus>>;

/** Each command carries only its owning field; the repository serializes all writes. */
export function createPreferenceCommands(
  commit: (
    patch: (current: SettingsPayload) => Partial<SettingsPayload>,
  ) => Promise<SettingsResult>,
  report: (key: PreferenceKey, status: PreferenceStatus | null) => void,
) {
  const versions: Partial<Record<PreferenceKey, number>> = {};
  const desired: Partial<Values> = {};
  const change = <K extends PreferenceKey>(key: K, value: Values[K]) => {
    desired[key] = value;
    const version = (versions[key] ?? 0) + 1;
    versions[key] = version;
    report(key, { state: 'pending' });
    void commit((current) => {
      if (key === 'units') return { units: value as Values['units'] };
      if (key === 'offline') return { offline: value as boolean };
      return { layers: { ...current.layers, [key]: value } };
    })
      .then((result) => {
        if (versions[key] !== version) return;
        report(
          key,
          result.status === 'committed' ? null : { state: 'error', message: result.error },
        );
      })
      .catch((error) => {
        if (versions[key] === version) report(key, { state: 'error', message: String(error) });
      });
  };
  return {
    change,
    retry(key: PreferenceKey) {
      const value = desired[key];
      if (value !== undefined) change(key, value);
    },
  };
}
