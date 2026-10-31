import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Watch from '@anchor-buddy/anchor-watch';
import {
  assessCandidate,
  createDefaultSearch,
  createDemoPack,
  DEFAULT_VESSEL,
  searchRegion,
  validateRegionPack,
  validateSearch,
  validateVessel,
  type Assessment,
  type AssessmentContext,
  type Candidate,
  type Position,
  type RegionPack,
  type SearchRequest,
  type UnitSystem,
  type VesselProfile,
} from '@anchor-buddy/domain';
import Chart from './components/Chart';
import ResultCard from './components/ResultCard';
import Details from './components/Details';
import { ProfileSheet, SearchSheet } from './components/Forms';
import { Button, Card, Field, Icon, Notice, type IconName } from './components/ui';
import Sheet from './components/Sheet';
import AdvancedFiltersSheet from './components/AdvancedFiltersSheet';
import MapLayersSheet from './components/MapLayersSheet';
import OnboardingSheet from './components/Onboarding';
import AppTour from './components/AppTour';
import PlannerScreen from './screens/PlannerScreen';
import WatchScreen from './screens/WatchScreen';
import SettingsScreen from './screens/SettingsScreen';
import SavedScreen from './screens/SavedScreen';
import { getLocal, setLocal } from './lib/storage';
import { depth, distance } from './lib/units';
import {
  DEFAULT_FILTERS,
  DEFAULT_LAYERS,
  freshSearch,
  readSavedSearches,
  stayLabel,
  type MapLayers,
  type ResultFilters,
  type SavedSearch,
} from './lib/workspace';
import { colors as c } from './theme';

type Tab = 'explore' | 'saved' | 'settings';
type Flow = 'base' | 'plan' | 'watch';
const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'explore', label: 'Explore', icon: 'compass' },
  { id: 'saved', label: 'Saved', icon: 'bookmark' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];
const kinds = [
  { id: 'all', label: 'All places' },
  { id: 'anchorage', label: 'Anchor' },
  { id: 'marina', label: 'Marinas' },
  { id: 'mooring', label: 'Buoys' },
  { id: 'dock', label: 'Docks' },
] as const;
const sortLabels = { distance: 'Distance', price: 'Price', depth: 'Depth', exposure: 'Exposure' };
const monotonicNow = () => globalThis.performance?.now() ?? Date.now();
const activeWatchStates = new Set(['arming', 'monitoring', 'alarm', 'position_uncertain']);
function AnchorApp() {
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const [pack, setPack] = useState(() => createDemoPack());
  const [vessel, setVessel] = useState<VesselProfile>(DEFAULT_VESSEL);
  const [defaults, setDefaults] = useState<SearchRequest>(() => createDefaultSearch());
  const [activeSearch, setActiveSearch] = useState<SearchRequest | null>(null);
  const [searchDraft, setSearchDraft] = useState<SearchRequest | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('explore');
  const [flow, setFlow] = useState<Flow>('base');
  const [units, setUnits] = useState<UnitSystem>('nautical');
  const [offline, setOffline] = useState(false);
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [mapPreview, setMapPreview] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [filters, setFilters] = useState<ResultFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string>();
  const [detail, setDetail] = useState<Assessment | null>(null);
  const [detailSearch, setDetailSearch] = useState<SearchRequest | null>(null);
  const [customPin, setCustomPin] = useState<Candidate | null>(null);
  const planSequence = useRef(0);
  const [plan, setPlan] = useState<{
    instance: number;
    candidate: Candidate;
    allowance: 0 | 20 | 30;
    search: SearchRequest;
  } | null>(null);
  const [watchSetup, setWatchSetup] = useState<{ position: Position; radius: number }>({
    position: defaults.origin,
    radius: 50,
  });
  const [watchStatus, setWatchStatus] = useState<Watch.WatchStatus | null>(null);
  const lastWatchContact = useRef(-Infinity);
  const previouslyActive = useRef(false);
  const [watchClock, setWatchClock] = useState(monotonicNow);
  const [profileOpen, setProfileOpen] = useState(false);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [vesselConfigured, setVesselConfigured] = useState(false);
  const [defaultsConfigured, setDefaultsConfigured] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [message, setMessage] = useState('');
  const [assessedAt, setAssessedAt] = useState(() => new Date().toISOString());
  const context = useMemo<AssessmentContext>(
    () => ({ assessedAt, purpose: 'current' }),
    [assessedAt],
  );
  const notifyError = (error: unknown) =>
    setMessage(error instanceof Error ? error.message : String(error));
  const persist = async (key: string, value: unknown) => {
    try {
      await setLocal(key, value);
    } catch (error) {
      setMessage('Could not save on this device: ' + String(error));
    }
  };
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [region, boat, prefs, searchPrefs, legacySearch, searches, setup] = await Promise.all(
          [
            getLocal<{ pack: RegionPack; savedAt: string }>('active-region'),
            getLocal<VesselProfile>('vessel'),
            getLocal<{ units: UnitSystem; offline: boolean; layers?: MapLayers }>('preferences'),
            getLocal<SearchRequest>('search-defaults'),
            getLocal<SearchRequest>('search'),
            getLocal<unknown>('saved-searches'),
            getLocal<boolean>('setup-complete-v2'),
          ],
        );
        if (!live) return;
        if (region?.pack && !validateRegionPack(region.pack).length) {
          setPack(region.pack);
          setSavedAt(region.savedAt);
        }
        if (boat && !validateVessel(boat).length) setVessel(boat);
        if (prefs) {
          if (['nautical', 'metric', 'imperial'].includes(prefs.units)) setUnits(prefs.units);
          setOffline(prefs.offline === true);
          if (
            prefs.layers &&
            ['depth', 'bedding', 'marks'].every(
              (k) => typeof prefs.layers?.[k as keyof MapLayers] === 'boolean',
            )
          )
            setLayers(prefs.layers);
        }
        const nextDefaults = searchPrefs ?? legacySearch;
        if (nextDefaults && !validateSearch(nextDefaults).length)
          setDefaults({
            ...nextDefaults,
            preferredBedding: nextDefaults.preferredBedding ?? 'sand',
          });
        setSaved(readSavedSearches(searches));
        setSetupOpen(setup !== true);
      } catch (error) {
        if (live) {
          notifyError(error);
          setSetupOpen(true);
        }
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const refresh = () => setAssessedAt(new Date().toISOString());
    const timer = setInterval(refresh, 60_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    if (Platform.OS === 'web') window.addEventListener('online', refresh);
    return () => {
      clearInterval(timer);
      listener.remove();
      if (Platform.OS === 'web') window.removeEventListener('online', refresh);
    };
  }, []);
  useEffect(() => {
    let live = true;
    let version = 0;
    const accept = (status: Watch.WatchStatus) => {
      lastWatchContact.current = monotonicNow();
      setWatchClock(lastWatchContact.current);
      previouslyActive.current = activeWatchStates.has(status.state);
      setWatchStatus(status);
    };
    const refresh = async () => {
      const request = ++version;
      try {
        const status = await Watch.getStatus();
        if (live && request === version) accept(status);
      } catch {
        if (live && request === version) setWatchStatus(null);
      }
    };
    const off = Watch.subscribe((status) => {
      version++;
      if (live) accept(status);
    });
    void refresh();
    const timer = setInterval(() => {
      setWatchClock(monotonicNow());
      if (AppState.currentState === 'active' || AppState.currentState === null) void refresh();
    }, 5000);
    const listener = AppState.addEventListener('change', (state) => {
      version++;
      setWatchStatus(null);
      if (state === 'active') void refresh();
    });
    return () => {
      live = false;
      version++;
      off();
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  const result = useMemo(
    () =>
      activeSearch
        ? searchRegion(
            pack,
            vessel,
            activeSearch,
            {
              sortBy: filters.sort,
              gridSpacingM: 500,
              maxGeneratedCandidates: 120,
              clusterDistanceM: 500,
              filters: {
                kinds:
                  filters.kind === 'all'
                    ? undefined
                    : filters.kind === 'anchorage'
                      ? ['anchorage', 'generated']
                      : [filters.kind],
                fee: filters.fee === 'all' ? undefined : [filters.fee],
                statuses:
                  filters.assessment === 'all'
                    ? undefined
                    : filters.assessment === 'complete'
                      ? ['passes']
                      : ['passes', 'insufficient_evidence'],
                compatibleOnly: filters.compatibleOnly,
              },
            },
            context,
          )
        : null,
    [pack, vessel, activeSearch, filters, context],
  );
  const custom = useMemo(
    () =>
      customPin && activeSearch
        ? assessCandidate(customPin, vessel, activeSearch, pack, context)
        : null,
    [customPin, activeSearch, pack, vessel, context],
  );
  const assessments = useMemo(
    () => (custom ? [custom, ...(result?.assessments ?? [])] : (result?.assessments ?? [])),
    [custom, result],
  );
  const currentDetail = useMemo(
    () =>
      detail && activeSearch
        ? assessCandidate(
            detail.candidate,
            vessel,
            detailSearch ?? activeSearch,
            pack,
            context,
            detail.depthAllowancePercent,
          )
        : null,
    [detail, detailSearch, activeSearch, vessel, pack, context],
  );
  const selected = assessments.find((a) => a.id === selectedId);
  const watchActive = !!watchStatus && activeWatchStates.has(watchStatus.state);
  const watchUnverified =
    previouslyActive.current && (!watchStatus || watchClock - lastWatchContact.current > 12_000);
  const watchProblem =
    watchUnverified ||
    watchStatus?.state === 'alarm' ||
    watchStatus?.state === 'position_uncertain' ||
    watchStatus?.state === 'interrupted';
  const watchLabel = watchUnverified
    ? 'Watch unverified'
    : watchStatus?.state === 'interrupted'
      ? 'Watch interrupted'
      : watchProblem
        ? 'Watch alert'
        : watchActive
          ? watchStatus?.simulation
            ? 'Watch simulation'
            : watchStatus?.serviceRunning
              ? 'Watch active'
              : 'Check watch'
          : 'Anchor watch';
  const changeTab = (next: Tab) => {
    setTab(next);
    setFlow('base');
    setDetail(null);
  };
  const savePreferences = (u: UnitSystem, o: boolean, l: MapLayers) => {
    setUnits(u);
    setOffline(o);
    setLayers(l);
    void persist('preferences', { units: u, offline: o, layers: l, language: 'en' });
  };
  const openSearch = () =>
    setSearchDraft(activeSearch ? { ...activeSearch } : freshSearch(defaults));
  const submitSearch = (search: SearchRequest) => {
    setActiveSearch(search);
    setAssessedAt(new Date().toISOString());
    setCustomPin(null);
    setSelectedId(undefined);
    setDetail(null);
    setPlan(null);
    setMapPreview(false);
    setTab('explore');
    setFlow('base');
  };
  const closeSearch = () => {
    setActiveSearch(null);
    setCustomPin(null);
    setSelectedId(undefined);
    setDetail(null);
    setPlan(null);
    setMapPreview(false);
    setFlow('base');
  };
  const saveVessel = (next: VesselProfile) => {
    setVessel(next);
    setVesselConfigured(true);
    setAssessedAt(new Date().toISOString());
    setPlan(null);
    void persist('vessel', next);
  };
  const saveDefaults = (next: SearchRequest) => {
    setDefaults(next);
    setDefaultsConfigured(true);
    void persist('search-defaults', next);
  };
  const savePack = async () => {
    const time = new Date().toISOString();
    await setLocal('active-region', { pack, savedAt: time });
    setSavedAt(time);
  };
  const changePack = (next: RegionPack) => {
    setPack(next);
    setSavedAt(new Date().toISOString());
    closeSearch();
    setAssessedAt(new Date().toISOString());
  };
  const resetDemo = () =>
    void (async () => {
      const state = await Watch.getStatus();
      if (state.serviceRunning || activeWatchStates.has(state.state))
        throw new Error('Stop the current watch before replacing regional data.');
      const next = createDemoPack();
      await setLocal('active-region', { pack: next, savedAt: new Date().toISOString() });
      changePack(next);
      setMessage('Sample data refreshed. Start a new search when ready.');
    })().catch(notifyError);
  const select = (assessment: Assessment) => {
    setSelectedId(assessment.id);
    setDetailSearch(null);
    setDetail(assessment);
  };
  const dropPin = (position: Position) => {
    if (!activeSearch) return;
    const candidate: Candidate = {
      id: 'custom-pin',
      name: 'Selected anchor position',
      kind: 'generated',
      position,
    };
    setCustomPin(candidate);
    select(
      assessCandidate(candidate, vessel, activeSearch, pack, {
        purpose: 'current',
        assessedAt: new Date().toISOString(),
      }),
    );
  };
  const saveResults = async () => {
    if (!activeSearch || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const time = new Date().toISOString();
      const snapshot: SavedSearch = {
        id: 'search-' + Date.now(),
        name: saveName.trim() || 'Florida Keys search',
        savedAt: time,
        search: activeSearch,
        filters: { ...filters },
        vesselName: vessel.name,
        packId: pack.id,
        packVersion: pack.version,
        results: assessments.map((a) => ({
          id: a.id,
          name: a.candidate.name,
          status: a.status,
          depthM: a.maxDepthM,
          total: a.cost.total,
          currency: a.cost.currency,
        })),
      };
      const next = [snapshot, ...saved].slice(0, 30);
      await setLocal('saved-searches', next);
      setSaved(next);
      setSaveOpen(false);
      setMessage('Results saved. Open them from Saved.');
    } catch (error) {
      setSaveError('Could not save results on this device: ' + String(error));
    } finally {
      setSaving(false);
    }
  };
  const deleteSaved = (id: string) =>
    void (async () => {
      const next = saved.filter((s) => s.id !== id);
      await setLocal('saved-searches', next);
      setSaved(next);
    })().catch(notifyError);
  const reopenSaved = (snapshot: SavedSearch) => {
    if (snapshot.packId !== pack.id) {
      setMessage(
        'Install the ' + snapshot.packId + ' region in Settings before reopening this search.',
      );
      return;
    }
    setFilters(snapshot.filters);
    submitSearch(snapshot.search);
    setMessage(
      'Reassessed with ' +
        vessel.name +
        ' and the current regional data. Update stay dates if they have elapsed.',
    );
  };
  const finishSetup = async () => {
    if (setupSaving) return;
    setSetupSaving(true);
    setSetupError('');
    try {
      await setLocal('vessel', vessel);
      await setLocal('search-defaults', defaults);
      await setLocal('preferences', { units, offline, layers, language: 'en' });
      await setLocal('setup-complete-v2', true);
      setSetupOpen(false);
      setTourOpen(true);
    } catch (error) {
      setSetupError('Could not save your setup on this device: ' + String(error));
    } finally {
      setSetupSaving(false);
    }
  };
  const showMap = !!activeSearch || mapPreview;
  const searchCaption = activeSearch
    ? stayLabel(activeSearch) + ' · ' + distance(activeSearch.maxDistanceNm, units) + ' radius'
    : mapPreview
      ? 'Saved regional map'
      : 'Set an area and stay window to search.';
  const activeFilterCount =
    Number(filters.fee !== 'all') +
    Number(filters.assessment !== 'recommended') +
    Number(filters.compatibleOnly) +
    Number((activeSearch ?? defaults).preferredBedding !== 'any');
  if (!ready)
    return (
      <View style={s.loading}>
        <ActivityIndicator color={c.blue} />
        <Text style={s.secondaryText}>Loading local settings…</Text>
      </View>
    );
  return (
    <SafeAreaView style={s.app}>
      <StatusBar style="dark" />
      <View style={[s.header, !wide && { paddingHorizontal: 16, height: 60 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Anchor Buddy Explore"
          onPress={() => changeTab('explore')}
          style={s.brand}
        >
          <Icon name="anchor" size={22} color={c.blue} />
          <Text style={[s.brandText, !wide && { fontSize: 17 }]}>Anchor Buddy</Text>
        </Pressable>
        {wide ? (
          <View style={s.nav}>
            {tabs.map((t) => (
              <Pressable
                key={t.id}
                accessibilityRole="tab"
                aria-selected={tab === t.id && flow === 'base'}
                onPress={() => changeTab(t.id)}
                style={[s.navItem, tab === t.id && flow === 'base' && s.navSelected]}
              >
                <Icon name={t.icon} size={17} color={tab === t.id ? c.blue : c.muted} />
                <Text style={[s.navText, tab === t.id && { color: c.blue }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={watchLabel}
          onPress={() => {
            setDetail(null);
            setFlow('watch');
          }}
          style={[
            s.watchButton,
            watchProblem && { borderColor: c.red, backgroundColor: '#FFF1F3' },
            watchActive && !watchProblem && { backgroundColor: c.mint, borderColor: c.blue },
          ]}
        >
          <Icon
            name={watchProblem ? 'alert-circle' : 'radio'}
            size={17}
            color={watchProblem ? c.red : c.blue}
          />
          <Text style={{ fontSize: 12, fontWeight: '600', color: watchProblem ? c.red : c.ink }}>
            {watchLabel}
          </Text>
        </Pressable>
      </View>
      {flow !== 'base' ? (
        <View style={s.flowBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFlow(flow === 'watch' && plan ? 'plan' : 'base')}
            style={s.back}
          >
            <Icon name="arrow-left" size={17} />
            <Text style={s.linkText}>
              {flow === 'watch' && plan
                ? 'Back to anchor plan'
                : 'Back to ' + (tab === 'explore' ? (activeSearch ? 'results' : 'Explore') : tab)}
            </Text>
          </Pressable>
          <Text style={s.secondaryText}>
            {flow === 'plan' ? '2 · Position & arrival checks' : '3 · Confirm & monitor'}
          </Text>
        </View>
      ) : null}
      {plan && activeSearch ? (
        <View style={flow === 'plan' ? { flex: 1, minHeight: 0 } : { display: 'none' }}>
          <PlannerScreen
            key={plan.instance}
            candidate={plan.candidate}
            pack={pack}
            vessel={vessel}
            search={plan.search}
            context={context}
            depthAllowancePercent={plan.allowance}
            offline={offline}
            units={units}
            layers={layers}
            onDetails={(assessment, request) => {
              setDetailSearch(request ?? plan.search);
              setDetail(assessment);
            }}
            onWatch={(position, radius) => {
              setWatchSetup({ position, radius });
              setFlow('watch');
            }}
          />
        </View>
      ) : null}
      {flow === 'watch' ? (
        <WatchScreen position={watchSetup.position} radius={watchSetup.radius} units={units} />
      ) : flow === 'plan' && plan && activeSearch ? null : tab === 'settings' ? (
        <SettingsScreen
          pack={pack}
          units={units}
          setUnits={(u) => savePreferences(u, offline, layers)}
          offline={offline}
          setOffline={(o) => savePreferences(units, o, layers)}
          savedAt={savedAt}
          onSave={savePack}
          onPack={changePack}
          onDemo={resetDemo}
          vessel={vessel}
          onEditVessel={() => setProfileOpen(true)}
          onEditDefaults={() => setDefaultsOpen(true)}
          onTour={() => setTourOpen(true)}
          onSetup={() => {
            setSetupError('');
            setVesselConfigured(false);
            setDefaultsConfigured(false);
            setSetupOpen(true);
          }}
          language="en"
          setLanguage={() => {}}
          layers={layers}
          setLayers={(l) => savePreferences(units, offline, l)}
        />
      ) : tab === 'saved' ? (
        <SavedScreen
          searches={saved}
          pack={pack}
          savedAt={savedAt}
          units={units}
          onOpen={reopenSaved}
          onDelete={deleteSaved}
          onMap={() => {
            closeSearch();
            setMapPreview(true);
            setTab('explore');
            setView('map');
          }}
          onSettings={() => changeTab('settings')}
          onSearch={() => {
            changeTab('explore');
            openSearch();
          }}
        />
      ) : (
        <View style={s.explore}>
          <View
            style={[
              s.searchHeader,
              !wide && { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
            ]}
          >
            <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
              <Text accessibilityRole="header" style={s.pageTitle}>
                Explore
              </Text>
              {wide ? <Text style={s.secondaryText}>{searchCaption}</Text> : null}
            </View>
            <View style={s.row}>
              <Button small icon={activeSearch ? 'sliders' : 'search'} onPress={openSearch}>
                {activeSearch ? (wide ? 'Edit search' : 'Edit') : 'New search'}
              </Button>
              {activeSearch ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Save results"
                    onPress={() => {
                      setSaveName(
                        'Florida Keys · ' + new Date(activeSearch.arrival).toLocaleDateString(),
                      );
                      setSaveError('');
                      setSaveOpen(true);
                    }}
                    style={s.iconButton}
                  >
                    <Icon name="bookmark" color={c.blue} />
                    {wide ? <Text style={s.linkText}>Save results</Text> : null}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close search"
                    onPress={closeSearch}
                    style={s.iconButton}
                  >
                    <Icon name="x" />
                    {wide ? <Text style={s.linkText}>Close search</Text> : null}
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
          {!wide ? (
            <Text style={[s.secondaryText, { paddingHorizontal: 16, paddingBottom: 14 }]}>
              {searchCaption}
            </Text>
          ) : null}
          <View style={[s.filterBar, !wide && { paddingHorizontal: 16 }]}>
            <View style={s.filterLabelRow}>
              <Text style={s.sectionLabel}>Quick filters</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAdvancedOpen(true)}
                style={s.advancedButton}
              >
                <Icon name="sliders" color={c.blue} size={15} />
                <Text style={s.linkText}>
                  Advanced filters & sorting
                  {activeFilterCount ? ' (' + activeFilterCount + ')' : ''}
                </Text>
              </Pressable>
            </View>
            <View style={s.filterControls}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flex: 1, minWidth: 0 }}
                contentContainerStyle={{ gap: 6, paddingRight: 8 }}
              >
                {kinds.map((k) => (
                  <Pressable
                    accessibilityRole="button"
                    aria-pressed={filters.kind === k.id}
                    key={k.id}
                    onPress={() => setFilters({ ...filters, kind: k.id })}
                    style={[s.quickTab, filters.kind === k.id && s.quickSelected]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: filters.kind === k.id ? c.white : c.ink,
                      }}
                    >
                      {k.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={s.viewSwitch}>
                {(['map', 'list'] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    accessibilityRole="button"
                    accessibilityLabel={mode === 'map' ? 'Map view' : 'List view'}
                    aria-pressed={view === mode}
                    onPress={() => setView(mode)}
                    style={[s.viewButton, view === mode && s.viewSelected]}
                  >
                    <Icon
                      name={mode === 'map' ? 'map' : 'list'}
                      size={16}
                      color={view === mode ? c.blue : c.muted}
                    />
                    {wide ? (
                      <Text style={{ fontSize: 12, color: view === mode ? c.blue : c.muted }}>
                        {mode === 'map' ? 'Map' : 'List'}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          {!showMap ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Icon name="search" size={28} color={c.blue} />
              </View>
              <Text style={s.emptyTitle}>No active search</Text>
              <Text style={s.emptyText}>
                Choose the area, dates, depth and seabed for your stay. Results appear after you run
                the search.
              </Text>
              <Button onPress={openSearch} icon="search">
                Plan a stay
              </Button>
              <Pressable
                accessibilityRole="button"
                onPress={() => changeTab('saved')}
                style={{ padding: 12 }}
              >
                <Text style={s.linkText}>Open saved searches</Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                minHeight: 0,
                flexDirection: wide && view === 'map' ? 'row' : 'column',
              }}
            >
              {activeSearch && (view === 'list' || wide) ? (
                <View style={view === 'map' ? s.resultsSidebar : { flex: 1, minHeight: 0 }}>
                  <View style={s.resultSummary}>
                    <Text style={s.sectionLabel}>{assessments.length} results</Text>
                    <Text style={s.secondaryText}>{sortLabels[filters.sort]} · straight-line</Text>
                  </View>
                  <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                    {result?.depthFallbackPercent ? (
                      <Notice>
                        +{result.depthFallbackPercent}% depth alternatives. All other constraints
                        still apply.
                      </Notice>
                    ) : null}
                    {result?.truncated ? (
                      <Text style={s.secondaryText}>
                        Candidate limit reached. Narrow the area for a more detailed search.
                      </Text>
                    ) : null}
                    {assessments.length ? (
                      assessments.map((a, i) => (
                        <ResultCard
                          key={a.id}
                          assessment={a}
                          selected={a.id === selectedId}
                          onSelect={() => select(a)}
                          units={units}
                          index={i}
                        />
                      ))
                    ) : (
                      <Card>
                        <Text style={s.sectionLabel}>No matching results</Text>
                        <Text style={s.secondaryText}>
                          Try another area or review the filters. Missing evidence cannot establish
                          a suitable position.
                        </Text>
                        <Button secondary onPress={openSearch}>
                          Edit search
                        </Button>
                      </Card>
                    )}
                  </ScrollView>
                </View>
              ) : null}
              {view === 'map' || !activeSearch ? (
                <View style={{ flex: 1, minHeight: 260 }}>
                  <Chart
                    pack={pack}
                    assessments={assessments}
                    selectedId={selectedId}
                    origin={activeSearch?.origin ?? defaults.origin}
                    onSelect={(id) => {
                      const found = assessments.find((a) => a.id === id);
                      if (found) select(found);
                    }}
                    onPin={dropPin}
                    onlineBasemap={!offline}
                    showDepth={layers.depth}
                    showBedding={layers.bedding}
                    showMarks={layers.marks}
                    searchRadiusNm={activeSearch?.maxDistanceNm}
                  />
                  <View style={s.mapTop}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setLayersOpen(true)}
                      style={s.mapControl}
                    >
                      <Icon name="layers" size={16} />
                      <Text style={s.linkText}>Layers</Text>
                    </Pressable>
                    {activeSearch ? (
                      <View style={s.mapCount}>
                        <Text style={s.secondaryText}>
                          {assessments.length} results{offline ? ' · Offline' : ''}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {selected ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => select(selected)}
                      style={s.selectedCard}
                    >
                      <View style={{ flex: 1, gap: 5 }}>
                        <Text style={s.sectionLabel}>{selected.candidate.name}</Text>
                        <Text style={s.secondaryText}>
                          {depth(selected.maxDepthM, units)} depth ·{' '}
                          {distance(selected.distanceNm, units)} straight-line
                        </Text>
                      </View>
                      <Icon name="chevron-right" color={c.blue} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        </View>
      )}
      {!wide ? (
        <View style={s.bottomNav}>
          {tabs.map((t) => (
            <Pressable
              accessibilityRole="tab"
              aria-selected={tab === t.id && flow === 'base'}
              key={t.id}
              onPress={() => changeTab(t.id)}
              style={s.bottomTab}
            >
              <Icon
                name={t.icon}
                size={21}
                color={tab === t.id && flow === 'base' ? c.blue : c.muted}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: tab === t.id && flow === 'base' ? c.blue : c.muted,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {message ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          onPress={() => setMessage('')}
          style={s.toast}
        >
          <Text style={{ flex: 1, color: 'white', fontSize: 12, lineHeight: 19 }}>{message}</Text>
          <Icon name="x" color="white" size={16} />
        </Pressable>
      ) : null}
      {setupOpen &&
      watchStatus &&
      !watchActive &&
      !watchProblem &&
      !profileOpen &&
      !defaultsOpen ? (
        <OnboardingSheet
          units={units}
          onUnits={(u) => savePreferences(u, offline, layers)}
          onEditVessel={() => setProfileOpen(true)}
          onEditDefaults={() => setDefaultsOpen(true)}
          vesselConfigured={vesselConfigured}
          defaultsConfigured={defaultsConfigured}
          onFinish={finishSetup}
          busy={setupSaving}
          error={setupError}
          sampleData={pack.validation.status === 'synthetic'}
        />
      ) : null}
      {profileOpen ? (
        <ProfileSheet
          vessel={vessel}
          units={units}
          onSave={saveVessel}
          onClose={() => setProfileOpen(false)}
          title={setupOpen ? 'Configure your vessel' : undefined}
          saveLabel={setupOpen ? 'Save vessel & continue' : undefined}
        />
      ) : null}
      {defaultsOpen ? (
        <SearchSheet
          mode="defaults"
          search={defaults}
          pack={pack}
          offline={offline}
          units={units}
          onSave={saveDefaults}
          onClose={() => setDefaultsOpen(false)}
        />
      ) : null}
      {searchDraft ? (
        <SearchSheet
          search={searchDraft}
          pack={pack}
          offline={offline}
          units={units}
          onSave={submitSearch}
          onClose={() => setSearchDraft(null)}
        />
      ) : null}
      {advancedOpen ? (
        <AdvancedFiltersSheet
          filters={filters}
          bedding={(activeSearch ?? defaults).preferredBedding}
          onApply={(next, bedding) => {
            setFilters(next);
            if (activeSearch) {
              setActiveSearch({ ...activeSearch, preferredBedding: bedding });
              setAssessedAt(new Date().toISOString());
            } else saveDefaults({ ...defaults, preferredBedding: bedding });
          }}
          onClose={() => setAdvancedOpen(false)}
        />
      ) : null}
      {layersOpen ? (
        <MapLayersSheet
          pack={pack}
          layers={layers}
          onChange={(next) => savePreferences(units, offline, next)}
          onClose={() => setLayersOpen(false)}
        />
      ) : null}
      {currentDetail ? (
        <Details
          assessment={currentDetail}
          pack={pack}
          units={units}
          onClose={() => setDetail(null)}
          onPlan={() => {
            setPlan({
              instance: ++planSequence.current,
              candidate: currentDetail.candidate,
              allowance: currentDetail.depthAllowancePercent,
              search: detailSearch ?? activeSearch!,
            });
            setDetail(null);
            setFlow('plan');
          }}
        />
      ) : null}
      {saveOpen ? (
        <Sheet
          title="Save search results"
          subtitle="A dated snapshot of this search. Reopening it recalculates against current data and your current vessel."
          onClose={() => {
            if (!saving) setSaveOpen(false);
          }}
        >
          <Field label="Search name" value={saveName} onChange={setSaveName} />
          <Text style={s.secondaryText}>
            {assessments.length} results · {vessel.name}
          </Text>
          {saveError ? <Notice tone="warning">{saveError}</Notice> : null}
          <Button icon="bookmark" disabled={saving} onPress={() => void saveResults()}>
            {saving ? 'Saving…' : 'Save results'}
          </Button>
        </Sheet>
      ) : null}
      {tourOpen && !setupOpen ? (
        <AppTour
          onClose={() => setTourOpen(false)}
          onSearch={() => {
            setTourOpen(false);
            changeTab('explore');
            openSearch();
          }}
          onSection={changeTab}
        />
      ) : null}
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <AnchorApp />
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: c.paper },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: c.paper,
  },
  header: {
    height: 72,
    paddingHorizontal: 24,
    backgroundColor: c.white,
    borderBottomWidth: 1,
    borderColor: c.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  brand: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  brandText: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5, color: c.ink },
  nav: { flexDirection: 'row', gap: 8 },
  navItem: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
  },
  navSelected: { backgroundColor: c.mint },
  navText: { fontSize: 13, fontWeight: '600', color: c.muted },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 10,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 8,
  },
  explore: { flex: 1, minHeight: 0 },
  searchHeader: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: c.white,
  },
  pageTitle: { fontSize: 24, fontWeight: '600', color: c.ink, letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryText: { fontSize: 12, color: c.muted, lineHeight: 19 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: c.ink },
  linkText: { fontSize: 12, fontWeight: '600', color: c.blue },
  iconButton: {
    minHeight: 40,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.line,
  },
  filterBar: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 16,
    gap: 8,
    backgroundColor: c.white,
    borderBottomWidth: 1,
    borderColor: c.line,
  },
  filterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  advancedButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  filterControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickTab: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: c.paper,
  },
  quickSelected: { backgroundColor: c.blue },
  viewSwitch: {
    flexDirection: 'row',
    padding: 3,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 9,
    backgroundColor: c.paper,
  },
  viewButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  viewSelected: { backgroundColor: c.white },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  emptyIcon: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: c.mint,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: c.ink },
  emptyText: { maxWidth: 360, fontSize: 14, lineHeight: 22, color: c.muted, textAlign: 'center' },
  resultsSidebar: {
    width: 335,
    borderRightWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
  },
  resultSummary: { padding: 16, gap: 4, borderBottomWidth: 1, borderColor: c.line },
  mapTop: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 55,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  mapControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: c.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.line,
  },
  mapCount: { backgroundColor: c.white, padding: 10, borderRadius: 8 },
  selectedCard: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    maxWidth: 420,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: c.white,
    borderTopWidth: 1,
    borderColor: c.line,
    paddingVertical: 6,
  },
  bottomTab: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 8 },
  flowBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: c.white,
    borderBottomWidth: 1,
    borderColor: c.line,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    alignSelf: 'center',
    maxWidth: 620,
    backgroundColor: c.ink,
    padding: 16,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 12,
    zIndex: 100,
  },
});
