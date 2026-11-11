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
  createDefaultSearch,
  createVesselDraft,
  getPreferredBeddings,
  searchRegion,
  validateLiveRegionPack,
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
import MapDownloadsSheet from './components/MapDownloadsSheet';
import RegionalDataSheet from './components/RegionalDataSheet';
import OnboardingSheet from './components/Onboarding';
import AppTour from './components/AppTour';
import PlannerScreen from './screens/PlannerScreen';
import WatchScreen from './screens/WatchScreen';
import SettingsScreen from './screens/SettingsScreen';
import SavedScreen from './screens/SavedScreen';
import { getLocal, setLocal, removeLocal } from './lib/storage';
import { discoverRegion, findLocations } from './lib/regionalData';
import { useConnectivity } from './lib/useConnectivity';
import { useEvidenceRefresh } from './lib/useEvidenceRefresh';
import {
  cacheRegion,
  createEmptyRegion,
  readRegionCache,
  regionContains,
  type RegionalData,
} from './lib/regionalDataCore';
import { listMapAreas, deleteMapArea, subscribeMapAreas, type MapArea } from './lib/worldMaps';
import { depth, distance } from './lib/units';
import { reassessSelection } from './lib/selectionAssessment';
import {
  DEFAULT_FILTERS,
  DEFAULT_LAYERS,
  freshSearch,
  prepareSavedSearch,
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
const UNSELECTED_ORIGIN: Position = [0, 0];
const monotonicNow = () => globalThis.performance?.now() ?? Date.now();
const activeWatchStates = new Set(['arming', 'monitoring', 'alarm', 'position_uncertain']);
function AnchorApp() {
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const [pack, setPack] = useState(() => createEmptyRegion(UNSELECTED_ORIGIN, 3));
  const [regionCache, setRegionCache] = useState<RegionalData[]>([]);
  const [regionData, setRegionData] = useState<RegionalData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [dataOpen, setDataOpen] = useState(false);
  const dataRequest = useRef<AbortController | null>(null);
  const lastLiveAttempt = useRef(0);
  const evidenceWrites = useRef<Promise<void>>(Promise.resolve());
  const [mapAreas, setMapAreas] = useState<MapArea[]>([]);
  const [downloadSelection, setDownloadSelection] = useState<{
    center: Position;
    radiusNm: number;
    resume?: MapArea;
    areaSelected?: boolean;
  } | null>(null);
  const [previewArea, setPreviewArea] = useState<{ center: Position; radiusNm: number } | null>(
    null,
  );
  const [vessel, setVessel] = useState<VesselProfile>(createVesselDraft);
  const [defaults, setDefaults] = useState<SearchRequest>(() =>
    createDefaultSearch(UNSELECTED_ORIGIN),
  );
  const [activeSearch, setActiveSearch] = useState<SearchRequest | null>(null);
  const [activeAreaName, setActiveAreaName] = useState<string>();
  const [activeAreaTimezone, setActiveAreaTimezone] = useState<string>();
  const [searchDraft, setSearchDraft] = useState<SearchRequest | null>(null);
  const [searchDraftArea, setSearchDraftArea] = useState<{
    confirmed: boolean;
    name?: string;
    timezone?: string;
  }>({ confirmed: false });
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('explore');
  const [flow, setFlow] = useState<Flow>('base');
  const [units, setUnits] = useState<UnitSystem>('nautical');
  const [offlinePreference, setOffline] = useState(false);
  const connectivity = useConnectivity();
  const offline = offlinePreference || connectivity === 'offline';
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
  const [choosingPin, setChoosingPin] = useState(false);
  const reopenedPin = useRef<Position | undefined>(undefined);
  const reopenedFilters = useRef<ResultFilters | undefined>(undefined);
  const planSequence = useRef(0);
  const [plan, setPlan] = useState<{
    instance: number;
    candidate: Candidate;
    allowance: 0 | 20 | 30;
    search: SearchRequest;
  } | null>(null);
  const [watchSetup, setWatchSetup] = useState<{ position: Position; radius?: number }>();
  const [watchStatus, setWatchStatus] = useState<Watch.WatchStatus | null>(null);
  const lastWatchContact = useRef(-Infinity);
  const previouslyActive = useRef(false);
  const [watchClock, setWatchClock] = useState(monotonicNow);
  const [profileOpen, setProfileOpen] = useState(false);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [reviewingSetup, setReviewingSetup] = useState(false);
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
        const [
          region,
          boat,
          prefs,
          searchPrefs,
          legacySearch,
          searches,
          setup,
          evidence,
          profileConfirmed,
        ] = await Promise.all([
          getLocal<{ pack: RegionPack; savedAt: string }>('active-region'),
          getLocal<VesselProfile>('vessel'),
          getLocal<{ units: UnitSystem; offline: boolean; layers?: MapLayers }>('preferences'),
          getLocal<SearchRequest>('search-defaults'),
          getLocal<SearchRequest>('search'),
          getLocal<unknown>('saved-searches'),
          getLocal<boolean>('setup-complete-v2'),
          getLocal<unknown>('regional-evidence-v1'),
          getLocal<boolean>('profile-confirmed-v3'),
        ]);
        if (!live) return;
        const cached = readRegionCache(evidence);
        setRegionCache(cached);
        if (region?.pack && !validateLiveRegionPack(region.pack).length) {
          setPack(region.pack);
          setSavedAt(region.savedAt);
          setRegionData(cached.find((row) => row.pack.id === region.pack.id) ?? null);
        }
        setVesselConfigured(profileConfirmed === true && !!boat && !validateVessel(boat).length);
        if (boat && !validateVessel(boat).length) {
          setVessel({
            ...boat,
            id: 'local-vessel',
            anchor: {
              ...boat.anchor,
              scopeGuidance:
                boat.anchor.scopeGuidance?.reviewStatus === 'reviewed'
                  ? boat.anchor.scopeGuidance
                  : null,
            },
          });
        }
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
            preferredBeddings: getPreferredBeddings(nextDefaults),
            preferredBedding: undefined,
          });
        setDefaultsConfigured(!!nextDefaults && !validateSearch(nextDefaults).length);
        setSaved(readSavedSearches(searches));
        setSetupOpen(
          setup !== true || profileConfirmed !== true || !boat || validateVessel(boat).length > 0,
        );
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
  const refreshMapAreas = () => void listMapAreas().then(setMapAreas).catch(notifyError);
  useEffect(() => {
    refreshMapAreas();
    const unsubscribe = subscribeMapAreas(refreshMapAreas);
    return () => {
      dataRequest.current?.abort();
      unsubscribe();
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
  const vesselReady = vesselConfigured && validateVessel(vessel).length === 0;
  const result = useMemo(
    () =>
      activeSearch && vesselReady
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
    [pack, vessel, activeSearch, filters, context, vesselReady],
  );
  const custom = useMemo(
    () =>
      customPin && activeSearch && vesselReady
        ? reassessSelection(customPin, vessel, activeSearch, pack, context).assessment
        : null,
    [customPin, activeSearch, pack, vessel, context, vesselReady],
  );
  const assessments = result?.assessments ?? [];
  const mapAssessments = useMemo(
    () => (custom ? [custom, ...(result?.assessments ?? [])] : (result?.assessments ?? [])),
    [custom, result],
  );
  const detailState = useMemo(
    () =>
      detail && activeSearch && vesselReady
        ? reassessSelection(
            detail.candidate,
            vessel,
            detailSearch ?? activeSearch,
            pack,
            context,
            detail.depthAllowancePercent,
          )
        : null,
    [detail, detailSearch, activeSearch, vessel, pack, context, vesselReady],
  );
  const currentDetail = detailState?.assessment ?? null;
  const selected = mapAssessments.find((a) => a.id === selectedId);
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
          ? watchStatus?.serviceRunning
            ? 'Watch active'
            : 'Check watch'
          : 'Anchor watch';
  const changeTab = (next: Tab) => {
    setTab(next);
    setFlow('base');
    setDetail(null);
    setChoosingPin(false);
  };
  const savePreferences = (u: UnitSystem, o: boolean, l: MapLayers) => {
    if (o && !offline) {
      dataRequest.current?.abort();
      setDataLoading(false);
      setDataError('Offline mode uses downloaded evidence with its original source dates.');
    }
    setUnits(u);
    setOffline(o);
    setLayers(l);
    void persist('preferences', { units: u, offline: o, layers: l, language: 'en' });
  };
  const requireVessel = () => {
    if (vesselReady) return true;
    setMessage('Enter and confirm your actual vessel details before searching.');
    setProfileOpen(true);
    return false;
  };
  const openSearch = () => {
    if (!requireVessel()) return;
    reopenedPin.current = undefined;
    reopenedFilters.current = undefined;
    setSearchDraftArea({
      confirmed: !!activeSearch || !!previewArea,
      name: activeAreaName,
      timezone: activeAreaTimezone,
    });
    setSearchDraft(
      activeSearch
        ? { ...activeSearch }
        : {
            ...freshSearch(defaults),
            ...(previewArea
              ? { origin: previewArea.center, maxDistanceNm: Math.min(25, previewArea.radiusNm) }
              : {}),
          },
    );
  };
  const updateEvidenceCache = (update: (previous: RegionalData[]) => RegionalData[]) => {
    const task = evidenceWrites.current.then(async () => {
      const next = update(readRegionCache(await getLocal('regional-evidence-v1')));
      await setLocal('regional-evidence-v1', next);
      setRegionCache(next);
    });
    evidenceWrites.current = task.catch(() => {});
    return task;
  };
  const saveRegionalData = async (data: RegionalData) => {
    const stored = { ...data, savedAt: new Date().toISOString() };
    await updateEvidenceCache((previous) => cacheRegion(previous, stored));
    return stored;
  };
  const loadSearchData = async (
    search: SearchRequest,
    forceLive = false,
    regionName?: string,
    timezone?: string,
  ) => {
    dataRequest.current?.abort();
    const controller = new AbortController();
    dataRequest.current = controller;
    setDataError('');
    const cached = regionCache.find((row) =>
      regionContains(row.pack, search.origin, search.maxDistanceNm),
    );
    const keepReviewed =
      pack.validation.status === 'reviewed' &&
      regionContains(pack, search.origin, search.maxDistanceNm);
    if (offline) {
      setDataLoading(false);
      if (cached && !keepReviewed) {
        setPack(cached.pack);
        setRegionData(cached);
        setSavedAt(cached.savedAt ?? null);
      } else if (
        !regionContains(pack, search.origin, search.maxDistanceNm) ||
        pack.validation.status === 'synthetic'
      ) {
        try {
          setPack(createEmptyRegion(search.origin, search.maxDistanceNm, regionName));
        } catch (error) {
          setDataError(String(error));
        }
        setRegionData(null);
        setSavedAt(null);
        setDataError(
          'No downloaded nautical evidence covers this search. Cached display maps remain available; reconnect to load place and weather data.',
        );
      }
      return;
    }
    setDataLoading(true);
    if (cached && !keepReviewed) {
      setPack(cached.pack);
      setRegionData(cached);
      setSavedAt(cached.savedAt ?? null);
    } else if (
      pack.validation.status !== 'reviewed' ||
      !regionContains(pack, search.origin, search.maxDistanceNm)
    ) {
      try {
        setPack(createEmptyRegion(search.origin, search.maxDistanceNm, regionName));
      } catch (error) {
        setDataError(String(error));
        setDataLoading(false);
        return;
      }
      setRegionData(null);
      setSavedAt(null);
    }
    try {
      lastLiveAttempt.current = Date.now();
      const loaded = await discoverRegion(search, controller.signal, regionName, timezone);
      if (controller.signal.aborted || dataRequest.current !== controller) return;
      // A separately reviewed chart pack remains authoritative. Live discovery cannot downgrade it.
      if (keepReviewed) {
        setRegionData(loaded);
        setDataError(
          'Live source observations loaded. The reviewed assessment pack remains active; refresh its published version in Settings for updated analysis.',
        );
      } else {
        setPack(loaded.pack);
        setRegionData(loaded);
      }
      setAssessedAt(new Date().toISOString());
      try {
        const stored = await saveRegionalData(loaded);
        if (!controller.signal.aborted) {
          if (!keepReviewed) {
            setSavedAt(stored.savedAt ?? null);
            await setLocal('active-region', { pack: loaded.pack, savedAt: stored.savedAt });
          }
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setDataError('Live data loaded, but could not be cached: ' + String(error));
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setDataError(
          (error instanceof Error ? error.message : String(error)) +
            (cached
              ? ' Previously downloaded evidence is retained with its original dates.'
              : ' No sample results have been substituted.'),
        );
    } finally {
      if (dataRequest.current === controller) setDataLoading(false);
    }
  };
  useEvidenceRefresh({
    offline,
    active: ready && !!activeSearch,
    loading: dataLoading,
    expiresAt: regionData?.pack.validUntil ?? pack.validUntil,
    lastAttempt: lastLiveAttempt.current,
    refresh: () => {
      if (activeSearch)
        void loadSearchData(activeSearch, false, activeAreaName, activeAreaTimezone);
    },
    cancel: () => {
      dataRequest.current?.abort();
      setDataLoading(false);
    },
  });
  const submitSearch = (
    search: SearchRequest,
    selection?: { regionName: string; timezone: string },
  ) => {
    if (!requireVessel()) return;
    setSearchDraft(null);
    setActiveSearch(search);
    setActiveAreaName(selection?.regionName);
    setActiveAreaTimezone(selection?.timezone);
    setAssessedAt(new Date().toISOString());
    setCustomPin(null);
    setChoosingPin(false);
    setSelectedId(undefined);
    setDetail(null);
    setPlan(null);
    setWatchSetup(undefined);
    setMapPreview(false);
    setTab('explore');
    setFlow('base');
    setPreviewArea(null);
    if (reopenedFilters.current) {
      setFilters(reopenedFilters.current);
      reopenedFilters.current = undefined;
    }
    if (reopenedPin.current) {
      setCustomPin({
        id: 'custom-pin',
        name: 'Selected anchor position',
        kind: 'generated',
        position: reopenedPin.current,
      });
      setSelectedId('custom-pin');
      reopenedPin.current = undefined;
    }
    void loadSearchData(search, false, selection?.regionName, selection?.timezone);
  };
  const closeSearch = () => {
    dataRequest.current?.abort();
    setDataLoading(false);
    setDataError('');
    setActiveSearch(null);
    setActiveAreaName(undefined);
    setActiveAreaTimezone(undefined);
    setCustomPin(null);
    setSelectedId(undefined);
    setDetail(null);
    setPlan(null);
    setWatchSetup(undefined);
    setMapPreview(false);
    setPreviewArea(null);
    setChoosingPin(false);
    reopenedPin.current = undefined;
    reopenedFilters.current = undefined;
    setFlow('base');
  };
  const downloadCurrentArea = () =>
    setDownloadSelection({
      center: activeSearch?.origin ?? previewArea?.center ?? defaults.origin,
      radiusNm: Math.min(25, activeSearch?.maxDistanceNm ?? previewArea?.radiusNm ?? 3),
      areaSelected: !!activeSearch || !!previewArea,
    });
  const areaSelection = (area: MapArea) => ({
    center: [
      (area.bounds[0] + area.bounds[2]) / 2,
      (area.bounds[1] + area.bounds[3]) / 2,
    ] as Position,
    radiusNm: Math.min(50, (area.bounds[3] - area.bounds[1]) * 30),
  });
  const openCachedMap = (area: MapArea) => {
    closeSearch();
    const selection = areaSelection(area);
    setPreviewArea(selection);
    setActiveAreaName(area.name);
    setMapPreview(true);
    setView('map');
    setTab('explore');
    const cached = regionCache.find((row) =>
      regionContains(row.pack, selection.center, selection.radiusNm),
    );
    if (cached) {
      setPack(cached.pack);
      setRegionData(cached);
      setSavedAt(cached.savedAt ?? null);
    } else {
      setPack(createEmptyRegion(selection.center, selection.radiusNm, area.name));
      setRegionData(null);
      setSavedAt(null);
    }
  };
  const openCachedRegion = (data: RegionalData) => {
    closeSearch();
    setPack(data.pack);
    setActiveAreaName(data.pack.name);
    setActiveAreaTimezone(data.pack.timezone);
    setRegionData(data);
    setSavedAt(data.savedAt ?? null);
    setPreviewArea({
      center: [
        (data.pack.bounds[0] + data.pack.bounds[2]) / 2,
        (data.pack.bounds[1] + data.pack.bounds[3]) / 2,
      ],
      radiusNm: Math.min(50, (data.pack.bounds[3] - data.pack.bounds[1]) * 30),
    });
    setMapPreview(true);
    setView('map');
    setTab('explore');
    setAssessedAt(new Date().toISOString());
  };
  const removeCachedRegion = (id: string) =>
    void (async () => {
      if (pack.id === id && (watchActive || watchUnverified)) {
        setMessage(
          'Keep the current evidence while the anchor watch is active or its status is unverified.',
        );
        return;
      }
      if (pack.id === id) {
        dataRequest.current?.abort();
        setDataLoading(false);
      }
      await updateEvidenceCache((previous) => previous.filter((row) => row.pack.id !== id));
      if (pack.id === id) {
        await removeLocal('active-region');
        setSavedAt(null);
        setRegionData(null);
        setPack(
          createEmptyRegion(
            activeSearch?.origin ?? previewArea?.center ?? UNSELECTED_ORIGIN,
            activeSearch?.maxDistanceNm ?? previewArea?.radiusNm ?? 3,
          ),
        );
        setDetail(null);
        setPlan(null);
        setWatchSetup(undefined);
        setFlow('base');
        setDataError(
          'Cached evidence removed. Refresh Sources & coverage to download this area again.',
        );
      }
    })().catch(notifyError);
  const saveVessel = (next: VesselProfile) => {
    setVessel(next);
    setVesselConfigured(true);
    setAssessedAt(new Date().toISOString());
    setPlan(null);
    setWatchSetup(undefined);
    if (flow === 'plan') setFlow('base');
    void persist('vessel', next);
  };
  const saveDefaults = (next: SearchRequest) => {
    setDefaults(next);
    setDefaultsConfigured(true);
    void persist('search-defaults', next);
  };
  const savePack = async () => {
    if (!pack.sources.length)
      throw new Error('Choose an area and load real source data before saving analysis.');
    const time = new Date().toISOString();
    await setLocal('active-region', { pack, savedAt: time });
    setSavedAt(time);
    if (regionData) await saveRegionalData(regionData);
  };
  const changePack = (next: RegionPack) => {
    if (validateLiveRegionPack(next).length) {
      setMessage('Regional data was rejected because its provenance could not be verified.');
      return;
    }
    setPack(next);
    setSavedAt(new Date().toISOString());
    closeSearch();
    setAssessedAt(new Date().toISOString());
    setRegionData(null);
  };
  const select = (assessment: Assessment) => {
    setSelectedId(assessment.id);
    setDetailSearch(null);
    setDetail(assessment);
  };
  const dropPin = (position: Position) => {
    if (!activeSearch || !vesselReady) return;
    const candidate: Candidate = {
      id: 'custom-pin',
      name: 'Selected anchor position',
      kind: 'generated',
      position,
    };
    const checked = reassessSelection(candidate, vessel, activeSearch, pack, {
      purpose: 'current',
      assessedAt: new Date().toISOString(),
    });
    if (!checked.assessment) {
      setMessage('Choose a valid position within 85° north or south and 180° east or west.');
      return;
    }
    setCustomPin(candidate);
    setChoosingPin(false);
    select(checked.assessment);
  };
  const saveResults = async () => {
    if (!activeSearch || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const time = new Date().toISOString();
      const snapshot: SavedSearch = {
        id: 'search-' + Date.now(),
        name: saveName.trim() || pack.name + ' search',
        savedAt: time,
        search: activeSearch,
        filters: { ...filters },
        vesselName: vessel.name,
        evidence: 'non-synthetic',
        packId: pack.id,
        packVersion: pack.version,
        ...(customPin ? { selectedPosition: customPin.position } : {}),
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
    if (!requireVessel()) return;
    if (
      offline &&
      snapshot.packId !== pack.id &&
      !regionCache.some((row) => row.pack.id === snapshot.packId)
    ) {
      setMessage('Reconnect to reopen this area, or download its place and weather data first.');
      return;
    }
    reopenedFilters.current = snapshot.filters;
    reopenedPin.current = snapshot.selectedPosition;
    const savedRegion =
      regionCache.find((row) => row.pack.id === snapshot.packId)?.pack ??
      (pack.id === snapshot.packId ? pack : undefined);
    const prepared = prepareSavedSearch(snapshot.search);
    if (prepared.needsDateReview) {
      setTab('explore');
      setFlow('base');
      setSearchDraft(prepared.search);
      setSearchDraftArea({
        confirmed: true,
        name: savedRegion?.name,
        timezone: savedRegion?.timezone,
      });
      setMessage('This saved stay has ended. Review the proposed new dates before searching.');
      return;
    }
    submitSearch(
      prepared.search,
      savedRegion ? { regionName: savedRegion.name, timezone: savedRegion.timezone } : undefined,
    );
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
      await setLocal('preferences', { units, offline: offlinePreference, layers, language: 'en' });
      await setLocal('profile-confirmed-v3', true);
      await setLocal('setup-complete-v2', true);
      setSetupOpen(false);
      setReviewingSetup(false);
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
    Number(getPreferredBeddings(activeSearch ?? defaults).length > 0);
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
            nativeWatchAvailable={watchStatus?.nativeAvailable === true}
            onEditSearch={(request, position) => {
              setSearchDraft({ ...request });
              setSearchDraftArea({
                confirmed: true,
                name: activeAreaName,
                timezone: activeAreaTimezone,
              });
              reopenedPin.current = position;
              reopenedFilters.current = undefined;
            }}
          />
        </View>
      ) : null}
      {flow === 'watch' ? (
        <WatchScreen position={watchSetup?.position} radius={watchSetup?.radius} units={units} />
      ) : flow === 'plan' && plan && activeSearch ? null : tab === 'settings' ? (
        <SettingsScreen
          pack={pack}
          units={units}
          setUnits={(u) => savePreferences(u, offlinePreference, layers)}
          offline={offlinePreference}
          connectivity={connectivity}
          setOffline={(o) => savePreferences(units, o, layers)}
          savedAt={savedAt}
          onSave={savePack}
          onPack={changePack}
          onDownloadMap={downloadCurrentArea}
          onViewData={() => setDataOpen(true)}
          vessel={vessel}
          onEditVessel={() => setProfileOpen(true)}
          onEditDefaults={() => setDefaultsOpen(true)}
          onTour={() => setTourOpen(true)}
          onSetup={() => {
            setSetupError('');
            setReviewingSetup(true);
            setSetupOpen(true);
          }}
          language="en"
          setLanguage={() => {}}
          layers={layers}
          setLayers={(l) => savePreferences(units, offlinePreference, l)}
        />
      ) : tab === 'saved' ? (
        <SavedScreen
          searches={saved}
          pack={pack}
          savedAt={savedAt}
          units={units}
          onOpen={reopenSaved}
          mapAreas={mapAreas}
          dataRegions={regionCache}
          onDownloadMap={downloadCurrentArea}
          onOpenMap={openCachedMap}
          onResumeMap={(area) => setDownloadSelection({ ...areaSelection(area), resume: area })}
          onRefreshMap={(area) =>
            setDownloadSelection({ ...areaSelection(area), areaSelected: true })
          }
          onDeleteMap={(id) => void deleteMapArea(id).then(refreshMapAreas).catch(notifyError)}
          onOpenRegion={openCachedRegion}
          onDeleteRegion={removeCachedRegion}
          onDelete={deleteSaved}
          onMap={() => {
            closeSearch();
            setPreviewArea({
              center: [
                (pack.bounds[0] + pack.bounds[2]) / 2,
                (pack.bounds[1] + pack.bounds[3]) / 2,
              ],
              radiusNm: Math.min(50, (pack.bounds[3] - pack.bounds[1]) * 30),
            });
            setActiveAreaName(pack.name);
            setActiveAreaTimezone(pack.timezone);
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
                        pack.name + ' · ' + new Date(activeSearch.arrival).toLocaleDateString(),
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
              {!activeSearch && mapPreview ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close map preview"
                  onPress={closeSearch}
                  style={s.iconButton}
                >
                  <Icon name="x" />
                  {wide ? <Text style={s.linkText}>Close map</Text> : null}
                </Pressable>
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
                    disabled={mode === 'list' && !activeSearch}
                    onPress={() => setView(mode)}
                    style={[
                      s.viewButton,
                      view === mode && s.viewSelected,
                      mode === 'list' && !activeSearch && { opacity: 0.4 },
                    ]}
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
          {activeSearch || mapPreview ? (
            <View
              style={{
                paddingHorizontal: wide ? 24 : 16,
                paddingVertical: 8,
                gap: 6,
                borderBottomWidth: 1,
                borderColor: c.line,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDataOpen(true)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 5,
                  }}
                >
                  {dataLoading ? (
                    <ActivityIndicator size="small" color={c.blue} />
                  ) : (
                    <Icon name="database" size={15} color={c.blue} />
                  )}
                  <Text style={s.linkText}>
                    {dataLoading
                      ? 'Loading live sources…'
                      : offline
                        ? 'Downloaded data · view coverage'
                        : 'Sources & coverage'}
                  </Text>
                </Pressable>
                {dataLoading ? (
                  <Button
                    small
                    secondary
                    onPress={() => {
                      dataRequest.current?.abort();
                      setDataLoading(false);
                      setDataError(
                        'Loading cancelled. Previously available data remains unchanged.',
                      );
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </View>
              {offline ? (
                <Text accessibilityLiveRegion="polite" style={s.secondaryText}>
                  {offlinePreference
                    ? 'Offline planning is enabled in Settings.'
                    : 'No network connection. Using downloaded maps and dated evidence.'}
                </Text>
              ) : null}
              {dataError ? (
                <Text accessibilityLiveRegion="polite" style={s.secondaryText}>
                  {dataError}
                </Text>
              ) : regionData && !dataLoading ? (
                <Text style={s.secondaryText}>
                  {regionData.providers.some(
                    (provider) =>
                      provider.id === 'osm-overpass' && provider.status === 'unavailable',
                  )
                    ? 'Place service unavailable · '
                    : `${regionData.pack.places.length} place records · `}
                  {regionData.pack.weather.length} forecast intervals. Open sources for missing
                  coverage.
                </Text>
              ) : null}
            </View>
          ) : null}
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
              <Button secondary onPress={downloadCurrentArea} icon="download">
                Download a map area
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
                    <Text style={s.secondaryText}>
                      {filters.sort === 'distance'
                        ? 'Straight-line distance'
                        : sortLabels[filters.sort]}{' '}
                      · suitability first
                    </Text>
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
                        <Text style={s.sectionLabel}>
                          {dataLoading ? 'Loading places and weather…' : 'No matching results'}
                        </Text>
                        <Text style={s.secondaryText}>
                          {dataLoading
                            ? 'Available source records will appear here. You can keep using the map while they load.'
                            : 'Try another area or review the filters. Missing evidence cannot establish a suitable position.'}
                        </Text>
                        <Button secondary onPress={openSearch}>
                          Edit search
                        </Button>
                        <Button secondary onPress={() => setAdvancedOpen(true)}>
                          Review filters
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
                    assessments={mapAssessments}
                    selectedId={selectedId}
                    origin={activeSearch?.origin ?? previewArea?.center ?? defaults.origin}
                    onSelect={(id) => {
                      const found = mapAssessments.find((a) => a.id === id);
                      if (found) select(found);
                    }}
                    onPin={dropPin}
                    selectOnTap={choosingPin}
                    units={units}
                    onlineBasemap={!offline}
                    showDepth={layers.depth}
                    showBedding={layers.bedding}
                    showMarks={layers.marks}
                    searchRadiusNm={activeSearch?.maxDistanceNm ?? previewArea?.radiusNm}
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
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Download map area"
                      onPress={downloadCurrentArea}
                      style={s.mapControl}
                    >
                      <Icon name="download" size={16} />
                      <Text style={s.linkText}>Download</Text>
                    </Pressable>
                    {activeSearch ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          choosingPin
                            ? 'Cancel anchor position selection'
                            : 'Choose anchor position on map'
                        }
                        onPress={() => setChoosingPin(!choosingPin)}
                        style={s.mapControl}
                      >
                        <Icon name={choosingPin ? 'x' : 'map-pin'} size={16} />
                        <Text style={s.linkText}>{choosingPin ? 'Cancel pin' : 'Choose pin'}</Text>
                      </Pressable>
                    ) : null}
                    {activeSearch ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Show ${assessments.length} results in list`}
                        onPress={() => setView('list')}
                        style={s.mapCount}
                      >
                        <Text style={s.secondaryText}>
                          {assessments.length} results
                          {mapAssessments.length > 50
                            ? ` · first ${customPin ? 49 : 50} on map`
                            : ''}
                          {offline ? ' · Offline' : ''}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {choosingPin ? (
                    <View pointerEvents="none" style={[s.selectedCard, { bottom: 18 }]}>
                      <Text style={s.secondaryText}>
                        Tap the map to inspect an anchor position. Its depth, restrictions and swing
                        space still require evidence.
                      </Text>
                    </View>
                  ) : null}
                  {selected && !choosingPin ? (
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
          onUnits={(u) => savePreferences(u, offlinePreference, layers)}
          onEditVessel={() => setProfileOpen(true)}
          onEditDefaults={() => setDefaultsOpen(true)}
          vesselConfigured={vesselConfigured}
          defaultsConfigured={defaultsConfigured}
          onFinish={finishSetup}
          onClose={
            reviewingSetup
              ? () => {
                  setSetupOpen(false);
                  setReviewingSetup(false);
                }
              : undefined
          }
          busy={setupSaving}
          error={setupError}
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
          initialAreaConfirmed={searchDraftArea.confirmed}
          initialRegionName={searchDraftArea.name}
          initialRegionTimezone={searchDraftArea.timezone}
          pack={pack}
          offline={offline}
          units={units}
          onFindLocation={findLocations}
          onSave={submitSearch}
          onClose={() => {
            setSearchDraft(null);
            reopenedPin.current = undefined;
            reopenedFilters.current = undefined;
          }}
        />
      ) : null}
      {advancedOpen ? (
        <AdvancedFiltersSheet
          filters={filters}
          bedding={getPreferredBeddings(activeSearch ?? defaults)}
          onApply={(next, bedding) => {
            setFilters(next);
            if (activeSearch) {
              setActiveSearch({
                ...activeSearch,
                preferredBeddings: bedding,
                preferredBedding: undefined,
              });
              setAssessedAt(new Date().toISOString());
            } else
              saveDefaults({
                ...defaults,
                preferredBeddings: bedding,
                preferredBedding: undefined,
              });
          }}
          onClose={() => setAdvancedOpen(false)}
        />
      ) : null}
      {layersOpen ? (
        <MapLayersSheet
          pack={pack}
          layers={layers}
          onChange={(next) => savePreferences(units, offlinePreference, next)}
          onClose={() => setLayersOpen(false)}
        />
      ) : null}
      {downloadSelection ? (
        <MapDownloadsSheet
          pack={pack}
          center={downloadSelection.center}
          radiusNm={downloadSelection.radiusNm}
          resume={downloadSelection.resume}
          initialAreaConfirmed={downloadSelection.areaSelected ?? !!downloadSelection.resume}
          offline={offline}
          units={units}
          onSaved={refreshMapAreas}
          onEvidenceDownload={async (center, radiusNm, signal, regionName, timezone) => {
            const data = await discoverRegion(
              {
                ...freshSearch(defaults),
                origin: center,
                maxDistanceNm: radiusNm,
              },
              signal,
              regionName,
              timezone,
            );
            if (signal?.aborted) throw new Error('Area data download cancelled.');
            await saveRegionalData(data);
          }}
          onClose={() => setDownloadSelection(null)}
        />
      ) : null}
      {dataOpen ? (
        <RegionalDataSheet
          units={units}
          pack={regionData?.pack ?? pack}
          data={regionData}
          error={dataError}
          loading={dataLoading}
          offline={offline}
          selectedArea={!!activeSearch || !!previewArea}
          onRetry={() => {
            if (!activeSearch && !previewArea) {
              setDataOpen(false);
              openSearch();
              return;
            }
            void loadSearchData(
              activeSearch ?? {
                ...freshSearch(defaults),
                origin: previewArea?.center ?? defaults.origin,
                maxDistanceNm: previewArea?.radiusNm ?? defaults.maxDistanceNm,
              },
              true,
              activeAreaName,
              activeAreaTimezone,
            );
          }}
          onSettings={() => {
            setDataOpen(false);
            changeTab('settings');
          }}
          onClose={() => setDataOpen(false)}
        />
      ) : null}
      {currentDetail ? (
        <Details
          assessment={currentDetail}
          pack={pack}
          units={units}
          onClose={() => setDetail(null)}
          onSources={() => {
            setDetail(null);
            setDataOpen(true);
          }}
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
      {detail && detailState?.error ? (
        <Sheet title="Selection needs refreshing" onClose={() => setDetail(null)}>
          <Notice tone="warning">{detailState.error}</Notice>
          <Button onPress={() => setDetail(null)}>Back to current results</Button>
        </Sheet>
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
    flexWrap: 'wrap',
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
