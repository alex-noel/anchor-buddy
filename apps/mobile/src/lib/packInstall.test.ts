import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createDemoPack } from '@anchor-buddy/domain';
import {
  installPack,
  validateManifest,
  validateOfflineChartStyle,
  type Manifest,
  type InstallIO,
  type OfflineChartApproval,
} from './packInstall';
const hash = async (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const pack = createDemoPack();
  pack.version = 'fixture-v1';
  const bytes = new TextEncoder().encode(JSON.stringify(pack));
  const manifest: Manifest = {
    schemaVersion: 1,
    regionId: pack.id,
    version: pack.version,
    createdAt: pack.generatedAt,
    validUntil: pack.validUntil,
    bounds: pack.bounds,
    synthetic: true,
    releaseStatus: 'demo-only',
    assets: [
      {
        path: 'assessment.json',
        purpose: 'assessment',
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    ],
  };
  return { pack, bytes, manifest };
}
function ioFor(bytes: Uint8Array, changes: Partial<InstallIO> = {}): InstallIO {
  return {
    fetchAsset: async () => bytes,
    hash,
    stage: async () => {},
    commit: async () => {},
    ...changes,
  };
}
test('only commits a fully verified pack', async () => {
  const { manifest, bytes, pack } = fixture();
  const events: string[] = [];
  await installPack(
    manifest,
    ioFor(bytes, {
      assertReplacementAllowed: async () => {
        events.push('watch-check');
      },
      stage: async () => {
        events.push('stage');
      },
      commit: async (p) => {
        assert.equal(p.id, pack.id);
        events.push('commit');
      },
    }),
  );
  assert.deepEqual(events, ['watch-check', 'stage', 'watch-check', 'commit']);
});
test('corrupt downloads leave the active pack unchanged and clean staging', async () => {
  const { manifest, bytes } = fixture();
  let committed = false,
    rolledBack = false;
  await assert.rejects(
    () =>
      installPack(
        manifest,
        ioFor(bytes, {
          hash: async () => '0'.repeat(64),
          commit: async () => {
            committed = true;
          },
          rollback: async () => {
            rolledBack = true;
          },
        }),
      ),
    /integrity/,
  );
  assert.equal(committed, false);
  assert.equal(rolledBack, true);
});
test('review-required live data cannot be installed as assessed data', async () => {
  const { manifest } = fixture();
  manifest.synthetic = false;
  let fetched = false;
  await assert.rejects(
    () =>
      installPack(
        manifest,
        ioFor(new Uint8Array(), {
          fetchAsset: async () => {
            fetched = true;
            return new Uint8Array();
          },
        }),
      ),
    /release review/,
  );
  assert.equal(fetched, false);
});
test('requested region and version must match the manifest before any download', async () => {
  const { manifest, bytes } = fixture();
  let fetched = false;
  await assert.rejects(
    installPack(
      manifest,
      ioFor(bytes, {
        fetchAsset: async () => {
          fetched = true;
          return bytes;
        },
      }),
      { regionId: 'other-region' },
    ),
    /requested region/,
  );
  assert.equal(fetched, false);
  assert.throws(
    () => validateManifest(manifest, { regionId: manifest.regionId, version: 'wrong-version' }),
    /requested region/,
  );
});
test('manifest bounds must cover exactly the assessment snapshot bounds', async () => {
  const { manifest, bytes } = fixture();
  manifest.bounds = [-82, 24, -80, 26];
  let committed = false;
  await assert.rejects(
    installPack(
      manifest,
      ioFor(bytes, {
        commit: async () => {
          committed = true;
        },
      }),
    ),
    /complete bounds/,
  );
  assert.equal(committed, false);
});
test('watch that starts during download blocks commit and preserves previous pack', async () => {
  const { manifest, bytes } = fixture();
  let active = false,
    committed = false,
    cleaned = false;
  await assert.rejects(
    installPack(
      manifest,
      ioFor(bytes, {
        assertReplacementAllowed: async () => {
          if (active) throw new Error('Stop the current anchor watch');
        },
        stage: async () => {
          active = true;
        },
        commit: async () => {
          committed = true;
        },
        rollback: async () => {
          cleaned = true;
        },
      }),
    ),
    /Stop the current anchor watch/,
  );
  assert.equal(committed, false);
  assert.equal(cleaned, true);
});
test('final publication failure cleans new files without committing an incomplete pack', async () => {
  const { manifest, bytes } = fixture();
  let cleanup = false;
  await assert.rejects(
    installPack(
      manifest,
      ioFor(bytes, {
        commit: async () => {
          throw new Error('disk full');
        },
        rollback: async () => {
          cleanup = true;
        },
      }),
    ),
    /disk full/,
  );
  assert.equal(cleanup, true);
});
test('ambiguous assessment snapshots and unsafe paths are rejected upfront', () => {
  const { manifest } = fixture();
  manifest.assets.push({ ...manifest.assets[0]!, path: 'second.json' });
  assert.throws(() => validateManifest(manifest), /Exactly one/);
  manifest.assets.pop();
  manifest.assets[0]!.path = '../escape';
  assert.throws(() => validateManifest(manifest), /asset entry/);
});
const approval: OfflineChartApproval = {
  styleUrl: 'https://charts.example.org/style.json',
  styleAsset: 'style.json',
  minZoom: 7,
  maxZoom: 15,
  resourceOrigins: ['https://charts.example.org'],
  rights: 'operator-owned-or-licensed',
  approvedBy: 'Fixture operator',
  approvedAt: '2026-10-30T00:00:00Z',
};
test('approved offline style allows owned tiles but rejects public OSM and opaque TileJSON', () => {
  validateOfflineChartStyle(
    {
      version: 8,
      sources: {
        chart: { type: 'vector', tiles: ['https://charts.example.org/tiles/{z}/{x}/{y}.pbf'] },
      },
      layers: [],
    },
    approval,
  );
  assert.throws(
    () =>
      validateOfflineChartStyle(
        {
          version: 8,
          sources: {
            osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'] },
          },
          layers: [],
        },
        {
          ...approval,
          resourceOrigins: [...approval.resourceOrigins, 'https://tile.openstreetmap.org'],
        },
      ),
    /Public OSM/,
  );
  assert.throws(
    () =>
      validateOfflineChartStyle(
        {
          version: 8,
          sources: {
            hidden: { type: 'vector', url: 'https://charts.example.org/unknown-tilejson' },
          },
          layers: [],
        },
        approval,
      ),
    /TileJSON/,
  );
});
test('provider styles cannot replace the app analysis overlays', () => {
  assert.throws(
    () =>
      validateOfflineChartStyle(
        {
          version: 8,
          sources: {
            'anchorbuddy-depths': {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] },
            },
          },
          layers: [],
        },
        approval,
      ),
    /analysis overlays/,
  );
  assert.throws(
    () =>
      validateOfflineChartStyle(
        { version: 8, sources: {}, layers: [{ id: 'anchorbuddy-swing-edge', type: 'background' }] },
        approval,
      ),
    /analysis overlays/,
  );
});
