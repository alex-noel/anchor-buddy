import { StyleSheet, Text, View } from 'react-native';
import {
  MAP_RESULT_LIMIT,
  MANUAL_PIN_GLYPH,
  resultStatuses,
  type ResultPresentation,
} from '../lib/resultPresentation';
import { colors as c, textScale } from '../theme';

export function ChartLegend({ results }: { results: ResultPresentation }) {
  if (!results.markers.length) return null;
  const shown = results.results.length > MAP_RESULT_LIMIT;
  const rankedLabel = shown
    ? `Ranks 1–${MAP_RESULT_LIMIT}${results.selectedBeyondLimit && results.selected?.rank ? ` + selected rank ${results.selected.rank}` : ''}`
    : 'Numbers show result rank';
  return (
    <View accessibilityLabel="Map marker legend" style={styles.legend}>
      {results.results.length ? <Text style={styles.label}>{rankedLabel}</Text> : null}
      {results.markers.some((marker) => marker.rank === null) ? (
        <Text style={styles.label}>{MANUAL_PIN_GLYPH} Manual pin</Text>
      ) : null}
      <Text style={styles.label}>
        <Text style={{ color: c.action }}>◎</Text> Selected
      </Text>
      {resultStatuses.map((status) => (
        <Text key={status.label} style={styles.label}>
          <Text style={{ color: status.color }}>{status.glyph}</Text> {status.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 2,
    backgroundColor: c.paper,
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
  label: { color: c.ink, fontSize: textScale.caption, fontWeight: '500' },
});
