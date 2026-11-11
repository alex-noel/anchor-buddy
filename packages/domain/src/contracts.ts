/** V2 exchange contracts. No provider facts, approval records or runtime fixtures live here. */
import type {
  AreaGeometry,
  EvidenceLayer,
  Position,
  SearchRequest,
  UnitSystem,
  VesselProfile,
} from './types.ts';

export const CONTRACT_SCHEMA_VERSION = 2 as const;
export type EvidenceRole =
  'chart-display' | 'scientific-context' | 'point-forecast' | 'analytical-coverage';
export interface FieldSourceReference {
  sourceId: string;
  documentRevision: string | null;
  locator: string;
}
export interface EvidenceRight {
  status: 'permitted' | 'prohibited' | 'unknown';
  policyUrl: string | null;
  verifiedAt: string | null;
  entitlementId: string | null;
}
export interface EvidenceEnvelope {
  schemaVersion: 2;
  role: EvidenceRole;
  sourceIds: string[];
  sourceTime: {
    kind: 'observation' | 'survey' | 'model-issue' | 'publication' | 'unknown';
    at: string | null;
  };
  retrievedAt: string;
  refreshEligibleAt: string | null;
  usableUntil: string | null;
  forecastInterval: { from: string; until: string } | null;
  original: { units: string | null; verticalDatum: string | null };
  rights: { onlineDisplay: EvidenceRight; offlineStorage: EvidenceRight; analysis: EvidenceRight };
  review: { status: 'unreviewed' | 'reviewed'; attestationIds: string[] };
}
export interface HazardPrimitive {
  id: string;
  kind: 'shore' | 'obstruction' | 'cable' | 'channel' | 'shallow' | 'habitat';
  name: string;
  objectClass: string;
  geometry:
    | { type: 'Point'; coordinates: Position }
    | { type: 'LineString'; coordinates: Position[] }
    | AreaGeometry;
  sourceIds: string[];
  /** Maximum physical distance from source geometry; null means unresolved, never zero. */
  extentM: number | null;
  positionalUncertaintyM: number | null;
  extentSource: FieldSourceReference | null;
  uncertaintySource: FieldSourceReference | null;
}
export interface EvidenceComponent {
  id: string;
  version: string;
  kind:
    | 'static-analysis'
    | 'rules-habitat'
    | 'weather-current'
    | 'water-level'
    | 'places-tariffs'
    | 'display';
  sha256: string;
  bytes: number;
  sourceIds: string[];
  evidence: EvidenceEnvelope;
}
export interface ReviewAttestation {
  id: string;
  reviewerId: string;
  reviewedAt: string;
  validUntil: string;
  scope: ('maritime' | 'coverage' | 'geometry' | 'station-mappings' | 'on-water')[];
  components: { id: string; version: string; sha256: string }[];
  /** Exact-hash only in v2. No automatic renewal or unbounded dynamic approval. */
  changePolicy: 'exact-components';
}
export interface SnapshotIdentity {
  schemaVersion: 2;
  id: string;
  version: string;
  components: EvidenceComponent[];
  reviews: ReviewAttestation[];
}
export interface AnalyticalCoverageContract {
  schemaVersion: 2;
  role: 'analytical-coverage';
  layer: EvidenceLayer;
  geometry: AreaGeometry;
  sourceIds: string[];
  componentId: string;
  reviewId: string;
  validFrom: string;
  validUntil: string;
  complete: boolean;
}
export interface GuidanceReference {
  id: string;
  version: string;
  /** SHA-256 of the canonical relevant vessel/equipment inputs defined in v2.md. */
  compatibilityFingerprint: string;
}
export interface EquipmentGuidanceRecord {
  schemaVersion: 2;
  id: string;
  version: string;
  source: FieldSourceReference;
  sourceUrl: string;
  verifiedAt: string;
  reviewedAt: string | null;
  validUntil: string;
  status: 'unreviewed' | 'reviewed' | 'withdrawn' | 'unsupported';
  applicability: {
    anchorManufacturer: string | null;
    anchorModel: string | null;
    rodeConfigurationId: string | null;
    vesselTypes: VesselProfile['type'][] | null;
    lengthM: NumericRange | null;
    beamM: NumericRange | null;
    displacementKg: NumericRange | null;
    windageDescription: string | null;
  };
  conditions: {
    maxWindKnots: number;
    maxGustKnots: number;
    maxWaveM: number;
    maxCurrentKnots: number;
  } | null;
  method: { kind: 'scope-ratio'; ratio: number } | { kind: 'unsupported'; reason: string };
}
/** Half-open [minInclusive, maxExclusive); null bound means no published bound, not infinity approval. */
export interface NumericRange {
  minInclusive: number | null;
  maxExclusive: number | null;
}
export interface TariffRuleContract {
  schemaVersion: 2;
  id: string;
  product: 'berth' | 'mooring' | 'anchorage';
  vesselTypes: VesselProfile['type'][] | null;
  lengthM: NumericRange | null;
  beamM: NumericRange | null;
  /** Effective local dates, half-open. Legacy inclusive end dates are not silently reinterpreted. */
  effectiveFrom: string;
  effectiveUntil: string;
  rateDecimal: string | null;
  currency: string;
  minorUnitDigits: 0 | 2 | 3 | null;
  currencyMetadataVersion: string | null;
  basis: 'flat' | 'per_metre' | 'per_foot';
  rounding: { mode: 'half-up'; stage: 'line' | 'total' } | null;
  billing: {
    timezone: string;
    period: 'night' | 'day' | 'hour';
    method: 'calendar' | 'elapsed';
    boundaryLocalTime: string | null;
    lengthIncrementDecimal: string | null;
    lengthRounding: 'started-increment' | 'exact' | null;
    minimumLengthDecimal: string | null;
    minimumChargeDecimal: string | null;
  };
  tax: { inclusion: 'included' | 'excluded' | 'unknown'; rateDecimal: string | null };
  charges: {
    id: string;
    amountDecimal: string | null;
    required: boolean;
    refundable: boolean;
    taxable: boolean | null;
    per: 'stay' | 'night' | 'hour' | 'metered' | 'quote';
  }[];
  /** JSON-pointer field -> original published fact. Missing fact is unknown/unavailable. */
  fieldSources: Record<string, FieldSourceReference>;
}
export interface LocalRecord<T> {
  schemaVersion: 2;
  kind: 'settings' | 'saved-search' | 'saved-plan';
  id: string;
  revision: string;
  savedAt: string;
  payload: T;
}
export interface SettingsPayload {
  vessel: VesselProfile | null;
  searchDefaults: SearchRequest | null;
  units: UnitSystem;
  offline: boolean;
  layers: { depth: boolean; bedding: boolean; marks: boolean };
  language: 'en';
  confirmed: { vessel: boolean; defaults: boolean };
}
export interface SavedPlanPayload {
  name: string;
  createdAt: string;
  updatedAt: string;
  selectedPosition: Position;
  plannedRodeM?: number;
  search: SearchRequest;
  depthAllowancePercent: 0 | 20 | 30;
  vesselId: string;
  vesselFingerprint: string;
  sourcePacks: { id: string; version: string; snapshotId?: string }[];
}
export type ContractResult<T> =
  | { status: 'supported'; value: T }
  | {
      status: 'unsupported-version' | 'invalid';
      errors: string[];
    };
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const oneOf = (value: unknown, allowed: readonly string[]): value is string =>
  typeof value === 'string' && allowed.includes(value);
const utc = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 19) === v.slice(0, 19);
const ids = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length > 0 && v.every(text) && new Set(v).size === v.length;
const sha = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const nonnegative = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0;
const interval = (a: unknown, b: unknown) => utc(a) && utc(b) && Date.parse(a) < Date.parse(b);
const ref = (v: unknown) =>
  object(v) &&
  text(v.sourceId) &&
  text(v.locator) &&
  (v.documentRevision === null || text(v.documentRevision));
const safeArea = (v: unknown, validate: (v: unknown) => boolean): boolean => {
  try {
    return validate(v) === true;
  } catch {
    return false;
  }
};
const url = (v: unknown) => {
  try {
    const u = new URL(String(v));
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
};

/** Absent schema is legacy v1 only when the caller explicitly permits it. */
export function checkSchemaVersion(value: unknown, allowLegacy = false): ContractResult<number> {
  if (!object(value)) return { status: 'invalid', errors: ['Expected a versioned object.'] };
  const version = value.schemaVersion;
  if ((allowLegacy && (version === undefined || version === 1)) || version === 2)
    return { status: 'supported', value: version === undefined ? 1 : (version as number) };
  return {
    status: 'unsupported-version',
    errors: [
      'Unsupported schema version. Update the app or use a supported export; retain the original record.',
    ],
  };
}
export function validateEvidenceEnvelope(value: unknown): string[] {
  if (!object(value)) return ['Evidence envelope must be an object.'];
  const errors: string[] = [];
  const version = checkSchemaVersion(value);
  if (version.status !== 'supported') errors.push(...version.errors);
  if (
    !oneOf(value.role, [
      'chart-display',
      'scientific-context',
      'point-forecast',
      'analytical-coverage',
    ]) ||
    !ids(value.sourceIds)
  )
    errors.push('Evidence role and source references are required.');
  if (
    !object(value.sourceTime) ||
    !oneOf(value.sourceTime.kind, [
      'observation',
      'survey',
      'model-issue',
      'publication',
      'unknown',
    ]) ||
    !(value.sourceTime.at === null || utc(value.sourceTime.at)) ||
    (value.sourceTime.kind === 'unknown') !== (value.sourceTime.at === null)
  )
    errors.push(
      'Original source time must have an explicit kind and UTC instant, or unknown/null.',
    );
  if (
    !utc(value.retrievedAt) ||
    !(value.refreshEligibleAt === null || utc(value.refreshEligibleAt)) ||
    !(value.usableUntil === null || utc(value.usableUntil))
  )
    errors.push('Evidence dates must be original UTC instants or explicit null.');
  if (!(
    value.forecastInterval === null ||
    (object(value.forecastInterval) &&
      interval(value.forecastInterval.from, value.forecastInterval.until))
  ))
    errors.push('Invalid forecast interval.');
  if (
    !object(value.original) ||
    !['units', 'verticalDatum'].every(
      (k) =>
        value.original &&
        object(value.original) &&
        (value.original[k] === null || text(value.original[k])),
    )
  )
    errors.push('Original units and datum must be retained or explicitly unknown.');
  if (!object(value.rights))
    errors.push('Separate display, storage and analysis rights are required.');
  else
    for (const key of ['onlineDisplay', 'offlineStorage', 'analysis']) {
      const right = value.rights[key];
      if (
        !object(right) ||
        !oneOf(right.status, ['permitted', 'prohibited', 'unknown']) ||
        !(right.policyUrl === null || url(right.policyUrl)) ||
        !(right.verifiedAt === null || utc(right.verifiedAt)) ||
        !(right.entitlementId === null || text(right.entitlementId)) ||
        (right.status !== 'unknown' && (!url(right.policyUrl) || !utc(right.verifiedAt)))
      )
        errors.push(`Invalid ${key} rights provenance.`);
    }
  if (
    !object(value.review) ||
    !oneOf(value.review.status, ['unreviewed', 'reviewed']) ||
    !Array.isArray(value.review.attestationIds) ||
    !value.review.attestationIds.every(text) ||
    (value.review.status === 'reviewed' && !ids(value.review.attestationIds))
  )
    errors.push('Review status requires explicit attestation references.');
  return errors;
}

/** Geometry validation is supplied by the shared validator, never a renderer. */
export function validateHazardPrimitive(
  value: unknown,
  areaValid: (v: unknown) => boolean,
): string[] {
  if (!object(value)) return ['Hazard primitive must be an object.'];
  const errors: string[] = [];
  const position = (p: unknown) =>
    Array.isArray(p) &&
    p.length === 2 &&
    p.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    Math.abs(p[0]) <= 180 &&
    Math.abs(p[1]) <= 85;
  const g = value.geometry;
  const valid =
    object(g) &&
    (g.type === 'Point'
      ? position(g.coordinates)
      : g.type === 'LineString'
        ? Array.isArray(g.coordinates) &&
          g.coordinates.length >= 2 &&
          g.coordinates.length <= 100_000 &&
          g.coordinates.every(position)
        : safeArea(g, areaValid));
  if (
    !valid ||
    !text(value.id) ||
    !text(value.name) ||
    !text(value.objectClass) ||
    !ids(value.sourceIds) ||
    !oneOf(value.kind, ['shore', 'obstruction', 'cable', 'channel', 'shallow', 'habitat'])
  )
    errors.push('Invalid primitive geometry, identity or provenance.');
  for (const [amount, provenance] of [
    ['extentM', 'extentSource'],
    ['positionalUncertaintyM', 'uncertaintySource'],
  ]) {
    if (
      !(value[amount] === null || nonnegative(value[amount])) ||
      !(value[provenance] === null || ref(value[provenance])) ||
      (value[amount] !== null && !ref(value[provenance]))
    )
      errors.push(`Hazard ${amount} must be unknown/null or have sourced nonnegative metres.`);
    if (
      object(value[provenance]) &&
      ids(value.sourceIds) &&
      !value.sourceIds.includes(value[provenance].sourceId as string)
    )
      errors.push('Hazard uncertainty/extent reference must belong to sourceIds.');
  }
  return errors;
}

/** Validate identity, provenance and review bindings against independently computed asset digests. */
export function validateSnapshotIdentity(
  value: unknown,
  observedHashes: Readonly<Record<string, string>>,
  assessedAt: string,
): string[] {
  if (!object(value)) return ['Snapshot identity must be an object.'];
  if (!object(observedHashes)) return ['Independently computed component hashes are required.'];
  const errors: string[] = [];
  const version = checkSchemaVersion(value);
  if (version.status !== 'supported') errors.push(...version.errors);
  if (!text(value.id) || !text(value.version) || !utc(assessedAt))
    errors.push('Snapshot identity and explicit UTC assessment time are required.');
  if (!Array.isArray(value.components) || !value.components.length || !Array.isArray(value.reviews))
    return [...errors, 'Snapshot components/reviews are required.'];
  const components = new Map<string, EvidenceComponent>();
  for (const component of value.components) {
    if (
      !object(component) ||
      !text(component.id) ||
      !text(component.version) ||
      !sha(component.sha256) ||
      !Number.isSafeInteger(component.bytes) ||
      Number(component.bytes) < 0 ||
      !ids(component.sourceIds) ||
      !oneOf(component.kind, [
        'static-analysis',
        'rules-habitat',
        'weather-current',
        'water-level',
        'places-tariffs',
        'display',
      ])
    ) {
      errors.push('Invalid immutable component identity.');
      continue;
    }
    if (components.has(component.id)) errors.push('Duplicate component identity.');
    if (
      !Object.hasOwn(observedHashes, component.id) ||
      observedHashes[component.id] !== component.sha256
    )
      errors.push(`Component integrity mismatch: ${component.id}.`);
    errors.push(...validateEvidenceEnvelope(component.evidence));
    if (
      object(component.evidence) &&
      ids(component.evidence.sourceIds) &&
      component.evidence.sourceIds.some((id) => !(component.sourceIds as string[]).includes(id))
    )
      errors.push('Component evidence has unresolved source references.');
    components.set(component.id, component as unknown as EvidenceComponent);
  }
  const reviewIds = new Set<string>();
  for (const review of value.reviews) {
    if (
      !object(review) ||
      !text(review.id) ||
      !text(review.reviewerId) ||
      !interval(review.reviewedAt, review.validUntil) ||
      Date.parse(String(review.reviewedAt)) > Date.parse(assessedAt) ||
      Date.parse(String(review.validUntil)) <= Date.parse(assessedAt) ||
      review.changePolicy !== 'exact-components' ||
      !ids(review.scope) ||
      review.scope.some(
        (s) => !['maritime', 'coverage', 'geometry', 'station-mappings', 'on-water'].includes(s),
      ) ||
      !Array.isArray(review.components) ||
      !review.components.length
    ) {
      errors.push('Invalid, expired or unsupported review attestation.');
      continue;
    }
    if (reviewIds.has(review.id)) errors.push('Duplicate review identity.');
    reviewIds.add(review.id);
    for (const binding of review.components) {
      const component =
        object(binding) && typeof binding.id === 'string' ? components.get(binding.id) : undefined;
      if (
        !component ||
        !object(binding) ||
        component.version !== binding.version ||
        component.sha256 !== binding.sha256
      )
        errors.push(`Review ${review.id} does not bind exact component content.`);
    }
  }
  for (const component of components.values()) {
    if (
      !object(component.evidence) ||
      !object(component.evidence.review) ||
      !Array.isArray(component.evidence.review.attestationIds)
    )
      continue;
    for (const reviewId of component.evidence.review.attestationIds) {
      const r = value.reviews.find((r) => object(r) && r.id === reviewId);
      if (
        !object(r) ||
        !Array.isArray(r.components) ||
        !r.components.some(
          (b) =>
            object(b) &&
            b.id === component.id &&
            b.version === component.version &&
            b.sha256 === component.sha256,
        )
      )
        errors.push('Component review reference does not bind its content.');
    }
  }
  return [...new Set(errors)];
}

export function readLocalRecord<T>(
  value: unknown,
  kind: LocalRecord<T>['kind'],
  validatePayload: (v: unknown) => string[],
): ContractResult<LocalRecord<T>> {
  const version = checkSchemaVersion(value);
  if (version.status !== 'supported') return version;
  const v = value as Record<string, unknown>;
  let errors: string[];
  if (
    v.kind !== kind ||
    !oneOf(v.kind, ['settings', 'saved-search', 'saved-plan']) ||
    !text(v.id) ||
    !text(v.revision) ||
    !utc(v.savedAt)
  )
    errors = ['Invalid local record identity or date.'];
  else {
    try {
      const validation = validatePayload(v.payload);
      errors =
        Array.isArray(validation) && validation.every((e) => typeof e === 'string')
          ? validation
          : ['Invalid payload validation result.'];
    } catch {
      errors = ['Local payload could not be validated; retain the original record.'];
    }
  }
  return errors.length
    ? { status: 'invalid', errors }
    : { status: 'supported', value: v as unknown as LocalRecord<T> };
}
/** The supplied commit must atomically write a complete new record; never delete the source. */
export async function commitMigratedRecord<T>(
  original: unknown,
  next: LocalRecord<T>,
  validatePayload: (v: unknown) => string[],
  commit: (record: LocalRecord<T>) => Promise<void>,
): Promise<
  | { status: 'committed'; value: LocalRecord<T>; original: unknown }
  | {
      status: 'invalid' | 'unsupported-version' | 'commit-failed';
      original: unknown;
      errors: string[];
    }
> {
  if (!object(next))
    return {
      status: 'invalid',
      original,
      errors: ['Migration target must be a complete versioned object.'],
    };
  const parsed = readLocalRecord<T>(next, next.kind, validatePayload);
  if (parsed.status !== 'supported') return { ...parsed, original };
  try {
    await commit(parsed.value);
    return { status: 'committed', value: parsed.value, original };
  } catch {
    return {
      status: 'commit-failed',
      original,
      errors: ['Local save failed. Original data retained; retry or recover.'],
    };
  }
}

/** Exact unit definitions. UI rounding is independent of canonical stored values. */
export const CANONICAL_CONVERSIONS = Object.freeze({
  metresPerFoot: 0.3048,
  metresPerNauticalMile: 1852,
  metresPerStatuteMile: 1609.344,
  kilometresPerNauticalMile: 1.852,
});
export const unitConversionTolerance = (expected: number) =>
  Math.max(1e-9, Math.abs(expected) * 1e-12);

/** An envelope's role alone cannot establish analytical coverage or release approval. */
export function validateAnalyticalCoverage(
  value: unknown,
  snapshot: unknown,
  observedHashes: Readonly<Record<string, string>>,
  assessedAt: string,
  areaValid: (v: unknown) => boolean,
): string[] {
  const errors = validateSnapshotIdentity(snapshot, observedHashes, assessedAt);
  if (errors.length) return errors;
  const validatedSnapshot = snapshot as SnapshotIdentity;
  if (!object(value)) return [...errors, 'Analytical coverage must be an object.'];
  if (
    value.schemaVersion !== 2 ||
    value.role !== 'analytical-coverage' ||
    !oneOf(value.layer, [
      'bathymetry',
      'hazards',
      'habitat',
      'restrictions',
      'weather',
      'tides',
      'currents',
    ]) ||
    !safeArea(value.geometry, areaValid) ||
    !ids(value.sourceIds) ||
    !interval(value.validFrom, value.validUntil) ||
    typeof value.complete !== 'boolean'
  )
    errors.push(
      'Analytical coverage requires original area geometry, interval, layer and source references.',
    );
  const component = validatedSnapshot.components.find((c) => c.id === value.componentId);
  const review = validatedSnapshot.reviews.find((r) => r.id === value.reviewId);
  const layerKinds: Record<string, EvidenceComponent['kind']> = {
    bathymetry: 'static-analysis',
    hazards: 'static-analysis',
    restrictions: 'rules-habitat',
    habitat: 'rules-habitat',
    weather: 'weather-current',
    currents: 'weather-current',
    tides: 'water-level',
  };
  if (
    !component ||
    !text(value.layer) ||
    !Object.hasOwn(layerKinds, value.layer) ||
    component.kind !== layerKinds[value.layer]
  )
    errors.push('Component kind cannot establish this analytical layer.');
  if (
    !component ||
    component.kind === 'display' ||
    component.evidence.role !== 'analytical-coverage' ||
    component.evidence.rights.analysis.status !== 'permitted' ||
    (ids(value.sourceIds) && value.sourceIds.some((id) => !component.sourceIds.includes(id)))
  )
    errors.push('Display/context/point evidence cannot establish analytical coverage.');
  if (
    !review ||
    !review.scope.includes('coverage') ||
    !component ||
    !review.components.some(
      (c) =>
        c.id === component.id && c.sha256 === component.sha256 && c.version === component.version,
    )
  )
    errors.push('Analytical coverage requires an exact component-bound coverage review.');
  if (value.complete === true && component) {
    const e = component.evidence;
    if (
      !utc(value.validFrom) ||
      !utc(value.validUntil) ||
      Date.parse(value.validUntil) <= Date.parse(assessedAt) ||
      !review ||
      Date.parse(value.validFrom) < Date.parse(review.reviewedAt) ||
      Date.parse(review.validUntil) < Date.parse(value.validUntil)
    )
      errors.push('Coverage and its review must remain valid through the requested interval.');
    if (
      e.review.status !== 'reviewed' ||
      !text(value.reviewId) ||
      !e.review.attestationIds.includes(value.reviewId)
    )
      errors.push('Complete coverage requires the component to name its exact coverage review.');
    if (
      !e.usableUntil ||
      Date.parse(e.usableUntil) <= Date.parse(assessedAt) ||
      Date.parse(e.retrievedAt) > Date.parse(assessedAt) ||
      !utc(value.validUntil) ||
      Date.parse(value.validUntil) > Date.parse(e.usableUntil)
    )
      errors.push(
        'Complete current coverage requires known usable evidence through the full interval.',
      );
    if (
      e.forecastInterval &&
      (!utc(value.validFrom) ||
        !utc(value.validUntil) ||
        Date.parse(value.validFrom) < Date.parse(e.forecastInterval.from) ||
        Date.parse(value.validUntil) > Date.parse(e.forecastInterval.until))
    )
      errors.push('Coverage cannot extend the forecast interval.');
  }
  return [...new Set(errors)];
}
