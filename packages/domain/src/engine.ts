import type {
  Assessment,
  AssessmentContext,
  AssessmentReason,
  Bedding,
  Candidate,
  EvidenceLayer,
  Place,
  Position,
  RegionPack,
  SearchOptions,
  SearchRequest,
  SearchResult,
  VesselProfile,
  WeatherInterval,
} from './types.ts';
import {
  areaContainsDisk,
  destination,
  diskIntersectsArea,
  distanceM,
  pointInArea,
} from './geo.ts';
import { assessHazardPrimitives } from './hazards.ts';
import { estimateCost, localDate } from './cost.ts';
import { getPreferredBeddings } from './seabed.ts';
import { assertInputs, validateAssessmentContext } from './validation.ts';

const NM = 1852;
const isoTime = (value: string) => Date.parse(value);
const overlaps = (from: string, until: string, start: number, end: number) =>
  isoTime(from) < end && isoTime(until) > start;
const numberKnown = (value: number | null): value is number =>
  value !== null && Number.isFinite(value);
const layers: EvidenceLayer[] = [
  'bathymetry',
  'hazards',
  'habitat',
  'restrictions',
  'weather',
  'tides',
  'currents',
];

function intervalHasSpatialEvidence(
  frame: { coverageAreaIds: string[]; validFrom: string; validUntil: string },
  layer: EvidenceLayer,
  point: Position,
  radius: number,
  start: number,
  end: number,
  pack: RegionPack,
): boolean {
  const from = Math.max(start, isoTime(frame.validFrom)),
    until = Math.min(end, isoTime(frame.validUntil));
  return frame.coverageAreaIds.some((id) =>
    pack.coverage.some(
      (area) =>
        area.id === id &&
        area.layer === layer &&
        area.complete === true &&
        isoTime(area.validFrom) <= from &&
        isoTime(area.validUntil) >= until &&
        areaContainsDisk(point, radius, area.geometry),
    ),
  );
}

export function intervalsCover(
  intervals: { validFrom: string; validUntil: string }[],
  start: number,
  end: number,
): boolean {
  const ordered = intervals
    .map((interval) => [isoTime(interval.validFrom), isoTime(interval.validUntil)] as const)
    .filter(([from, until]) => Number.isFinite(from) && Number.isFinite(until) && until > from)
    .sort((a, b) => a[0] - b[0]);
  if (start === end) return ordered.some(([from, until]) => from <= start && until >= start);
  let covered = start;
  for (const [from, until] of ordered) {
    if (from > covered) return false;
    covered = Math.max(covered, until);
    if (covered >= end) return true;
  }
  return false;
}

export function isOvernight(search: SearchRequest, timezone: string): boolean {
  return (
    search.visitMode === 'overnight' ||
    isoTime(search.departure) - isoTime(search.arrival) > 12 * 3_600_000 ||
    localDate(search.arrival, timezone) !== localDate(search.departure, timezone)
  );
}

function candidateFromPlace(place: Place): Candidate {
  return { id: place.id, name: place.name, position: place.position, kind: place.kind, place };
}

function exposureEstimate(
  point: Position,
  weather: WeatherInterval[],
  pack: RegionPack,
): Assessment['exposure'] {
  if (!weather.length || weather.some((frame) => frame.windDirectionDeg === null))
    return { score: null, label: 'Exposure unknown', maxFetchM: null };
  let maximum = 0;
  const shores = pack.hazards.filter((hazard) => hazard.kind === 'shore');
  // Estimate upwind fetch through known chart coverage, without implying wave modelling.
  for (const frame of weather) {
    let fetch = 0;
    for (let metres = 100; metres <= 10_000; metres += 100) {
      const p = destination(point, frame.windDirectionDeg!, metres);
      if (shores.some((shore) => diskIntersectsArea(p, 50, shore.geometry))) break;
      if (
        !pack.coverage.some(
          (c) => c.layer === 'hazards' && c.complete && pointInArea(p, c.geometry),
        )
      )
        return {
          score: null,
          label: 'Fetch extends beyond known coastline coverage',
          maxFetchM: null,
        };
      fetch = metres;
    }
    maximum = Math.max(maximum, fetch);
  }
  return {
    score: Math.round(maximum / 100),
    label: 'Coastline/fetch exposure estimate; not a wave forecast',
    maxFetchM: maximum,
  };
}

function assess(
  candidate: Candidate,
  vessel: VesselProfile,
  search: SearchRequest,
  pack: RegionPack,
  allowance: 0 | 20 | 30,
  context?: AssessmentContext,
): Assessment {
  const start = isoTime(search.arrival),
    end = isoTime(search.departure) + search.departureContingencyHours * 3_600_000;
  const reasons: AssessmentReason[] = [];
  const sources = new Set<string>();
  const add = (
    code: string,
    message: string,
    severity: AssessmentReason['severity'],
    sourceIds?: string[],
  ) => {
    if (!reasons.some((reason) => reason.code === code && reason.message === message))
      reasons.push({ code, message, severity, ...(sourceIds ? { sourceIds } : {}) });
    sourceIds?.forEach((id) => sources.add(id));
  };
  const simulated = pack.validation.status === 'synthetic';
  if (simulated)
    add(
      'synthetic_data',
      'SIMULATION: all geometry, forecasts, prices and permissions are artificial; do not use for navigation or anchoring.',
      'info',
    );
  else if (pack.validation.status !== 'reviewed')
    add(
      'unreviewed_pack',
      'This region has not passed qualified maritime review.',
      'insufficient_evidence',
    );
  if (context?.purpose !== 'current')
    add(
      'historical_assessment',
      'Historical replay: evidence is checked against the requested stay, without present-time freshness certification.',
      'info',
    );
  if (isoTime(pack.validUntil) < end)
    add(
      'expired_pack',
      'The region snapshot expires before the end of the stay and departure contingency.',
      'insufficient_evidence',
    );
  if (isoTime(pack.generatedAt) > start)
    add(
      'future_pack',
      'The region snapshot was created after the requested arrival.',
      'insufficient_evidence',
    );
  const assessedAt = context?.purpose === 'current' ? isoTime(context.assessedAt) : null;
  if (assessedAt !== null) {
    if (end <= assessedAt)
      add(
        'elapsed_stay',
        'The requested stay and departure contingency have elapsed. Update the stay before using this assessment for current anchoring.',
        'insufficient_evidence',
      );
    if (isoTime(pack.validUntil) <= assessedAt)
      add(
        'currently_expired_pack',
        'The region snapshot has expired as of the assessment time.',
        'insufficient_evidence',
      );
    if (isoTime(pack.generatedAt) > assessedAt)
      add(
        'currently_future_pack',
        'The region snapshot is dated after the assessment time.',
        'insufficient_evidence',
      );
  }
  const d = distanceM(search.origin, candidate.position);
  if (d > search.maxDistanceNm * NM)
    add(
      'outside_radius',
      'The point exceeds the maximum straight-line search distance.',
      'excluded',
    );
  const [west, south, east, north] = pack.bounds;
  if (
    candidate.position[0] < west ||
    candidate.position[0] > east ||
    candidate.position[1] < south ||
    candidate.position[1] > north
  )
    add('outside_region', 'The point lies outside this region snapshot.', 'insufficient_evidence');

  const weather = pack.weather
    .filter(
      (frame) =>
        overlaps(frame.validFrom, frame.validUntil, start, end) &&
        intervalHasSpatialEvidence(frame, 'weather', candidate.position, 0, start, end, pack) &&
        intervalHasSpatialEvidence(frame, 'currents', candidate.position, 0, start, end, pack),
    )
    .sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  if (!intervalsCover(weather, start, end))
    add(
      'forecast_gap',
      'Weather and current forecasts do not cover the entire stay and departure contingency.',
      'insufficient_evidence',
    );
  const scope = vessel.anchor.scopeGuidance;
  const anchored = candidate.kind === 'anchorage' || candidate.kind === 'generated';
  if (anchored && (!scope || (!simulated && scope.reviewStatus !== 'reviewed')))
    add(
      'scope_unreviewed',
      'Equipment-specific reviewed rode guidance is required.',
      'insufficient_evidence',
    );
  for (const frame of weather) {
    frame.sourceIds.forEach((id) => sources.add(id));
    if (
      [
        frame.windKnots,
        frame.gustKnots,
        frame.windDirectionDeg,
        frame.waveM,
        frame.swellM,
        frame.currentKnots,
        frame.currentDirectionDeg,
      ].some((value) => value === null)
    )
      add(
        'weather_unknown',
        'Wind, gusts, direction, waves, swell or current evidence is missing.',
        'insufficient_evidence',
        frame.sourceIds,
      );
    const waveBound =
      numberKnown(frame.waveM) && numberKnown(frame.swellM) ? frame.waveM + frame.swellM : null;
    const metrics = [
      ['wind', frame.windKnots, search.maxWindKnots, scope?.maxWindKnots],
      ['gust', frame.gustKnots, search.maxGustKnots, scope?.maxGustKnots],
      ['wave', waveBound, search.maxWaveM, scope?.maxWaveM],
      ['current', frame.currentKnots, search.maxCurrentKnots, scope?.maxCurrentKnots],
    ] as const;
    for (const [name, actual, requested, equipment] of metrics) {
      if (actual !== null && actual > requested)
        add(
          `${name}_limit`,
          `${name[0]!.toUpperCase()}${name.slice(1)} conditions exceed the configured operating limit.`,
          'excluded',
          frame.sourceIds,
        );
      if (anchored && actual !== null && equipment !== undefined && actual > equipment)
        add(
          'scope_conditions',
          'Conditions exceed the reviewed anchor/rode guidance envelope.',
          'excluded',
          frame.sourceIds,
        );
    }
    if (frame.warnings.length)
      add(
        'official_warning',
        `Active warning: ${frame.warnings.join('; ')}.`,
        'excluded',
        frame.sourceIds,
      );
  }

  const tides = pack.tides.filter(
    (tide) =>
      overlaps(tide.validFrom, tide.validUntil, start, end) &&
      intervalHasSpatialEvidence(tide, 'tides', candidate.position, 0, start, end, pack),
  );
  tides.forEach((tide) => tide.sourceIds.forEach((id) => sources.add(id)));
  if (!intervalsCover(tides, start, end))
    add(
      'tide_gap',
      'Water-level bounds do not cover the entire stay and departure contingency.',
      'insufficient_evidence',
    );
  const tideKnown =
    tides.length > 0 &&
    tides.every(
      (tide) =>
        numberKnown(tide.minWaterLevelM) &&
        numberKnown(tide.maxWaterLevelM) &&
        numberKnown(tide.uncertaintyM) &&
        tide.minWaterLevelM <= tide.maxWaterLevelM &&
        tide.stationRelationshipReviewed,
    );
  if (!tideKnown)
    add(
      'water_level_unknown',
      'Reviewed station relationships and bounded water-level uncertainty are required.',
      'insufficient_evidence',
    );
  const lowWater = tideKnown
    ? Math.min(...tides.map((t) => t.minWaterLevelM! - t.uncertaintyM!))
    : null;
  const highWater = tideKnown
    ? Math.max(...tides.map((t) => t.maxWaterLevelM! + t.uncertaintyM!))
    : null;

  let radius = anchored
    ? search.safetyMarginM
    : candidate.kind === 'mooring'
      ? (candidate.place?.mooringSwingRadiusM ?? 0) +
        vessel.lengthM +
        vessel.beamM / 2 +
        search.safetyMarginM
      : Math.hypot(vessel.lengthM, vessel.beamM) / 2 + search.safetyMarginM;
  let minDepth: number | null = null,
    maxDepth: number | null = null,
    requiredRode: number | null = null;
  let intersected = pack.depths.filter((depth) =>
    diskIntersectsArea(candidate.position, radius, depth.geometry),
  );
  let converged = false;
  for (let iteration = 0; iteration < 24; iteration++) {
    intersected = pack.depths.filter((depth) =>
      diskIntersectsArea(candidate.position, radius, depth.geometry),
    );
    const bounded =
      intersected.length > 0 &&
      intersected.every(
        (depth) =>
          depth.minDepthM !== null &&
          depth.maxDepthM !== null &&
          depth.surveyQuality === 'reviewed',
      );
    const datums = new Set(intersected.map((depth) => depth.verticalDatum));
    const datumMatched = datums.size === 1 && tides.every((tide) => datums.has(tide.verticalDatum));
    if (!bounded || !datumMatched || lowWater === null || highWater === null) break;
    minDepth = Math.min(...intersected.map((depth) => depth.minDepthM!)) + lowWater;
    maxDepth = Math.max(...intersected.map((depth) => depth.maxDepthM!)) + highWater;
    if (!anchored || !scope) {
      converged = true;
      break;
    }
    requiredRode = Math.ceil((maxDepth + vessel.anchor.bowRollerHeightM) * scope.ratio);
    // Full deployed rode as horizontal reach is conservative for every tidal state.
    const next =
      Math.max(requiredRode, search.deployedRodeM ?? 0) +
      vessel.lengthM +
      vessel.beamM / 2 +
      search.safetyMarginM;
    if (next <= radius + 0.001) {
      converged = true;
      break;
    }
    radius = next;
  }
  if (!converged && anchored && requiredRode !== null)
    add(
      'footprint_unresolved',
      'The depth/rode footprint did not converge.',
      'insufficient_evidence',
    );
  for (const depth of intersected) {
    depth.sourceIds.forEach((id) => sources.add(id));
    if (depth.minDepthM === null || depth.maxDepthM === null || depth.surveyQuality !== 'reviewed')
      add(
        'depth_unknown',
        'A depth bound or survey-quality assessment is missing within the full footprint.',
        'insufficient_evidence',
        depth.sourceIds,
      );
    if (tides.some((tide) => tide.verticalDatum !== depth.verticalDatum))
      add(
        'datum_mismatch',
        'Chart depth and water-level datums do not match; no inferred conversion is allowed.',
        'insufficient_evidence',
        depth.sourceIds,
      );
  }
  if (!intersected.some((depth) => areaContainsDisk(candidate.position, radius, depth.geometry)))
    add(
      'depth_coverage',
      'No continuous unsimplified depth area proves complete footprint coverage; chart seams and gaps remain unresolved.',
      'insufficient_evidence',
    );
  if (minDepth === null || maxDepth === null)
    add(
      'depth_unresolved',
      'Conservative minimum and maximum depths could not be established.',
      'insufficient_evidence',
    );
  else {
    if (minDepth < vessel.loadedDraftM + search.minUnderKeelClearanceM)
      add(
        'under_keel_clearance',
        'Minimum depth during the stay leaves less than the configured under-keel clearance.',
        'excluded',
      );
    if (maxDepth > search.preferredMaxDepthM * (1 + allowance / 100))
      add('preferred_depth', 'Maximum depth exceeds this search depth band.', 'excluded');
  }
  if (requiredRode !== null && requiredRode > vessel.anchor.usableLengthM)
    add('insufficient_rode', 'Required rode exceeds the vessel’s usable rode length.', 'excluded');
  if (anchored && search.deployedRodeM !== undefined) {
    if (requiredRode !== null && search.deployedRodeM < requiredRode)
      add(
        'deployed_rode_short',
        'Confirmed deployed rode is shorter than the required equipment guidance.',
        'excluded',
      );
    if (search.deployedRodeM > vessel.anchor.usableLengthM)
      add(
        'deployed_rode_exceeds_equipment',
        'Confirmed deployed rode exceeds the vessel’s usable rode length.',
        'excluded',
      );
  }
  if (allowance)
    add(
      'depth_alternative',
      `Deeper alternative: up to +${allowance}% of preferred depth; all other checks remain enforced.`,
      'info',
    );
  if (
    weather.some(
      (frame) =>
        !intervalHasSpatialEvidence(
          frame,
          'weather',
          candidate.position,
          radius,
          start,
          end,
          pack,
        ) ||
        !intervalHasSpatialEvidence(
          frame,
          'currents',
          candidate.position,
          radius,
          start,
          end,
          pack,
        ),
    )
  )
    add(
      'forecast_spatial_coverage',
      'The forecast/current grid does not cover the full swing footprint for its entire interval.',
      'insufficient_evidence',
    );
  if (
    tides.some(
      (frame) =>
        !intervalHasSpatialEvidence(frame, 'tides', candidate.position, radius, start, end, pack),
    )
  )
    add(
      'tide_spatial_coverage',
      'The reviewed tide-station relationship does not cover the full footprint for its entire interval.',
      'insufficient_evidence',
    );

  const primitiveHazards = assessHazardPrimitives(
    candidate.position,
    radius,
    pack.hazardPrimitives ?? [],
  );
  for (const reason of primitiveHazards.reasons)
    add(reason.code, reason.message, reason.severity, reason.sourceIds);

  for (const layer of layers) {
    const covering = pack.coverage.filter(
      (c) =>
        c.layer === layer &&
        c.complete &&
        (layer !== 'hazards' || primitiveHazards.complete) &&
        areaContainsDisk(candidate.position, radius, c.geometry),
    );
    covering.forEach((c) => c.sourceIds.forEach((id) => sources.add(id)));
    if (!intervalsCover(covering, start, end))
      add(
        `${layer}_coverage`,
        `Positive ${layer} coverage for the full footprint and stay is missing or expired.`,
        'insufficient_evidence',
      );
  }
  for (const hazard of pack.hazards)
    if (diskIntersectsArea(candidate.position, radius, hazard.geometry))
      add(
        `hazard_${hazard.kind}`,
        `The full footprint intersects ${hazard.name}.`,
        'excluded',
        hazard.sourceIds,
      );
  const overnight = isOvernight(
    { ...search, departure: new Date(end).toISOString() },
    pack.timezone,
  );
  for (const restriction of pack.restrictions) {
    if (
      !diskIntersectsArea(candidate.position, radius, restriction.geometry) ||
      !overlaps(restriction.validFrom, restriction.validUntil, start, end)
    )
      continue;
    if (!restriction.resolved || !restriction.jurisdiction.trim())
      add(
        'restriction_unresolved',
        `Applicability of ${restriction.name} is unresolved.`,
        'insufficient_evidence',
        restriction.sourceIds,
      );
    else if (
      (anchored && restriction.prohibitsAnchoring) ||
      (overnight && restriction.prohibitsOvernight)
    )
      add(
        'restricted',
        `${restriction.name} prohibits the requested stay.`,
        'excluded',
        restriction.sourceIds,
      );
  }

  const place = candidate.place;
  const approach: Assessment['approach'] = {
    status: 'unverified',
    notes: ['No navigation route or approach clearance has been verified.'],
  };
  if (place) {
    place.sourceIds.forEach((id) => sources.add(id));
    place.tariff?.sourceIds.forEach((id) => sources.add(id));
    if (place.closed || place.availability === 'unavailable')
      add(
        'unavailable',
        'This site is closed or reported unavailable.',
        'excluded',
        place.sourceIds,
      );
    if (overnight && (place.overnightAllowed === false || place.floridaKeysReefBuoy))
      add(
        'day_use_only',
        'Day-use location: overnight stays are not permitted.',
        'excluded',
        place.sourceIds,
      );
    if (overnight && place.overnightAllowed === null)
      add(
        'overnight_unknown',
        'Overnight permission is not established.',
        'insufficient_evidence',
        place.sourceIds,
      );
    if (place.allowedVesselTypes && !place.allowedVesselTypes.includes(vessel.type))
      add('vessel_type', 'Published rules exclude this vessel type.', 'excluded', place.sourceIds);
    const dimensions = [
      [place.maxLengthM, vessel.lengthM, 'length'],
      [place.maxBeamM, vessel.beamM, 'beam'],
      [place.maxDraftM, vessel.loadedDraftM, 'draft'],
      [place.maxDisplacementKg, vessel.displacementKg, 'displacement'],
    ] as const;
    for (const [limit, actual, name] of dimensions)
      if (limit !== undefined && actual > limit)
        add(
          'vessel_limit',
          `Vessel ${name} exceeds the published limit.`,
          'excluded',
          place.sourceIds,
        );
    if (place.kind !== 'anchorage') {
      if (place.vesselLimitsVerified !== true || place.operationalRestrictionsVerified !== true)
        add(
          'site_limits_unknown',
          'Published vessel limits and operational restrictions have not been verified.',
          'insufficient_evidence',
          place.sourceIds,
        );
      if (
        place.maxLengthM === undefined ||
        (place.kind === 'mooring'
          ? place.maxDisplacementKg === undefined
          : place.maxBeamM === undefined)
      )
        add(
          'site_capacity_unknown',
          place.kind === 'mooring'
            ? 'Published mooring length and displacement capacity are required.'
            : 'Published berth length and beam limits are required.',
          'insufficient_evidence',
          place.sourceIds,
        );
      if (place.kind === 'mooring' && place.mooringSwingRadiusM === undefined)
        add(
          'mooring_footprint_unknown',
          'The mooring’s maximum swing footprint is not established.',
          'insufficient_evidence',
          place.sourceIds,
        );
      const entrance = place.entranceMinDepthM,
        berth = place.berthMinDepthM;
      if (
        entrance === undefined ||
        berth === undefined ||
        lowWater === null ||
        !place.verticalDatum ||
        tides.some((t) => t.verticalDatum !== place.verticalDatum)
      )
        add(
          'berth_depth_unknown',
          'Entrance and berth depth bounds with matching datums are required.',
          'insufficient_evidence',
          place.sourceIds,
        );
      else {
        approach.status = 'published_constraints';
        approach.notes.push(
          'Published entrance depth checked; the approach route remains unverified.',
        );
        if (
          Math.min(entrance, berth) + lowWater <
          vessel.loadedDraftM + search.minUnderKeelClearanceM
        ) {
          add(
            'berth_clearance',
            'Published entrance or berth depth fails under-keel clearance.',
            'excluded',
            place.sourceIds,
          );
          approach.status = 'excluded';
        }
      }
      if (place.maxAirDraftM !== undefined) {
        if (vessel.airDraftM === undefined)
          add(
            'air_draft_unknown',
            'Vessel air draft is required for this published overhead limit.',
            'insufficient_evidence',
          );
        else if (vessel.airDraftM > place.maxAirDraftM)
          add(
            'air_draft_limit',
            'Vessel air draft exceeds the published access limit.',
            'excluded',
          );
      }
      if (
        place.accessWindows &&
        (!place.accessWindows.some(
          (window) => isoTime(window.from) <= start && isoTime(window.until) >= start,
        ) ||
          !intervalsCover(
            place.accessWindows.map((window) => ({
              validFrom: window.from,
              validUntil: window.until,
            })),
            isoTime(search.departure),
            end,
          ))
      )
        add(
          'access_window',
          'Arrival or continuous departure contingency falls outside published access windows.',
          'excluded',
        );
    }
    if (anchored && ['unknown', 'rock', 'grass'].includes(place.holding))
      add(
        'holding_unknown',
        'Suitable holding ground is not established for this anchor.',
        'insufficient_evidence',
        place.sourceIds,
      );
  }
  let bedding: Bedding = place?.holding ?? 'unknown';
  if (anchored) {
    const evidence = (pack.holdingAreas ?? []).filter(
      (area) => area.reviewed && areaContainsDisk(candidate.position, 2, area.geometry),
    );
    evidence.forEach((area) => area.sourceIds.forEach((id) => sources.add(id)));
    const beddings = new Set(evidence.map((area) => area.holding));
    bedding = beddings.size === 1 ? evidence[0]!.holding : 'unknown';
    const holding = evidence.find(
      (area) =>
        ['sand', 'mud', 'mixed', 'gravel', 'clay', 'silt', 'shell'].includes(area.holding) &&
        area.compatibleAnchorTypes.includes(vessel.anchor.type),
    );
    if (!holding || bedding === 'unknown')
      add(
        'holding_unknown',
        'This position has no unambiguous, verified equipment-compatible holding-ground evidence.',
        'insufficient_evidence',
      );
    const preferredBeddings = getPreferredBeddings(search);
    if (preferredBeddings.length) {
      if (bedding === 'unknown' && !preferredBeddings.includes('unknown'))
        add(
          'bedding_unknown',
          'The preferred seabed cannot be confirmed at this drop point.',
          'insufficient_evidence',
        );
      else if (bedding !== 'unknown' && !preferredBeddings.includes(bedding))
        add(
          'bedding_preference',
          `This drop point has ${bedding} seabed; the search requests ${preferredBeddings.join(', ')}.`,
          'excluded',
        );
    }
  }
  for (const sourceId of sources) {
    const source = pack.sources.find((s) => s.id === sourceId);
    if (
      !source ||
      isoTime(source.validUntil) < end ||
      isoTime(source.retrievedAt) > start ||
      isoTime(source.retrievedAt) > isoTime(pack.generatedAt) ||
      (!simulated && source.synthetic)
    )
      add(
        'source_unverified',
        `Source ${sourceId} is missing, stale, future-dated or synthetic.`,
        'insufficient_evidence',
      );
    if (
      assessedAt !== null &&
      source &&
      (isoTime(source.validUntil) <= assessedAt || isoTime(source.retrievedAt) > assessedAt)
    )
      add(
        'currently_invalid_source',
        `Source ${sourceId} is expired or future-dated as of the assessment time.`,
        'insufficient_evidence',
        [sourceId],
      );
  }
  const status = reasons.some((reason) => reason.severity === 'excluded')
    ? 'excluded'
    : reasons.some((reason) => reason.severity === 'insufficient_evidence')
      ? 'insufficient_evidence'
      : 'passes';
  // The iterative radius is also used for preliminary hazard screening. It is
  // not a resolved swing footprint until the complete rode model has resolved.
  const anchorFootprintResolved =
    anchored &&
    requiredRode !== null &&
    converged &&
    !!scope &&
    (simulated || scope.reviewStatus === 'reviewed') &&
    !reasons.some(
      (reason) => reason.code === 'scope_conditions' || reason.code === 'depth_coverage',
    );
  const publishedSwingRadius = anchored
    ? anchorFootprintResolved
      ? radius
      : null
    : candidate.kind === 'mooring' && candidate.place?.mooringSwingRadiusM !== undefined
      ? radius
      : null;
  return {
    id: candidate.id,
    candidate,
    status,
    simulated,
    context: context ? { ...context } : null,
    reasons,
    distanceNm: d / NM,
    minDepthM: minDepth,
    maxDepthM: maxDepth,
    bedding,
    requiredRodeM: anchorFootprintResolved ? requiredRode : null,
    swingRadiusM: publishedSwingRadius,
    scopeRatio: anchored ? (scope?.ratio ?? null) : null,
    depthAllowancePercent: allowance,
    cost: place
      ? estimateCost(place, vessel, search)
      : {
          status: 'unknown',
          currency: null,
          total: null,
          items: [],
          notes: ['No verified fee information for this generated position.'],
          sourceIds: [],
        },
    exposure: exposureEstimate(candidate.position, weather, pack),
    weather,
    approach,
    availability: place?.availability ?? 'unknown',
    sourceIds: [...sources].sort(),
  };
}

export function assessCandidate(
  candidate: Candidate,
  vessel: VesselProfile,
  search: SearchRequest,
  pack: RegionPack,
  context?: AssessmentContext,
  depthAllowancePercent: 0 | 20 | 30 = 0,
): Assessment {
  assertInputs(pack, vessel, search);
  if (context !== undefined) {
    const errors = validateAssessmentContext(context);
    if (errors.length) throw new Error(errors.join(' '));
  }
  if (![0, 20, 30].includes(depthAllowancePercent))
    throw new Error('Depth allowance must be exactly 0, 20 or 30 percent.');
  if (
    !candidate ||
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    !['generated', 'anchorage', 'marina', 'dock', 'mooring'].includes(candidate.kind)
  )
    throw new Error('Candidate identity and kind are required.');
  if (
    !Array.isArray(candidate.position) ||
    candidate.position.length !== 2 ||
    !candidate.position.every(Number.isFinite) ||
    Math.abs(candidate.position[1]) > 85 ||
    Math.abs(candidate.position[0]) > 180
  )
    throw new Error('Candidate position is invalid.');
  if (candidate.kind === 'generated') {
    const { place: _ignoredPlace, ...generatedCandidate } = candidate;
    return assess(generatedCandidate, vessel, search, pack, depthAllowancePercent, context);
  }
  const place = pack.places.find(
    (p) =>
      p.id === candidate.id &&
      p.kind === candidate.kind &&
      p.position[0] === candidate.position[0] &&
      p.position[1] === candidate.position[1],
  );
  if (!place)
    throw new Error(
      'Documented candidate must match a place in the region pack; use a generated candidate for a selected pin.',
    );
  return assess({ ...candidate, place }, vessel, search, pack, depthAllowancePercent, context);
}

export function generateCandidates(
  pack: RegionPack,
  search: SearchRequest,
  options: SearchOptions = {},
): { candidates: Candidate[]; truncated: boolean } {
  const spacing = options.gridSpacingM ?? 250;
  const limit = options.maxGeneratedCandidates ?? 600;
  if (
    !Number.isFinite(spacing) ||
    spacing < 100 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 5000
  )
    throw new Error('Candidate grid spacing must be >=100m and limit 1–5000.');
  const latStep = spacing / 111_320;
  // Fixed regional latitude keeps coordinates stable when the search origin changes.
  const lonStep =
    spacing / (111_320 * Math.cos((((pack.bounds[1] + pack.bounds[3]) / 2) * Math.PI) / 180));
  const radiusLat = (search.maxDistanceNm * NM) / 110_000;
  const radiusLon = radiusLat / Math.cos((search.origin[1] * Math.PI) / 180);
  const minLat = Math.max(pack.bounds[1], search.origin[1] - radiusLat),
    maxLat = Math.min(pack.bounds[3], search.origin[1] + radiusLat);
  const minLon = Math.max(pack.bounds[0], search.origin[0] - radiusLon),
    maxLon = Math.min(pack.bounds[2], search.origin[0] + radiusLon);
  const candidates: Candidate[] = [];
  for (let row = Math.ceil(minLat / latStep); row <= Math.floor(maxLat / latStep); row++) {
    for (
      let column = Math.ceil(minLon / lonStep);
      column <= Math.floor(maxLon / lonStep);
      column++
    ) {
      const position: Position = [
        Number((column * lonStep).toFixed(8)),
        Number((row * latStep).toFixed(8)),
      ];
      if (
        distanceM(search.origin, position) > search.maxDistanceNm * NM ||
        !pack.depths.some((depth) => pointInArea(position, depth.geometry))
      )
        continue;
      candidates.push({
        id: `generated:${spacing}:${row}:${column}`,
        name: 'Generated drop position',
        kind: 'generated',
        position,
      });
    }
  }
  candidates.sort(
    (a, b) =>
      distanceM(search.origin, a.position) - distanceM(search.origin, b.position) ||
      a.id.localeCompare(b.id),
  );
  return { candidates: candidates.slice(0, limit), truncated: candidates.length > limit };
}

export function sortAssessments(
  assessments: Assessment[],
  sortBy: SearchOptions['sortBy'] = 'distance',
): Assessment[] {
  const rank = { passes: 0, insufficient_evidence: 1, excluded: 2 };
  const key = (a: Assessment) =>
    sortBy === 'price'
      ? (a.cost.total ?? Infinity)
      : sortBy === 'depth'
        ? (a.maxDepthM ?? Infinity)
        : sortBy === 'exposure'
          ? (a.exposure.score ?? Infinity)
          : a.distanceNm;
  return [...assessments].sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      (sortBy === 'price' &&
      a.cost.total !== null &&
      b.cost.total !== null &&
      a.cost.currency !== b.cost.currency &&
      a.cost.total !== 0 &&
      b.cost.total !== 0
        ? String(a.cost.currency).localeCompare(String(b.cost.currency))
        : key(a) - key(b)) ||
      a.distanceNm - b.distanceNm ||
      a.id.localeCompare(b.id),
  );
}

export function searchRegion(
  pack: RegionPack,
  vessel: VesselProfile,
  search: SearchRequest,
  options: SearchOptions = {},
  context?: AssessmentContext,
): SearchResult {
  assertInputs(pack, vessel, search);
  if (context !== undefined) {
    const errors = validateAssessmentContext(context);
    if (errors.length) throw new Error(errors.join(' '));
  }
  const generated = generateCandidates(pack, search, options);
  const candidates = [
    ...pack.places
      .filter((place) => distanceM(search.origin, place.position) <= search.maxDistanceNm * NM)
      .map(candidateFromPlace),
    ...generated.candidates,
  ];
  const filters = options.filters;
  const preferredBeddings = getPreferredBeddings(search);
  const matchesIntent = (a: Assessment) =>
    (!preferredBeddings.length ||
      !['anchorage', 'generated'].includes(a.candidate.kind) ||
      preferredBeddings.includes(a.bedding)) &&
    (!filters?.fee?.length || filters.fee.includes(a.cost.status)) &&
    (!filters?.kinds?.length || filters.kinds.includes(a.candidate.kind)) &&
    (!filters?.overnightOnly ||
      (a.candidate.kind === 'generated'
        ? isOvernight(search, pack.timezone) && a.status === 'passes'
        : a.candidate.place?.overnightAllowed === true &&
          !a.candidate.place.floridaKeysReefBuoy)) &&
    (!filters?.compatibleOnly ||
      !a.reasons.some((reason) =>
        [
          'vessel_type',
          'vessel_limit',
          'air_draft_limit',
          'site_limits_unknown',
          'site_capacity_unknown',
        ].includes(reason.code),
      ));
  let assessments = candidates.map((candidate) =>
    assess(candidate, vessel, search, pack, 0, context),
  );
  let fallback: 0 | 20 | 30 = 0;
  if (!assessments.some((a) => a.status === 'passes' && matchesIntent(a))) {
    for (const percent of [20, 30] as const) {
      const alternatives = candidates.map((candidate) =>
        assess(candidate, vessel, search, pack, percent, context),
      );
      if (alternatives.some((a) => a.status === 'passes' && matchesIntent(a))) {
        assessments = alternatives;
        fallback = percent;
        break;
      }
    }
  }
  const clusterDistance = options.clusterDistanceM ?? 300;
  if (!Number.isFinite(clusterDistance) || clusterDistance < 0)
    throw new Error('Cluster distance must be nonnegative.');
  const selectedGenerated: Assessment[] = [];
  const clustered = sortAssessments(assessments, 'distance').filter((assessment) => {
    if (assessment.candidate.kind !== 'generated') return true;
    // Only surviving assessed candidates become generated suggestions. Exclusions
    // remain inspectable for documented places and individually selected pins.
    if (assessment.status !== 'passes') return false;
    if (
      selectedGenerated.some(
        (selected) =>
          distanceM(selected.candidate.position, assessment.candidate.position) < clusterDistance,
      )
    )
      return false;
    selectedGenerated.push(assessment);
    return true;
  });
  const filtered = clustered.filter(
    (a) => matchesIntent(a) && (!filters?.statuses?.length || filters.statuses.includes(a.status)),
  );
  return {
    packId: pack.id,
    packVersion: pack.version,
    simulated: pack.validation.status === 'synthetic',
    context: context ? { ...context } : null,
    assessments: sortAssessments(filtered, options.sortBy),
    generatedCount: generated.candidates.length,
    truncated: generated.truncated,
    depthFallbackPercent: fallback,
    notices: [
      pack.validation.notice,
      ...(context?.purpose !== 'current'
        ? [
            'Historical replay: supply a current assessment context before using results for present-time anchoring.',
          ]
        : []),
      'Distances are straight-line distances, not navigable routes.',
      'Suitability is ordered before the selected sort. Unknown fees are never assumed free. Different currencies are grouped rather than converted.',
      ...(fallback
        ? [
            `No preferred-depth candidates passed. Showing separately labelled +${fallback}% depth alternatives.`,
          ]
        : []),
      ...(generated.truncated
        ? [
            'Generated grid truncated to the nearest candidate limit; this is not an exhaustive area search.',
          ]
        : []),
    ],
  };
}
