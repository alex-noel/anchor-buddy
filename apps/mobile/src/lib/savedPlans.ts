import {
  readLocalRecord,
  validateSearch,
  type LocalRecord,
  type SavedPlanPayload,
} from '@anchor-buddy/domain';
import type { DeletionOutcome } from './deletion';
import { prepareSavedSearch } from './workspace';

export const SAVED_PLANS_KEY = 'saved-plans-v2';
export const SAVED_PLAN_LIMIT = 30;
export type PlanRecord = LocalRecord<SavedPlanPayload>;
export type PlanRead = {
  records: PlanRecord[];
  issue?: { kind: 'invalid' | 'unsupported-version' | 'unreadable'; message: string };
};
const utc = (v: unknown) =>
  typeof v === 'string' &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 19) === v.slice(0, 19);
export function validateSavedPlan(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Invalid plan payload.'];
  const p = value as SavedPlanPayload;
  const allowed = new Set([
    'name',
    'createdAt',
    'updatedAt',
    'selectedPosition',
    'plannedRodeM',
    'search',
    'depthAllowancePercent',
    'vesselId',
    'vesselFingerprint',
    'sourcePacks',
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return ['Unsupported plan fields.'];
  if (
    typeof p.name !== 'string' ||
    !p.name.trim() ||
    !utc(p.createdAt) ||
    !utc(p.updatedAt) ||
    Date.parse(p.updatedAt) < Date.parse(p.createdAt)
  )
    return ['Invalid plan name or timestamps.'];
  if (
    !Array.isArray(p.selectedPosition) ||
    p.selectedPosition.length !== 2 ||
    !p.selectedPosition.every(Number.isFinite) ||
    Math.abs(p.selectedPosition[0]) > 180 ||
    Math.abs(p.selectedPosition[1]) > 85
  )
    return ['Invalid plan position.'];
  if (!p.search || validateSearch(p.search).length || p.search.deployedRodeM !== undefined)
    return ['Invalid plan search.'];
  if (
    p.plannedRodeM !== undefined &&
    (!Number.isFinite(p.plannedRodeM) || p.plannedRodeM < 1 || p.plannedRodeM > 1000)
  )
    return ['Invalid proposed rode.'];
  if (
    ![0, 20, 30].includes(p.depthAllowancePercent) ||
    typeof p.vesselId !== 'string' ||
    !p.vesselId.trim() ||
    typeof p.vesselFingerprint !== 'string' ||
    !/^[a-f0-9]{64}$/.test(p.vesselFingerprint)
  )
    return ['Invalid plan allowance or vessel reference.'];
  if (
    !Array.isArray(p.sourcePacks) ||
    p.sourcePacks.length > 100 ||
    p.sourcePacks.some(
      (ref) =>
        !ref ||
        typeof ref.id !== 'string' ||
        !ref.id.trim() ||
        typeof ref.version !== 'string' ||
        !ref.version.trim() ||
        (ref.snapshotId !== undefined &&
          (typeof ref.snapshotId !== 'string' || !ref.snapshotId.trim())),
    )
  )
    return ['Invalid plan source references.'];
  if (
    new Set(
      p.sourcePacks.map((ref) => JSON.stringify([ref.id, ref.version, ref.snapshotId ?? null])),
    ).size !== p.sourcePacks.length
  )
    return ['Duplicate plan source references.'];
  return [];
}
export function createSavedPlansRepository(store: {
  getRaw(key: string): Promise<string | null>;
  set<T>(key: string, value: T): Promise<void>;
}) {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<PlanRead> => {
    try {
      const raw = await store.getRaw(SAVED_PLANS_KEY);
      if (raw === null) return { records: [] };
      let input: unknown;
      try {
        input = JSON.parse(raw);
      } catch {
        return {
          records: [],
          issue: { kind: 'invalid', message: 'Plan library is corrupt; original retained.' },
        };
      }
      if (!Array.isArray(input))
        return {
          records: [],
          issue: { kind: 'invalid', message: 'Plan library is invalid; original retained.' },
        };
      const records: PlanRecord[] = [];
      const ids = new Set<string>();
      let issue: PlanRead['issue'];
      for (const item of input) {
        const parsed = readLocalRecord<SavedPlanPayload>(item, 'saved-plan', validateSavedPlan);
        if (parsed.status !== 'supported') {
          if (!issue || parsed.status === 'unsupported-version')
            issue = {
              kind: parsed.status,
              message: 'Some plans are unreadable or unsupported; original library retained.',
            };
          continue;
        }
        if (ids.has(parsed.value.id)) {
          issue ??= {
            kind: 'invalid',
            message: 'Duplicate plan identifiers; original library retained.',
          };
          continue;
        }
        ids.add(parsed.value.id);
        records.push(parsed.value);
      }
      return { records, ...(issue ? { issue } : {}) };
    } catch (error) {
      return {
        records: [],
        issue: { kind: 'unreadable', message: 'Could not read saved plans: ' + String(error) },
      };
    }
  };
  const save = (
    payload: SavedPlanPayload,
    id?: string,
    assertCurrent?: () => void,
    proposedId?: string,
  ): Promise<
    | { status: 'committed'; record: PlanRecord; records: PlanRecord[] }
    | { status: 'failed'; message: string }
  > => {
    const run = async () => {
      let attempted: PlanRecord | undefined;
      try {
        const current = await read();
        if (current.issue) return { status: 'failed' as const, message: current.issue.message };
        const prior =
          id || proposedId
            ? current.records.find((row) => row.id === (id ?? proposedId))
            : undefined;
        if (id && !prior)
          return { status: 'failed' as const, message: 'That plan is no longer available.' };
        if (!prior && current.records.length >= SAVED_PLAN_LIMIT)
          return {
            status: 'failed' as const,
            message:
              'The plan library holds 30 drafts. Delete a named draft in Saved before saving another.',
          };
        const now = new Date().toISOString();
        const record: PlanRecord = {
          schemaVersion: 2,
          kind: 'saved-plan',
          id:
            prior?.id ?? proposedId ?? `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          revision: `${now}-${Math.random().toString(36).slice(2)}`,
          savedAt: now,
          payload: {
            ...payload,
            name: payload.name.trim(),
            createdAt: prior?.payload.createdAt ?? payload.createdAt,
            updatedAt: now,
          },
        };
        const parsed = readLocalRecord<SavedPlanPayload>(record, 'saved-plan', validateSavedPlan);
        if (parsed.status !== 'supported')
          return { status: 'failed' as const, message: parsed.errors.join(' ') };
        const records = [record, ...current.records.filter((row) => row.id !== record.id)];
        assertCurrent?.();
        attempted = record;
        await store.set(SAVED_PLANS_KEY, records);
        return { status: 'committed' as const, record, records };
      } catch (error) {
        if (attempted) {
          const observed = await read();
          const committed = observed.records.find(
            (row) => row.id === attempted!.id && row.revision === attempted!.revision,
          );
          if (!observed.issue && committed)
            return { status: 'committed' as const, record: committed, records: observed.records };
        }
        return { status: 'failed' as const, message: String(error) };
      }
    };
    const result = queue.then(run, run);
    queue = result;
    return result;
  };
  const remove = (id: string): Promise<DeletionOutcome> => {
    const run = async (): Promise<DeletionOutcome> => {
      try {
        const current = await read();
        if (current.issue) return { status: 'unchanged', message: current.issue.message };
        const records = current.records.filter((row) => row.id !== id);
        if (records.length === current.records.length) return { status: 'complete' };
        await store.set(SAVED_PLANS_KEY, records);
        return { status: 'complete' };
      } catch (error) {
        const current = await read();
        if (current.issue)
          return {
            status: 'cleanup-pending',
            message: 'Could not confirm plan removal. Retry. ' + current.issue.message,
          };
        return current.records.some((row) => row.id === id)
          ? { status: 'unchanged', message: 'Plan was not removed. ' + String(error) }
          : { status: 'complete' };
      }
    };
    const result = queue.then(run, run);
    queue = result;
    return result;
  };
  return { read, save, remove };
}

/** Compare references only; a match never asserts source approval or freshness. */
export function planMaterialChanges(
  payload: SavedPlanPayload,
  vesselId: string,
  fingerprint: string,
  currentSources: SavedPlanPayload['sourcePacks'],
): string[] {
  const changes: string[] = [];
  if (payload.vesselId !== vesselId || payload.vesselFingerprint !== fingerprint)
    changes.push('Vessel or equipment has changed.');
  const canonical = (refs: SavedPlanPayload['sourcePacks']) =>
    refs.map((row) => JSON.stringify([row.id, row.version, row.snapshotId ?? null])).sort();
  if (
    !currentSources.length ||
    JSON.stringify(canonical(payload.sourcePacks)) !== JSON.stringify(canonical(currentSources))
  )
    changes.push('Evidence sources or versions have changed or are unavailable.');
  return changes;
}

/** Only proposed inputs are restored; arrival and watch state are never part of this result. */
export function prepareSavedPlan(payload: SavedPlanPayload, now = new Date()) {
  const prepared = prepareSavedSearch(payload.search, now);
  return {
    needsDateReview: prepared.needsDateReview,
    search: prepared.search,
    selectedPosition: [...payload.selectedPosition] as [number, number],
    plannedRodeM: payload.plannedRodeM,
    depthAllowancePercent: payload.depthAllowancePercent,
  };
}
