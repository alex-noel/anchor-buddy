import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, ScrollView, Text, View } from 'react-native';
import type { RegionPack, UnitSystem } from '@anchor-buddy/domain';
import { Button, Card, Icon, Notice } from '../components/ui';
import Sheet from '../components/Sheet';
import { colors as c, type as typography } from '../theme';
import { depth, money, localTime } from '../lib/units';
import type { MapArea } from '../lib/worldMapsCore';
import type { RegionalData } from '../lib/regionalDataCore';
import type { SavedSearch } from '../lib/workspace';
import type { DeletionOutcome, EvidenceCleanup } from '../lib/deletion';
import { knownStorageUsage, storageBytes } from '../lib/storageUsage';
import type { PlanRecord, PlanRead } from '../lib/savedPlans';
export default function SavedScreen({
  searches,
  plans,
  planIssue,
  onOpenPlan,
  onDeletePlan,
  onRetryPlans,
  pack,
  savedAt,
  units,
  onOpen,
  onDelete,
  onMap,
  onSettings,
  onSearch,
  mapAreas,
  dataRegions,
  pendingEvidence,
  onSetRetention,
  onDownloadMap,
  onOpenMap,
  onResumeMap,
  onRefreshMap,
  onDeleteMap,
  onOpenRegion,
  onDeleteRegion,
}: {
  searches: SavedSearch[];
  plans: PlanRecord[];
  planIssue?: PlanRead['issue'];
  onOpenPlan: (plan: PlanRecord) => void;
  onDeletePlan: (id: string) => Promise<DeletionOutcome>;
  onRetryPlans: () => void;
  pack: RegionPack;
  savedAt: string | null;
  units: UnitSystem;
  onOpen: (s: SavedSearch) => void;
  onDelete: (id: string) => Promise<DeletionOutcome>;
  onMap: () => void;
  onSettings: () => void;
  onSearch: () => void;
  mapAreas: MapArea[];
  dataRegions: RegionalData[];
  pendingEvidence: EvidenceCleanup[];
  onSetRetention: (id: string, retention: 'automatic' | 'retained') => Promise<void>;
  onDownloadMap: () => void;
  onOpenMap: (area: MapArea) => void;
  onResumeMap: (area: MapArea) => void;
  onRefreshMap?: (area: MapArea) => void;
  onDeleteMap: (id: string) => Promise<DeletionOutcome>;
  onOpenRegion: (data: RegionalData) => void;
  onDeleteRegion: (id: string, name: string) => Promise<DeletionOutcome>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [capacity, setCapacity] = useState<{ usage: number; quota: number } | null>(null);
  const [retentionBusy, setRetentionBusy] = useState<string | null>(null);
  const [retentionError, setRetentionError] = useState<{ id: string; message: string } | null>(
    null,
  );
  const usage = knownStorageUsage(mapAreas, dataRegions);
  useEffect(() => {
    let mounted = true;
    const storage = Platform.OS === 'web' ? globalThis.navigator?.storage : undefined;
    const estimate = storage?.estimate as (() => Promise<StorageEstimate>) | undefined;
    if (typeof estimate === 'function')
      void estimate
        .call(storage)
        .then((result) => {
          if (
            mounted &&
            typeof result.usage === 'number' &&
            typeof result.quota === 'number' &&
            Number.isFinite(result.usage) &&
            Number.isFinite(result.quota)
          )
            setCapacity({ usage: result.usage, quota: result.quota });
        })
        .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  const changeRetention = async (id: string, value: 'automatic' | 'retained') => {
    if (retentionBusy) return;
    setRetentionBusy(id);
    setRetentionError(null);
    try {
      await onSetRetention(id, value);
    } catch (error) {
      setRetentionError({
        id,
        message: 'Could not save this choice. Manage storage and retry: ' + String(error),
      });
    } finally {
      setRetentionBusy(null);
    }
  };
  const [removal, setRemoval] = useState<{
    kind: 'search' | 'plan' | 'map' | 'data';
    id: string;
    name: string;
  } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removalError, setRemovalError] = useState('');
  const removalLock = useRef(false);
  const headingRef = useRef<React.ComponentRef<typeof Text>>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
    },
    [],
  );
  const confirmRemoval = async () => {
    if (!removal || removalLock.current) return;
    removalLock.current = true;
    setRemoving(true);
    setRemovalError('');
    try {
      const outcome =
        removal.kind === 'search'
          ? await onDelete(removal.id)
          : removal.kind === 'plan'
            ? await onDeletePlan(removal.id)
            : removal.kind === 'map'
              ? await onDeleteMap(removal.id)
              : await onDeleteRegion(removal.id, removal.name);
      if (outcome.status === 'complete') {
        setRemoval(null);
        focusTimer.current = setTimeout(() => {
          if (Platform.OS === 'web') {
            const heading = document.getElementById('saved-library-heading');
            if (heading) {
              heading.tabIndex = -1;
              heading.focus();
            }
          } else if (headingRef.current)
            AccessibilityInfo.sendAccessibilityEvent(headingRef.current, 'focus');
        }, 400);
      } else setRemovalError(outcome.message);
    } catch (error) {
      setRemovalError('Removal could not be completed. ' + String(error));
    } finally {
      removalLock.current = false;
      setRemoving(false);
    }
  };
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        gap: 24,
        maxWidth: 980,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <View style={{ gap: 8 }}>
        <Text
          ref={headingRef}
          nativeID="saved-library-heading"
          accessibilityRole="header"
          style={typography.title}
        >
          Saved
        </Text>
        <Text style={{ fontSize: 13, lineHeight: 20, color: c.muted }}>
          Search results, saved map areas and cached evidence on this device.
        </Text>
        <Button onPress={onDownloadMap} icon="download">
          Download map area
        </Button>
      </View>
      <Card>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '600', color: c.ink }}>
          Storage on this device
        </Text>
        <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
          Map resources: {storageBytes(usage.mapBytes)} last reported · cached evidence:
          approximately {storageBytes(usage.evidenceBytes)} serialized. These estimates exclude
          storage overhead and other data.
        </Text>
        <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
          {capacity
            ? `Browser origin reports ${storageBytes(capacity.usage)} used of an estimated ${storageBytes(capacity.quota)} capacity.`
            : 'Device or browser capacity is unknown.'}{' '}
          Available capacity can change and is not guaranteed.
        </Text>
      </Card>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '600', color: c.ink }}>
          Anchor plan drafts · {plans.length}
        </Text>
        {planIssue ? (
          <>
            <Notice tone="warning">{planIssue.message}</Notice>
            <Button secondary small onPress={onRetryPlans}>
              Retry saved plans
            </Button>
          </>
        ) : null}
        {!plans.length && !planIssue ? (
          <Card>
            <Text style={{ color: c.ink }}>No saved plan drafts</Text>
            <Text style={{ color: c.muted }}>
              Open an assessed position in the planner, then save its proposed inputs.
            </Text>
            <Button secondary small onPress={onSearch}>
              Find a position
            </Button>
          </Card>
        ) : null}
        {plans.map((record) => (
          <Card key={record.id}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>
              {record.payload.name}
            </Text>
            <Text style={{ fontSize: 12, color: c.muted }}>
              Saved {localTime(record.savedAt, 'UTC')} {new Date(record.savedAt).getUTCFullYear()} ·{' '}
              {record.payload.selectedPosition[1]}, {record.payload.selectedPosition[0]} · depth
              alternative {record.payload.depthAllowancePercent}%
            </Text>
            <Text style={{ fontSize: 12, color: c.muted }}>
              {Date.parse(record.payload.search.departure) <= Date.now()
                ? 'Stay ended · date review required'
                : 'Proposed stay · reassessment required'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button small onPress={() => onOpenPlan(record)}>
                Open & reassess
              </Button>
              <Button
                small
                secondary
                icon="trash-2"
                onPress={() => {
                  setRemovalError('');
                  setRemoval({ kind: 'plan', id: record.id, name: record.payload.name });
                }}
              >
                Delete draft
              </Button>
            </View>
          </Card>
        ))}
      </View>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '600', color: c.ink }}>
          Search results · {searches.length}
        </Text>
        {!searches.length ? (
          <Card>
            <Icon name="bookmark" size={24} color={c.blue} />
            <Text style={{ fontSize: 14, color: c.ink }}>No saved searches</Text>
            <Text style={{ fontSize: 13, lineHeight: 20, color: c.muted }}>
              Run a search in Explore, then choose Save results. Closing a search keeps its saved
              copy here.
            </Text>
            <Button onPress={onSearch} icon="search">
              New search
            </Button>
          </Card>
        ) : (
          searches.map((saved) => (
            <Card key={saved.id}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Icon name="bookmark" color={c.blue} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>
                    {saved.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.muted }}>
                    {localTime(saved.search.arrival, 'UTC')}{' '}
                    {new Date(saved.search.arrival).getUTCFullYear()} –{' '}
                    {localTime(saved.search.departure, 'UTC')}{' '}
                    {new Date(saved.search.departure).getUTCFullYear()}
                    {Date.parse(saved.search.departure) < Date.now() ? ' · Stay ended' : ''}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.muted }}>
                    {saved.requiresReassessment
                      ? 'Reassessment required'
                      : `${saved.results.length} results`}{' '}
                    · {saved.vesselName} · Saved {localTime(saved.savedAt, 'UTC')}{' '}
                    {new Date(saved.savedAt).getUTCFullYear()}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button small onPress={() => onOpen(saved)} icon="refresh-cw">
                  Open & reassess
                </Button>
                <Button
                  small
                  secondary
                  onPress={() => setExpanded(expanded === saved.id ? null : saved.id)}
                >
                  {expanded === saved.id ? 'Hide snapshot' : 'View saved snapshot'}
                </Button>
                <Button
                  small
                  secondary
                  onPress={() => {
                    setRemovalError('');
                    setRemoval({ kind: 'search', id: saved.id, name: saved.name });
                  }}
                  icon="trash-2"
                >
                  Delete
                </Button>
              </View>
              {expanded === saved.id ? (
                <View style={{ gap: 12 }}>
                  <Notice>
                    {saved.requiresReassessment
                      ? 'This older snapshot has no verified source provenance. Its result values are hidden; open and reassess to load current evidence.'
                      : `Saved evidence from ${localTime(saved.savedAt)}. These are historical results; open and reassess with the current vessel and available data before planning.`}
                  </Notice>
                  {saved.results.map((result) => (
                    <View
                      key={result.id}
                      style={{
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderColor: c.line,
                        gap: 5,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: c.ink }}>
                        {result.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: c.muted }}>
                        {result.status.replaceAll('_', ' ')} · {depth(result.depthM, units)} ·{' '}
                        {money(result.total, result.currency)}
                      </Text>
                    </View>
                  ))}
                  <Text style={{ fontSize: 11, color: c.muted }}>
                    Evidence version: {saved.packVersion}
                  </Text>
                </View>
              ) : null}
            </Card>
          ))
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '600', color: c.ink }}>
          Saved maps · {mapAreas.length}
        </Text>
        <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
          Display maps contain geographic context. Nautical analysis and time-limited weather are
          saved separately below.
        </Text>
        {!mapAreas.length ? (
          <Card>
            <Text style={{ fontSize: 14, color: c.ink }}>No saved map areas</Text>
            <Text style={{ fontSize: 13, lineHeight: 20, color: c.muted }}>
              Choose an area and detail level to download its basemap for offline use.
            </Text>
            <Button secondary onPress={onDownloadMap} icon="map">
              Choose map area
            </Button>
          </Card>
        ) : (
          mapAreas.map((area) => (
            <Card key={area.id}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Icon name="map" color={c.blue} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>{area.name}</Text>
                  <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
                    {area.cleanupPending
                      ? 'Removal incomplete · unavailable'
                      : area.status === 'complete'
                        ? 'Complete · available offline'
                        : typeof area.usableZoom === 'number'
                          ? 'Partial coverage · available offline'
                          : 'Preparing offline coverage'}{' '}
                    · {(area.bytes / 1_000_000).toFixed(1)} MB
                  </Text>
                  <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
                    {area.completedTiles.toLocaleString()} / {area.tileCount.toLocaleString()} map
                    tiles · Detail level {area.maxZoom}
                  </Text>
                  {!area.cleanupPending &&
                  area.status === 'partial' &&
                  typeof area.usableZoom === 'number' ? (
                    <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
                      Ready through zoom {area.usableZoom} of {area.maxZoom}. Finer detail may have
                      gaps.
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
                    Updated {localTime(area.updatedAt)}
                    {Date.parse(area.refreshAfter) < Date.now() ? ' · Refresh suggested' : ''}
                  </Text>
                </View>
              </View>
              {area.status === 'partial' ? (
                <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
                  {area.error || 'Some map resources are missing. Resume to complete this area.'}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {!area.cleanupPending && typeof area.usableZoom === 'number' ? (
                  <Button small onPress={() => onOpenMap(area)} icon="map">
                    {area.status === 'complete' ? 'Open map' : 'Open partial map'}
                  </Button>
                ) : null}
                {area.status === 'partial' && !area.cleanupPending ? (
                  <Button small secondary onPress={() => onResumeMap(area)} icon="download">
                    Resume download
                  </Button>
                ) : null}
                {!area.cleanupPending && area.status === 'complete' && onRefreshMap ? (
                  <Button small secondary onPress={() => onRefreshMap(area)} icon="refresh-cw">
                    Download updated copy
                  </Button>
                ) : null}
                <Button
                  small
                  secondary
                  onPress={() => {
                    setRemovalError('');
                    setRemoval({ kind: 'map', id: area.id, name: area.name });
                  }}
                  icon="trash-2"
                >
                  Delete map
                </Button>
              </View>
            </Card>
          ))
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '600', color: c.ink }}>
          Cached regional data · {dataRegions.length + pendingEvidence.length}
        </Text>
        {!dataRegions.length && !pendingEvidence.length ? (
          <Card>
            <Text style={{ fontSize: 14, color: c.ink }}>No cached regional data</Text>
            <Text style={{ fontSize: 13, lineHeight: 20, color: c.muted }}>
              Online searches cache available places and weather. Source coverage and expiry dates
              are retained for offline use.
            </Text>
            <Button secondary small onPress={onSearch} icon="search">
              Search an area
            </Button>
          </Card>
        ) : (
          <>
            {pendingEvidence.map((item) => (
              <Card key={`pending-${item.id}`}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>{item.name}</Text>
                <Notice tone="warning">
                  Removal incomplete. This data is unavailable until cleanup finishes.
                </Notice>
                <Button
                  secondary
                  small
                  onPress={() => {
                    setRemovalError('');
                    setRemoval({ kind: 'data', id: item.id, name: item.name });
                  }}
                >
                  Retry deletion
                </Button>
              </Card>
            ))}
            {dataRegions.map((data) => {
              const expired = Date.parse(data.pack.validUntil) < Date.now();
              const weatherEnd = data.pack.weather.length
                ? new Date(
                    Math.max(
                      ...data.pack.weather.map((interval) => Date.parse(interval.validUntil)),
                    ),
                  ).toISOString()
                : null;
              return (
                <Card key={data.pack.id}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Icon name="database" color={c.blue} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>
                        {data.pack.name}
                      </Text>
                      <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
                        {data.pack.places.length} places ·{' '}
                        {data.pack.weather.length
                          ? `${data.pack.weather.length} forecast intervals`
                          : 'Weather unavailable'}
                        {data.partial ? ' · Partial source coverage' : ''}
                      </Text>
                      <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
                        {data.retention === 'retained'
                          ? 'Retained by you · protected from automatic cleanup'
                          : data.retention === 'automatic'
                            ? 'Automatically cached · may be removed as space is needed'
                            : 'Earlier cached data · ownership unknown, protected until you choose'}
                      </Text>
                      <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
                        {data.savedAt
                          ? `Saved ${localTime(data.savedAt)}`
                          : `Retrieved ${localTime(data.pack.generatedAt)}`}
                      </Text>
                      <Text
                        style={{ fontSize: 12, lineHeight: 19, color: expired ? c.red : c.muted }}
                      >
                        {expired ? 'Evidence expired' : 'Evidence valid until'}{' '}
                        {localTime(data.pack.validUntil)}
                      </Text>
                      {weatherEnd ? (
                        <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
                          Forecast ends {localTime(weatherEnd)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {retentionError?.id === data.pack.id ? (
                    <Notice tone="warning">{retentionError.message}</Notice>
                  ) : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {data.retention !== 'retained' ? (
                      <Button
                        small
                        secondary
                        disabled={!!retentionBusy}
                        onPress={() => void changeRetention(data.pack.id, 'retained')}
                      >
                        {retentionBusy === data.pack.id ? 'Saving…' : 'Keep for offline use'}
                      </Button>
                    ) : null}
                    {data.retention !== 'automatic' ? (
                      <Button
                        small
                        secondary
                        disabled={!!retentionBusy}
                        onPress={() => void changeRetention(data.pack.id, 'automatic')}
                      >
                        Allow automatic cleanup
                      </Button>
                    ) : null}
                    <Button small onPress={() => onOpenRegion(data)} icon="map">
                      Open area & data
                    </Button>
                    <Button
                      small
                      secondary
                      onPress={() => (
                        setRemovalError(''),
                        setRemoval({ kind: 'data', id: data.pack.id, name: data.pack.name })
                      )}
                      icon="trash-2"
                    >
                      Delete cached data
                    </Button>
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </View>
      {savedAt && !dataRegions.some((data) => data.pack.id === pack.id) ? (
        <View style={{ gap: 12 }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: 17, fontWeight: '600', color: c.ink }}
          >
            Regional analysis snapshot
          </Text>
          <Card>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Icon name="layers" color={c.blue} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>{pack.name}</Text>
                <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
                  {pack.validation.status === 'reviewed'
                    ? 'Reviewed regional analysis'
                    : 'Unreviewed regional analysis'}{' '}
                  · Saved {localTime(savedAt)}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    lineHeight: 19,
                    color: Date.parse(pack.validUntil) < Date.now() ? c.red : c.muted,
                  }}
                >
                  {Date.parse(pack.validUntil) < Date.now()
                    ? 'Evidence expired'
                    : 'Evidence valid until'}{' '}
                  {localTime(pack.validUntil)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Button small onPress={onMap} icon="map">
                Open saved analysis
              </Button>
              <Button small secondary onPress={onSettings} icon="settings">
                Manage regional packs
              </Button>
            </View>
          </Card>
        </View>
      ) : null}
      {removal ? (
        <Sheet
          title={`Delete ${removal.kind === 'search' ? 'saved search' : removal.kind === 'plan' ? 'plan draft' : removal.kind === 'map' ? 'saved map' : 'cached data'}?`}
          subtitle={removal.name}
          pending={removing}
          onClose={() => {
            if (!removalLock.current) setRemoval(null);
          }}
        >
          <Text style={{ fontSize: 13, lineHeight: 20, color: c.ink }}>
            {removal.kind === 'search'
              ? 'This removes the saved search and its historical results. Downloaded maps and regional evidence are kept.'
              : removal.kind === 'plan'
                ? 'This removes only the named plan draft. Searches, maps and evidence are kept.'
                : removal.kind === 'map'
                  ? 'This removes the downloaded basemap from this device. You will need a connection to download it again. Saved searches and regional evidence are kept.'
                  : 'This removes the cached regional evidence from this device. Saved search snapshots and downloaded basemaps are kept.'}
          </Text>
          {removalError ? <Notice tone="warning">{removalError}</Notice> : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button secondary disabled={removing} onPress={() => setRemoval(null)}>
                Keep it
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button icon="trash-2" disabled={removing} onPress={() => void confirmRemoval()}>
                {removing
                  ? 'Deleting…'
                  : `Delete ${removal.kind === 'search' ? 'search' : removal.kind === 'plan' ? 'draft' : removal.kind === 'map' ? 'map' : 'data'}`}
              </Button>
            </View>
          </View>
        </Sheet>
      ) : null}
    </ScrollView>
  );
}
