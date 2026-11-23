import type { SettingsPayload } from '@anchor-buddy/domain';
import type { SettingsResult } from './settingsPersistence';

/** Completion is committed together with the already confirmed, validated settings revision. */
export function completeSetup(
  commit: (
    patch: (current: SettingsPayload) => Partial<SettingsPayload>,
  ) => Promise<SettingsResult>,
): Promise<SettingsResult> {
  return commit((current) => {
    if (
      !current.confirmed.vessel ||
      !current.confirmed.defaults ||
      !current.vessel ||
      !current.searchDefaults
    )
      throw new Error('Complete and save the vessel and search defaults before continuing.');
    return { setupComplete: true };
  });
}
