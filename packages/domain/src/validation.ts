import type { RegionPack, SearchRequest, VesselProfile } from './types.ts';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown, min = 0, max = Infinity): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const date = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  day(value.slice(0, 10)) &&
  Number.isFinite(Date.parse(value));
const position = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.length === 2 &&
  finite(value[0], -180, 180) &&
  finite(value[1], -85, 85);
const interval = (from: unknown, until: unknown) =>
  date(from) && date(until) && Date.parse(until) > Date.parse(from);
const sourceIds = (value: unknown) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((id) => typeof id === 'string' && id.length > 0);
export const VERTICAL_DATUMS = [
  'MLLW',
  'MLW',
  'LAT',
  'MSL',
  'NAVD88',
  'NGVD29',
  'MHHW',
  'MHW',
  'MHWS',
  'HAT',
] as const;
const datum = (value: unknown) =>
  typeof value === 'string' && (VERTICAL_DATUMS as readonly string[]).includes(value);
const day = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

export function validateAssessmentContext(value: unknown): string[] {
  return record(value) &&
    date(value.assessedAt) &&
    ['current', 'historical'].includes(String(value.purpose))
    ? []
    : [
        'Assessment context requires an explicit ISO timestamp with timezone and current or historical purpose.',
      ];
}

export function validateTariff(value: unknown): string[] {
  if (!record(value)) return ['Tariff must be an object.'];
  const errors: string[] = [];
  if (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency))
    errors.push('Tariff currency must be a three-letter code.');
  try {
    new Intl.DateTimeFormat('en', { timeZone: String(value.timezone) });
  } catch {
    errors.push('Invalid tariff timezone.');
  }
  if (!sourceIds(value.sourceIds) || !interval(value.verifiedAt, value.validUntil))
    errors.push('Tariff provenance and verification dates are required.');
  if (!finite(value.taxRate, 0, 1)) errors.push('Invalid tax rate.');
  if (value.minimumStayCharge !== undefined && !finite(value.minimumStayCharge, 0))
    errors.push('Invalid minimum stay charge.');
  if (value.multihullMultiplier !== undefined && !finite(value.multihullMultiplier, 1))
    errors.push('Invalid multihull multiplier.');
  if (
    value.beamSurcharge !== undefined &&
    (!record(value.beamSurcharge) ||
      !finite(value.beamSurcharge.aboveM, 0) ||
      !finite(value.beamSurcharge.multiplier, 1))
  )
    errors.push('Invalid beam supplement.');
  if (!Array.isArray(value.bands) || !value.bands.length) errors.push('Tariff bands are required.');
  else
    for (const band of value.bands) {
      if (
        !record(band) ||
        typeof band.id !== 'string' ||
        typeof band.label !== 'string' ||
        !day(band.validFrom) ||
        !day(band.validUntil) ||
        band.validUntil < band.validFrom ||
        !['flat', 'per_metre', 'per_foot'].includes(String(band.basis)) ||
        !['night', 'day', 'hour'].includes(String(band.period)) ||
        !finite(band.rate, 0)
      )
        errors.push('Invalid tariff band.');
      if (record(band))
        for (const key of ['minBillableLengthM', 'minCharge', 'maxLengthM'])
          if (band[key] !== undefined && !finite(band[key], 0))
            errors.push(`Invalid tariff ${key}.`);
    }
  if (
    !Array.isArray(value.extras) ||
    !value.extras.every(
      (extra) =>
        record(extra) &&
        typeof extra.label === 'string' &&
        finite(extra.amount, 0) &&
        ['stay', 'night'].includes(String(extra.per)) &&
        typeof extra.required === 'boolean' &&
        typeof extra.taxable === 'boolean',
    )
  )
    errors.push('Invalid tariff extras.');
  return errors;
}

export function validateVessel(value: unknown): string[] {
  if (!record(value)) return ['Vessel must be an object.'];
  const errors: string[] = [];
  for (const key of ['id', 'name'])
    if (typeof value[key] !== 'string' || !value[key]) errors.push(`Vessel ${key} is required.`);
  if (!['sailboat', 'powerboat', 'catamaran', 'trimaran'].includes(String(value.type)))
    errors.push('Unsupported vessel type.');
  for (const key of ['lengthM', 'beamM', 'loadedDraftM', 'displacementKg'])
    if (!finite(value[key], 0.01)) errors.push(`Vessel ${key} must be positive.`);
  if (finite(value.lengthM) && finite(value.beamM) && value.beamM > value.lengthM)
    errors.push('Beam cannot exceed vessel length.');
  if (value.airDraftM !== undefined && !finite(value.airDraftM, 0))
    errors.push('Air draft must be nonnegative.');
  if (!record(value.anchor)) errors.push('Anchor configuration is required.');
  else {
    const anchor = value.anchor;
    if (typeof anchor.type !== 'string' || !anchor.type.trim())
      errors.push('Anchor type is required.');
    if (!['chain', 'mixed', 'rope'].includes(String(anchor.rodeType)))
      errors.push('Rode type is required.');
    if (!finite(anchor.usableLengthM, 1, 1000))
      errors.push('Usable rode must be between 1 and 1000 metres.');
    if (!finite(anchor.bowRollerHeightM, 0, 20))
      errors.push('Bow roller height must be between 0 and 20 metres.');
    if (anchor.scopeGuidance !== null) {
      if (!record(anchor.scopeGuidance))
        errors.push('Scope guidance must be reviewed guidance or null.');
      else {
        const scope = anchor.scopeGuidance;
        if (!finite(scope.ratio, 1, 20)) errors.push('Scope ratio must be between 1 and 20.');
        for (const key of ['maxWindKnots', 'maxGustKnots', 'maxWaveM', 'maxCurrentKnots'])
          if (!finite(scope[key], 0)) errors.push(`Scope guidance ${key} is invalid.`);
        if (
          !['reviewed', 'demo'].includes(String(scope.reviewStatus)) ||
          typeof scope.source !== 'string' ||
          !scope.source.trim() ||
          !date(scope.reviewedAt)
        )
          errors.push('Scope guidance needs its review status, source and date.');
      }
    }
  }
  return errors;
}

export function validateSearch(value: unknown): string[] {
  if (!record(value)) return ['Search must be an object.'];
  const errors: string[] = [];
  if (!position(value.origin)) errors.push('Search origin must be [longitude, latitude].');
  if (!finite(value.maxDistanceNm, 0.01, 50))
    errors.push('Search radius must be between 0.01 and 50 nautical miles.');
  if (
    !date(value.arrival) ||
    !date(value.departure) ||
    Date.parse(String(value.departure)) <= Date.parse(String(value.arrival))
  )
    errors.push('Departure must be after arrival.');
  if (
    date(value.arrival) &&
    date(value.departure) &&
    Date.parse(value.departure) - Date.parse(value.arrival) > 7 * 86_400_000
  )
    errors.push('Search stay cannot exceed seven days.');
  if (!finite(value.departureContingencyHours, 0, 48))
    errors.push('Departure contingency must be between 0 and 48 hours.');
  for (const key of [
    'preferredMaxDepthM',
    'minUnderKeelClearanceM',
    'maxWindKnots',
    'maxGustKnots',
    'maxWaveM',
    'maxCurrentKnots',
    'safetyMarginM',
  ])
    if (!finite(value[key], key === 'preferredMaxDepthM' ? 0.1 : 0))
      errors.push(`Search ${key} is invalid.`);
  if (value.deployedRodeM !== undefined && !finite(value.deployedRodeM, 1, 1000))
    errors.push('Deployed rode must be between 1 and 1000 metres.');
  if (
    value.preferredBedding !== undefined &&
    !['any', 'sand', 'mud', 'mixed', 'rock', 'unknown'].includes(String(value.preferredBedding))
  )
    errors.push('Preferred seabed must be any, sand, mud, mixed, rock or unknown.');
  if (!['overnight', 'daytime'].includes(String(value.visitMode)))
    errors.push('Visit mode must be overnight or daytime.');
  return errors;
}

type Point = [number, number];
function ringInside(point: Point, ring: Point[]): boolean {
  let result = false;
  for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1]!,
      b = ring[i]!;
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      result = !result;
  }
  return result;
}
function ringsValid(rings: Point[][]): boolean {
  const segments: {
    a: Point;
    b: Point;
    ring: number;
    index: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }[] = [];
  for (const [r, ring] of rings.entries()) {
    let area = 0;
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1]!,
        b = ring[i]!;
      if (a[0] === b[0] && a[1] === b[1]) return false;
      area += a[0] * b[1] - b[0] * a[1];
      segments.push({
        a,
        b,
        ring: r,
        index: i - 1,
        minX: Math.min(a[0], b[0]),
        maxX: Math.max(a[0], b[0]),
        minY: Math.min(a[1], b[1]),
        maxY: Math.max(a[1], b[1]),
      });
    }
    if (Math.abs(area) < 1e-12) return false;
    if (
      r > 0 &&
      (!ringInside(ring[0]!, rings[0]!) ||
        rings.slice(1, r).some((hole) => ringInside(ring[0]!, hole) || ringInside(hole[0]!, ring)))
    )
      return false;
  }
  segments.sort((a, b) => a.minX - b.minX);
  const cross = (a: Point, b: Point, c: Point) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 0; i < segments.length; i++) {
    const a = segments[i]!;
    for (let j = i + 1; j < segments.length; j++) {
      const b = segments[j]!;
      if (b.minX > a.maxX) break;
      if (a.maxY < b.minY || b.maxY < a.minY) continue;
      if (
        a.ring === b.ring &&
        (Math.abs(a.index - b.index) === 1 ||
          Math.abs(a.index - b.index) === rings[a.ring]!.length - 2)
      )
        continue;
      const c1 = cross(a.a, a.b, b.a),
        c2 = cross(a.a, a.b, b.b),
        c3 = cross(b.a, b.b, a.a),
        c4 = cross(b.a, b.b, a.b);
      if (
        ((c1 <= 0 && c2 >= 0) || (c1 >= 0 && c2 <= 0)) &&
        ((c3 <= 0 && c4 >= 0) || (c3 >= 0 && c4 <= 0))
      )
        return false;
    }
  }
  return true;
}
function validGeometry(value: unknown): boolean {
  if (
    !record(value) ||
    !['Polygon', 'MultiPolygon'].includes(String(value.type)) ||
    !Array.isArray(value.coordinates)
  )
    return false;
  const polygons = value.type === 'Polygon' ? [value.coordinates] : value.coordinates;
  return (
    polygons.length > 0 &&
    polygons.every(
      (polygon) =>
        Array.isArray(polygon) &&
        polygon.length > 0 &&
        polygon.every((ring) => {
          if (
            !Array.isArray(ring) ||
            ring.length < 4 ||
            ring.length > 100_000 ||
            !ring.every(position)
          )
            return false;
          const first = ring[0] as number[],
            last = ring[ring.length - 1] as number[];
          return first[0] === last[0] && first[1] === last[1];
        }) &&
        ringsValid(polygon as Point[][]),
    )
  );
}

export function validateRegionPack(value: unknown): string[] {
  if (!record(value)) return ['Region pack must be an object.'];
  const errors: string[] = [];
  for (const key of ['id', 'version', 'name', 'timezone'])
    if (typeof value[key] !== 'string' || !value[key]) errors.push(`Region ${key} is required.`);
  try {
    new Intl.DateTimeFormat('en', { timeZone: String(value.timezone) });
  } catch {
    errors.push('Region timezone is invalid.');
  }
  if (!interval(value.generatedAt, value.validUntil))
    errors.push('Region generation/expiry dates are required and ordered.');
  if (
    !record(value.validation) ||
    !['synthetic', 'unreviewed', 'reviewed'].includes(String(value.validation.status)) ||
    typeof value.validation.notice !== 'string'
  )
    errors.push('Region validation metadata is required.');
  if (
    record(value.validation) &&
    value.validation.status === 'reviewed' &&
    (!value.validation.reviewedBy || !date(value.validation.reviewedAt))
  )
    errors.push('Reviewed regions require a reviewer and review date.');
  if (
    !Array.isArray(value.bounds) ||
    value.bounds.length !== 4 ||
    !value.bounds.every((n) => finite(n, -180, 180)) ||
    !(
      Number(value.bounds[0]) < Number(value.bounds[2]) &&
      Number(value.bounds[1]) < Number(value.bounds[3])
    )
  )
    errors.push('Region bounds are invalid.');
  if (
    !record(value.chart) ||
    typeof value.chart.attribution !== 'string' ||
    typeof value.chart.offlineAllowed !== 'boolean'
  )
    errors.push('Region chart metadata is required.');
  for (const key of [
    'sources',
    'coverage',
    'depths',
    'hazards',
    'restrictions',
    'tides',
    'weather',
    'places',
  ])
    if (!Array.isArray(value[key])) errors.push(`Region ${key} must be an array.`);
  for (const key of [
    'sources',
    'coverage',
    'depths',
    'hazards',
    'restrictions',
    'places',
    'holdingAreas',
    'marks',
  ]) {
    const entries = value[key];
    if (Array.isArray(entries)) {
      const ids = entries.filter(record).map((item) => item.id);
      if (new Set(ids).size !== ids.length) errors.push(`Duplicate ${key} identifiers.`);
    }
  }
  for (const key of ['coverage', 'depths', 'hazards', 'restrictions', 'holdingAreas']) {
    const features = value[key];
    if (Array.isArray(features))
      for (const feature of features) {
        if (
          !record(feature) ||
          typeof feature.id !== 'string' ||
          !validGeometry(feature.geometry) ||
          !sourceIds(feature.sourceIds)
        )
          errors.push(`Invalid ${key} feature, polygon topology or missing provenance.`);
      }
  }
  if (Array.isArray(value.sources))
    for (const source of value.sources) {
      if (
        !record(source) ||
        typeof source.id !== 'string' ||
        !interval(source.retrievedAt, source.validUntil) ||
        typeof source.url !== 'string' ||
        !/^https?:\/\//.test(source.url)
      )
        errors.push('Invalid source provenance.');
    }
  if (Array.isArray(value.coverage))
    for (const item of value.coverage) {
      if (
        !record(item) ||
        ![
          'bathymetry',
          'hazards',
          'habitat',
          'restrictions',
          'weather',
          'tides',
          'currents',
        ].includes(String(item.layer)) ||
        !interval(item.validFrom, item.validUntil) ||
        typeof item.complete !== 'boolean'
      )
        errors.push('Invalid coverage declaration.');
    }
  if (Array.isArray(value.depths))
    for (const item of value.depths) {
      if (
        !record(item) ||
        ![item.minDepthM, item.maxDepthM].every((n) => n === null || finite(n, -100, 12000)) ||
        !datum(item.verticalDatum) ||
        !['reviewed', 'unknown'].includes(String(item.surveyQuality)) ||
        (typeof item.minDepthM === 'number' &&
          typeof item.maxDepthM === 'number' &&
          item.minDepthM > item.maxDepthM)
      )
        errors.push('Invalid depth bounds, vertical datum or survey quality.');
    }
  if (Array.isArray(value.hazards))
    for (const item of value.hazards)
      if (
        !record(item) ||
        !['shore', 'obstruction', 'cable', 'channel', 'shallow', 'habitat'].includes(
          String(item.kind),
        )
      )
        errors.push('Invalid hazard kind.');
  if (Array.isArray(value.restrictions))
    for (const item of value.restrictions) {
      if (
        !record(item) ||
        typeof item.resolved !== 'boolean' ||
        typeof item.prohibitsAnchoring !== 'boolean' ||
        typeof item.prohibitsOvernight !== 'boolean' ||
        typeof item.jurisdiction !== 'string' ||
        !interval(item.validFrom, item.validUntil)
      )
        errors.push('Invalid restriction applicability.');
    }
  if (Array.isArray(value.tides))
    for (const item of value.tides) {
      if (
        !record(item) ||
        !interval(item.validFrom, item.validUntil) ||
        !datum(item.verticalDatum) ||
        !sourceIds(item.coverageAreaIds) ||
        typeof item.stationRelationshipReviewed !== 'boolean' ||
        ![item.minWaterLevelM, item.maxWaterLevelM].every(
          (n) => n === null || finite(n, -100, 100),
        ) ||
        !(item.uncertaintyM === null || finite(item.uncertaintyM, 0, 100)) ||
        !sourceIds(item.sourceIds) ||
        (typeof item.minWaterLevelM === 'number' &&
          typeof item.maxWaterLevelM === 'number' &&
          item.minWaterLevelM > item.maxWaterLevelM)
      )
        errors.push('Invalid tide interval, spatial applicability or vertical datum.');
    }
  if (Array.isArray(value.weather))
    for (const item of value.weather) {
      if (
        !record(item) ||
        !interval(item.validFrom, item.validUntil) ||
        !sourceIds(item.coverageAreaIds) ||
        !Array.isArray(item.warnings) ||
        !item.warnings.every((w) => typeof w === 'string') ||
        !sourceIds(item.sourceIds) ||
        ![
          'windKnots',
          'gustKnots',
          'waveM',
          'swellM',
          'currentKnots',
          'windDirectionDeg',
          'currentDirectionDeg',
        ].every((k) => item[k] === null || finite(item[k], 0, k.endsWith('Deg') ? 360 : 500))
      )
        errors.push('Invalid weather interval or spatial applicability.');
    }
  if (Array.isArray(value.places))
    for (const item of value.places) {
      if (
        !record(item) ||
        typeof item.id !== 'string' ||
        typeof item.name !== 'string' ||
        !position(item.position) ||
        !['marina', 'dock', 'mooring', 'anchorage'].includes(String(item.kind)) ||
        !['free', 'paid', 'unknown'].includes(String(item.feeStatus)) ||
        !['available', 'unavailable', 'unknown'].includes(String(item.availability)) ||
        !['sand', 'mud', 'mixed', 'rock', 'unknown'].includes(String(item.holding)) ||
        ![true, false, null].includes(item.overnightAllowed as boolean | null) ||
        !sourceIds(item.sourceIds) ||
        !Array.isArray(item.facilities) ||
        !Array.isArray(item.notes)
      )
        errors.push('Invalid place.');
      if (record(item)) {
        if (item.tariff !== undefined) errors.push(...validateTariff(item.tariff));
        for (const key of [
          'floridaKeysReefBuoy',
          'closed',
          'vesselLimitsVerified',
          'operationalRestrictionsVerified',
        ])
          if (item[key] !== undefined && typeof item[key] !== 'boolean')
            errors.push(`Place ${key} must be a boolean.`);
        if (
          item.allowedVesselTypes !== undefined &&
          (!Array.isArray(item.allowedVesselTypes) ||
            !item.allowedVesselTypes.every((type) =>
              ['sailboat', 'powerboat', 'catamaran', 'trimaran'].includes(String(type)),
            ))
        )
          errors.push('Invalid allowed vessel types.');
        if (item.verticalDatum !== undefined && !datum(item.verticalDatum))
          errors.push('Invalid place vertical datum.');
        for (const key of [
          'maxLengthM',
          'maxBeamM',
          'maxDraftM',
          'maxDisplacementKg',
          'maxAirDraftM',
          'mooringSwingRadiusM',
          'entranceMinDepthM',
          'berthMinDepthM',
        ])
          if (item[key] !== undefined && !finite(item[key], 0))
            errors.push(`Invalid place ${key}.`);
        if (
          item.accessWindows !== undefined &&
          (!Array.isArray(item.accessWindows) ||
            !item.accessWindows.every((w) => record(w) && interval(w.from, w.until)))
        )
          errors.push('Invalid access window.');
      }
    }
  if (value.holdingAreas !== undefined && !Array.isArray(value.holdingAreas))
    errors.push('Holding areas must be an array.');
  if (Array.isArray(value.holdingAreas))
    for (const item of value.holdingAreas)
      if (
        !record(item) ||
        !['sand', 'mud', 'mixed', 'rock', 'unknown'].includes(String(item.holding)) ||
        !Array.isArray(item.compatibleAnchorTypes) ||
        !item.compatibleAnchorTypes.every((t) => typeof t === 'string') ||
        typeof item.reviewed !== 'boolean'
      )
        errors.push('Invalid holding-ground evidence.');
  if (value.marks !== undefined && !Array.isArray(value.marks))
    errors.push('Navigation marks must be an array.');
  if (Array.isArray(value.marks)) {
    const knownSources = new Set(
      Array.isArray(value.sources) ? value.sources.filter(record).map((source) => source.id) : [],
    );
    for (const mark of value.marks)
      if (
        !record(mark) ||
        typeof mark.id !== 'string' ||
        !mark.id.trim() ||
        typeof mark.name !== 'string' ||
        !mark.name.trim() ||
        typeof mark.label !== 'string' ||
        !mark.label.trim() ||
        !position(mark.position) ||
        !['lateral', 'cardinal', 'isolated_danger', 'safe_water', 'special', 'unknown'].includes(
          String(mark.kind),
        ) ||
        !sourceIds(mark.sourceIds) ||
        !(mark.sourceIds as string[]).every((source) => knownSources.has(source))
      )
        errors.push('Invalid navigation mark or missing provenance.');
  }
  return [...new Set(errors)];
}

export function assertInputs(pack: RegionPack, vessel: VesselProfile, search: SearchRequest): void {
  const errors = [
    ...validateRegionPack(pack),
    ...validateVessel(vessel),
    ...validateSearch(search),
  ];
  if (errors.length) throw new Error(errors.join(' '));
}
