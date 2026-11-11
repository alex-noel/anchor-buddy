import React, { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Watch from '@anchor-buddy/anchor-watch';
import type { RegionPack, UnitSystem, VesselProfile } from '@anchor-buddy/domain';
import { Button, Card, Chip, Eyebrow, Field, Icon, Notice } from '../components/ui';
import { colors as c } from '../theme';
import { depth, localTime } from '../lib/units';
import { setLocal } from '../lib/storage';
import { providerBase } from '../lib/regionalDataCore';
import type { Connectivity } from '../lib/connectivityCore';
import { getAPIBase } from '../lib/regionalData';
import { installPack, validateManifest, validSegment } from '../lib/packInstall';
import { beginPackStage, downloadOfflineChart, loadInstalledChartStyle } from '../lib/packFiles';
export interface MapLayerDefaults {
  depth: boolean;
  bedding: boolean;
  marks: boolean;
}

function SettingRow({
  title,
  detail,
  action,
  icon,
}: {
  title: string;
  detail: string;
  action: () => void;
  icon: React.ComponentProps<typeof Icon>['name'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={action}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 10,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: c.mint,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Icon name={icon} color={c.green} size={19} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>{title}</Text>
        <Text style={{ fontSize: 12, lineHeight: 18, color: c.muted }}>{detail}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={c.muted} />
    </Pressable>
  );
}

function LayerRow({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 6 }}>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{label}</Text>
        <Text style={{ fontSize: 12, lineHeight: 18, color: c.muted }}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.green }}
      />
    </View>
  );
}

export default function SettingsScreen({
  pack,
  units,
  setUnits,
  offline,
  setOffline,
  savedAt,
  onSave,
  onPack,
  vessel,
  onEditVessel,
  onEditDefaults,
  onTour,
  onSetup,
  layers,
  setLayers,
  onDownloadMap,
  onViewData,
  connectivity = 'unknown',
}: {
  pack: RegionPack;
  units: UnitSystem;
  setUnits: (u: UnitSystem) => void;
  offline: boolean;
  setOffline: (b: boolean) => void;
  savedAt: string | null;
  onSave: () => Promise<void>;
  onPack: (p: RegionPack) => void;
  vessel?: VesselProfile;
  onEditVessel?: () => void;
  onEditDefaults?: () => void;
  onTour?: () => void;
  onSetup?: () => void;
  language?: 'en';
  setLanguage?: (language: 'en') => void;
  layers?: MapLayerDefaults;
  setLayers?: (layers: MapLayerDefaults) => void;
  onDownloadMap?: () => void;
  onViewData?: () => void;
  connectivity?: Connectivity;
}) {
  const { width } = useWindowDimensions();
  const [showSources, setShowSources] = useState(false);
  const [showProvider, setShowProvider] = useState(false);
  const [api, setApi] = useState(
    process.env.EXPO_PUBLIC_API_URL ||
      (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001'),
  );
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [regions, setRegions] = useState<
    { id: string; version?: string; label: string; releaseStatus: string; synthetic: boolean }[]
  >([]);
  const [catalogueLoaded, setCatalogueLoaded] = useState(false);
  const hasEvidence = pack.sources.some((source) => source.synthetic === false);
  const networkUnavailable = offline || connectivity === 'offline';
  const [chartAvailable, setChartAvailable] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  useEffect(() => {
    let active = true;
    void getAPIBase()
      .then((address) => {
        if (active) setApi(address);
      })
      .catch(() => {
        if (active)
          setMessage(
            'The saved API address could not be restored. The default address is available.',
          );
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    void loadInstalledChartStyle(pack)
      .then((chart) => {
        if (current) {
          setChartAvailable(!!chart);
          setChartReady(!!chart?.offlineReady);
        }
      })
      .catch((error) => {
        if (current) {
          setChartAvailable(false);
          setChartReady(false);
          setMessage('Stored chart unavailable: ' + String(error));
        }
      });
    return () => {
      current = false;
    };
  }, [pack]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const base = () => providerBase(api);
  const fetchChecked = async (url: string, timeout: number) => {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeout),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Provider returned HTTP ' + response.status + '.');
      return response;
    } catch (error) {
      throw new Error(
        (error instanceof Error ? error.message : 'Provider could not be reached.') +
          ' Check the API address and network. Your previous regional pack is retained.',
      );
    }
  };
  const assertReplacementAllowed = async () => {
    const status = await Watch.getStatus();
    if (
      status.serviceRunning ||
      ['arming', 'monitoring', 'position_uncertain', 'alarm'].includes(status.state)
    )
      throw new Error('Stop the current anchor watch before replacing its regional evidence.');
  };
  const load = async () => {
    const address = base();
    const response = await fetchChecked(address + '/v1/regions', 15000);
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== 'object' ||
      !Array.isArray((data as { regions?: unknown }).regions)
    )
      throw new Error('The provider returned an invalid regional catalogue.');
    const items = (data as { regions: unknown[] }).regions;
    if (
      items.length > 200 ||
      items.some(
        (item) =>
          !item ||
          typeof item !== 'object' ||
          !validSegment((item as { id?: unknown }).id) ||
          typeof (item as { label?: unknown }).label !== 'string' ||
          typeof (item as { releaseStatus?: unknown }).releaseStatus !== 'string' ||
          typeof (item as { synthetic?: unknown }).synthetic !== 'boolean' ||
          ((item as { version?: unknown }).version !== undefined &&
            !validSegment((item as { version?: unknown }).version)),
      )
    )
      throw new Error('The provider returned invalid region records.');
    const realRegions = (items as typeof regions).filter((item) => item.synthetic === false);
    setRegions(realRegions);
    setCatalogueLoaded(true);
    try {
      await setLocal('provider-api-url', address);
      setApi(address);
      setMessage(
        realRegions.length
          ? 'Connected and API address saved. Only reviewed regions can be installed.'
          : 'Connected and API address saved. Live searches are available; this server has no reviewed regional packs to download.',
      );
    } catch {
      setMessage('Catalogue loaded, but the API address could not be saved on this device.');
    }
  };
  const download = async (id: string, version?: string) => {
    await assertReplacementAllowed();
    const root = base() + '/v1/regions/' + encodeURIComponent(id);
    const response = await fetchChecked(
      root + '/manifest' + (version ? '?version=' + encodeURIComponent(version) : ''),
      15000,
    );
    const manifest: unknown = await response.json();
    validateManifest(manifest, { regionId: id, version });
    const stage = await beginPackStage(Crypto.randomUUID());
    const next = await installPack(
      manifest,
      {
        fetchAsset: async (name) => {
          const r = await fetchChecked(
            root +
              '/' +
              encodeURIComponent(manifest.version) +
              '/assets/' +
              encodeURIComponent(name),
            120000,
          );
          const expected = manifest.assets.find((asset) => asset.path === name)!;
          const reported = r.headers.get('content-length');
          if (reported && Number(reported) !== expected.bytes)
            throw new Error('Asset size differs from its manifest. Previous pack retained.');
          return new Uint8Array(await r.arrayBuffer());
        },
        hash: async (bytes) =>
          Array.from(
            new Uint8Array(
              await Crypto.digest(
                Crypto.CryptoDigestAlgorithm.SHA256,
                new Uint8Array(bytes).buffer,
              ),
            ),
          )
            .map((x) => x.toString(16).padStart(2, '0'))
            .join(''),
        stage: stage.stage,
        rollback: stage.rollback,
        assertReplacementAllowed,
        progress: (done, total) =>
          setMessage(
            'Verified ' +
              done +
              ' of ' +
              total +
              ' regional assets. Previous pack remains active until completion.',
          ),
        commit: async (p, m) => {
          const assetKey = await stage.finalize();
          await assertReplacementAllowed();
          await setLocal('active-region', {
            pack: p,
            manifest: m,
            assetKey,
            savedAt: new Date().toISOString(),
          });
        },
      },
      { regionId: id, version },
    );
    onPack(next);
    setMessage(
      'Verified regional analysis installed. ' +
        (Date.parse(next.validUntil) < Date.now()
          ? 'Its forecast evidence is expired; reconnect for updated evidence.'
          : 'Forecast validity still applies offline.') +
        (manifest.offlineChart
          ? ' Chart tiles can now be downloaded separately.'
          : ' Reviewed chart tiles are not included; worldwide basemaps can be downloaded separately.'),
    );
  };
  return (
    <ScrollView
      contentContainerStyle={{
        padding: width < 700 ? 16 : 24,
        paddingBottom: 32,
        gap: 20,
        maxWidth: 900,
        width: '100%',
        alignSelf: 'center',
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '600', color: c.ink }}>
        Settings
      </Text>
      <Card>
        <Eyebrow>BOAT & SEARCH</Eyebrow>
        {onEditVessel ? (
          <SettingRow
            title={vessel?.name || 'Configure your vessel'}
            detail={
              vessel?.name && vessel.lengthM > 0
                ? `${depth(vessel.lengthM, units)} length · ${depth(vessel.loadedDraftM, units)} draft · ${depth(vessel.anchor.usableLengthM, units)} rode`
                : 'Dimensions, anchor model and equipment limits'
            }
            icon="anchor"
            action={onEditVessel}
          />
        ) : null}
        {onEditDefaults ? (
          <SettingRow
            title="Search defaults"
            detail="Depth, seabed, search area and operating limits"
            icon="sliders"
            action={onEditDefaults}
          />
        ) : null}
      </Card>
      <Card>
        <Eyebrow>DISPLAY</Eyebrow>
        <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>Units</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {(['nautical', 'metric', 'imperial'] as const).map((u) => (
            <Chip key={u} selected={units === u} onPress={() => setUnits(u)}>
              {u[0].toUpperCase() + u.slice(1)}
            </Chip>
          ))}
        </View>
        <Text style={{ fontSize: 12, color: c.muted, lineHeight: 18 }}>
          {units === 'nautical'
            ? 'Distances in nautical miles, depths in metres, speed in knots.'
            : units === 'metric'
              ? 'Distances in kilometres, depths in metres, speed in km/h.'
              : 'Distances in miles, depths in feet, speed in mph.'}{' '}
          Configuration fields show their own units.
        </Text>
        <View style={{ gap: 5 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>Language · English</Text>
          <Text style={{ fontSize: 12, color: c.muted, lineHeight: 18 }}>
            More languages will appear here when translations are available.
          </Text>
        </View>
      </Card>
      {layers && setLayers ? (
        <Card>
          <Eyebrow>MAP LAYERS</Eyebrow>
          <LayerRow
            label="Water depth"
            detail="Charted depth bounds where available, plus GEBCO global bathymetry as online display context. GEBCO does not establish clearance."
            value={layers.depth}
            onChange={(value) => setLayers({ ...layers, depth: value })}
          />
          <LayerRow
            label="Seabed"
            detail="Reviewed seabed evidence where available, plus online EMODnet European substrate context. Context does not establish anchor holding or habitat permission."
            value={layers.bedding}
            onChange={(value) => setLayers({ ...layers, bedding: value })}
          />
          <LayerRow
            label="Marks"
            detail="Available charted marks plus OpenSeaMap community seamarks online. Display marks do not establish complete hazard coverage."
            value={layers.marks}
            onChange={(value) => setLayers({ ...layers, marks: value })}
          />
          <Text style={{ fontSize: 12, color: c.muted, lineHeight: 18 }}>
            Layers change the map display. All available evidence is still included in assessments.
          </Text>
        </Card>
      ) : null}
      <Card>
        <Eyebrow>OFFLINE MAPS & DATA</Eyebrow>
        {onDownloadMap ? (
          <Button icon="download" onPress={onDownloadMap}>
            Download a map area
          </Button>
        ) : null}
        <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>
          Save worldwide basemap areas for offline display. Reviewed nautical analysis and cached
          places/weather are stored separately; forecasts keep their original expiry dates.
        </Text>
        {onViewData ? (
          <Button secondary small icon="database" onPress={onViewData}>
            View current sources & coverage
          </Button>
        ) : null}
        {hasEvidence ? (
          <>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: c.ink }}>{pack.name}</Text>
                <Text style={{ fontSize: 12, color: c.muted }}>Version {pack.version}</Text>
              </View>
              <Icon name="download-cloud" color={c.green} size={24} />
            </View>
            <Text style={{ fontSize: 12, color: c.muted, lineHeight: 20 }}>
              {Date.parse(pack.validUntil) < Date.now()
                ? 'Evidence expired'
                : 'Evidence valid until'}{' '}
              {localTime(pack.validUntil)}
              {'\n'}
              {savedAt ? 'Saved ' + localTime(savedAt) : 'Not saved on this device'}
            </Text>
            {!savedAt ? (
              <Button
                disabled={busy}
                secondary
                icon="download"
                onPress={() =>
                  run(async () => {
                    await onSave();
                    setMessage(
                      'Analysis snapshot saved with its original evidence dates. Basemap areas can be downloaded separately.',
                    );
                  })
                }
              >
                Save evidence offline
              </Button>
            ) : (
              <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>
                Available offline. Saving does not extend forecast or source validity.
              </Text>
            )}
          </>
        ) : (
          <Notice>
            Search an area or open saved regional data to see its sources and save evidence offline.
          </Notice>
        )}
        {chartAvailable ? (
          <View style={{ gap: 10 }}>
            <Button
              secondary
              disabled={busy || networkUnavailable || Platform.OS === 'web'}
              icon="map"
              onPress={() =>
                run(async () => {
                  const result = await downloadOfflineChart(pack, setMessage);
                  setChartReady(result.complete);
                  setMessage(
                    `${result.resources} chart resources downloaded. Analysis geometry is stored separately.`,
                  );
                })
              }
            >
              {chartReady ? 'Verify reviewed chart tiles' : 'Download reviewed chart tiles'}
            </Button>
            {Platform.OS === 'web' ? (
              <Text style={{ fontSize: 12, color: c.muted }}>
                Reviewed chart-provider downloads require the iOS or Android app. Worldwide basemap
                downloads are also available in the browser.
              </Text>
            ) : null}
          </View>
        ) : hasEvidence ? (
          <Text style={{ fontSize: 12, color: c.muted, lineHeight: 18 }}>
            No reviewed chart tiles are bundled for this region. You can still download its
            worldwide basemap above; it does not provide nautical clearance evidence.
          </Text>
        ) : null}
        <LayerRow
          label="Offline planning"
          detail="Prefer downloaded data even when connected; forecasts keep their expiry dates"
          value={offline}
          onChange={setOffline}
        />
        <Text style={{ fontSize: 12, lineHeight: 18, color: c.muted }}>
          {connectivity === 'offline'
            ? 'No network connection. Downloaded areas are used automatically.'
            : 'Maps use downloaded areas automatically when the connection drops.'}{' '}
          Active live searches refresh after reconnection; reviewed packs must be updated
          separately.
        </Text>
      </Card>
      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Data connection"
          accessibilityState={{ expanded: showProvider }}
          aria-expanded={showProvider}
          onPress={() => setShowProvider(!showProvider)}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>Data connection</Text>
          <Icon name={showProvider ? 'chevron-up' : 'chevron-down'} size={18} />
        </Pressable>
        {showProvider ? (
          <View style={{ gap: 16 }}>
            <Field
              label="Regional API address"
              disabled={busy}
              value={api}
              onChange={(value) => {
                setApi(value);
                setRegions([]);
                setCatalogueLoaded(false);
                setMessage('');
              }}
              help="Use the Anchor Buddy server address. Provider API keys are managed on the server."
            />
            <Button
              secondary
              disabled={busy || networkUnavailable}
              onPress={() => run(load)}
              icon="refresh-cw"
            >
              {busy ? 'Connecting…' : 'Connect & check regions'}
            </Button>
            {networkUnavailable ? (
              <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>
                Turn off Offline planning and reconnect to check the server or download a region.
              </Text>
            ) : null}
            {catalogueLoaded && !regions.length ? (
              <Notice>
                No reviewed regional packs are published on this server yet. Use Explore for live
                places and available forecasts.
              </Notice>
            ) : null}
            {regions.map((r) => (
              <View
                key={r.id}
                style={{ gap: 10, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 16 }}
              >
                <Text style={{ fontSize: 13, color: c.ink }}>
                  {r.label} · {r.releaseStatus}
                </Text>
                <Button
                  small
                  secondary
                  disabled={busy || networkUnavailable || r.releaseStatus !== 'reviewed'}
                  onPress={() => run(() => download(r.id, r.version))}
                >
                  Download reviewed region
                </Button>
                {r.releaseStatus !== 'reviewed' ? (
                  <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>
                    This region cannot be installed until its nautical evidence has been reviewed.
                  </Text>
                ) : null}
              </View>
            ))}
            <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
              The API supplies global live places and available weather, with source status and
              coverage shown per area. Reviewed regional packs separately supply supported nautical
              evidence, restrictions and tariffs; only reviewed packs can be installed.
            </Text>
          </View>
        ) : null}
      </Card>
      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Source details"
          accessibilityState={{ expanded: showSources }}
          aria-expanded={showSources}
          onPress={() => setShowSources(!showSources)}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>Source details</Text>
          <Icon name={showSources ? 'chevron-up' : 'chevron-down'} size={18} />
        </Pressable>
        {showSources ? (
          <View style={{ gap: 16 }}>
            <Notice>
              {hasEvidence
                ? pack.validation.notice
                : 'No regional evidence is loaded. Search an area or open saved data to inspect sources.'}
            </Notice>
            {pack.sources.map((source) => (
              <View key={source.id} style={{ gap: 6 }}>
                <Pressable accessibilityRole="link" onPress={() => Linking.openURL(source.url)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: c.green }}>
                    {source.name} ↗
                  </Text>
                </Pressable>
                <Text style={{ fontSize: 12, color: c.muted, lineHeight: 18 }}>
                  {source.attribution} · {source.license}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
      <Card>
        <Eyebrow>HELP</Eyebrow>
        {onTour ? (
          <SettingRow
            title="App tour"
            detail="Search, compare, plan and monitor a stay"
            icon="compass"
            action={onTour}
          />
        ) : null}
        {onSetup ? (
          <SettingRow
            title="Review initial setup"
            detail="Boat profile, units and search defaults"
            icon="check-circle"
            action={onSetup}
          />
        ) : null}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>
            AI assistant · unavailable
          </Text>
          <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
            Awaiting approved ChatGPT partner access and mobile sign-in. Search and monitoring work
            independently.
          </Text>
        </View>
      </Card>
      {message ? <Notice>{message}</Notice> : null}
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
          Anchor Buddy 0.1 · Profiles and watch logs are stored on this device.
        </Text>
      </View>
    </ScrollView>
  );
}
