import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Assessment, UnitSystem } from '@anchor-buddy/domain';
import { colors as c } from '../theme';
import { Icon, type IconName } from './ui';
import { depth, distance, money } from '../lib/units';
export const kindNames: Record<string, string> = {
  marina: 'Marina',
  dock: 'Public dock',
  mooring: 'Mooring buoy',
  anchorage: 'Anchorage',
  generated: 'Suggested anchor position',
};
export const kindIcons: Record<string, IconName> = {
  marina: 'home',
  dock: 'grid',
  mooring: 'disc',
  anchorage: 'anchor',
  generated: 'navigation',
};
export function StatusBadge({ assessment: a }: { assessment: Assessment }) {
  const pass = a.status === 'passes';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 4,
          backgroundColor: pass ? c.green : a.status === 'excluded' ? c.red : c.muted,
        }}
      />
      <Text
        style={{
          fontSize: 10,
          color: pass ? c.green : a.status === 'excluded' ? c.red : c.muted,
          fontWeight: '600',
        }}
      >
        {pass
          ? a.simulated
            ? 'Simulated checks pass'
            : 'Checks pass'
          : a.status === 'excluded'
            ? 'Excluded'
            : 'Needs more evidence'}
      </Text>
    </View>
  );
}
export default function ResultCard({
  assessment: a,
  selected,
  onSelect,
  units,
  index,
}: {
  assessment: Assessment;
  selected: boolean;
  onSelect: () => void;
  units: UnitSystem;
  index: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${a.candidate.name}, ${a.status}`}
      onPress={onSelect}
      style={[s.card, selected && s.selected]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={[s.icon, selected && { backgroundColor: c.green }]}>
          <Icon name={kindIcons[a.candidate.kind]} color={selected ? 'white' : c.green} size={19} />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={s.name}>{a.candidate.name}</Text>
          <Text style={s.subtitle}>
            {kindNames[a.candidate.kind]} · {distance(a.distanceNm, units)}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: c.muted, paddingTop: 2 }}>
          {String(index + 1).padStart(2, '0')}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Icon name="layers" size={13} color={c.muted} />
          <Text style={{ fontSize: 12, color: c.ink }}>{depth(a.maxDepthM, units)}</Text>
        </View>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: a.cost.status === 'free' ? c.green : c.ink,
          }}
        >
          {money(a.cost.total, a.cost.currency)}
          {a.cost.total !== null && a.cost.total > 0 ? (
            <Text style={{ fontWeight: '400', fontSize: 10, color: c.muted }}> / stay</Text>
          ) : null}
        </Text>
      </View>
      <StatusBadge assessment={a} />
      {a.depthAllowancePercent > 0 ? (
        <Text style={{ fontSize: 11, color: c.orange }}>
          +{a.depthAllowancePercent}% depth alternative
        </Text>
      ) : null}
    </Pressable>
  );
}
const s = StyleSheet.create({
  card: {
    padding: 17,
    gap: 14,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 14,
    backgroundColor: c.white,
  },
  selected: { borderColor: c.blue, backgroundColor: c.mint },
  icon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: c.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontWeight: '600', fontSize: 14, color: c.ink, lineHeight: 19 },
  subtitle: { fontSize: 11, color: c.muted },
});
