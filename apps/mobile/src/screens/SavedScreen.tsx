import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { RegionPack, UnitSystem } from '@anchor-buddy/domain';
import { Button, Card, Icon, Notice } from '../components/ui';
import { colors as c, type as typography } from '../theme';
import { depth, money } from '../lib/units';
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
          Search snapshots and downloaded regional maps stay on this device.
        </Text>
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
                    {new Date(saved.savedAt).toLocaleDateString()}
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
                    Saved evidence from {new Date(saved.savedAt).toLocaleString()}. These are
                    historical results; open and reassess with the current vessel and available data
                    before planning.
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
          Downloaded maps & analysis
        </Text>
        <Card>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Icon name="map" color={c.blue} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>
                {savedAt ? pack.name : 'No downloaded area'}
              </Text>
              <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
                {savedAt
                  ? 'Analysis saved ' +
                    new Date(savedAt).toLocaleString() +
                    '. Chart download status is available in Settings.'
                  : 'Save regional analysis or download an approved map from Settings.'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {savedAt ? (
              <Button small onPress={onMap} icon="map">
                Open saved area
              </Button>
            ) : null}
            <Button small secondary onPress={onSettings} icon="settings">
              Manage downloads
            </Button>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
