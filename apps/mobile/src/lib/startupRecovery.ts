import { validateLiveRegionPack, type RegionPack } from '@anchor-buddy/domain';
import { readRegionCache } from './regionalDataCore';
import { readSavedSearches } from './workspace';
import type { SettingsRead } from './settingsPersistence';

export type StartupCategory = 'settings' | 'searches' | 'evidence' | 'region' | 'evidence-cleanup';
export type StartupIssue = {
  kind: 'invalid' | 'unsupported-version' | 'unreadable';
  message: string;
};
export type StartupResult = {
  category: StartupCategory;
  value?: unknown;
  missing?: boolean;
  issue?: StartupIssue;
};
const names: Record<Exclude<StartupCategory, 'settings'>, string> = {
  searches: 'saved-searches',
  evidence: 'regional-evidence-v1',
  'evidence-cleanup': 'evidence-cleanup-v1',
  region: 'active-region',
};

/** Read one category without allowing another category's failure to mask it. */
export async function readStartupCategory(
  category: StartupCategory,
  getRaw: (key: string) => Promise<string | null>,
  readSettings: () => Promise<SettingsRead>,
): Promise<StartupResult> {
  try {
    if (category === 'settings') {
      const result = await readSettings();
      return result.status === 'supported'
        ? { category, value: result.value, missing: result.source === 'absent' }
        : { category, issue: { kind: result.status, message: result.error } };
    }
    const raw = await getRaw(names[category]);
    if (raw === null) return { category, missing: true };
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return {
        category,
        issue: { kind: 'invalid', message: 'Stored data is not valid JSON; original retained.' },
      };
    }
    const future = (v: unknown) =>
      !!v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      typeof (v as { schemaVersion?: unknown }).schemaVersion === 'number' &&
      (v as { schemaVersion: number }).schemaVersion > 2;
    if (future(value) || (Array.isArray(value) && value.some(future)))
      return {
        category,
        issue: {
          kind: 'unsupported-version',
          message: 'A newer data version is unsupported; original retained.',
        },
      };
    if (category === 'evidence-cleanup') {
      if (
        !Array.isArray(value) ||
        value.some(
          (row) =>
            !row ||
            typeof row !== 'object' ||
            typeof row.id !== 'string' ||
            !row.id ||
            typeof row.name !== 'string',
        )
      )
        return {
          category,
          issue: {
            kind: 'invalid',
            message: 'Evidence cleanup record is invalid; original retained.',
          },
        };
      return { category, value };
    }
    if (category === 'region') {
      const record = value as { pack?: RegionPack; savedAt?: unknown } | null;
      if (typeof record?.pack?.schemaVersion === 'number' && record.pack.schemaVersion >= 2)
        return {
          category,
          issue: {
            kind: 'unsupported-version',
            message: 'Saved region version is not supported by this app; original retained.',
          },
        };
      if (
        !record ||
        !record.pack ||
        typeof record.savedAt !== 'string' ||
        !Number.isFinite(Date.parse(record.savedAt)) ||
        validateLiveRegionPack(record.pack).length
      )
        return {
          category,
          issue: {
            kind: 'invalid',
            message: 'Saved region is invalid or unsupported; original retained.',
          },
        };
      return { category, value: record };
    }
    if (!Array.isArray(value))
      return {
        category,
        issue: { kind: 'invalid', message: 'Stored list is invalid; original retained.' },
      };
    const valid = category === 'searches' ? readSavedSearches(value) : readRegionCache(value);
    return valid.length === value.length
      ? { category, value: valid }
      : {
          category,
          value: valid,
          issue: { kind: 'invalid', message: 'Some entries could not be read; original retained.' },
        };
  } catch (error) {
    return {
      category,
      issue: {
        kind: 'unreadable',
        message: 'Could not read this data on the device: ' + String(error),
      },
    };
  }
}
