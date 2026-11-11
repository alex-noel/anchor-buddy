import React, { useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import type { RegionPack, UnitSystem } from '@anchor-buddy/domain';
import Sheet from './Sheet';
import { Button, Notice } from './ui';
import { colors as c } from '../theme';
import { localTime, wind, depth, direction } from '../lib/units';
import type { RegionalData } from '../lib/regionalDataCore';

export default function RegionalDataSheet({
  pack,
  data,
  error,
  loading,
  onRetry,
  onSettings,
  onClose,
  units,
  offline = false,
  selectedArea = true,
}: {
  pack: RegionPack;
  data: RegionalData | null;
  error: string;
  loading: boolean;
  onRetry: () => void;
  onSettings: () => void;
  onClose: () => void;
  units: UnitSystem;
  offline?: boolean;
  selectedArea?: boolean;
}) {
  const [showAllForecast, setShowAllForecast] = useState(false);
  const forecast = useMemo(
    () => [...pack.weather].sort((a, b) => Date.parse(a.validFrom) - Date.parse(b.validFrom)),
    [pack.weather],
  );
  const visibleForecast = showAllForecast ? forecast : forecast.slice(0, 24);
  return (
    <Sheet title="Area data & coverage" subtitle={pack.name} onClose={onClose}>
      {error ? <Notice tone="warning">{error}</Notice> : null}
      <Notice>{pack.validation.notice}</Notice>
      {pack.sources.length ? (
        <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
          Snapshot refresh due {localTime(pack.validUntil)}
          {Date.parse(pack.validUntil) <= Date.now() ? ' · Expired — refresh required' : ''}
        </Text>
      ) : (
        <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
          No regional evidence snapshot is loaded.
        </Text>
      )}
      <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
        All dates and times below use your device’s local time zone.
      </Text>
      <Text style={{ color: c.ink, fontSize: 13, lineHeight: 20 }}>
        {pack.places.length} place records · {pack.depths.length} depth areas ·{' '}
        {pack.weather.length} forecast intervals. Prices, overnight permission, seabed and berth
        availability stay unknown unless their sources establish them.
      </Text>
      {data?.mapContext ? (
        <View
          style={{ gap: 10, paddingVertical: 12, borderBottomColor: c.line, borderBottomWidth: 1 }}
        >
          <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600' }}>
            Scientific map context
          </Text>
          <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
            Sample at {data.mapContext.position[1].toFixed(4)}°,{' '}
            {data.mapContext.position[0].toFixed(4)}°. This describes the search centre only.
          </Text>
          <Notice>{data.mapContext.notice}</Notice>
          {data.mapContext.depth ? (
            <View style={{ gap: 5 }}>
              <Text style={{ color: c.ink, fontSize: 13 }}>
                DTM cell mean: {depth(data.mapContext.depth.meanM, units)} LAT
              </Text>
              <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
                Raw signed grid values: {depth(data.mapContext.depth.minM, units)} to{' '}
                {depth(data.mapContext.depth.maxM, units)}. These are not chart clearance bounds.
                {data.mapContext.depth.interpolated === true ? ' This cell is interpolated.' : ''}
              </Text>
              {data.mapContext.depth.reference ? (
                <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
                  {data.mapContext.depth.reference}
                </Text>
              ) : null}
            </View>
          ) : null}
          {data.mapContext.seabed ? (
            <View style={{ gap: 5 }}>
              <Text style={{ color: c.ink, fontSize: 13 }}>
                Mapped substrate: {data.mapContext.seabed.label}
              </Text>
              <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
                {data.mapContext.seabed.originator}
                {data.mapContext.seabed.scale
                  ? ` · 1:${data.mapContext.seabed.scale.toLocaleString()}`
                  : ''}
              </Text>
              <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
                {data.mapContext.seabed.reference}
              </Text>
              {data.mapContext.seabed.notes ? (
                <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
                  {data.mapContext.seabed.notes}
                </Text>
              ) : null}
            </View>
          ) : null}
          {data.mapContext.sources.map((source) => (
            <View key={source.id} style={{ gap: 4 }}>
              <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(source.url)}>
                <Text style={{ color: c.blue, fontSize: 12 }}>{source.name} ↗</Text>
              </Pressable>
              <Text style={{ color: c.muted, fontSize: 11, lineHeight: 17 }}>
                {source.attribution} · {source.license}
              </Text>
              <Text style={{ color: c.muted, fontSize: 11, lineHeight: 17 }}>
                Retrieved {localTime(source.retrievedAt)} · refresh due{' '}
                {localTime(source.validUntil)}. Retrieval is not the survey date.
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {data?.providers.map((provider) => (
        <View
          key={provider.id}
          style={{ gap: 5, paddingVertical: 10, borderBottomColor: c.line, borderBottomWidth: 1 }}
        >
          <Text style={{ color: c.ink, fontSize: 14, fontWeight: '600' }}>
            {provider.name} · {provider.status.replaceAll('-', ' ')}
          </Text>
          <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>{provider.message}</Text>
          {provider.retrievedAt ? (
            <Text style={{ color: c.muted, fontSize: 11 }}>
              Retrieved {localTime(provider.retrievedAt)}
            </Text>
          ) : null}
          {provider.validUntil ? (
            <Text style={{ color: c.muted, fontSize: 11, lineHeight: 17 }}>
              Refresh due {localTime(provider.validUntil)}
              {Date.parse(provider.validUntil) <= Date.now() ? ' · Expired' : ''}
            </Text>
          ) : null}
          {provider.license ? (
            <Text style={{ color: c.muted, fontSize: 11 }}>{provider.license}</Text>
          ) : null}
          {provider.attribution ? (
            <Text style={{ color: c.muted, fontSize: 11, lineHeight: 17 }}>
              {provider.attribution}
            </Text>
          ) : null}
        </View>
      ))}
      {data?.notices.map((notice, index) => (
        <Text key={index} style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
          {notice}
        </Text>
      ))}
      <View style={{ gap: 10 }}>
        <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600' }}>Available forecast</Text>
        {forecast.length ? (
          <>
            <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
              Showing {visibleForecast.length} of {forecast.length} forecast intervals.
            </Text>
            {visibleForecast.map((interval, index) => (
              <View key={index} style={{ gap: 4, paddingVertical: 6 }}>
                <Text style={{ color: c.ink, fontSize: 12 }}>
                  {localTime(interval.validFrom)} – {localTime(interval.validUntil)}
                </Text>
                <Text style={{ color: c.muted, fontSize: 12 }}>
                  Wind {wind(interval.windKnots, units)} {direction(interval.windDirectionDeg)} ·
                  gusts {wind(interval.gustKnots, units)} · waves {depth(interval.waveM, units)}
                </Text>
              </View>
            ))}
            {forecast.length > 24 ? (
              <Button secondary onPress={() => setShowAllForecast((previous) => !previous)}>
                {showAllForecast
                  ? 'Show first 24 intervals'
                  : `Show all ${forecast.length} intervals`}
              </Button>
            ) : null}
          </>
        ) : (
          <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
            No forecast intervals are loaded for this area. Weather coverage is unknown.
          </Text>
        )}
      </View>
      <Button icon="refresh-cw" disabled={loading || (offline && selectedArea)} onPress={onRetry}>
        {loading ? 'Loading sources…' : selectedArea ? 'Refresh area data' : 'Choose search area'}
      </Button>
      {offline ? (
        <Text style={{ color: c.muted, fontSize: 12 }}>
          Reconnect and disable manual offline planning to refresh sources.
        </Text>
      ) : null}
      <Button secondary icon="settings" onPress={onSettings}>
        Data connection settings
      </Button>
    </Sheet>
  );
}
