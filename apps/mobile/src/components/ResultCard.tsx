import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Assessment, UnitSystem } from '@anchor-buddy/domain';
import { colors as c, textScale } from '../theme';
import { Icon, type IconName } from './ui';
import { depth, distance, money } from '../lib/units';
import { assessmentStatus, markerLabel, type RankedResult } from '../lib/resultPresentation';
export const kindNames: Record<string, string> = {
  marina: 'Marina',
  dock: 'Public dock',
  mooring: 'Mooring buoy',
  anchorage: 'Anchorage',
  generated: 'Anchor position',
};
export const kindIcons: Record<string, IconName> = {
  marina: 'home',
  dock: 'grid',
  mooring: 'disc',
  anchorage: 'anchor',
  generated: 'navigation',
};
export function StatusBadge({ assessment: a }: { assessment: Assessment }) {
  const presentation = assessmentStatus(a.status);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={presentation.icon} size={15} color={presentation.color} />
      <Text
        style={{
          fontSize: textScale.compact,
          color: presentation.color,
          fontWeight: '600',
        }}
      >
        {presentation.label}
      </Text>
    </View>
  );
}
export default function ResultCard({
  result,
  onSelect,
  units,
}: {
  result: RankedResult;
  onSelect: () => void;
  units: UnitSystem;
}) {
  const { assessment: a, selected, rank } = result;
  const leadingReason = a.reasons[0]?.message;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${markerLabel(result)} ${kindNames[a.candidate.kind]}${leadingReason ? `. ${leadingReason}` : ''}`}
      accessibilityHint="Opens place details."
      onPress={onSelect}
      style={[s.card, selected && s.selected]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={[s.icon, selected && { backgroundColor: c.green }]}>
          <Icon name={kindIcons[a.candidate.kind]} color={selected ? 'white' : c.green} size={19} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Text style={s.name}>{a.candidate.name}</Text>
          <Text style={s.subtitle}>
            {kindNames[a.candidate.kind]} · {distance(a.distanceNm, units)}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: c.muted, paddingTop: 2 }}>
          {String(rank).padStart(2, '0')}
        </Text>
      </View>
      <StatusBadge assessment={a} />
      {leadingReason ? <Text style={s.reason}>{leadingReason}</Text> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 24 }}>
          <Icon name="layers" size={13} color={c.muted} />
          <Text style={{ fontSize: textScale.compact, color: c.ink }}>
            {depth(a.maxDepthM, units)}
          </Text>
        </View>
        <Text
          style={{
            fontSize: textScale.body,
            fontWeight: '600',
            color: a.cost.status === 'free' ? c.success : c.ink,
            flexShrink: 1,
            textAlign: 'right',
          }}
        >
          {money(a.cost.total, a.cost.currency, a.cost.status)}
          {a.cost.total !== null && a.cost.total > 0 ? (
            <Text style={{ fontWeight: '400', fontSize: 10, color: c.muted }}> / stay</Text>
          ) : null}
        </Text>
      </View>
      {a.depthAllowancePercent > 0 ? (
        <Text style={{ fontSize: textScale.caption, color: c.warning }}>
          +{a.depthAllowancePercent}% depth alternative
        </Text>
      ) : null}
    </Pressable>
  );
}
const s = StyleSheet.create({
  card: {
    padding: 16,
    gap: 10,
    minHeight: 44,
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
  name: {
    fontWeight: '600',
    fontSize: textScale.bodyLarge,
    color: c.ink,
    lineHeight: 22,
    flexShrink: 1,
  },
  subtitle: { fontSize: textScale.caption, color: c.muted, flexShrink: 1 },
  reason: { fontSize: textScale.compact, color: c.ink, lineHeight: 18, flexShrink: 1 },
});
