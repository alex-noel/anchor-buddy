/** Explicit test fixtures. Never import this entry point from application code. */
import type {
  AreaGeometry,
  CoverageArea,
  EvidenceLayer,
  Place,
  RegionPack,
  SearchRequest,
  VesselProfile,
} from './types.ts';
import { rectangle } from './geo.ts';

const HOUR = 3_600_000;
const asDate = (value: Date | string = new Date()) =>
  value instanceof Date ? value : new Date(value);

/** This is demonstration equipment guidance, not real-world scope advice. */
export const DEFAULT_VESSEL: VesselProfile = {
  id: 'demo-vessel',
  name: 'Demo sailboat',
  type: 'sailboat',
  lengthM: 11.2,
  beamM: 3.7,
  loadedDraftM: 1.8,
  displacementKg: 6800,
  airDraftM: 16.5,
  anchor: {
    type: 'modern-scoop',
    rodeType: 'chain',
    usableLengthM: 65,
    bowRollerHeightM: 1,
    scopeGuidance: {
      ratio: 7,
      maxWindKnots: 20,
      maxGustKnots: 28,
      maxWaveM: 1.2,
      maxCurrentKnots: 1.5,
      reviewStatus: 'demo',
      source:
        'SIMULATION ONLY — illustrative equipment envelope; replace with qualified equipment-specific guidance.',
      reviewedAt: '2026-01-01T00:00:00Z',
    },
  },
};

export function createDefaultSearch(now: Date | string = new Date()): SearchRequest {
  const time = asDate(now).getTime();
  return {
    origin: [-81.104, 24.715],
    maxDistanceNm: 3,
    arrival: new Date(time + HOUR).toISOString(),
    departure: new Date(time + 19 * HOUR).toISOString(),
    departureContingencyHours: 3,
    preferredMaxDepthM: 5,
    preferredBedding: 'sand',
    minUnderKeelClearanceM: 0.6,
    maxWindKnots: 20,
    maxGustKnots: 28,
    maxWaveM: 1.2,
    maxCurrentKnots: 1.5,
    visitMode: 'overnight',
    safetyMarginM: 5,
  };
}

export function createDemoPack(now: Date | string = new Date()): RegionPack {
  const time = asDate(now).getTime(),
    iso = (offset: number) => new Date(time + offset * HOUR).toISOString();
  const harbor = rectangle(-81.112, 24.713, -81.098, 24.719);
  const offshore = rectangle(-81.13, 24.686, -81.075, 24.696);
  const ringOf = (area: AreaGeometry) =>
    area.type === 'Polygon' ? area.coordinates[0]! : area.coordinates[0]![0]!;
  const geometry: AreaGeometry = {
    type: 'MultiPolygon',
    coordinates: [[ringOf(harbor)], [ringOf(offshore)]],
  };
  const surroundingShore: AreaGeometry = {
    type: 'Polygon',
    coordinates: [
      ringOf(rectangle(-81.145, 24.685, -81.055, 24.745)),
      ringOf(harbor),
      ringOf(offshore),
    ],
  };
  const sourceIds = ['demo-fixture'];
  const coverage = (
    [
      'bathymetry',
      'hazards',
      'habitat',
      'restrictions',
      'weather',
      'tides',
      'currents',
    ] as EvidenceLayer[]
  ).map((layer): CoverageArea => ({
    id: `demo-${layer}`,
    layer,
    geometry,
    sourceIds,
    validFrom: iso(-24),
    validUntil: iso(72),
    complete: true,
  }));
  const basePlace: Omit<Place, 'id' | 'name' | 'kind' | 'position'> = {
    feeStatus: 'unknown',
    sourceIds,
    overnightAllowed: true,
    availability: 'unknown',
    holding: 'sand',
    facilities: [],
    notes: ['SIMULATED site. This is not an actual facility, price or anchoring recommendation.'],
  };
  const paid = {
    currency: 'USD',
    timezone: 'America/New_York',
    sourceIds,
    verifiedAt: iso(-24),
    validUntil: iso(72),
    bands: [
      {
        id: 'demo-night',
        label: 'Illustrative dock charge',
        validFrom: iso(-24).slice(0, 10),
        validUntil: iso(72).slice(0, 10),
        basis: 'per_foot' as const,
        rate: 3,
        period: 'night' as const,
        minBillableLengthM: 9.144,
        minCharge: 90,
      },
    ],
    taxRate: 0.075,
    multihullMultiplier: 1.5,
    beamSurcharge: { aboveM: 6, multiplier: 1.15 },
    extras: [
      {
        label: 'Illustrative shore power',
        amount: 12,
        per: 'night' as const,
        required: false,
        taxable: true,
      },
      {
        label: 'Illustrative facility charge',
        amount: 5,
        per: 'night' as const,
        required: true,
        taxable: true,
      },
    ],
  };
  return {
    id: 'florida-keys-demo',
    version: `demo-${new Date(time).toISOString()}`,
    name: 'Florida Keys · simulation',
    generatedAt: iso(0),
    validUntil: iso(72),
    timezone: 'America/New_York',
    bounds: [-81.145, 24.685, -81.055, 24.745],
    validation: {
      status: 'synthetic',
      notice:
        'SIMULATION ONLY. Artificial chart polygons, places, forecasts, fees and permissions near Boot Key. Never use this pack for navigation, anchoring or docking.',
    },
    sources: [
      {
        id: 'demo-fixture',
        name: 'Anchor Buddy synthetic test fixture',
        url: 'https://charts.noaa.gov/ENCs/ENCs.shtml',
        retrievedAt: iso(0),
        validUntil: iso(72),
        attribution:
          'Artificial demonstration data. NOAA link is a future source reference; no NOAA geometry, observations or forecasts are included.',
        license: 'Synthetic project fixture',
        synthetic: true,
      },
    ],
    coverage,
    depths: [
      {
        id: 'demo-main-depth',
        geometry,
        minDepthM: 3.2,
        maxDepthM: 3.7,
        verticalDatum: 'MLLW',
        surveyQuality: 'reviewed',
        sourceIds,
      },
      {
        id: 'demo-shallow-patch',
        geometry: rectangle(-81.1, 24.716, -81.098, 24.717),
        minDepthM: 0.6,
        maxDepthM: 1.1,
        verticalDatum: 'MLLW',
        surveyQuality: 'reviewed',
        sourceIds,
      },
      {
        id: 'demo-deeper-pocket',
        geometry: rectangle(-81.126, 24.687, -81.116, 24.693),
        minDepthM: 4.3,
        maxDepthM: 5.2,
        verticalDatum: 'MLLW',
        surveyQuality: 'reviewed',
        sourceIds,
      },
    ],
    hazards: [
      {
        id: 'demo-shore',
        kind: 'shore',
        name: 'Simulated shoreline / outside illustrative water areas',
        geometry: surroundingShore,
        sourceIds,
      },
      {
        id: 'demo-cable',
        kind: 'cable',
        name: 'Simulated submarine cable corridor',
        geometry: rectangle(-81.116, 24.685, -81.1155, 24.696),
        sourceIds,
      },
      {
        id: 'demo-seagrass',
        kind: 'habitat',
        name: 'Simulated seagrass habitat',
        geometry: rectangle(-81.095, 24.689, -81.09, 24.691),
        sourceIds,
      },
      {
        id: 'demo-tiny-hazard',
        kind: 'obstruction',
        name: 'Simulated submerged obstruction',
        geometry: rectangle(-81.1041, 24.717, -81.10405, 24.71705),
        sourceIds,
      },
    ],
    restrictions: [
      {
        id: 'demo-protected',
        name: 'Simulated no-anchor sanctuary zone',
        jurisdiction: 'Synthetic sanctuary authority',
        geometry: rectangle(-81.076, 24.69, -81.065, 24.709),
        resolved: true,
        prohibitsAnchoring: true,
        prohibitsOvernight: true,
        validFrom: iso(-24),
        validUntil: iso(72),
        sourceIds,
      },
    ],
    holdingAreas: [
      {
        id: 'demo-sand',
        geometry,
        holding: 'sand',
        compatibleAnchorTypes: ['modern-scoop'],
        reviewed: true,
        sourceIds,
      },
    ],
    marks: [
      {
        id: 'demo-mark-lateral',
        name: 'Illustrative lateral mark',
        position: [-81.1068, 24.7141],
        kind: 'lateral',
        label: 'M1',
        sourceIds,
      },
      {
        id: 'demo-mark-special',
        name: 'Illustrative special mark',
        position: [-81.101, 24.7168],
        kind: 'special',
        label: 'M2',
        sourceIds,
      },
    ],
    tides: [
      {
        validFrom: iso(-24),
        validUntil: iso(72),
        verticalDatum: 'MLLW',
        coverageAreaIds: ['demo-tides'],
        minWaterLevelM: 0.1,
        maxWaterLevelM: 0.65,
        uncertaintyM: 0.15,
        stationRelationshipReviewed: true,
        sourceIds,
      },
    ],
    weather: [
      {
        validFrom: iso(-24),
        validUntil: iso(8),
        coverageAreaIds: ['demo-weather', 'demo-currents'],
        windKnots: 10,
        gustKnots: 16,
        windDirectionDeg: 70,
        waveM: 0.25,
        swellM: 0.1,
        currentKnots: 0.4,
        currentDirectionDeg: 90,
        warnings: [],
        sourceIds,
      },
      {
        validFrom: iso(8),
        validUntil: iso(18),
        coverageAreaIds: ['demo-weather', 'demo-currents'],
        windKnots: 14,
        gustKnots: 21,
        windDirectionDeg: 145,
        waveM: 0.4,
        swellM: 0.15,
        currentKnots: 0.7,
        currentDirectionDeg: 270,
        warnings: [],
        sourceIds,
      },
      {
        validFrom: iso(18),
        validUntil: iso(72),
        coverageAreaIds: ['demo-weather', 'demo-currents'],
        windKnots: 11,
        gustKnots: 18,
        windDirectionDeg: 250,
        waveM: 0.3,
        swellM: 0.1,
        currentKnots: 0.5,
        currentDirectionDeg: 90,
        warnings: [],
        sourceIds,
      },
    ],
    places: [
      {
        ...basePlace,
        id: 'demo-sand-anchorage',
        name: 'Sand pocket · demo',
        kind: 'anchorage',
        position: [-81.108, 24.716],
        feeStatus: 'free',
        facilities: ['Shelter estimate available'],
      },
      {
        ...basePlace,
        id: 'demo-marina',
        name: 'Harbor marina · demo',
        kind: 'marina',
        position: [-81.101, 24.718],
        feeStatus: 'paid',
        tariff: paid,
        maxLengthM: 18,
        maxBeamM: 7,
        maxDraftM: 2.8,
        maxDisplacementKg: 30000,
        entranceMinDepthM: 3.2,
        berthMinDepthM: 3.2,
        verticalDatum: 'MLLW',
        vesselLimitsVerified: true,
        operationalRestrictionsVerified: true,
        facilities: ['Water', 'Power', 'Showers'],
        contact: 'Operator details intentionally omitted for simulation',
      },
      {
        ...basePlace,
        id: 'demo-mooring',
        name: 'Overnight mooring · demo',
        kind: 'mooring',
        position: [-81.11, 24.715],
        feeStatus: 'paid',
        tariff: {
          ...paid,
          bands: [
            {
              id: 'demo-mooring-night',
              label: 'Illustrative mooring charge',
              validFrom: iso(-24).slice(0, 10),
              validUntil: iso(72).slice(0, 10),
              basis: 'flat',
              rate: 35,
              period: 'night',
            },
          ],
          extras: [],
          multihullMultiplier: 1,
        },
        mooringSwingRadiusM: 30,
        maxLengthM: 15,
        maxBeamM: 8,
        maxDisplacementKg: 18000,
        entranceMinDepthM: 3.2,
        berthMinDepthM: 3.2,
        verticalDatum: 'MLLW',
        vesselLimitsVerified: true,
        operationalRestrictionsVerified: true,
        facilities: ['Dinghy landing'],
      },
      {
        ...basePlace,
        id: 'demo-day-buoy',
        name: 'Reef day buoy · demo',
        kind: 'mooring',
        position: [-81.087, 24.692],
        feeStatus: 'free',
        overnightAllowed: false,
        floridaKeysReefBuoy: true,
        mooringSwingRadiusM: 20,
        maxLengthM: 15,
        maxDisplacementKg: 18000,
        vesselLimitsVerified: true,
        operationalRestrictionsVerified: true,
        entranceMinDepthM: 3.2,
        berthMinDepthM: 3.2,
        verticalDatum: 'MLLW',
      },
      {
        ...basePlace,
        id: 'demo-unknown-dock',
        name: 'Public dock · unverified demo',
        kind: 'dock',
        position: [-81.103, 24.714],
        overnightAllowed: null,
        holding: 'unknown',
        facilities: ['Public landing'],
      },
      {
        ...basePlace,
        id: 'demo-shallow',
        name: 'Shallow pocket · demo',
        kind: 'anchorage',
        position: [-81.099, 24.7165],
        feeStatus: 'free',
      },
    ],
    chart: {
      attribution: 'Artificial overlay. Basemap is for geographical context, not navigation.',
      offlineAllowed: true,
    },
  };
}

export const SAMPLE_PACK = createDemoPack();
