import { validateRegionPack, type RegionPack } from '@anchor-buddy/domain';

export interface OfflineChartApproval {
  styleUrl: string;
  styleAsset: string;
  minZoom: number;
  maxZoom: number;
  resourceOrigins: string[];
  rights: 'operator-owned-or-licensed';
  approvedBy: string;
  approvedAt: string;
}
export interface Manifest {
  schemaVersion: 1;
  regionId: string;
  version: string;
  createdAt: string;
  validUntil: string;
  bounds: [number, number, number, number];
  synthetic: boolean;
  releaseStatus: string;
  assets: { path: string; sha256: string; bytes: number; purpose: string; mediaType?: string }[];
  review?: {
    maritime: boolean;
    coverage: boolean;
    geometry: boolean;
    stationMappings: boolean;
    onWaterValidation: boolean;
    reviewedBy?: string;
    reviewedAt?: string;
  };
  offlineChart?: OfflineChartApproval;
}
export interface InstallIO {
  fetchAsset: (name: string) => Promise<Uint8Array>;
  hash: (bytes: Uint8Array) => Promise<string>;
  stage: (name: string, bytes: Uint8Array) => Promise<void>;
  /** Checked before downloads and immediately before publication. */
  assertReplacementAllowed?: () => Promise<void>;
  commit: (pack: RegionPack, manifest: Manifest) => Promise<void>;
  rollback?: () => Promise<void>;
  progress?: (completed: number, total: number) => void;
}
export function validSegment(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(value) &&
    !value.includes('..')
  );
}
const validDate = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

export function validateManifest(
  value: unknown,
  expected?: { regionId: string; version?: string },
): asserts value is Manifest {
  if (!value || typeof value !== 'object') throw new Error('Missing pack manifest.');
  const m = value as Manifest;
  if (
    m.schemaVersion !== 1 ||
    !validSegment(m.regionId) ||
    !validSegment(m.version) ||
    typeof m.synthetic !== 'boolean' ||
    !Array.isArray(m.assets) ||
    !m.assets.length ||
    m.assets.length > 100
  )
    throw new Error('Unsupported or incomplete pack manifest.');
  if (
    expected &&
    (m.regionId !== expected.regionId ||
      (expected.version !== undefined && m.version !== expected.version))
  )
    throw new Error('The downloaded manifest does not match the requested region and version.');
  if (
    !validDate(m.createdAt) ||
    !validDate(m.validUntil) ||
    Date.parse(m.validUntil) <= Date.parse(m.createdAt)
  )
    throw new Error('Invalid regional validity dates.');
  if (
    !Array.isArray(m.bounds) ||
    m.bounds.length !== 4 ||
    !m.bounds.every(Number.isFinite) ||
    m.bounds[0] < -180 ||
    m.bounds[2] > 180 ||
    m.bounds[1] < -90 ||
    m.bounds[3] > 90 ||
    m.bounds[0] >= m.bounds[2] ||
    m.bounds[1] >= m.bounds[3]
  )
    throw new Error('Invalid regional bounds.');
  if (
    !m.synthetic &&
    (!m.review ||
      m.releaseStatus !== 'reviewed' ||
      !['maritime', 'coverage', 'geometry', 'stationMappings', 'onWaterValidation'].every(
        (key) => m.review?.[key as keyof NonNullable<Manifest['review']>] === true,
      ) ||
      !m.review.reviewedBy?.trim() ||
      !validDate(m.review.reviewedAt))
  )
    throw new Error('Regional data has not completed the release review.');
  let total = 0,
    assessments = 0;
  const paths = new Set<string>();
  for (const asset of m.assets) {
    if (
      !asset ||
      !validSegment(asset.path) ||
      paths.has(asset.path) ||
      !Number.isSafeInteger(asset.bytes) ||
      asset.bytes < 1 ||
      asset.bytes > 200_000_000 ||
      typeof asset.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      !['analysis', 'display', 'forecast', 'restrictions', 'tariffs', 'assessment'].includes(
        asset.purpose,
      )
    )
      throw new Error('Invalid asset entry.');
    paths.add(asset.path);
    total += asset.bytes;
    if (asset.purpose === 'assessment') assessments++;
  }
  if (total > 500_000_000)
    throw new Error('Regional download exceeds the 500 MB application limit.');
  if (assessments !== 1) throw new Error('Exactly one assembled assessment snapshot is required.');
  if (m.offlineChart) {
    const chart = m.offlineChart;
    if (
      chart.rights !== 'operator-owned-or-licensed' ||
      !chart.approvedBy?.trim() ||
      !validDate(chart.approvedAt) ||
      !Array.isArray(chart.resourceOrigins) ||
      !chart.resourceOrigins.length ||
      chart.resourceOrigins.length > 10 ||
      !Number.isInteger(chart.minZoom) ||
      !Number.isInteger(chart.maxZoom) ||
      chart.minZoom < 0 ||
      chart.maxZoom > 16 ||
      chart.minZoom > chart.maxZoom
    )
      throw new Error('Offline chart rights or zoom limits have not been approved.');
    if (
      !m.assets.some(
        (asset) =>
          asset.path === chart.styleAsset &&
          asset.purpose === 'display' &&
          asset.bytes <= 2_000_000,
      )
    )
      throw new Error('Offline chart style must be a small, integrity-checked display asset.');
    chart.resourceOrigins.forEach((origin) => {
      const url = approvedResourceUrl(origin, chart);
      if (url.origin !== origin || url.pathname !== '/')
        throw new Error('Chart resource origins must be explicit HTTPS origins.');
    });
    approvedResourceUrl(chart.styleUrl, chart);
  }
}

function approvedResourceUrl(address: string, approval: OfflineChartApproval): URL {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    throw new Error('Chart resources must use absolute HTTPS URLs.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    !approval.resourceOrigins.includes(url.origin) ||
    /(^|\.)(openstreetmap\.org|openstreetmap\.fr|opentopomap\.org)$/.test(url.hostname)
  )
    throw new Error(
      'Chart resource is not an approved, licensed offline source. Public OSM tile downloads are disabled.',
    );
  return url;
}
/** Only operator-controlled/licensed embedded source definitions; no opaque TileJSON imports. */
export function validateOfflineChartStyle(
  style: unknown,
  approval: OfflineChartApproval,
): asserts style is Record<string, unknown> {
  if (!style || typeof style !== 'object') throw new Error('Offline chart style is invalid.');
  const value = style as Record<string, unknown>;
  if (
    value.version !== 8 ||
    !value.sources ||
    typeof value.sources !== 'object' ||
    Array.isArray(value.sources) ||
    !Array.isArray(value.layers) ||
    value.imports !== undefined
  )
    throw new Error('Unsupported offline chart style.');
  const layerIds = new Set<string>();
  for (const layer of value.layers) {
    if (
      !layer ||
      typeof layer !== 'object' ||
      typeof layer.id !== 'string' ||
      layer.id.startsWith('anchorbuddy-') ||
      layerIds.has(layer.id)
    )
      throw new Error(
        'Offline chart layer IDs must be unique and must not replace Anchor Buddy analysis overlays.',
      );
    layerIds.add(layer.id);
  }
  if (Object.keys(value.sources as object).some((id) => id.startsWith('anchorbuddy-')))
    throw new Error('Offline chart sources must not replace Anchor Buddy analysis overlays.');
  if (value.glyphs !== undefined) {
    if (typeof value.glyphs !== 'string') throw new Error('Invalid chart glyph source.');
    approvedResourceUrl(value.glyphs, approval);
  }
  if (value.sprite !== undefined) {
    if (typeof value.sprite !== 'string')
      throw new Error('Offline chart sprites must use one approved URL.');
    approvedResourceUrl(value.sprite, approval);
  }
  for (const source of Object.values(value.sources as Record<string, unknown>)) {
    if (!source || typeof source !== 'object') throw new Error('Invalid chart source.');
    const s = source as Record<string, unknown>;
    if (s.url !== undefined)
      throw new Error(
        'Offline chart sources must embed approved tile URLs; remote TileJSON is not accepted.',
      );
    if (s.type === 'vector' || s.type === 'raster' || s.type === 'raster-dem') {
      if (!Array.isArray(s.tiles) || !s.tiles.length || s.tiles.length > 10)
        throw new Error('Offline chart is missing tile URLs.');
      s.tiles.forEach((address) => {
        if (typeof address !== 'string') throw new Error('Invalid tile URL.');
        approvedResourceUrl(address, approval);
      });
    } else if (s.type === 'geojson') {
      if (typeof s.data === 'string')
        throw new Error('Offline chart GeoJSON must be embedded in the checked style.');
      if (!s.data || typeof s.data !== 'object') throw new Error('Invalid chart geometry source.');
    } else throw new Error('Offline chart source type is not supported.');
  }
}

/** Commit is last: failed downloads never replace the usable pack. */
export async function installPack(
  manifest: Manifest,
  io: InstallIO,
  expected?: { regionId: string; version?: string },
): Promise<RegionPack> {
  let pack: RegionPack | undefined;
  let completed = 0;
  try {
    validateManifest(manifest, expected);
    await io.assertReplacementAllowed?.();
    for (const asset of manifest.assets) {
      const bytes = await io.fetchAsset(asset.path);
      if (bytes.byteLength !== asset.bytes || (await io.hash(bytes)) !== asset.sha256)
        throw new Error('Downloaded pack failed its integrity check.');
      if (asset.purpose === 'assessment') {
        const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
        const errors = validateRegionPack(parsed);
        if (errors.length)
          throw new Error('Invalid regional analysis: ' + errors.slice(0, 3).join('; '));
        pack = parsed as RegionPack;
        if (
          pack.id !== manifest.regionId ||
          pack.version !== manifest.version ||
          (pack.validation.status === 'synthetic') !== manifest.synthetic ||
          pack.bounds.some((coordinate, index) => coordinate !== manifest.bounds[index])
        )
          throw new Error('Pack identity or complete bounds do not match its manifest.');
        if (Date.parse(pack.validUntil) > Date.parse(manifest.validUntil))
          throw new Error('Assessment expiry exceeds its manifest validity.');
        if (
          !manifest.synthetic &&
          (pack.validation.status !== 'reviewed' || pack.sources.some((source) => source.synthetic))
        )
          throw new Error('Analysis has not been reviewed or contains synthetic evidence.');
        if (
          manifest.offlineChart &&
          (pack.chart.styleUrl !== manifest.offlineChart.styleUrl || !pack.chart.offlineAllowed)
        )
          throw new Error('Chart style or offline rights differ from the regional assessment.');
      }
      if (manifest.offlineChart?.styleAsset === asset.path)
        validateOfflineChartStyle(
          JSON.parse(new TextDecoder().decode(bytes)),
          manifest.offlineChart,
        );
      await io.stage(asset.path, bytes);
      io.progress?.(++completed, manifest.assets.length);
    }
    if (!pack) throw new Error('No analysis snapshot is available in this download.');
    await io.assertReplacementAllowed?.();
    await io.commit(pack, manifest);
    return pack;
  } catch (error) {
    await io.rollback?.().catch(() => {});
    throw error;
  }
}
