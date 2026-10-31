import { createHash } from 'node:crypto';
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { RegionPack } from '@anchor-buddy/domain';

export interface PackAsset {
  path: string;
  sha256: string;
  bytes: number;
  mediaType: string;
  purpose: 'analysis' | 'display' | 'forecast' | 'restrictions' | 'tariffs' | 'assessment';
}
export interface PackManifest {
  schemaVersion: 1;
  regionId: string;
  version: string;
  createdAt: string;
  validUntil: string;
  label: string;
  synthetic: boolean;
  releaseStatus: 'review-required' | 'reviewed';
  bounds: [number, number, number, number];
  assets: PackAsset[];
  provenance: Array<{
    id: string;
    url: string;
    retrievedAt: string;
    attribution: string;
    [key: string]: unknown;
  }>;
  review: {
    maritime: boolean;
    coverage: boolean;
    geometry: boolean;
    stationMappings: boolean;
    onWaterValidation: boolean;
    reviewedBy?: string;
    reviewedAt?: string;
  };
  [key: string]: unknown;
}
export interface PackStore {
  regions(): Promise<
    Array<{ id: string; version: string; label: string; synthetic: boolean; releaseStatus: string }>
  >;
  manifest(regionId: string, version?: string): Promise<PackManifest>;
  asset(
    regionId: string,
    version: string,
    name: string,
  ): Promise<{ buffer: Buffer; asset: PackAsset }>;
  assessment(regionId: string, version?: string): Promise<RegionPack>;
}
export class PackError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 404,
  ) {
    super(message);
  }
}
const SAFE_SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;
function segment(value: string) {
  if (!SAFE_SEGMENT.test(value) || value.includes('..'))
    throw new PackError('INVALID_PATH', 'Invalid pack path', 400);
  return value;
}

/** Immutable assets on a local/S3-mounted volume; current.json is an atomic pointer. */
export class FilePackStore implements PackStore {
  constructor(private readonly root: string) {}
  async regions() {
    const entries = await readdir(this.root, { withFileTypes: true }).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      },
    );
    const manifests = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && SAFE_SEGMENT.test(entry.name))
        .map(async (entry) => {
          try {
            return await this.manifest(entry.name);
          } catch {
            return null;
          }
        }),
    );
    return manifests
      .filter((manifest): manifest is PackManifest => manifest !== null)
      .map((manifest) => ({
        id: manifest.regionId,
        version: manifest.version,
        label: manifest.label,
        synthetic: manifest.synthetic,
        releaseStatus: manifest.releaseStatus,
      }));
  }
  private async safePath(...parts: string[]) {
    parts.forEach(segment);
    const base = await realpath(this.root).catch(() => {
      throw new PackError('PACK_NOT_FOUND', 'Pack store has no published region');
    });
    const path = await realpath(resolve(base, ...parts)).catch(() => {
      throw new PackError('PACK_NOT_FOUND', 'Pack or asset not found');
    });
    if (!path.startsWith(base + sep))
      throw new PackError('INVALID_PATH', 'Pack path escapes store', 400);
    return path;
  }
  async manifest(regionId: string, version?: string): Promise<PackManifest> {
    if (!version) {
      const pointer = JSON.parse(
        await readFile(await this.safePath(regionId, 'current.json'), 'utf8'),
      ) as { version: string };
      version = segment(pointer.version);
    }
    const result = JSON.parse(
      await readFile(await this.safePath(regionId, version, 'manifest.json'), 'utf8'),
    ) as PackManifest;
    if (
      result.schemaVersion !== 1 ||
      result.regionId !== regionId ||
      result.version !== version ||
      !Array.isArray(result.assets)
    )
      throw new PackError('INVALID_MANIFEST', 'Pack manifest identity mismatch', 503);
    return result;
  }
  async asset(regionId: string, version: string, name: string) {
    segment(name);
    const manifest = await this.manifest(regionId, version);
    const asset = manifest.assets.find((item) => item.path === name);
    if (!asset) throw new PackError('ASSET_NOT_FOUND', 'Asset is not part of manifest');
    const path = await this.safePath(regionId, version, name);
    if ((await stat(path)).size !== asset.bytes)
      throw new PackError('INTEGRITY_FAILED', 'Pack asset size mismatch', 503);
    const buffer = await readFile(path);
    if (createHash('sha256').update(buffer).digest('hex') !== asset.sha256)
      throw new PackError('INTEGRITY_FAILED', 'Pack asset checksum mismatch', 503);
    return { buffer, asset };
  }
  async assessment(regionId: string, version?: string): Promise<RegionPack> {
    const manifest = await this.manifest(regionId, version);
    if (
      !manifest.synthetic &&
      (manifest.releaseStatus !== 'reviewed' ||
        !manifest.review.maritime ||
        !manifest.review.coverage ||
        !manifest.review.geometry ||
        !manifest.review.stationMappings ||
        !manifest.review.onWaterValidation ||
        !manifest.review.reviewedBy ||
        !manifest.review.reviewedAt)
    ) {
      throw new PackError(
        'REVIEW_REQUIRED',
        'Regional nautical data is not released for live assessment',
        503,
      );
    }
    const entry = manifest.assets.find((asset) => asset.purpose === 'assessment');
    if (!entry)
      throw new PackError('ASSESSMENT_UNAVAILABLE', 'Pack has no assembled assessment data', 503);
    return JSON.parse(
      (await this.asset(regionId, manifest.version, entry.path)).buffer.toString('utf8'),
    ) as RegionPack;
  }
}
