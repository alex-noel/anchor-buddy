import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import type { RegionPack } from '@anchor-buddy/domain';
import Sheet from './Sheet';
import { Check, Notice } from './ui';
import { colors as c } from '../theme';
import type { MapLayers } from '../lib/workspace';
import { WORLD_BEDDING_NOTICE, EMODNET_BEDDING_LEGEND_URL } from '../lib/worldMapsCore';
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
          Available charted depth bounds in metres. The worldwide GEBCO layer is a coarse online
          overview, not navigational depth evidence. It is never used to calculate clearance.
        </Text>
      </View>
      <View style={{ gap: 5 }}>
        <Check
          label="Seabed / bedding"
          checked={layers.bedding}
          onChange={(bedding) => onChange({ ...layers, bedding })}
        />
        <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>
          Available sand, mud, rock, gravel, clay, silt, shell, grass and mixed ground evidence.
          Select multiple preferred seabeds in search settings or Advanced filters. Areas without
          source evidence remain unknown.
        </Text>
        <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>{WORLD_BEDDING_NOTICE}</Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(EMODNET_BEDDING_LEGEND_URL)}
        >
          <Text style={{ fontSize: 12, color: c.blue, paddingVertical: 6 }}>
            View EMODnet substrate colour legend ↗
          </Text>
        </Pressable>
      </View>
      <View style={{ gap: 5 }}>
        <Check
          label="Marks"
          checked={layers.marks}
          onChange={(marks) => onChange({ ...layers, marks })}
        />
        <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>
          Available charted marks plus OpenSeaMap community marks while online. Community coverage
          can be incomplete. Hiding this layer does not remove hazards from assessment checks.
        </Text>
      </View>
      <Text style={{ fontSize: 12, color: c.muted, lineHeight: 20 }}>
        Available hazards remain visible. A swing footprint appears only when its geometry can be
        established. Shaded edges are source-data boundaries, not marina boundaries or a navigation
        route.
      </Text>
      <Notice>{pack.validation.notice}</Notice>
      <Text style={{ fontSize: 12, lineHeight: 20, color: c.muted }}>
        {pack.sources.length
          ? `Assessment sources: ${pack.sources.map((source) => source.name).join(', ')}. Version ${pack.version}.`
          : 'No regional assessment sources are loaded. Display-map attribution appears on the map.'}
      </Text>
    </Sheet>
  );
}
