import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { RegionPack, UnitSystem } from '@anchor-buddy/domain';
import { Button, Card, Icon, Notice } from '../components/ui';
import { colors as c, type as typography } from '../theme';
import { depth, money, localTime } from '../lib/units';
import type { MapArea } from '../lib/worldMapsCore';
import type { RegionalData } from '../lib/regionalDataCore';
import { stayLabel, type SavedSearch } from '../lib/workspace';
export default function SavedScreen({
  searches,
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
  onDownloadMap,
  onOpenMap,
  onResumeMap,
  onDeleteMap,
  onOpenRegion,
  onDeleteRegion,
}: {
  searches: SavedSearch[];
  pack: RegionPack;
  savedAt: string | null;
  units: UnitSystem;
  onOpen: (s: SavedSearch) => void;
  onDelete: (id: string) => void;
  onMap: () => void;
  onSettings: () => void;
  onSearch: () => void;
  mapAreas: MapArea[];
  dataRegions: RegionalData[];
  onDownloadMap: () => void;
  onOpenMap: (area: MapArea) => void;
  onResumeMap: (area: MapArea) => void;
  onDeleteMap: (id: string) => void;
  onOpenRegion: (data: RegionalData) => void;
  onDeleteRegion: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
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
        <Text accessibilityRole="header" style={typography.title}>
          Saved
        </Text>
        <Text style={{ fontSize: 13, lineHeight: 20, color: c.muted }}>
          Search results, saved map areas and cached evidence on this device.
        </Text>
        <Button onPress={onDownloadMap} icon="download">
          Download map area
        </Button>
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
                  <Text style={{ fontSize: 12, color: c.muted }}>{stayLabel(saved.search)}</Text>
                  <Text style={{ fontSize: 12, color: c.muted }}>
                    {saved.results.length} results · {saved.vesselName} · Saved{' '}
                    {localTime(saved.savedAt)}
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
                <Button small secondary onPress={() => onDelete(saved.id)} icon="trash-2">
                  Delete
                </Button>
              </View>
              {expanded === saved.id ? (
                <View style={{ gap: 12 }}>
                  <Notice>
                    Saved evidence from {localTime(saved.savedAt)}. These are historical results;
                    open and reassess with the current vessel and available data before planning.
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
                    {area.status === 'complete'
                      ? 'Complete · available offline'
                      : 'Partial download'}{' '}
                    · {(area.bytes / 1_000_000).toFixed(1)} MB
                  </Text>
                  <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
                    {area.completedTiles.toLocaleString()} / {area.tileCount.toLocaleString()} map
                    tiles · Detail level {area.maxZoom}
                  </Text>
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
                {area.status === 'complete' ? (
                  <Button small onPress={() => onOpenMap(area)} icon="map">
                    Open map
                  </Button>
                ) : null}
                {area.status === 'partial' ? (
                  <Button small secondary onPress={() => onResumeMap(area)} icon="download">
                    Resume download
                  </Button>
                ) : null}
                <Button small secondary onPress={() => onDeleteMap(area.id)} icon="trash-2">
                  Delete map
                </Button>
              </View>
            </Card>
          ))
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '600', color: c.ink }}>
          Cached regional data · {dataRegions.length}
        </Text>
        {!dataRegions.length ? (
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
          dataRegions.map((data) => {
            const expired = Date.parse(data.pack.validUntil) < Date.now();
            const weatherEnd = data.pack.weather.length
              ? new Date(
                  Math.max(...data.pack.weather.map((interval) => Date.parse(interval.validUntil))),
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
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <Button small onPress={() => onOpenRegion(data)} icon="map">
                    Open area & data
                  </Button>
                  <Button
                    small
                    secondary
                    onPress={() => onDeleteRegion(data.pack.id)}
                    icon="trash-2"
                  >
                    Delete cached data
                  </Button>
                </View>
              </Card>
            );
          })
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
                    : pack.validation.status === 'synthetic'
                      ? 'Optional sample analysis'
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
                  Evidence valid until {localTime(pack.validUntil)}
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
    </ScrollView>
  );
}
