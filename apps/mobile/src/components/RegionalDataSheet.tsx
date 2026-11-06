import React from 'react';
import { Text, View } from 'react-native';
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
}: {
  pack: RegionPack;
  data: RegionalData | null;
  error: string;
  loading: boolean;
  onRetry: () => void;
  onSettings: () => void;
  onClose: () => void;
  units: UnitSystem;
}) {
  return (
    <Sheet title="Area data & coverage" subtitle={pack.name} onClose={onClose}>
      {error ? <Notice tone="warning">{error}</Notice> : null}
      <Notice>{pack.validation.notice}</Notice>
      <Text style={{ color: c.ink, fontSize: 13, lineHeight: 20 }}>
        {pack.places.length} place records · {pack.depths.length} depth areas ·{' '}
        {pack.weather.length} forecast intervals. Prices, overnight permission, seabed and berth
        availability stay unknown unless their sources establish them.
      </Text>
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
      {pack.weather.length ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600' }}>Available forecast</Text>
          {pack.weather.slice(0, 24).map((interval, index) => (
            <View key={index} style={{ gap: 4, paddingVertical: 6 }}>
              <Text style={{ color: c.ink, fontSize: 12 }}>{localTime(interval.validFrom)}</Text>
              <Text style={{ color: c.muted, fontSize: 12 }}>
                Wind {wind(interval.windKnots, units)} {direction(interval.windDirectionDeg)} ·
                gusts {wind(interval.gustKnots, units)} · waves {depth(interval.waveM, units)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <Button icon="refresh-cw" disabled={loading} onPress={onRetry}>
        {loading ? 'Loading sources…' : 'Refresh area data'}
      </Button>
      <Button secondary icon="settings" onPress={onSettings}>
        Data connection settings
      </Button>
    </Sheet>
  );
}
