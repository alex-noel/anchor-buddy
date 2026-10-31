import {
  destination,
  pointInArea,
  type AreaGeometry,
  type Assessment,
  type Bedding,
  type Position,
  type RegionPack,
} from '@anchor-buddy/domain';
import { colors as c } from '../theme';

export interface ChartProps {
  pack: RegionPack;
  assessments: Assessment[];
  selectedId?: string;
  origin: Position;
  onSelect: (id: string) => void;
  onPin: (p: Position) => void;
  onlineBasemap: boolean;
  showDepth?: boolean;
  showBedding?: boolean;
  showMarks?: boolean;
  searchRadiusNm?: number;
  selectOnTap?: boolean;
  initialZoom?: number;
}

export function circleGeometry(center: Position, radius: number) {
  const points: Position[] = [];
  for (let i = 0; i <= 96; i++) points.push(destination(center, (i / 96) * 360, radius));
  return { type: 'Polygon' as const, coordinates: [points] };
}

/** Keep a clear margin in both compact pickers and full-screen maps. */
export function mapFitDiameter(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 220;
  return Math.max(180, Math.min(650, Math.round(Math.min(width, height) * 0.08) * 10));
}

/** Fits a radius to the current container; user gestures can still adjust the camera. */
export function radiusZoom(
  origin: Position,
  radiusNm?: number,
  fallback = 12.2,
  targetDiameterPx = 220,
) {
  if (!radiusNm || !Number.isFinite(radiusNm) || radiusNm <= 0) return fallback;
  const diameter =
    Number.isFinite(targetDiameterPx) && targetDiameterPx > 0 ? targetDiameterPx : 220;
  return Math.max(
    2,
    Math.min(
      18,
      // MapLibre zoom uses a 512px world tile, so its scale is half the familiar 256px formula.
      Math.log2(
        (78271.515 * Math.cos((origin[1] * Math.PI) / 180) * diameter) / (radiusNm * 1852 * 2),
      ),
    ),
  );
}

export const beddingColors: Record<Bedding, string> = {
  sand: '#B7C8D9',
  mud: '#71859A',
  mixed: '#819CAF',
  rock: '#485A6D',
  unknown: '#CCD2DA',
};

/** Labels locate bounded source polygons. They are not interpolated soundings. */
export interface EvidenceLabel {
  id: string;
  position: Position;
  text: string;
  detail: string;
  kind: 'depth' | 'bedding';
  priority: number;
}

export function evidenceLabels(pack: RegionPack, depth = true, bedding = true) {
  const labels: EvidenceLabel[] = [];
  const add = (
    id: string,
    geometry: AreaGeometry,
    text: string,
    detail: string,
    kind: 'depth' | 'bedding',
    priority = 0,
  ) => {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    for (const [i, coordinates] of polygons.entries()) {
      const ring = coordinates[0];
      if (!ring?.length) continue;
      let west = Infinity,
        east = -Infinity,
        south = Infinity,
        north = -Infinity;
      for (const [x, y] of ring) {
        west = Math.min(west, x);
        east = Math.max(east, x);
        south = Math.min(south, y);
        north = Math.max(north, y);
      }
      // Try the centre first, then interior samples. Never label a polygon hole or a neighbouring area.
      const offsets = [0.5, 0.25, 0.75, 0.1, 0.9];
      let position: Position | undefined;
      for (const y of offsets) {
        for (const x of offsets) {
          const candidate: Position = [west + (east - west) * x, south + (north - south) * y];
          if (pointInArea(candidate, { type: 'Polygon', coordinates })) {
            position = candidate;
            break;
          }
        }
        if (position) break;
      }
      if (position)
        labels.push({ id: `${kind}-${id}-${i}`, position, text, detail, kind, priority });
    }
  };
  const provenance = (ids: string[]) =>
    ids.map((id) => pack.sources.find((s) => s.id === id)?.name ?? id).join(', ');
  if (depth)
    for (const area of pack.depths) {
      const bounds =
        area.minDepthM === null || area.maxDepthM === null
          ? 'Depth bounds unknown'
          : `${area.minDepthM.toFixed(1)}–${area.maxDepthM.toFixed(1)} m`;
      add(
        area.id,
        area.geometry,
        bounds,
        `${bounds} · ${area.verticalDatum} · ${provenance(area.sourceIds)}`,
        'depth',
        area.minDepthM ?? -1,
      );
    }
  if (bedding)
    for (const area of pack.holdingAreas ?? []) {
      const label =
        area.holding === 'unknown'
          ? 'Seabed unknown'
          : area.holding[0]!.toUpperCase() + area.holding.slice(1);
      add(
        area.id,
        area.geometry,
        label,
        `${label} · ${area.reviewed ? 'Reviewed evidence' : 'Unreviewed evidence'} · ${provenance(area.sourceIds)}`,
        'bedding',
      );
    }
  return labels.slice(0, 80);
}

/** Pixel-space collision filtering changes display only. Source geometry and assessments are untouched. */
export function declutterEvidenceLabels(
  labels: EvidenceLabel[],
  zoom: number,
  bearing = 0,
  pitch = 0,
  obstacles: { position: Position; radiusPx: number }[] = [],
) {
  const scale = 512 * 2 ** zoom;
  const angle = (-bearing * Math.PI) / 180;
  const pitchScale = Math.max(0.15, Math.cos((pitch * Math.PI) / 180));
  const project = ([longitude, latitude]: Position) => {
    const sin = Math.sin((Math.max(-85, Math.min(85, latitude)) * Math.PI) / 180);
    const x = ((longitude + 180) / 360) * scale;
    const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
    return [
      x * Math.cos(angle) - y * Math.sin(angle),
      (x * Math.sin(angle) + y * Math.cos(angle)) * pitchScale,
    ];
  };
  const occupied = obstacles.map((obstacle) => {
    const [x, y] = project(obstacle.position);
    return { x: x!, y: y!, halfWidth: obstacle.radiusPx, halfHeight: obstacle.radiusPx };
  });
  return [...labels]
    .sort((a, b) => (a.kind === b.kind ? a.priority - b.priority : a.kind === 'depth' ? -1 : 1))
    .filter((label) => {
      const [x, y] = project(label.position);
      const box = {
        x: x!,
        y: y! + (label.kind === 'depth' ? -12 : 12),
        halfWidth: label.text.length * 3.2 + 7,
        halfHeight: 10,
      };
      if (
        occupied.some(
          (other) =>
            Math.abs(box.x - other.x) < box.halfWidth + other.halfWidth + 3 &&
            Math.abs(box.y - other.y) < box.halfHeight + other.halfHeight + 3,
        )
      )
        return false;
      occupied.push(box);
      return true;
    });
}

export function buildMapStyle(
  pack: RegionPack,
  selected: Assessment | undefined,
  online: boolean,
  depth = true,
  base: Record<string, unknown> | null = null,
  bedding = true,
  search?: { origin: Position; radiusNm: number },
) {
  const features = pack.depths.map((d) => ({
    type: 'Feature',
    properties: { min: d.minDepthM, max: d.maxDepthM },
    geometry: d.geometry,
  }));
  // Coverage and the fixture's outer shore mask are analysis inputs, not chart features.
  const hazards = pack.hazards
    .filter(
      (d) =>
        !(pack.validation.status === 'synthetic' && d.kind === 'shore' && d.id === 'demo-shore'),
    )
    .map((d) => ({ type: 'Feature', properties: { kind: d.kind }, geometry: d.geometry }));
  const holdings = (pack.holdingAreas ?? []).map((area) => ({
    type: 'Feature',
    properties: { holding: area.holding },
    geometry: area.geometry,
  }));
  return {
    ...base,
    version: 8 as const,
    sources: {
      ...((base?.sources as Record<string, unknown>) ?? {}),
      ...(online && !base
        ? {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors · Basemap only',
            },
          }
        : {}),
      'anchorbuddy-depths': { type: 'geojson', data: { type: 'FeatureCollection', features } },
      'anchorbuddy-hazards': {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: hazards },
      },
      'anchorbuddy-bedding': {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: holdings },
      },
      'anchorbuddy-search': {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features:
            search && Number.isFinite(search.radiusNm) && search.radiusNm > 0
              ? [
                  {
                    type: 'Feature',
                    properties: {},
                    geometry: circleGeometry(search.origin, search.radiusNm * 1852),
                  },
                ]
              : [],
        },
      },
      'anchorbuddy-swing': {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: selected?.swingRadiusM
            ? [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: circleGeometry(selected.candidate.position, selected.swingRadiusM),
                },
              ]
            : [],
        },
      },
    },
    layers: [
      { id: 'anchorbuddy-water', type: 'background', paint: { 'background-color': c.ocean } },
      ...((base?.layers as object[]) ?? []),
      ...(online && !base
        ? [
            {
              id: 'anchorbuddy-basemap',
              type: 'raster',
              source: 'osm',
              paint: { 'raster-opacity': 0.8, 'raster-saturation': -0.85 },
            },
          ]
        : []),
      ...(depth
        ? [
            {
              id: 'anchorbuddy-depth-fill',
              type: 'fill',
              source: 'anchorbuddy-depths',
              paint: {
                'fill-color': [
                  'case',
                  ['any', ['==', ['get', 'min'], null], ['==', ['get', 'max'], null]],
                  '#A9B4C3',
                  [
                    'interpolate',
                    ['linear'],
                    ['get', 'min'],
                    0,
                    '#78A8D5',
                    5,
                    '#4D87BA',
                    15,
                    '#295982',
                  ],
                ],
                'fill-opacity': 0.12,
              },
            },
          ]
        : []),
      ...(bedding
        ? [
            {
              id: 'anchorbuddy-bedding-fill',
              type: 'fill',
              source: 'anchorbuddy-bedding',
              paint: {
                'fill-color': [
                  'match',
                  ['get', 'holding'],
                  'sand',
                  beddingColors.sand,
                  'mud',
                  beddingColors.mud,
                  'mixed',
                  beddingColors.mixed,
                  'rock',
                  beddingColors.rock,
                  beddingColors.unknown,
                ],
                'fill-opacity': 0.12,
              },
            },
          ]
        : []),
      {
        id: 'anchorbuddy-hazard-fill',
        type: 'fill',
        source: 'anchorbuddy-hazards',
        paint: { 'fill-color': c.ink, 'fill-opacity': 0.1 },
      },
      {
        id: 'anchorbuddy-hazard-line',
        type: 'line',
        source: 'anchorbuddy-hazards',
        paint: { 'line-color': c.muted, 'line-width': 1.2, 'line-dasharray': [2, 3] },
      },
      {
        id: 'anchorbuddy-search-fill',
        type: 'fill',
        source: 'anchorbuddy-search',
        paint: { 'fill-color': c.blue, 'fill-opacity': 0.045 },
      },
      {
        id: 'anchorbuddy-search-edge',
        type: 'line',
        source: 'anchorbuddy-search',
        paint: { 'line-color': c.blue, 'line-width': 1.5, 'line-dasharray': [3, 3] },
      },
      {
        id: 'anchorbuddy-swing-fill',
        type: 'fill',
        source: 'anchorbuddy-swing',
        paint: { 'fill-color': c.blue, 'fill-opacity': 0.16 },
      },
      {
        id: 'anchorbuddy-swing-edge',
        type: 'line',
        source: 'anchorbuddy-swing',
        paint: { 'line-color': c.blue, 'line-width': 2 },
      },
    ],
  };
}
