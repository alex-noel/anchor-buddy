import {
  destination,
  pointInArea,
  type AreaGeometry,
  type Assessment,
  type Bedding,
  type Position,
  type RegionPack,
  type UnitSystem,
} from '@anchor-buddy/domain';
import { colors as c } from '../theme';
import { onlineWorldMapStyle } from '../lib/worldMapsCore';

export interface ChartProps {
  pack: RegionPack;
  assessments: Assessment[];
  selectedId?: string;
  origin: Position;
  onSelect: (id: string) => void;
  onPin: (p: Position) => void;
  onlineBasemap: boolean;
  units?: UnitSystem;
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
  gravel: '#8D9EAD',
  clay: '#93A5B6',
  silt: '#A5B4C3',
  shell: '#CCD6DF',
  grass: '#667D8B',
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
  marks = true,
) {
  base = base ?? (online ? onlineWorldMapStyle() : null);
  const baseLayers = (base?.layers as { type?: string }[] | undefined) ?? [];
  const firstLabel = baseLayers.findIndex((layer) => layer.type === 'symbol');
  const split = firstLabel < 0 ? baseLayers.length : firstLabel;
  const globalBathymetry =
    online && depth
      ? [
          {
            id: 'anchorbuddy-global-bathymetry',
            type: 'raster',
            source: 'anchorbuddy-gebco',
            maxzoom: 13,
            paint: { 'raster-opacity': 0.28, 'raster-saturation': -0.6 },
          },
        ]
      : [];
  const europeanBedding =
    online && bedding
      ? [
          {
            id: 'anchorbuddy-european-substrate',
            type: 'raster',
            source: 'anchorbuddy-emodnet-substrate',
            minzoom: 4,
            maxzoom: 13,
            paint: { 'raster-opacity': 0.42 },
          },
        ]
      : [];
  const features = pack.depths.map((d) => ({
    type: 'Feature',
    properties: { min: d.minDepthM, max: d.maxDepthM },
    geometry: d.geometry,
  }));
  const hazards = pack.hazards.map((d) => ({
    type: 'Feature',
    properties: { kind: d.kind },
    geometry: d.geometry,
  }));
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
      ...(online && bedding
        ? {
            'anchorbuddy-emodnet-substrate': {
              type: 'raster',
              tiles: [
                'https://drive.emodnet-geology.eu/geoserver/gtk/wms?service=WMS&version=1.1.1&request=GetMap&layers=seabed_substrate_1m,seabed_substrate_250k&styles=&format=image/png&transparent=true&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256',
              ],
              bounds: [-36, 15, 43, 85] as [number, number, number, number],
              tileSize: 256,
              minzoom: 4,
              maxzoom: 10,
              attribution:
                '<a href="https://emodnet.ec.europa.eu/en/geology">EMODnet Geology</a> · Broad-scale substrate context; not anchoring evidence',
            },
          }
        : {}),
      ...(online && depth
        ? {
            'anchorbuddy-gebco': {
              type: 'raster',
              tiles: [
                'https://wms.gebco.net/mapserv?service=WMS&version=1.1.1&request=GetMap&layers=GEBCO_LATEST_2&styles=&format=image/png&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256',
              ],
              tileSize: 256,
              maxzoom: 8,
              attribution:
                '<a href="https://www.gebco.net/data-products/gebco-web-services/web-map-service">GEBCO_2026 Grid</a> · Coarse display only; not for navigation',
            },
          }
        : {}),
      ...(online && marks
        ? {
            'anchorbuddy-seamarks': {
              type: 'raster',
              tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
              tileSize: 256,
              minzoom: 8,
              maxzoom: 18,
              attribution:
                '© <a href="https://www.openseamap.org">OpenSeaMap</a> contributors · Community marks, incomplete coverage',
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
      // Unknown/unloaded map regions stay neutral, rather than implying open water.
      { id: 'anchorbuddy-water', type: 'background', paint: { 'background-color': '#E7EBEF' } },
      ...baseLayers.slice(0, split),
      ...globalBathymetry,
      ...europeanBedding,
      ...baseLayers.slice(split),
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
      ...(online && marks
        ? [
            {
              id: 'anchorbuddy-global-seamarks',
              type: 'raster',
              source: 'anchorbuddy-seamarks',
              minzoom: 8,
            },
          ]
        : []),
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
