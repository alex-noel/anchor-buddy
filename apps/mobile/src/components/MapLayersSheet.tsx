import React from 'react';
import { Text, View } from 'react-native';
import type { RegionPack } from '@anchor-buddy/domain';
import Sheet from './Sheet';
import { Check, Notice } from './ui';
import { colors as c } from '../theme';
import type { MapLayers } from '../lib/workspace';
export default function MapLayersSheet({
  layers,
  onChange,
  pack,
  onClose,
}: {
  layers: MapLayers;
  onChange: (layers: MapLayers) => void;
  pack: RegionPack;
  onClose: () => void;
}) {
  return (
    <Sheet
      title="Map layers"
      subtitle="Layer visibility changes the map, not the assessment checks."
      onClose={onClose}
    >
      <View style={{ gap: 5 }}>
        <Check
          label="Water depth"
          checked={layers.depth}
          onChange={(depth) => onChange({ ...layers, depth })}
        />
        <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>
          Blue shading and charted lower–upper depth bounds in metres. Unmapped water has no assumed
          depth.
        </Text>
      </View>
      <View style={{ gap: 5 }}>
        <Check
          label="Seabed / bedding"
          checked={layers.bedding}
          onChange={(bedding) => onChange({ ...layers, bedding })}
        />
        <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>
          Labelled sand, mud, mixed ground or rock. Choose preferred seabed in search settings or
          Advanced filters.
        </Text>
      </View>
      <View style={{ gap: 5 }}>
        <Check
          label="Marks"
          checked={layers.marks}
          onChange={(marks) => onChange({ ...layers, marks })}
        />
        <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>
          Charted navigation marks shown separately from mooring buoys. A hidden mark remains in the
          source data.
        </Text>
      </View>
      <Text style={{ fontSize: 12, color: c.muted, lineHeight: 20 }}>
        Hazards and the selected position’s full swing footprint remain visible. Shaded edges are
        source-data boundaries, not marina boundaries or a navigation route.
      </Text>
      <Notice>
        {pack.validation.status === 'synthetic'
          ? 'Current map overlays use artificial sample polygons and marks, including rectangular source extents. They are not real nautical chart data.'
          : pack.validation.notice}
      </Notice>
      <Text style={{ fontSize: 12, lineHeight: 20, color: c.muted }}>
        Sources: {pack.sources.map((source) => source.name).join(', ')}. Version {pack.version}.
      </Text>
    </Sheet>
  );
}
