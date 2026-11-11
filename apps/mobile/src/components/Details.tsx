import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import type { Assessment, RegionPack, UnitSystem } from '@anchor-buddy/domain';
import Sheet from './Sheet';
import { Button, Card, Eyebrow, Icon, Notice } from './ui';
import { StatusBadge, kindNames } from './ResultCard';
import { colors as c } from '../theme';
import { depth, distance, direction, localTime, money, wind } from '../lib/units';
export default function Details({
  assessment: a,
  pack,
  units,
  onClose,
  onPlan,
  onSources,
}: {
  assessment: Assessment;
  pack: RegionPack;
  units: UnitSystem;
  onClose: () => void;
  onPlan: () => void;
  onSources?: () => void;
}) {
  const [allWeather, setAllWeather] = useState(false);
  const p = a.candidate.place;
  const anchored = a.candidate.kind === 'anchorage' || a.candidate.kind === 'generated';
  const footprintResolved = a.requiredRodeM !== null && a.swingRadiusM !== null;
  const elapsedEvidence = a.reasons.some(
    (reason) => reason.code === 'elapsed_stay' || reason.code.startsWith('currently_'),
  );
  return (
    <Sheet
      title={a.candidate.name}
      subtitle={
        kindNames[a.candidate.kind] +
        ' · ' +
        distance(a.distanceNm, units) +
        ' straight-line distance'
      }
      onClose={onClose}
    >
      <StatusBadge assessment={a} />
      {a.context ? (
        <Text style={{ fontSize: 11, color: c.muted }}>
          Reassessed {localTime(a.context.assessedAt)} · {a.context.purpose}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, padding: 16 }}>
          <Eyebrow>WATER DEPTH</Eyebrow>
          <Text style={{ fontSize: 20, fontWeight: '600', color: c.ink }}>
            {depth(a.minDepthM, units)} – {depth(a.maxDepthM, units)}
          </Text>
        </Card>
        <Card style={{ flex: 1, padding: 16 }}>
          <Eyebrow>ESTIMATED STAY</Eyebrow>
          <Text style={{ fontSize: 20, fontWeight: '600', color: c.ink }}>
            {money(a.cost.total, a.cost.currency)}
          </Text>
        </Card>
      </View>
      <Eyebrow>ASSESSMENT</Eyebrow>
      {a.reasons.map((r, i) => (
        <View key={r.code + '-' + i} style={{ flexDirection: 'row', gap: 10 }}>
          <Icon
            name={
              r.severity === 'excluded'
                ? 'x-circle'
                : r.severity === 'insufficient_evidence'
                  ? 'alert-circle'
                  : 'check-circle'
            }
            color={
              r.severity === 'excluded'
                ? c.red
                : r.severity === 'insufficient_evidence'
                  ? c.muted
                  : c.green
            }
            size={16}
          />
          <Text style={{ fontSize: 12, lineHeight: 19, color: c.ink, flex: 1 }}>{r.message}</Text>
        </View>
      ))}
      {anchored ? (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, padding: 16 }}>
              <Eyebrow>REQUIRED RODE</Eyebrow>
              <Text style={{ color: c.ink, fontSize: 21 }}>{depth(a.requiredRodeM, units)}</Text>
            </Card>
            <Card style={{ flex: 1, padding: 16 }}>
              <Eyebrow>CALCULATED SWING RADIUS</Eyebrow>
              <Text style={{ color: c.ink, fontSize: 21 }}>
                {depth(footprintResolved ? a.swingRadiusM : null, units)}
              </Text>
            </Card>
          </View>
          <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
            {footprintResolved
              ? 'Calculated geometry does not establish clear seabed, suitable holding or permission to anchor.'
              : 'The full swing footprint has not been established from the available depth, water-level and equipment evidence.'}
          </Text>
        </>
      ) : null}
      <Notice>
        {a.exposure.label}. Exposure is a coastline/fetch estimate, not a local shelter guarantee.
      </Notice>
      <Eyebrow>STAY & DEPARTURE CONTINGENCY</Eyebrow>
      {!a.weather.length ? (
        <Notice>
          No forecast has verified spatial coverage at this position for this stay. Sources &
          coverage may contain a forecast for the search centre; it cannot establish local shelter
          or conditions here.
        </Notice>
      ) : null}
      {(allWeather ? a.weather : a.weather.slice(0, 12)).map((w, i) => (
        <View
          key={i}
          style={{ borderBottomWidth: 1, borderBottomColor: c.line, paddingBottom: 11, gap: 7 }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: c.ink }}>
            {localTime(w.validFrom)}
          </Text>
          <Text style={{ fontSize: 12, color: c.muted }}>
            Wind {wind(w.windKnots, units)} {direction(w.windDirectionDeg)} · gusts{' '}
            {wind(w.gustKnots, units)} · waves {depth(w.waveM, units)} · current{' '}
            {wind(w.currentKnots, units, 1)}
          </Text>
          {w.warnings.length ? <Notice tone="warning">{w.warnings.join('; ')}</Notice> : null}
        </View>
      ))}
      {a.weather.length > 12 ? (
        <Button secondary onPress={() => setAllWeather(!allWeather)}>
          {allWeather
            ? 'Show first 12 intervals'
            : `Show all ${a.weather.length} forecast intervals`}
        </Button>
      ) : null}
      {onSources ? (
        <Button secondary onPress={onSources}>
          Sources & coverage
        </Button>
      ) : null}
      <Eyebrow>ACCESS & AVAILABILITY</Eyebrow>
      <Text style={{ fontSize: 12, lineHeight: 20, color: c.ink }}>
        Approach: {a.approach.status.replaceAll('_', ' ')}. {a.approach.notes.join(' ')}
      </Text>
      <Text style={{ fontSize: 12, lineHeight: 20, color: c.ink }}>
        Availability: {a.availability}.{' '}
        {p?.overnightAllowed === true
          ? 'Overnight use permitted in the source record.'
          : p?.overnightAllowed === false
            ? 'Day use only.'
            : 'Overnight permission requires verification.'}
      </Text>
      {p ? (
        <Text style={{ fontSize: 12, lineHeight: 20, color: c.muted }}>
          Holding: {p.holding}. {p.facilities.join(' · ')}. {p.notes.join(' ')}{' '}
          {p.contact ? 'Contact: ' + p.contact : ''}
        </Text>
      ) : null}
      <Eyebrow>COST BREAKDOWN</Eyebrow>
      {a.cost.items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ fontSize: 12, color: c.ink, flex: 1 }}>{item.label}</Text>
          <Text style={{ fontSize: 12, color: c.ink }}>{money(item.amount, a.cost.currency)}</Text>
        </View>
      ))}
      <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
        {a.cost.notes.join(' ') || 'An estimate is not a booking or confirmation of availability.'}
      </Text>
      <Eyebrow>SOURCES & FRESHNESS</Eyebrow>
      {!a.sourceIds.length ? (
        <Text style={{ fontSize: 12, color: c.muted }}>
          No applicable evidence is available for this position.
        </Text>
      ) : null}
      {pack.sources
        .filter((s) => a.sourceIds.includes(s.id))
        .map((source) => (
          <Pressable
            accessibilityRole="link"
            key={source.id}
            onPress={() => Linking.openURL(source.url)}
            style={{ gap: 4 }}
          >
            <Text style={{ fontSize: 12, color: c.green, fontWeight: '600' }}>{source.name} ↗</Text>
            <Text style={{ fontSize: 10, color: c.muted }}>
              Retrieved {localTime(source.retrievedAt)}
            </Text>
          </Pressable>
        ))}
      {anchored ? (
        <Button
          onPress={onPlan}
          disabled={elapsedEvidence}
          icon="anchor"
          secondary={a.status !== 'passes'}
        >
          {a.status === 'excluded' ? 'Inspect position in planner' : 'Plan this position'}
        </Button>
      ) : (
        <Notice>
          Confirm berth or mooring availability and arrival instructions with the operator. This
          site assessment does not authorize dropping an anchor at a dock or mooring.
        </Notice>
      )}
    </Sheet>
  );
}
