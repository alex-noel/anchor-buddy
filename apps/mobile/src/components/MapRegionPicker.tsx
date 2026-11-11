import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MAP_REGIONS, searchMapRegions, type MapRegionPreset } from '../lib/mapRegions';
import { colors as c } from '../theme';
import type { UnitSystem } from '@anchor-buddy/domain';
import { distance } from '../lib/units';
import { Chip, Field, Icon, s } from './ui';

const continents = ['Europe', 'Asia', 'Americas'] as const;

export default function MapRegionPicker({
  selectedId,
  units = 'nautical',
  onSelect,
}: {
  selectedId?: string;
  units?: UnitSystem;
  onSelect: (preset: MapRegionPreset) => void;
}) {
  const selected = MAP_REGIONS.find((region) => region.id === selectedId);
  const [expanded, setExpanded] = useState(false);
  const [continent, setContinent] = useState<MapRegionPreset['continent']>(
    selected?.continent ?? 'Europe',
  );
  const [query, setQuery] = useState('');
  const matches = searchMapRegions(query, query.trim() ? undefined : continent);
  return (
    <View style={{ gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        onPress={() => setExpanded(!expanded)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 14,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 10,
          backgroundColor: c.white,
        }}
      >
        <Icon name="globe" color={c.blue} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: c.ink, fontWeight: '600', fontSize: 13 }}>
            Browse coastal regions
          </Text>
          <Text style={s.help}>
            {selected?.name ?? 'Europe, Asia and the Americas · works offline'}
          </Text>
        </View>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} />
      </Pressable>
      {expanded ? (
        <View style={{ gap: 12 }}>
          <Field
            label="Filter coastal regions"
            value={query}
            onChange={setQuery}
            help="Search the built-in area list. No connection needed."
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {continents.map((item) => (
              <Chip
                key={item}
                selected={!query.trim() && continent === item}
                onPress={() => {
                  setContinent(item);
                  setQuery('');
                }}
              >
                {item}
              </Chip>
            ))}
          </View>
          <ScrollView
            style={{ maxHeight: 260, flexShrink: 1 }}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8 }}
          >
            {matches.map((region) => (
              <Pressable
                key={region.id}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${region.name}, ${distance(region.radiusNm, units)} radius`}
                accessibilityState={{ selected: selectedId === region.id }}
                onPress={() => {
                  onSelect(region);
                  setExpanded(false);
                }}
                style={{
                  padding: 12,
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: selectedId === region.id ? c.blue : c.line,
                  borderRadius: 8,
                  backgroundColor: c.white,
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 13, color: c.ink, fontWeight: '600' }}>
                    {region.name}
                  </Text>
                  <Text style={s.help}>{distance(region.radiusNm, units)} starting radius</Text>
                </View>
                <Icon
                  name={selectedId === region.id ? 'check' : 'arrow-up-right'}
                  color={c.blue}
                  size={16}
                />
              </Pressable>
            ))}
            {!matches.length ? (
              <Text style={s.help}>
                No preset matches. Search for a location or choose a point on the map.
              </Text>
            ) : null}
          </ScrollView>
          <Text style={s.help}>
            Choosing a region moves the map and sets a starting radius. Map and nautical-data
            coverage are checked separately.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
