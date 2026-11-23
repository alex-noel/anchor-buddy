import { useEffect, useReducer } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { chartIssue, chartLoadReducer, initialChartLoad, type ChartLoad } from '../lib/chartLoad';
import { colors as c, textScale } from '../theme';
import type { CachedChartState } from './useChartStyle';
import { Button } from './ui';

export function useChartLoad(attempt: number) {
  const [load, signal] = useReducer(chartLoadReducer, initialChartLoad);
  useEffect(() => {
    if (load.phase !== 'loading') return;
    const timer = setTimeout(() => signal({ type: 'slow' }), 12_000);
    return () => clearTimeout(timer);
  }, [attempt, load.phase]);
  return { load, signal };
}

export function ChartNotice({
  load,
  online,
  cached,
  onRetry,
  onShowList,
}: {
  load: ChartLoad;
  online: boolean;
  cached: CachedChartState;
  onRetry: () => void;
  onShowList?: () => void;
}) {
  const issue = chartIssue(load);
  const checkingCache = !online && cached === 'checking';
  const noOfflineBase = !online && cached === 'unconfirmed';
  const retrying = Boolean(load.recovering && !load.slow);
  const showActions = Boolean((issue && !retrying) || load.slow);
  const headline =
    issue === 'renderer'
      ? 'Map renderer unavailable'
      : issue === 'partial'
        ? 'Some map detail is unavailable'
        : load.phase !== 'ready'
          ? load.slow
            ? 'Map is taking longer than expected'
            : 'Loading map…'
          : checkingCache
            ? 'Checking downloaded maps…'
            : noOfflineBase
              ? 'No downloaded basemap confirmed'
              : !online && cached === 'available'
                ? 'Downloaded basemap available in saved areas'
                : null;
  if (!headline) return null;

  const detail = retrying
    ? 'Retrying map…'
    : cached === 'available' && (issue === 'partial' || load.slow)
      ? 'Downloaded detail is available within saved areas.'
      : noOfflineBase && issue !== 'renderer'
        ? 'Saved places and evidence may still be available.'
        : issue === 'renderer'
          ? onShowList
            ? 'Explore places in the list or try the map again.'
            : 'Try loading the map again.'
          : null;

  return (
    <View style={styles.notice}>
      <View accessibilityLiveRegion="polite" style={styles.copy}>
        <Text style={styles.title}>{headline}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {showActions ? (
        <View style={styles.actions}>
          <Button secondary small onPress={onRetry}>
            Retry map
          </Button>
          {onShowList ? (
            <Button secondary small onPress={onShowList}>
              Show list
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: c.paper,
    borderTopColor: c.line,
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  copy: { flexGrow: 1, flexBasis: 150, gap: 2 },
  title: { color: c.ink, fontWeight: '600', fontSize: textScale.compact },
  detail: { color: c.neutral, fontSize: textScale.compact },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
