import { StyleSheet, Text, View } from 'react-native';
import type { UnitSystem } from '@anchor-buddy/domain';
import {
  formatForecastPeaks,
  formatForecastRange,
  type ForecastPresentation,
} from '../lib/forecastPresentation';
import { direction } from '../lib/units';
import { colors as c, spacing, textScale } from '../theme';
import { Notice } from './ui';

function ForecastWindow({
  label,
  window,
  timezone,
  units,
}: {
  label: string;
  window: NonNullable<ForecastPresentation['requested']>['stay'];
  timezone: string;
  units: UnitSystem;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.copy}>{formatForecastRange(window.range, timezone)}</Text>
      {window.hasCurrentIntervals ? (
        <>
          <Text style={styles.copy}>
            {window.intervalGap
              ? 'Gaps in current forecast intervals.'
              : 'Current forecast intervals span this window.'}
          </Text>
          {window.metricGaps.length ? (
            <Text style={styles.copy}>
              Values missing for part of this window · {window.metricGaps.join(', ')}.
            </Text>
          ) : null}
          <Text style={styles.title}>Highest available values</Text>
          <Text style={styles.copy}>{formatForecastPeaks(window.peaks, units)}</Text>
        </>
      ) : (
        <Text style={styles.copy}>No current forecast intervals for this window.</Text>
      )}
    </View>
  );
}

export function ForecastOverview({
  forecast,
  scope,
  timezone,
  units,
}: {
  forecast: ForecastPresentation;
  scope: 'position' | 'area';
  timezone: string;
  units: UnitSystem;
}) {
  const { availableRange, requested } = forecast;
  return (
    <View style={styles.overview}>
      <Text style={styles.title}>Forecast time zone · {timezone}</Text>
      <Text style={styles.copy}>
        {scope === 'position'
          ? 'Forecast timing at the assessed position. See assessment findings for coverage of the swing area.'
          : 'Forecast context for the area. Live forecasts describe the search centre only.'}
      </Text>
      {forecast.expired ? (
        <Text style={styles.copy}>
          Expired forecasts or evidence affect {forecast.expired} interval(s).
        </Text>
      ) : null}
      {forecast.unconfirmed ? (
        <Text style={styles.copy}>
          Freshness unconfirmed for {forecast.unconfirmed} interval(s).
        </Text>
      ) : null}
      {requested ? (
        <>
          <ForecastWindow
            label="Requested stay"
            window={requested.stay}
            timezone={timezone}
            units={units}
          />
          {requested.contingency ? (
            <ForecastWindow
              label="Departure contingency"
              window={requested.contingency}
              timezone={timezone}
              units={units}
            />
          ) : (
            <Text style={styles.copy}>No departure contingency requested.</Text>
          )}
        </>
      ) : availableRange ? (
        <View style={styles.group}>
          <Text style={styles.title}>
            {availableRange.current ? 'Available forecast range' : 'Loaded forecast range'}
          </Text>
          <Text style={styles.copy}>{formatForecastRange(availableRange, timezone)}</Text>
          {availableRange.hasGaps ? <Text style={styles.copy}>Gaps between intervals.</Text> : null}
          {!availableRange.current ? (
            <Text style={styles.copy}>Current forecast availability is unconfirmed.</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.copy}>No forecast interval dates available.</Text>
      )}
    </View>
  );
}

export function ForecastIntervalRow({
  row,
  timezone,
  units,
}: {
  row: ForecastPresentation['rows'][number];
  timezone: string;
  units: UnitSystem;
}) {
  const { interval } = row;
  return (
    <View style={styles.row}>
      <Text style={styles.title}>
        {formatForecastRange({ from: interval.validFrom, until: interval.validUntil }, timezone)}
      </Text>
      {row.freshness !== 'current' ? (
        <Text style={styles.copy}>
          {row.freshness === 'expired'
            ? 'Forecast interval or evidence expired.'
            : 'Forecast freshness unconfirmed.'}
        </Text>
      ) : null}
      <Text style={styles.copy}>
        {formatForecastPeaks(interval, units)} · wind direction{' '}
        {direction(interval.windDirectionDeg)}
      </Text>
      {row.missing ? <Text style={styles.copy}>Some forecast values are unavailable.</Text> : null}
      {interval.warnings.length ? (
        <Notice tone="warning">{interval.warnings.join(' · ')}</Notice>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overview: { gap: spacing.sm, padding: spacing.md, backgroundColor: c.paper, borderRadius: 8 },
  group: { gap: spacing.xs, borderTopWidth: 1, borderTopColor: c.line, paddingTop: spacing.sm },
  row: {
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
    paddingBottom: spacing.sm,
  },
  title: { color: c.ink, fontWeight: '600', fontSize: textScale.compact, lineHeight: 19 },
  copy: { color: c.neutral, fontSize: textScale.compact, lineHeight: 19 },
});
