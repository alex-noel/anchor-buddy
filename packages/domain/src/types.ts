import type { EvidenceEnvelope, HazardPrimitive, SnapshotIdentity } from './contracts.ts';

/** All engine distances/depths are metres, winds/currents knots, angles true degrees. */
export type Position = [longitude: number, latitude: number];
export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}
export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}
export type AreaGeometry = PolygonGeometry | MultiPolygonGeometry;
export type VesselType = 'sailboat' | 'powerboat' | 'catamaran' | 'trimaran';
export type PlaceKind = 'marina' | 'dock' | 'mooring' | 'anchorage' | 'generated';
export type AssessmentStatus = 'passes' | 'excluded' | 'insufficient_evidence';
export type FeeStatus = 'free' | 'paid' | 'unknown';
export type UnitSystem = 'nautical' | 'metric' | 'imperial';
export const BEDDINGS = [
  'sand',
  'mud',
  'rock',
  'gravel',
  'clay',
  'silt',
  'shell',
  'grass',
  'mixed',
  'unknown',
] as const;
export type Bedding = (typeof BEDDINGS)[number];
/** Explicit evaluation clock. Omit only for deterministic historical replay. */
export interface AssessmentContext {
  assessedAt: string;
  purpose: 'current' | 'historical';
}
export interface SourceRecord {
  id: string;
  name: string;
  url: string;
  retrievedAt: string;
  validUntil: string;
  attribution: string;
  license: string;
  synthetic?: boolean;
  /** Optional v2 provenance; absent means legacy provenance, never inferred review. */
  evidence?: EvidenceEnvelope;
}
export interface ScopeGuidance {
  ratio: number;
  maxWindKnots: number;
  maxGustKnots: number;
  maxWaveM: number;
  maxCurrentKnots: number;
  reviewStatus: 'reviewed' | 'demo';
  source: string;
  reviewedAt: string;
}
export interface VesselProfile {
  id: string;
  name: string;
  type: VesselType;
  lengthM: number;
  beamM: number;
  loadedDraftM: number;
  displacementKg: number;
  airDraftM?: number;
  anchor: {
    type: string;
    rodeType: 'chain' | 'mixed' | 'rope';
    usableLengthM: number;
    bowRollerHeightM: number;
    scopeGuidance: ScopeGuidance | null;
  };
}
export interface SearchRequest {
  origin: Position;
  maxDistanceNm: number;
  arrival: string;
  departure: string;
  departureContingencyHours: number;
  preferredMaxDepthM: number;
  /** Seabed preference applies to anchors; it never changes equipment or habitat checks. */
  /** Legacy single preference, read when preferredBeddings is absent. */
  preferredBedding?: Bedding | 'any';
  /** Accepted seabeds for anchored positions. Empty means no seabed preference. */
  preferredBeddings?: Bedding[];
  minUnderKeelClearanceM: number;
  maxWindKnots: number;
  maxGustKnots: number;
  maxWaveM: number;
  maxCurrentKnots: number;
  visitMode: 'overnight' | 'daytime';
  /** Additional clearance outside the complete anchor/rode/vessel footprint. */
  safetyMarginM: number;
  /** Actual planned/deployed rode; enlarges the full footprint and must satisfy guidance. */
  deployedRodeM?: number;
}
export type EvidenceLayer =
  'bathymetry' | 'hazards' | 'habitat' | 'restrictions' | 'weather' | 'tides' | 'currents';
export interface CoverageArea {
  id: string;
  layer: EvidenceLayer;
  geometry: AreaGeometry;
  sourceIds: string[];
  validFrom: string;
  validUntil: string;
  complete: boolean;
}
export interface DepthArea {
  id: string;
  geometry: AreaGeometry;
  minDepthM: number | null;
  maxDepthM: number | null;
  verticalDatum: string;
  surveyQuality: 'reviewed' | 'unknown';
  sourceIds: string[];
}
export interface HazardArea {
  id: string;
  geometry: AreaGeometry;
  kind: 'shore' | 'obstruction' | 'cable' | 'channel' | 'shallow' | 'habitat';
  name: string;
  sourceIds: string[];
}
/** Charted aid to navigation, separate from places and assessed hazard geometry. */
export interface NavigationMark {
  id: string;
  name: string;
  position: Position;
  kind: 'lateral' | 'cardinal' | 'isolated_danger' | 'safe_water' | 'special' | 'unknown';
  label: string;
  sourceIds: string[];
}
export interface RestrictionArea {
  id: string;
  geometry: AreaGeometry;
  name: string;
  jurisdiction: string;
  resolved: boolean;
  prohibitsAnchoring: boolean;
  prohibitsOvernight: boolean;
  validFrom: string;
  validUntil: string;
  sourceIds: string[];
}
/** Nominal datum-converted interval bounds; uncertainty is separate and expanded once by the engine. */
export interface TideInterval {
  validFrom: string;
  validUntil: string;
  verticalDatum: string;
  /** Named tide coverage polygons for the reviewed station relationship. */
  coverageAreaIds: string[];
  minWaterLevelM: number | null;
  maxWaterLevelM: number | null;
  uncertaintyM: number | null;
  stationRelationshipReviewed: boolean;
  sourceIds: string[];
}
export interface WeatherInterval {
  validFrom: string;
  validUntil: string;
  windKnots: number | null;
  gustKnots: number | null;
  /** Named weather AND current coverage polygons applicable to this grid/forecast. */
  coverageAreaIds: string[];
  windDirectionDeg: number | null;
  waveM: number | null;
  swellM: number | null;
  currentKnots: number | null;
  currentDirectionDeg: number | null;
  warnings: string[];
  sourceIds: string[];
}
export interface TariffBand {
  id: string;
  label: string;
  validFrom: string;
  validUntil: string;
  basis: 'flat' | 'per_metre' | 'per_foot';
  rate: number;
  period: 'night' | 'day' | 'hour';
  minBillableLengthM?: number;
  minCharge?: number;
  maxLengthM?: number;
}
export interface Tariff {
  currency: string;
  timezone: string;
  sourceIds: string[];
  verifiedAt: string;
  validUntil: string;
  bands: TariffBand[];
  taxRate: number;
  minimumStayCharge?: number;
  multihullMultiplier?: number;
  beamSurcharge?: { aboveM: number; multiplier: number };
  extras: {
    label: string;
    amount: number;
    per: 'stay' | 'night';
    required: boolean;
    taxable: boolean;
  }[];
}
export interface Place {
  id: string;
  name: string;
  kind: Exclude<PlaceKind, 'generated'>;
  position: Position;
  feeStatus: FeeStatus;
  tariff?: Tariff;
  sourceIds: string[];
  overnightAllowed: boolean | null;
  floridaKeysReefBuoy?: boolean;
  availability: 'available' | 'unavailable' | 'unknown';
  closed?: boolean;
  holding: Bedding;
  maxLengthM?: number;
  maxBeamM?: number;
  maxDraftM?: number;
  maxDisplacementKg?: number;
  allowedVesselTypes?: VesselType[];
  entranceMinDepthM?: number;
  berthMinDepthM?: number;
  verticalDatum?: string;
  maxAirDraftM?: number;
  mooringSwingRadiusM?: number;
  /** Published limits are required for dock/mooring eligibility, not inferred from missing values. */
  vesselLimitsVerified?: boolean;
  operationalRestrictionsVerified?: boolean;
  accessWindows?: { from: string; until: string }[];
  facilities: string[];
  contact?: string;
  notes: string[];
}
export interface RegionPack {
  /** Absent is legacy v1; unsupported major versions are rejected. */
  schemaVersion?: 1 | 2;
  snapshot?: SnapshotIdentity;
  /** Validated source primitives; known intersections exclude, clearance requires model review. */
  hazardPrimitives?: HazardPrimitive[];
  id: string;
  version: string;
  name: string;
  generatedAt: string;
  validUntil: string;
  timezone: string;
  bounds: [west: number, south: number, east: number, north: number];
  validation: {
    status: 'synthetic' | 'unreviewed' | 'reviewed';
    notice: string;
    reviewedBy?: string;
    reviewedAt?: string;
  };
  sources: SourceRecord[];
  coverage: CoverageArea[];
  depths: DepthArea[];
  hazards: HazardArea[];
  restrictions: RestrictionArea[];
  tides: TideInterval[];
  weather: WeatherInterval[];
  places: Place[];
  marks?: NavigationMark[];
  holdingAreas?: {
    id: string;
    geometry: AreaGeometry;
    holding: Bedding;
    compatibleAnchorTypes: string[];
    reviewed: boolean;
    sourceIds: string[];
  }[];
  /** Raw geometry remains separate from display tiles. */
  chart: { styleUrl?: string; tileUrl?: string; attribution: string; offlineAllowed: boolean };
}
export interface Candidate {
  id: string;
  name: string;
  position: Position;
  kind: PlaceKind;
  place?: Place;
}
export interface AssessmentReason {
  code: string;
  message: string;
  severity: 'excluded' | 'insufficient_evidence' | 'info';
  sourceIds?: string[];
}
export interface CostEstimate {
  status: FeeStatus;
  currency: string | null;
  total: number | null;
  items: { label: string; amount: number; quantity: number; unitPrice: number }[];
  notes: string[];
  sourceIds: string[];
}
export interface Assessment {
  id: string;
  candidate: Candidate;
  status: AssessmentStatus;
  simulated: boolean;
  /** Null means historical replay without present-time freshness validation. */
  context: AssessmentContext | null;
  reasons: AssessmentReason[];
  distanceNm: number;
  minDepthM: number | null;
  maxDepthM: number | null;
  /** Seabed evidence at the drop point; unknown never means suitable holding. */
  bedding: Bedding;
  requiredRodeM: number | null;
  /** Resolved anchor/mooring swing geometry; null for berths or an unresolved model.
   * A calculated footprint does not establish site clearance or suitability. */
  swingRadiusM: number | null;
  scopeRatio: number | null;
  depthAllowancePercent: 0 | 20 | 30;
  cost: CostEstimate;
  exposure: { score: number | null; label: string; maxFetchM: number | null };
  weather: WeatherInterval[];
  approach: { status: 'unverified' | 'published_constraints' | 'excluded'; notes: string[] };
  availability: Place['availability'];
  sourceIds: string[];
}
export interface SearchOptions {
  sortBy?: 'distance' | 'price' | 'depth' | 'exposure';
  filters?: {
    fee?: FeeStatus[];
    kinds?: PlaceKind[];
    statuses?: AssessmentStatus[];
    overnightOnly?: boolean;
    compatibleOnly?: boolean;
  };
  /** Defaults to 250m; deterministic latitude/longitude grid, then 300m clustering. */
  gridSpacingM?: number;
  clusterDistanceM?: number;
  maxGeneratedCandidates?: number;
}
export interface SearchResult {
  packId: string;
  packVersion: string;
  simulated: boolean;
  assessments: Assessment[];
  context: AssessmentContext | null;
  generatedCount: number;
  truncated: boolean;
  depthFallbackPercent: 0 | 20 | 30;
  notices: string[];
}
export interface ProviderCapabilities {
  id: string;
  name: string;
  coverage: AreaGeometry | null;
  updatedAt: string | null;
  attribution: string;
  offlineAllowed: boolean;
  analyticalUseAllowed: boolean;
  authentication: 'none' | 'api_key' | 'oauth';
  implemented: boolean;
}
export interface ChartDisplayProvider {
  capabilities: ProviderCapabilities;
  getStyleUrl(): Promise<string>;
}
export interface BathymetryProvider {
  capabilities: ProviderCapabilities;
  getAnalysis(
    bounds: RegionPack['bounds'],
  ): Promise<Pick<RegionPack, 'depths' | 'hazards' | 'coverage'>>;
}
export interface WeatherProvider {
  capabilities: ProviderCapabilities;
  getForecast(position: Position, from: string, until: string): Promise<WeatherInterval[]>;
}
export interface TideCurrentProvider {
  capabilities: ProviderCapabilities;
  getConditions(
    position: Position,
    from: string,
    until: string,
  ): Promise<{
    tides: TideInterval[];
    weather: Pick<
      WeatherInterval,
      'validFrom' | 'validUntil' | 'currentKnots' | 'currentDirectionDeg'
    >[];
  }>;
}
export interface PlacesProvider {
  capabilities: ProviderCapabilities;
  getPlaces(bounds: RegionPack['bounds']): Promise<Place[]>;
}
export interface TariffProvider {
  capabilities: ProviderCapabilities;
  getTariff(placeId: string): Promise<Tariff | null>;
}
export interface AssistantProvider {
  capabilities: ProviderCapabilities;
  approvedPartnerAccess: boolean;
  explain(assessments: Assessment[]): Promise<{ text: string; assessmentIds: string[] }>;
}
