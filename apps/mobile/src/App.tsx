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
import * as Crypto from 'expo-crypto';
import {
  createDefaultSearch,
  createVesselDraft,
  getPreferredBeddings,
  searchRegion,
  validateLiveRegionPack,
  validateSearch,
  validateVessel,
  vesselCompatibilityFingerprint,
  type Assessment,
  type AssessmentContext,
  type Candidate,
  type Position,
  type RegionPack,
  type SearchRequest,
  type UnitSystem,
  type VesselProfile,
  type SavedPlanPayload,
} from '@anchor-buddy/domain';
import Chart from './components/Chart';
import ResultCard, { StatusBadge } from './components/ResultCard';
import { createResultPresentation } from './lib/resultPresentation';
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
import { getLocal, getLocalRaw, setLocal, removeLocal } from './lib/storage';
import { createSettingsRepository, type MobileSettingsPayload } from './lib/settingsPersistence';
import { completeSetup } from './lib/setupCompletion';
import {
  readStartupCategory,
  type StartupCategory,
  type StartupIssue,
  type StartupResult,
} from './lib/startupRecovery';
import {
  createPreferenceCommands,
  type PreferenceKey,
  type PreferenceStatuses,
} from './lib/preferenceCommands';
const settingsRepository = createSettingsRepository({
  get: getLocal,
  getRaw: getLocalRaw,
  set: setLocal,
});
import { discoverRegion, findLocations } from './lib/regionalData';
import { useConnectivity } from './lib/useConnectivity';
import { useEvidenceRefresh } from './lib/useEvidenceRefresh';
import { shouldRefreshEvidence } from './lib/connectivityCore';
import { evidencePresentation } from './lib/evidencePresentation';
import { createForecastStay, type ForecastStay } from './lib/forecastPresentation';
import {
  cacheRegion,
  createEmptyRegion,
  regionContains,
  type RegionalData,
} from './lib/regionalDataCore';
import { listMapAreas, deleteMapArea, subscribeMapAreas, type MapArea } from './lib/worldMaps';
import { depth, distance, localTime } from './lib/units';
import { addSavedSnapshot, SAVED_SEARCH_LIMIT } from './lib/savedCapacity';
import {
  createSavedPlansRepository,
  planMaterialChanges,
  prepareSavedPlan,
  type PlanRecord,
  type PlanRead,
} from './lib/savedPlans';
import { deleteEvidence, type DeletionOutcome, type EvidenceCleanup } from './lib/deletion';
import { reassessSelection } from './lib/selectionAssessment';
import {
  DEFAULT_FILTERS,
  DEFAULT_LAYERS,
  freshSearch,
  prepareSavedSearch,
  stayLabel,
  type MapLayers,
  type ResultFilters,
  type SavedSearch,
} from './lib/workspace';
import { colors as c } from './theme';
import { useWorkspaceController } from './lib/useWorkspaceController';
import { cacheCurrentEvidence, observeWatchStatus, type Tab } from './lib/workspaceController';

const savedPlansRepository = createSavedPlansRepository({ getRaw: getLocalRaw, set: setLocal });
const fingerprintVessel = (vessel: VesselProfile) =>
  vesselCompatibilityFingerprint(vessel, async (bytes) =>
    Array.from(
      new Uint8Array(
        await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(bytes).buffer),
      ),
    )
      .map((value) => value.toString(16).padStart(2, '0'))
      .join(''),
  );
const planSources = (pack: RegionPack): SavedPlanPayload['sourcePacks'] =>
  pack.sources.length
    ? [
        {
          id: pack.id,
          version: pack.version,
          ...(pack.snapshot ? { snapshotId: pack.snapshot.id } : {}),
        },
      ]
    : [];

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
  const controller = useWorkspaceController();
  const {
    state: workspace,
    set: setWorkspace,
    modal: setModal,
    dispatch,
    dataRequest,
    generation,
    mounted,
    cancelDataRequest,
  } = controller;
  const {
    activeSearch,
    activeAreaName,
    activeAreaTimezone,
    searchDraft,
    searchDraftArea,
    tab,
    flow,
    previewArea,
    mapPreview,
    view,
    filters,
    selectedId,
    detail,
    detailSearch,
    customPin,
    choosingPin,
    plan,
    watchSetup,
  } = workspace;
  const setActiveSearch = (v: typeof activeSearch) => setWorkspace('activeSearch', v);
  const setFilters = (v: typeof filters) => setWorkspace('filters', v);
  const setSelectedId = (v: typeof selectedId) => setWorkspace('selectedId', v);
  const closeDetails = () => dispatch({ type: 'closeDetails' });
  const setCustomPin = (v: typeof customPin) => setWorkspace('customPin', v);
  const setChoosingPin = (v: typeof choosingPin) => setWorkspace('choosingPin', v);
  const isModal = (name: import('./lib/workspaceController').ModalName) =>
    workspace.modal?.name === name;
  const dataOpen = isModal('data');
  const [sourceStay, setSourceStay] = useState<ForecastStay | null>(null);
  const setDataOpen = (v: boolean, stay?: ForecastStay | null) => {
    if (v)
      setSourceStay(
        stay === undefined ? (activeSearch ? createForecastStay(activeSearch) : null) : stay,
      );
    setModal('data', v);
  };
  const profileOpen = isModal('profile');
  const setProfileOpen = (v: boolean) => setModal('profile', v);
  const defaultsOpen = isModal('defaults');
  const setDefaultsOpen = (v: boolean) => setModal('defaults', v);
  const advancedOpen = isModal('advanced');
  const setAdvancedOpen = (v: boolean) => setModal('advanced', v);
  const layersOpen = isModal('layers');
  const setLayersOpen = (v: boolean) => setModal('layers', v);
  const setupOpen = isModal('setup') || workspace.modal?.parent === 'setup';
  const setSetupOpen = (v: boolean) => setModal('setup', v);
  const tourOpen = isModal('tour');
  const setTourOpen = (v: boolean) => setModal('tour', v);
  const saveOpen = isModal('save');
  const setSaveOpen = (v: boolean) => setModal('save', v);
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const [pack, setPack] = useState(() => createEmptyRegion(UNSELECTED_ORIGIN, 3));
  const [regionCache, setRegionCache] = useState<RegionalData[]>([]);
  const [pendingEvidence, setPendingEvidence] = useState<EvidenceCleanup[]>([]);
  const pendingEvidenceRef = useRef<EvidenceCleanup[]>([]);
  const evidenceDeletionLock = useRef(false);
  const savedDeletionLock = useRef(false);
  const [regionData, setRegionData] = useState<RegionalData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const lastLiveAttempt = useRef(0);
  const evidenceWrites = useRef<Promise<void>>(Promise.resolve());
  const [mapAreas, setMapAreas] = useState<MapArea[]>([]);
  const [downloadSelection, updateDownloadSelection] = useState<{
    center: Position;
    radiusNm: number;
    resume?: MapArea;
    areaSelected?: boolean;
  } | null>(null);
  const setDownloadSelection = (v: typeof downloadSelection) => {
    updateDownloadSelection(v);
    setModal('download', !!v);
  };
  const [vessel, setVessel] = useState<VesselProfile>(createVesselDraft);
  const [defaults, setDefaults] = useState<SearchRequest>(() =>
    createDefaultSearch(UNSELECTED_ORIGIN),
  );
  const [startupLoadingSettings, setStartupLoadingSettings] = useState(true);
  const ready = !startupLoadingSettings;
  const startupCategories: StartupCategory[] = [
    'settings',
    'searches',
    'evidence',
    'region',
    'evidence-cleanup',
  ];
  const [startupIssues, setStartupIssues] = useState<
    Partial<Record<StartupCategory, StartupIssue>>
  >({});
  const startupBlocked = useRef<Partial<Record<StartupCategory, boolean>>>({
    settings: true,
    searches: true,
    evidence: true,
    region: true,
    'evidence-cleanup': true,
  });
  const startupResults = useRef<Partial<Record<StartupCategory, StartupResult>>>({});
  const startupGeneration = useRef<Partial<Record<StartupCategory, number>>>({});
  const startupLive = useRef(true);
  const startupSetupDecided = useRef(false);
  const [units, setUnits] = useState<UnitSystem>('nautical');
  const [offlinePreference, setOffline] = useState(false);
  const connectivity = useConnectivity();
  const offline = offlinePreference || connectivity === 'offline';
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [preferenceStatuses, setPreferenceStatuses] = useState<PreferenceStatuses>({});
  const preferenceStatusRef = useRef<PreferenceStatuses>({});
  const [preferenceCommands] = useState(() =>
    createPreferenceCommands(settingsRepository.commit, (key, status) => {
      if (status) preferenceStatusRef.current[key] = status;
      else delete preferenceStatusRef.current[key];
      setPreferenceStatuses((previous) => {
        const next = { ...previous };
        if (status) next[key] = status;
        else delete next[key];
        return next;
      });
      if (status?.state === 'error')
        setMessage('A preference could not be saved. Retry it in Settings.');
    }),
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [savedPlans, setSavedPlans] = useState<PlanRecord[]>([]);
  const [savedPlansIssue, setSavedPlansIssue] = useState<PlanRead['issue']>();
  const [currentVesselFingerprint, setCurrentVesselFingerprint] = useState('');
  const pendingPlanReview = useRef<PlanRecord | null>(null);
  const planRestoreGeneration = useRef(0);
  const planReadGeneration = useRef(0);
  const planCandidateIds = useRef(new Map<number, string>());
  const planInputs = useRef({ vessel, pack });
  planInputs.current = { vessel, pack };
  const [reassessingVessel, setReassessingVessel] = useState<string | null>(null);
  const planSequence = useRef(0);
  const [watchStatus, setWatchStatus] = useState<Watch.WatchStatus | null>(null);
  const latestWatchStatus = useRef<Watch.WatchStatus | null>(null);
  const lastWatchContact = useRef(-Infinity);
  const previouslyActive = useRef(false);
  const [watchClock, setWatchClock] = useState(monotonicNow);
  const [reviewingSetup, setReviewingSetup] = useState(false);
  const [setupSaving, setSetupSaving] = useState(false);
  const setupSaveLock = useRef(false);
  const [setupError, setSetupError] = useState('');
  const [vesselConfigured, setVesselConfigured] = useState(false);
  const [defaultsConfigured, setDefaultsConfigured] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [replaceSavedId, setReplaceSavedId] = useState<string | undefined>();
  const saveResultsLock = useRef(false);
  const [message, setMessage] = useState('');
  const [assessedAt, setAssessedAt] = useState(() => new Date().toISOString());
  const context = useMemo<AssessmentContext>(
    () => ({ assessedAt, purpose: 'current' }),
    [assessedAt],
  );
  const notifyError = (error: unknown) =>
    setMessage(error instanceof Error ? error.message : String(error));
  const refreshSavedPlans = async () => {
    const generation = ++planReadGeneration.current;
    const result = await savedPlansRepository.read();
    if (mounted.current && generation === planReadGeneration.current) {
      setSavedPlans(result.records);
      setSavedPlansIssue(result.issue);
    }
  };
  useEffect(() => {
    void refreshSavedPlans();
  }, []);
  useEffect(() => {
    let live = true;
    if (!vesselConfigured) {
      setCurrentVesselFingerprint('');
      return () => {
        live = false;
      };
    }
    void fingerprintVessel(vessel)
      .then((value) => {
        if (live) setCurrentVesselFingerprint(value);
      })
      .catch(() => {
        if (live) setCurrentVesselFingerprint('');
      });
    return () => {
      live = false;
    };
  }, [vessel, vesselConfigured]);
  useEffect(() => {
    planRestoreGeneration.current++;
  }, [tab, flow]);
  const persist = async (key: string, value: unknown) => {
    try {
      await setLocal(key, value);
    } catch (error) {
      setMessage('Could not save on this device: ' + String(error));
    }
  };
  const applyStartup = (result: StartupResult) => {
    const { category, issue, value, missing } = result;
    startupResults.current[category] = result;
    startupBlocked.current[category] = !!issue;
    setStartupIssues((previous) => {
      const next = { ...previous };
      if (issue) next[category] = issue;
      else delete next[category];
      return next;
    });
    if (category === 'settings' && !issue && value) {
      const settings = value as MobileSettingsPayload;
      const boat = settings.vessel;
      setVesselConfigured(settings.confirmed.vessel);
      if (boat)
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
      setUnits(settings.units);
      setOffline(settings.offline);
      setLayers(settings.layers);
      if (settings.searchDefaults)
        setDefaults({
          ...settings.searchDefaults,
          preferredBeddings: getPreferredBeddings(settings.searchDefaults),
          preferredBedding: undefined,
        });
      setDefaultsConfigured(settings.confirmed.defaults);
    }
    if (category === 'searches' && value) setSaved(value as SavedSearch[]);
    if (category === 'evidence' || category === 'region' || category === 'evidence-cleanup') {
      const markerResult = startupResults.current['evidence-cleanup'];
      if (markerResult && !markerResult.issue) {
        const pending = (markerResult.value as EvidenceCleanup[] | undefined) ?? [];
        pendingEvidenceRef.current = pending;
        setPendingEvidence(pending);
        const cached = startupResults.current.evidence?.value as RegionalData[] | undefined;
        if (cached)
          setRegionCache(cached.filter((row) => !pending.some((item) => item.id === row.pack.id)));
        const region = startupResults.current.region?.value as
          { pack: RegionPack; savedAt: string } | undefined;
        if (region && !pending.some((item) => item.id === region.pack.id)) {
          setPack(region.pack);
          setSavedAt(region.savedAt);
          setRegionData(cached?.find((row) => row.pack.id === region.pack.id) ?? null);
        }
      }
    }
    const settings = startupResults.current.settings;
    if (settings) setStartupLoadingSettings(false);
    if (
      !startupSetupDecided.current &&
      !pendingEvidenceRef.current.length &&
      startupCategories.every(
        (key) => startupResults.current[key] && !startupResults.current[key]?.issue,
      ) &&
      settings
    ) {
      const payload = settings.value as MobileSettingsPayload;
      startupSetupDecided.current = true;
      setSetupOpen(!payload.setupComplete);
    }
  };
  const retryStartup = (category: StartupCategory) => {
    const generation = (startupGeneration.current[category] ?? 0) + 1;
    startupGeneration.current[category] = generation;
    startupBlocked.current[category] = true;
    void readStartupCategory(category, getLocalRaw, settingsRepository.read).then((result) => {
      if (startupLive.current && startupGeneration.current[category] === generation)
        applyStartup(result);
    });
  };
  useEffect(() => {
    startupLive.current = true;
    startupCategories.forEach(retryStartup);
    return () => {
      startupLive.current = false;
    };
  }, []);
  const assertStartupWritable = (category: StartupCategory) => {
    if (startupBlocked.current[category])
      throw new Error(
        `Stored ${category} data needs recovery before it can be changed. Retry from the recovery notice.`,
      );
  };
  const refreshMapAreas = () =>
    void listMapAreas()
      .then((areas) => {
        if (mounted.current) setMapAreas(areas);
      })
      .catch((error) => {
        if (mounted.current) notifyError(error);
      });
  useEffect(() => {
    refreshMapAreas();
    const unsubscribe = subscribeMapAreas(refreshMapAreas);
    return () => {
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
    const accept = (status: Watch.WatchStatus) => {
      lastWatchContact.current = monotonicNow();
      setWatchClock(lastWatchContact.current);
      previouslyActive.current = activeWatchStates.has(status.state);
      latestWatchStatus.current = status;
      setWatchStatus(status);
    };
    const observer = observeWatchStatus(Watch, accept, () => {
      latestWatchStatus.current = null;
      setWatchStatus(null);
    });
    void observer.refresh();
    const timer = setInterval(() => {
      setWatchClock(monotonicNow());
      if (AppState.currentState === 'active' || AppState.currentState === null)
        void observer.refresh();
    }, 5000);
    const listener = AppState.addEventListener('change', (state) => {
      observer.invalidate();
      latestWatchStatus.current = null;
      setWatchStatus(null);
      if (state === 'active') void observer.refresh();
    });
    return () => {
      observer.dispose();
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
  const resultsWithoutDisplayFilters = useMemo(() => {
    if (!activeSearch || !vesselReady || !result || result.assessments.length) return 0;
    return searchRegion(
      pack,
      vessel,
      activeSearch,
      {
        sortBy: filters.sort,
        gridSpacingM: 500,
        maxGeneratedCandidates: 120,
        clusterDistanceM: 500,
      },
      context,
    ).assessments.length;
  }, [activeSearch, vesselReady, result, pack, vessel, filters.sort, context]);
  const displayResults = useMemo(
    () => createResultPresentation(result?.assessments ?? [], selectedId, custom),
    [result, selectedId, custom],
  );
  const assessedSearch = detailSearch ?? activeSearch;
  const detailState = useMemo(
    () =>
      detail && assessedSearch && vesselReady
        ? reassessSelection(
            detail.candidate,
            vessel,
            assessedSearch,
            pack,
            context,
            detail.allowance,
          )
        : null,
    [detail, assessedSearch, vessel, pack, context, vesselReady],
  );
  const currentDetail = detailState?.assessment ?? null;
  const selected = displayResults.selected?.assessment;
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
    dispatch({ type: 'changeTab', tab: next });
  };
  const changeUnits = (value: UnitSystem) => {
    setUnits(value);
    preferenceCommands.change('units', value);
  };
  const changeOffline = (value: boolean) => {
    if (value && !offline) {
      cancelDataRequest();
      setDataLoading(false);
      setDataError('Offline mode uses downloaded evidence with its original source dates.');
    }
    setOffline(value);
    preferenceCommands.change('offline', value);
  };
  const changeLayer = (key: 'depth' | 'bedding' | 'marks', value: boolean) => {
    setLayers((previous) => ({ ...previous, [key]: value }));
    preferenceCommands.change(key, value);
  };
  const changeLayersFromSheet = (next: MapLayers) => {
    for (const key of ['depth', 'bedding', 'marks'] as const)
      if (next[key] !== layers[key]) changeLayer(key, next[key]);
  };
  const requireVessel = () => {
    if (vesselReady) return true;
    setMessage('Enter and confirm your actual vessel details before searching.');
    setProfileOpen(true);
    return false;
  };
  const openSearch = () => {
    if (!requireVessel()) return;
    dispatch({
      type: 'beginSearch',
      area: {
        confirmed: !!activeSearch || !!previewArea,
        name: activeAreaName,
        timezone: activeAreaTimezone,
      },
      draft: activeSearch
        ? { ...activeSearch }
        : {
            ...freshSearch(defaults),
            ...(previewArea
              ? { origin: previewArea.center, maxDistanceNm: Math.min(25, previewArea.radiusNm) }
              : {}),
          },
    });
  };
  const updateEvidenceCache = (
    update: (previous: RegionalData[]) => RegionalData[],
    allowCleanup = false,
  ) => {
    const task = evidenceWrites.current.then(async () => {
      assertStartupWritable('evidence');
      assertStartupWritable('evidence-cleanup');
      if (!allowCleanup && pendingEvidenceRef.current.length)
        throw new Error('Complete pending evidence removal before changing cached data.');
      const current = await readStartupCategory('evidence', getLocalRaw, settingsRepository.read);
      if (current.issue) throw new Error(current.issue.message);
      const previous = (current.value as RegionalData[] | undefined) ?? [];
      const next = update(previous);
      if (next === previous) return;
      startupGeneration.current.evidence = (startupGeneration.current.evidence ?? 0) + 1;
      await setLocal('regional-evidence-v1', next);
      startupResults.current.evidence = { category: 'evidence', value: next };
      if (mounted.current)
        setRegionCache(
          next.filter((row) => !pendingEvidenceRef.current.some((item) => item.id === row.pack.id)),
        );
    });
    evidenceWrites.current = task.catch(() => {});
    return task;
  };
  const saveRegionalData = async (
    data: RegionalData,
    retention: 'automatic' | 'retained' = 'automatic',
  ) => {
    const stored = { ...data, savedAt: new Date().toISOString(), retention };
    let skipped = false;
    await updateEvidenceCache((previous) => {
      const next = cacheRegion(previous, stored);
      skipped = next === previous;
      return next;
    });
    return skipped ? { ...data, savedAt: undefined } : stored;
  };
  const setEvidenceRetention = async (id: string, retention: 'automatic' | 'retained') => {
    await updateEvidenceCache((previous) => {
      if (!previous.some((row) => row.pack.id === id))
        throw new Error('This cached data is no longer available.');
      return previous.map((row) => (row.pack.id === id ? { ...row, retention } : row));
    });
  };
  const loadSearchData = async (
    search: SearchRequest,
    forceLive = false,
    regionName?: string,
    timezone?: string,
    reassessmentVessel?: string,
  ) => {
    cancelDataRequest();
    const request = generation.current.begin();
    const controller = new AbortController();
    dataRequest.current = controller;
    setReassessingVessel(reassessmentVessel ?? null);
    const announceReassessment = (outcome: string) => {
      if (reassessmentVessel && !controller.signal.aborted && generation.current.current(request))
        setMessage(`Reassessed with ${reassessmentVessel}. ${outcome}`);
    };
    setDataError('');
    const cached = regionCache.find((row) =>
      regionContains(row.pack, search.origin, search.maxDistanceNm),
    );
    const keepReviewed =
      pack.validation.status === 'reviewed' &&
      regionContains(pack, search.origin, search.maxDistanceNm);
    const keepAvailable =
      pack.sources.length > 0 && regionContains(pack, search.origin, search.maxDistanceNm);
    if (offline) {
      setDataLoading(false);
      if (cached && !keepReviewed) {
        setPack(cached.pack);
        setRegionData(cached);
        setSavedAt(cached.savedAt ?? null);
        announceReassessment(
          'Using downloaded evidence with its original dates; coverage and freshness may be incomplete.',
        );
      } else if (keepReviewed) {
        announceReassessment('Using the retained reviewed pack with its original source dates.');
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
          'No downloaded nautical evidence covers this search. Reconnect to load place and weather data.',
        );
        announceReassessment(
          'No downloaded evidence covers this area. Reconnect to load sources; suitability remains unresolved.',
        );
      } else {
        announceReassessment(
          pack.sources.length
            ? 'Using evidence retained in this session with its original dates; coverage and freshness may be incomplete.'
            : 'No nautical evidence is available for this area. Reconnect to load sources; suitability remains unresolved.',
        );
      }
      return;
    }
    setDataLoading(true);
    if (cached && !keepReviewed && !keepAvailable) {
      setPack(cached.pack);
      setRegionData(cached);
      setSavedAt(cached.savedAt ?? null);
    } else if (!keepReviewed && !keepAvailable) {
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
      if (controller.signal.aborted || !generation.current.current(request)) return;
      // A separately reviewed chart pack remains authoritative. Live discovery cannot downgrade it.
      if (keepReviewed) {
        setRegionData({ ...loaded, savedAt: undefined });
        setDataError(
          'Live source observations loaded. The reviewed assessment pack remains active; refresh its published version in Settings for updated analysis.',
        );
      } else {
        setPack(loaded.pack);
        setRegionData({ ...loaded, savedAt: undefined });
        setSavedAt(null);
      }
      setAssessedAt(new Date().toISOString());
      try {
        await cacheCurrentEvidence(
          loaded,
          (data) => saveRegionalData(data, 'automatic'),
          () => !controller.signal.aborted && generation.current.current(request),
          (stored) => {
            if (!keepReviewed) setSavedAt(stored.savedAt ?? null);
            setRegionData(stored);
          },
        );
      } catch (error) {
        if (!controller.signal.aborted && generation.current.current(request))
          setDataError(
            'Live data loaded, but could not be cached. Manage cached data in Saved, then retry: ' +
              String(error),
          );
      }
      announceReassessment(
        keepReviewed
          ? 'Live observations loaded; the retained reviewed assessment pack remains active.'
          : loaded.partial
            ? 'New observations loaded with partial evidence. Review missing coverage and original source dates.'
            : 'New observations loaded. Review source dates and the assessment before proceeding.',
      );
    } catch (error) {
      if (!controller.signal.aborted && generation.current.current(request)) {
        setDataError(
          (error instanceof Error ? error.message : String(error)) +
            (cached || keepAvailable || keepReviewed
              ? ' Previously downloaded evidence is retained with its original dates.'
              : ' No sample results have been substituted.'),
        );
        announceReassessment(
          cached || keepAvailable || keepReviewed
            ? 'Live retrieval failed. Retained evidence keeps its original dates and may be incomplete or expired.'
            : 'Live retrieval failed and no evidence is available for this area. Suitability remains unresolved.',
        );
      }
    } finally {
      if (generation.current.current(request)) setDataLoading(false);
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
      cancelDataRequest();
      setDataLoading(false);
    },
  });
  const evidenceState = evidencePresentation({
    preference: offlinePreference,
    connectivity,
    loading: dataLoading,
    error: dataError,
    hasEvidence: pack.sources.length > 0,
    partial: regionData?.partial ?? pack.validation.status !== 'reviewed',
    expiresAt: pack.validUntil,
    now: Date.parse(assessedAt),
    lastAttempt: lastLiveAttempt.current,
    selectedArea: !!activeSearch || !!previewArea,
  });
  useEffect(() => {
    const remaining = lastLiveAttempt.current + 60_000 - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setAssessedAt(new Date().toISOString()), remaining + 10);
    return () => clearTimeout(timer);
  }, [dataLoading, assessedAt]);
  const retryEvidence = () => {
    if (
      !shouldRefreshEvidence({
        offline,
        active: !!activeSearch || !!previewArea,
        loading: dataLoading,
        now: Date.now(),
        lastAttempt: lastLiveAttempt.current,
        force: true,
      })
    )
      return;
    void loadSearchData(
      activeSearch ?? {
        ...freshSearch(defaults),
        origin: previewArea!.center,
        maxDistanceNm: previewArea!.radiusNm,
      },
      true,
      activeAreaName,
      activeAreaTimezone,
    );
  };
  const submitSearch = (
    search: SearchRequest,
    selection?: { regionName: string; timezone?: string },
    restore?: { filters?: ResultFilters; pin?: Position },
    reassessmentVessel?: string,
  ) => {
    if (!requireVessel()) return;
    dispatch({
      type: 'commitSearch',
      search,
      area: selection,
      filters: restore?.filters,
      pin: restore?.pin,
    });
    setAssessedAt(new Date().toISOString());
    void loadSearchData(
      search,
      false,
      selection?.regionName,
      selection?.timezone,
      reassessmentVessel,
    );
  };
  const closeSearch = () => {
    cancelDataRequest();
    setDataLoading(false);
    setDataError('');
    dispatch({ type: mapPreview && !activeSearch ? 'closePreview' : 'closeSearch' });
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
    if (area.cleanupPending) {
      setMessage('Map removal is incomplete. Retry deletion in Saved.');
      return;
    }
    cancelDataRequest();
    setDataLoading(false);
    setDataError('');
    const selection = areaSelection(area);
    dispatch({ type: 'openPreview', area: selection, name: area.name });
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
    if (
      startupBlocked.current['evidence-cleanup'] ||
      pendingEvidenceRef.current.some((item) => item.id === data.pack.id)
    ) {
      setMessage('Evidence removal needs attention. Retry deletion in Saved.');
      return;
    }
    cancelDataRequest();
    setDataLoading(false);
    setDataError('');
    setPack(data.pack);
    setRegionData(data);
    setSavedAt(data.savedAt ?? null);
    dispatch({
      type: 'openPreview',
      name: data.pack.name,
      timezone: data.pack.timezone,
      area: {
        center: [
          (data.pack.bounds[0] + data.pack.bounds[2]) / 2,
          (data.pack.bounds[1] + data.pack.bounds[3]) / 2,
        ],
        radiusNm: Math.min(50, (data.pack.bounds[3] - data.pack.bounds[1]) * 30),
      },
    });
    setAssessedAt(new Date().toISOString());
  };
  const removeCachedRegion = async (id: string, name: string): Promise<DeletionOutcome> => {
    if (evidenceDeletionLock.current)
      return { status: 'unchanged', message: 'Another removal is in progress.' };
    evidenceDeletionLock.current = true;
    try {
      return await deleteEvidence(
        { id, name },
        {
          readMarkers: async () => {
            assertStartupWritable('evidence-cleanup');
            const result = await readStartupCategory(
              'evidence-cleanup',
              getLocalRaw,
              settingsRepository.read,
            );
            if (result.issue) throw new Error(result.issue.message);
            return (result.value as EvidenceCleanup[] | undefined) ?? [];
          },
          writeMarkers: (rows) => setLocal('evidence-cleanup-v1', rows),
          onPending: (rows) => {
            pendingEvidenceRef.current = rows;
            setPendingEvidence(rows);
            startupResults.current['evidence-cleanup'] = {
              category: 'evidence-cleanup',
              value: rows,
            };
            if (rows.some((item) => item.id === id)) {
              setRegionCache((previous) => previous.filter((row) => row.pack.id !== id));
              if (pack.id === id && !previouslyActive.current && !watchUnverified) {
                cancelDataRequest();
                setDataLoading(false);
                setSavedAt(null);
                setRegionData(null);
                setPack(
                  createEmptyRegion(
                    activeSearch?.origin ?? previewArea?.center ?? UNSELECTED_ORIGIN,
                    activeSearch?.maxDistanceNm ?? previewArea?.radiusNm ?? 3,
                  ),
                );
                dispatch({ type: 'invalidateEvidence' });
              }
            }
          },
          ensureAllowed: async () => {
            assertStartupWritable('evidence');
            assertStartupWritable('region');
            const current = await readStartupCategory(
              'region',
              getLocalRaw,
              settingsRepository.read,
            );
            if (current.issue) throw new Error(current.issue.message);
            const active = current.value as { pack: RegionPack } | undefined;
            const age = monotonicNow() - lastWatchContact.current;
            const status = latestWatchStatus.current;
            if (
              (active?.pack.id === id || pack.id === id) &&
              (!status ||
                status.serviceRunning ||
                activeWatchStates.has(status.state) ||
                !Number.isFinite(age) ||
                age < 0 ||
                age > 12_000)
            )
              throw new Error(
                'Keep the current evidence while the anchor watch is active or its status is unverified.',
              );
          },
          removeCache: async (target) => {
            await updateEvidenceCache(
              (previous) => previous.filter((row) => row.pack.id !== target),
              true,
            );
          },
          removeActive: async (target) => {
            const current = await readStartupCategory(
              'region',
              getLocalRaw,
              settingsRepository.read,
            );
            if (current.issue) throw new Error(current.issue.message);
            if ((current.value as { pack: RegionPack } | undefined)?.pack.id === target) {
              startupGeneration.current.region = (startupGeneration.current.region ?? 0) + 1;
              await removeLocal('active-region');
              startupResults.current.region = { category: 'region', missing: true };
            }
            if (pack.id === target) {
              cancelDataRequest();
              setDataLoading(false);
              setSavedAt(null);
              setRegionData(null);
              setPack(
                createEmptyRegion(
                  activeSearch?.origin ?? previewArea?.center ?? UNSELECTED_ORIGIN,
                  activeSearch?.maxDistanceNm ?? previewArea?.radiusNm ?? 3,
                ),
              );
              dispatch({ type: 'invalidateEvidence' });
              setDataError(
                'Cached evidence removed. Refresh Sources & coverage to download this area again.',
              );
            }
          },
        },
      );
    } finally {
      evidenceDeletionLock.current = false;
    }
  };
  const saveVessel = async (next: VesselProfile) => {
    const result = await settingsRepository.commit((current) => ({
      vessel: next,
      confirmed: { ...current.confirmed, vessel: true },
    }));
    if (result.status === 'failed') throw new Error(result.error);
    setVessel(next);
    setVesselConfigured(true);
    setAssessedAt(new Date().toISOString());
    dispatch({ type: 'commitProfile' });
  };
  const saveDefaults = async (next: SearchRequest) => {
    const result = await settingsRepository.commit((current) => ({
      searchDefaults: next,
      confirmed: { ...current.confirmed, defaults: true },
    }));
    if (result.status === 'failed') throw new Error(result.error);
    setDefaults(next);
    setDefaultsConfigured(true);
  };
  const savePack = async () => {
    if (!pack.sources.length)
      throw new Error('Choose an area and load real source data before saving analysis.');
    const time = new Date().toISOString();
    assertStartupWritable('region');
    assertStartupWritable('evidence-cleanup');
    if (pendingEvidenceRef.current.length)
      throw new Error('Complete pending evidence removal before saving regional analysis.');
    if (regionData) await saveRegionalData(regionData, 'retained');
    startupGeneration.current.region = (startupGeneration.current.region ?? 0) + 1;
    await setLocal('active-region', { pack, savedAt: time });
    startupResults.current.region = { category: 'region', value: { pack, savedAt: time } };
    setSavedAt(time);
  };
  const changePack = (next: RegionPack) => {
    if (validateLiveRegionPack(next).length) {
      setMessage('Regional data was rejected because its provenance could not be verified.');
      return;
    }
    const time = new Date().toISOString();
    startupGeneration.current.region = (startupGeneration.current.region ?? 0) + 1;
    startupResults.current.region = { category: 'region', value: { pack: next, savedAt: time } };
    setPack(next);
    setSavedAt(time);
    closeSearch();
    setAssessedAt(new Date().toISOString());
    setRegionData(null);
  };
  const select = (assessment: Assessment) => {
    dispatch({
      type: 'openDetails',
      selection: { candidate: assessment.candidate, allowance: assessment.depthAllowancePercent },
      search: null,
    });
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
    if (!activeSearch || saveResultsLock.current) return;
    saveResultsLock.current = true;
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
      assertStartupWritable('searches');
      const current = await readStartupCategory('searches', getLocalRaw, settingsRepository.read);
      if (current.issue) throw new Error(current.issue.message);
      const existing = (current.value as SavedSearch[] | undefined) ?? [];
      setSaved(existing);
      const next = addSavedSnapshot(existing, snapshot, replaceSavedId);
      startupGeneration.current.searches = (startupGeneration.current.searches ?? 0) + 1;
      await setLocal('saved-searches', next);
      startupResults.current.searches = { category: 'searches', value: next };
      setSaved(next);
      setSaveOpen(false);
      setMessage(
        existing.length === SAVED_SEARCH_LIMIT && replaceSavedId
          ? 'Saved results and replaced the selected snapshot.'
          : 'Results saved. Open them from Saved.',
      );
    } catch (error) {
      setSaveError('Could not save results on this device: ' + String(error));
    } finally {
      saveResultsLock.current = false;
      setSaving(false);
    }
  };
  const deleteSaved = async (id: string): Promise<DeletionOutcome> => {
    if (savedDeletionLock.current)
      return { status: 'unchanged', message: 'Another deletion is in progress.' };
    savedDeletionLock.current = true;
    let attempted = false;
    try {
      assertStartupWritable('searches');
      const current = await readStartupCategory('searches', getLocalRaw, settingsRepository.read);
      if (current.issue) throw new Error(current.issue.message);
      const next = ((current.value as SavedSearch[] | undefined) ?? []).filter(
        (item) => item.id !== id,
      );
      attempted = true;
      startupGeneration.current.searches = (startupGeneration.current.searches ?? 0) + 1;
      await setLocal('saved-searches', next);
      startupResults.current.searches = { category: 'searches', value: next };
      setSaved(next);
      return { status: 'complete' };
    } catch (error) {
      if (attempted) {
        const observed = await readStartupCategory(
          'searches',
          getLocalRaw,
          settingsRepository.read,
        );
        if (observed.issue)
          return {
            status: 'cleanup-pending',
            message:
              'Could not verify whether the search was removed. Retry. ' + observed.issue.message,
          };
        const current = (observed.value as SavedSearch[] | undefined) ?? [];
        startupResults.current.searches = { category: 'searches', value: current };
        setSaved(current);
        if (!current.some((item) => item.id === id)) return { status: 'complete' };
      }
      return { status: 'unchanged', message: 'Search was not removed. ' + String(error) };
    } finally {
      savedDeletionLock.current = false;
    }
  };
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
    const savedRegion =
      regionCache.find((row) => row.pack.id === snapshot.packId)?.pack ??
      (pack.id === snapshot.packId ? pack : undefined);
    const prepared = prepareSavedSearch(snapshot.search);
    if (prepared.needsDateReview) {
      dispatch({ type: 'changeTab', tab: 'explore' });
      dispatch({
        type: 'beginSearch',
        draft: prepared.search,
        area: { confirmed: true, name: savedRegion?.name, timezone: savedRegion?.timezone },
        restore: { filters: snapshot.filters, pin: snapshot.selectedPosition },
      });
      setMessage('This saved stay has ended. Review the proposed new dates before searching.');
      return;
    }
    setMessage('');
    submitSearch(
      prepared.search,
      savedRegion ? { regionName: savedRegion.name, timezone: savedRegion.timezone } : undefined,
      { filters: snapshot.filters, pin: snapshot.selectedPosition },
      vessel.name,
    );
  };
  const startRestoredPlan = (record: PlanRecord, search: SearchRequest) => {
    const payload = record.payload;
    const effective = {
      ...search,
      ...(payload.plannedRodeM === undefined ? {} : { deployedRodeM: payload.plannedRodeM }),
    };
    const candidate: Candidate = {
      id: `saved-plan-${record.id}`,
      name: 'Your proposed anchor position',
      kind: 'generated',
      position: payload.selectedPosition,
    };
    pendingPlanReview.current = null;
    submitSearch(search, undefined, { pin: payload.selectedPosition }, vessel.name);
    dispatch({
      type: 'openPlan',
      plan: {
        instance: ++planSequence.current,
        candidate,
        allowance: payload.depthAllowancePercent,
        search: effective,
        savedDraft: { id: record.id, payload },
      },
    });
  };
  const openSavedPlan = async (record: PlanRecord) => {
    if (!requireVessel()) return;
    const generation = ++planRestoreGeneration.current;
    try {
      const fingerprint = await fingerprintVessel(vessel);
      const latest = await savedPlansRepository.read();
      if (!mounted.current || generation !== planRestoreGeneration.current) return;
      if (!latest.records.some((row) => row.id === record.id && row.revision === record.revision))
        throw new Error('This plan changed or was removed. Retry from Saved.');
      setCurrentVesselFingerprint(fingerprint);
      const prepared = prepareSavedPlan(record.payload);
      if (prepared.needsDateReview) {
        pendingPlanReview.current = record;
        dispatch({ type: 'changeTab', tab: 'explore' });
        dispatch({
          type: 'beginSearch',
          draft: prepared.search,
          area: { confirmed: true },
          restore: { pin: record.payload.selectedPosition },
        });
        setMessage(
          'This plan’s stay has ended. Review the proposed dates before reassessing the draft.',
        );
        return;
      }
      startRestoredPlan(record, prepared.search);
    } catch (error) {
      if (mounted.current) notifyError(error);
    }
  };
  const deleteSavedPlan = async (id: string): Promise<DeletionOutcome> => {
    planReadGeneration.current++;
    const outcome = await savedPlansRepository.remove(id);
    await refreshSavedPlans();
    return outcome;
  };
  const finishSetup = async () => {
    if (setupSaveLock.current) return;
    if (Object.keys(preferenceStatusRef.current).length) {
      setSetupError(
        'Wait for preferences to save, or retry unsaved preferences before continuing.',
      );
      return;
    }
    setupSaveLock.current = true;
    setSetupSaving(true);
    setSetupError('');
    try {
      const result = await completeSetup(settingsRepository.commit);
      if (result.status === 'failed') throw new Error(result.error);
      startupSetupDecided.current = true;
      setSetupOpen(false);
      setReviewingSetup(false);
      setTourOpen(true);
    } catch (error) {
      setSetupError('Could not save your setup on this device: ' + String(error));
    } finally {
      setupSaveLock.current = false;
      setSetupSaving(false);
    }
  };
  const showMap = !!activeSearch || mapPreview;
  const ExploreContainer = !wide && showMap ? ScrollView : View;
  const ResultsContainer = wide ? ScrollView : View;
  const MapContainer = wide ? ScrollView : View;
  const searchCaption = activeSearch
    ? stayLabel(activeSearch) + ' · ' + distance(activeSearch.maxDistanceNm, units) + ' radius'
    : mapPreview
      ? 'Saved regional map'
      : 'Set an area and stay window to search.';
  const activeFilterCount =
    Number(filters.kind !== 'all') +
    Number(filters.fee !== 'all') +
    Number(filters.assessment !== 'recommended') +
    Number(filters.compatibleOnly) +
    Number(getPreferredBeddings(activeSearch ?? defaults).length > 0);
  return (
    <SafeAreaView style={s.app}>
      <StatusBar style="dark" />
      <View style={[s.header, !wide && { paddingHorizontal: 16 }]}>
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
            dispatch({ type: 'showWatch' });
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
          <Text
            style={{
              flexShrink: 1,
              fontSize: 12,
              fontWeight: '600',
              color: watchProblem ? c.red : c.ink,
            }}
          >
            {watchLabel}
          </Text>
        </Pressable>
      </View>
      {Object.keys(startupIssues).length ? (
        <ScrollView
          style={{ maxHeight: 160 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 6 }}
        >
          <Notice tone="warning">
            Some local data needs attention. Original records are retained. Watch status remains
            available.
          </Notice>
          {(Object.keys(startupIssues) as StartupCategory[]).map((category) => (
            <View
              key={category}
              style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
            >
              <Text style={{ flex: 1, minWidth: 160, color: c.ink }}>
                {category}: {startupIssues[category]?.message}
              </Text>
              <Button secondary small onPress={() => retryStartup(category)}>
                Retry {category}
              </Button>
            </View>
          ))}
        </ScrollView>
      ) : null}
      {flow !== 'base' ? (
        <View style={s.flowBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'back' })}
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
            evidenceLoading={dataLoading}
            savedPlanName={plan.savedDraft?.payload.name}
            materialNotice={
              plan.savedDraft
                ? [
                    ...(currentVesselFingerprint
                      ? planMaterialChanges(
                          plan.savedDraft.payload,
                          vessel.id,
                          currentVesselFingerprint,
                          planSources(pack),
                        )
                      : ['Checking the current vessel compatibility.']),
                    ...(!dataLoading && dataError ? [dataError] : []),
                    'Draft inputs are reassessed with the current vessel and available evidence. Arrival checks and watch state are not restored.',
                  ].join(' ')
                : undefined
            }
            onSaveDraft={async (draft) => {
              planReadGeneration.current++;
              const sourceVessel = vessel;
              const sourcePack = pack;
              const fingerprint = await fingerprintVessel(sourceVessel);
              const now = new Date().toISOString();
              if (!planCandidateIds.current.has(plan.instance))
                planCandidateIds.current.set(
                  plan.instance,
                  `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                );
              const payload: SavedPlanPayload = {
                ...draft,
                createdAt: plan.savedDraft?.payload.createdAt ?? now,
                updatedAt: now,
                depthAllowancePercent: plan.allowance,
                vesselId: sourceVessel.id,
                vesselFingerprint: fingerprint,
                sourcePacks: planSources(sourcePack),
              };
              const result = await savedPlansRepository.save(
                payload,
                plan.savedDraft?.id,
                () => {
                  if (
                    planInputs.current.vessel !== sourceVessel ||
                    planInputs.current.pack !== sourcePack
                  )
                    throw new Error(
                      'Vessel or evidence changed while saving. Review the plan and retry.',
                    );
                },
                planCandidateIds.current.get(plan.instance),
              );
              if (result.status === 'failed') {
                await refreshSavedPlans();
                throw new Error(result.message);
              }
              if (mounted.current) {
                setSavedPlans(result.records);
                setSavedPlansIssue(undefined);
                dispatch({
                  type: 'markPlanSaved',
                  instance: plan.instance,
                  id: result.record.id,
                  payload: result.record.payload,
                });
              }
            }}
            onDetails={(assessment, request) => {
              dispatch({
                type: 'openDetails',
                selection: {
                  candidate: assessment.candidate,
                  allowance: assessment.depthAllowancePercent,
                },
                search: request ?? plan.search,
              });
            }}
            onWatch={(position, radius) => {
              dispatch({ type: 'showWatch', setup: { position, radius } });
            }}
            nativeWatchAvailable={watchStatus?.nativeAvailable === true}
            onEditSearch={(request, position) => {
              dispatch({
                type: 'beginSearch',
                draft: { ...request },
                area: { confirmed: true, name: activeAreaName, timezone: activeAreaTimezone },
                restore: { pin: position },
              });
            }}
          />
        </View>
      ) : null}
      {flow === 'watch' ? (
        <WatchScreen position={watchSetup?.position} radius={watchSetup?.radius} units={units} />
      ) : startupLoadingSettings ? (
        <View style={s.loading}>
          <ActivityIndicator color={c.blue} />
          <Text style={s.secondaryText}>Loading local settings…</Text>
        </View>
      ) : flow === 'plan' && plan && activeSearch ? null : tab === 'settings' ? (
        <SettingsScreen
          pack={pack}
          units={units}
          setUnits={changeUnits}
          offline={offlinePreference}
          connectivity={connectivity}
          setOffline={changeOffline}
          savedAt={savedAt}
          onSave={savePack}
          onPack={changePack}
          canReplaceRegion={() =>
            !startupBlocked.current.region &&
            !startupBlocked.current['evidence-cleanup'] &&
            pendingEvidenceRef.current.length === 0
          }
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
          setLayer={changeLayer}
          preferenceStatuses={preferenceStatuses}
          onRetryPreference={(key: PreferenceKey) => preferenceCommands.retry(key)}
        />
      ) : tab === 'saved' ? (
        <SavedScreen
          searches={saved}
          plans={savedPlans}
          planIssue={savedPlansIssue}
          onRetryPlans={() => void refreshSavedPlans()}
          onOpenPlan={(record) => void openSavedPlan(record)}
          onDeletePlan={deleteSavedPlan}
          pack={pack}
          savedAt={savedAt}
          units={units}
          onOpen={reopenSaved}
          mapAreas={mapAreas}
          dataRegions={regionCache}
          pendingEvidence={pendingEvidence}
          onSetRetention={setEvidenceRetention}
          onDownloadMap={downloadCurrentArea}
          onOpenMap={openCachedMap}
          onResumeMap={(area) => setDownloadSelection({ ...areaSelection(area), resume: area })}
          onRefreshMap={(area) =>
            setDownloadSelection({ ...areaSelection(area), areaSelected: true })
          }
          onDeleteMap={async (id) => {
            const result = await deleteMapArea(id);
            refreshMapAreas();
            return result;
          }}
          onOpenRegion={openCachedRegion}
          onDeleteRegion={removeCachedRegion}
          onDelete={deleteSaved}
          onMap={() => {
            cancelDataRequest();
            setDataLoading(false);
            setDataError('');
            dispatch({
              type: 'openPreview',
              name: pack.name,
              timezone: pack.timezone,
              area: {
                center: [
                  (pack.bounds[0] + pack.bounds[2]) / 2,
                  (pack.bounds[1] + pack.bounds[3]) / 2,
                ],
                radiusNm: Math.min(50, (pack.bounds[3] - pack.bounds[1]) * 30),
              },
            });
          }}
          onSettings={() => changeTab('settings')}
          onSearch={() => {
            changeTab('explore');
            openSearch();
          }}
        />
      ) : (
        <ExploreContainer
          style={s.explore}
          {...(!wide && showMap ? { contentContainerStyle: { flexGrow: 1 } } : {})}
        >
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
                      setReplaceSavedId(undefined);
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
          {activeSearch ? (
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
                      onPress={() => dispatch({ type: 'changeView', view: mode })}
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
              <Text style={s.secondaryText}>
                Result filters: {kinds.find((kind) => kind.id === filters.kind)?.label};{' '}
                {filters.fee === 'all'
                  ? 'any price'
                  : filters.fee === 'unknown'
                    ? 'fee unknown'
                    : filters.fee}
                ;{' '}
                {filters.assessment === 'all'
                  ? 'including exclusions'
                  : filters.assessment === 'complete'
                    ? 'checks pass only'
                    : 'excluded positions hidden'}
                {filters.compatibleOnly ? '; vessel compatibility required' : ''}. Sort:{' '}
                {sortLabels[filters.sort]}.
              </Text>
              <Text style={s.secondaryText}>
                Search seabed preference:{' '}
                {getPreferredBeddings(activeSearch).length
                  ? getPreferredBeddings(activeSearch).join(', ')
                  : 'all seabeds / no preference'}
                .
              </Text>
              <Button secondary small onPress={() => setFilters({ ...DEFAULT_FILTERS })}>
                Reset result filters
              </Button>
            </View>
          ) : null}
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
                      ? reassessingVessel
                        ? `Reassessing with ${reassessingVessel}…`
                        : 'Loading live sources…'
                      : 'Sources & coverage'}
                  </Text>
                </Pressable>
                {dataLoading ? (
                  <Button
                    small
                    secondary
                    onPress={() => {
                      cancelDataRequest();
                      setDataLoading(false);
                      setDataError(
                        'Loading cancelled. Previously available data remains unchanged.',
                      );
                    }}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    small
                    secondary
                    disabled={evidenceState.retryDisabled}
                    onPress={retryEvidence}
                  >
                    Refresh sources
                  </Button>
                )}
              </View>
              <Text accessibilityLiveRegion="polite" style={s.secondaryText}>
                {evidenceState.connection} · {evidenceState.freshness}
              </Text>
              {pack.sources.length ? (
                <Text style={s.secondaryText}>
                  Source refresh due {localTime(pack.validUntil)}
                  {savedAt ? ` · Cached ${localTime(savedAt)}` : ''}
                </Text>
              ) : null}
              {evidenceState.retryHelp ? (
                <Text style={s.secondaryText}>{evidenceState.retryHelp}</Text>
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
            <ScrollView contentContainerStyle={[s.empty, { flexGrow: 1 }]}>
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
            </ScrollView>
          ) : (
            <View
              style={{
                flex: wide ? 1 : undefined,
                minHeight: 0,
                flexDirection: wide && view === 'map' ? 'row' : 'column',
              }}
            >
              {activeSearch && (view === 'list' || wide) ? (
                <View
                  style={
                    wide && view === 'map'
                      ? s.resultsSidebar
                      : { flex: wide ? 1 : undefined, minHeight: 0 }
                  }
                >
                  <View style={s.resultSummary}>
                    <Text style={s.sectionLabel}>{assessments.length} results</Text>
                    <Text style={s.secondaryText}>
                      {filters.sort === 'distance'
                        ? 'Straight-line distance'
                        : sortLabels[filters.sort]}{' '}
                      · suitability first
                    </Text>
                  </View>
                  <ResultsContainer
                    {...(wide
                      ? { contentContainerStyle: { padding: 16, gap: 12 } }
                      : { style: { padding: 16, gap: 12 } })}
                  >
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
                      displayResults.results.map((entry) => (
                        <ResultCard
                          key={entry.assessment.id}
                          result={entry}
                          onSelect={() => select(entry.assessment)}
                          units={units}
                        />
                      ))
                    ) : (
                      <Card>
                        <Text style={s.sectionLabel}>
                          {dataLoading
                            ? 'Loading places and weather…'
                            : dataError ||
                                regionData?.providers.some(
                                  (provider) =>
                                    provider.id === 'osm-overpass' &&
                                    provider.status === 'unavailable',
                                )
                              ? 'Source retrieval needs attention'
                              : resultsWithoutDisplayFilters > 0
                                ? 'Result filters hide available positions'
                                : !pack.places.length
                                  ? 'No source places returned'
                                  : 'No positions match this search'}
                        </Text>
                        <Text style={s.secondaryText}>
                          {dataLoading
                            ? 'Available source records will appear here. You can keep using the map while they load.'
                            : dataError
                              ? 'Available evidence keeps its original dates. Review the source error and retry when connected.'
                              : resultsWithoutDisplayFilters > 0
                                ? 'Reset result filters or review them. Your search dates, seabed preferences and operating limits stay unchanged.'
                                : !pack.places.length
                                  ? 'No place records or verified generated positions are available. Try another area or inspect source coverage. Missing evidence cannot establish suitability.'
                                  : 'Review the area and search preferences. Missing evidence cannot establish a suitable position.'}
                        </Text>
                        <Button secondary onPress={openSearch}>
                          Edit search
                        </Button>
                        <Button secondary onPress={() => setAdvancedOpen(true)}>
                          Review filters
                        </Button>
                        {resultsWithoutDisplayFilters > 0 ? (
                          <Button secondary onPress={() => setFilters({ ...DEFAULT_FILTERS })}>
                            Reset result filters
                          </Button>
                        ) : null}
                        {!dataLoading ? (
                          <Button secondary onPress={() => setDataOpen(true)}>
                            Review sources & retry
                          </Button>
                        ) : null}
                      </Card>
                    )}
                  </ResultsContainer>
                </View>
              ) : null}
              {view === 'map' || !activeSearch ? (
                <MapContainer
                  style={{ flex: wide ? 1 : undefined, minHeight: 0 }}
                  {...(wide ? { contentContainerStyle: { flexGrow: 1 } } : {})}
                >
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
                        onPress={() => dispatch({ type: 'changeView', view: 'list' })}
                        style={s.mapCount}
                      >
                        <Text style={s.secondaryText}>
                          {assessments.length} results
                          {offline ? ' · Offline' : ''}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={wide ? { flex: 1, minHeight: 320 } : { height: 440 }}>
                    <Chart
                      pack={pack}
                      results={displayResults}
                      onShowList={
                        activeSearch
                          ? () => dispatch({ type: 'changeView', view: 'list' })
                          : undefined
                      }
                      origin={activeSearch?.origin ?? previewArea?.center ?? defaults.origin}
                      onSelect={(id) => {
                        const found = displayResults.markers.find(
                          (entry) => entry.assessment.id === id,
                        )?.assessment;
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
                  </View>
                  {choosingPin ? (
                    <View pointerEvents="none" style={s.selectedCard}>
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
                        <StatusBadge assessment={selected} />
                        <Text style={s.secondaryText}>
                          {depth(selected.maxDepthM, units)} depth ·{' '}
                          {distance(selected.distanceNm, units)} straight-line
                        </Text>
                      </View>
                      <Icon name="chevron-right" color={c.blue} />
                    </Pressable>
                  ) : null}
                </MapContainer>
              ) : null}
            </View>
          )}
        </ExploreContainer>
      )}
      {message ? (
        <View style={s.toast}>
          <Text
            accessibilityLiveRegion="polite"
            style={{ flex: 1, minWidth: 0, color: 'white', fontSize: 13, lineHeight: 20 }}
          >
            {message}
          </Text>
          <Button small secondary onPress={() => setMessage('')}>
            Dismiss message
          </Button>
        </View>
      ) : null}
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
      {setupOpen &&
      flow !== 'watch' &&
      watchStatus &&
      !watchActive &&
      !watchProblem &&
      !profileOpen &&
      !defaultsOpen ? (
        <OnboardingSheet
          units={units}
          onUnits={changeUnits}
          onEditVessel={() => setProfileOpen(true)}
          onEditDefaults={() => setDefaultsOpen(true)}
          vesselConfigured={vesselConfigured}
          defaultsConfigured={defaultsConfigured}
          vesselSummary={
            vesselConfigured
              ? `${vessel.name} · ${depth(vessel.lengthM, units)} length · ${depth(vessel.loadedDraftM, units)} draft`
              : undefined
          }
          defaultsSummary={
            defaultsConfigured
              ? `${distance(defaults.maxDistanceNm, units)} search radius · ${depth(defaults.preferredMaxDepthM, units)} preferred maximum depth`
              : undefined
          }
          preferenceStatus={preferenceStatuses.units}
          otherPreferencesUnsaved={Object.keys(preferenceStatuses).some((key) => key !== 'units')}
          onRetryUnits={() => preferenceCommands.retry('units')}
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
      {searchDraft && isModal('search') ? (
        <SearchSheet
          search={searchDraft}
          initialAreaConfirmed={searchDraftArea.confirmed}
          initialRegionName={searchDraftArea.name}
          initialRegionTimezone={searchDraftArea.timezone}
          pack={pack}
          offline={offline}
          units={units}
          onFindLocation={findLocations}
          onSave={async (search, selection) => {
            const pending = pendingPlanReview.current;
            if (pending) {
              const latest = await savedPlansRepository.read();
              if (
                !latest.records.some(
                  (row) => row.id === pending.id && row.revision === pending.revision,
                )
              )
                throw new Error(
                  'This plan changed or was removed. Cancel and reopen it from Saved.',
                );
              if (!mounted.current || pendingPlanReview.current !== pending) return;
              startRestoredPlan(pending, search);
            } else submitSearch(search, selection);
          }}
          onClose={() => {
            pendingPlanReview.current = null;
            dispatch({ type: 'cancelSearch' });
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
              void saveDefaults({
                ...defaults,
                preferredBeddings: bedding,
                preferredBedding: undefined,
              }).catch(notifyError);
          }}
          onClose={() => setAdvancedOpen(false)}
        />
      ) : null}
      {layersOpen ? (
        <MapLayersSheet
          pack={pack}
          layers={layers}
          onChange={changeLayersFromSheet}
          onClose={() => setLayersOpen(false)}
        />
      ) : null}
      {downloadSelection && isModal('download') ? (
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
            await saveRegionalData(data, 'retained');
          }}
          onClose={() => setDownloadSelection(null)}
        />
      ) : null}
      {dataOpen ? (
        <RegionalDataSheet
          units={units}
          stay={sourceStay}
          pack={regionData?.pack ?? pack}
          data={regionData}
          error={dataError}
          loading={dataLoading}
          offline={offline}
          selectedArea={!!activeSearch || !!previewArea}
          connectionSummary={evidenceState.connection}
          retryDisabled={evidenceState.retryDisabled}
          retryHelp={evidenceState.retryHelp}
          onRetry={() => {
            if (!activeSearch && !previewArea) {
              setDataOpen(false);
              openSearch();
              return;
            }
            retryEvidence();
          }}
          onSettings={() => {
            setDataOpen(false);
            changeTab('settings');
          }}
          onClose={() => setDataOpen(false)}
        />
      ) : null}
      {currentDetail && isModal('detail') ? (
        <Details
          assessment={currentDetail}
          stay={assessedSearch ? createForecastStay(assessedSearch) : null}
          pack={pack}
          evidenceCachedAt={
            regionData?.pack.id === pack.id && regionData.pack.version === pack.version
              ? regionData.savedAt
              : undefined
          }
          units={units}
          onClose={() => closeDetails()}
          onSources={() => {
            const stay = assessedSearch ? createForecastStay(assessedSearch) : null;
            closeDetails();
            setDataOpen(true, stay);
          }}
          onPlan={() => {
            dispatch({
              type: 'openPlan',
              plan: {
                instance: ++planSequence.current,
                candidate: currentDetail.candidate,
                allowance: currentDetail.depthAllowancePercent,
                search: assessedSearch!,
              },
            });
          }}
        />
      ) : null}
      {detail && isModal('detail') && detailState?.error ? (
        <Sheet title="Selection needs refreshing" onClose={() => closeDetails()}>
          <Notice tone="warning">{detailState.error}</Notice>
          <Button onPress={() => closeDetails()}>Back to current results</Button>
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
          {saved.length >= SAVED_SEARCH_LIMIT ? (
            <View style={{ gap: 10 }}>
              <Notice tone="warning">
                {saved.length > SAVED_SEARCH_LIMIT
                  ? 'This library has more than 30 searches. Delete existing searches until 30 or fewer remain before saving.'
                  : 'The library holds 30 saved searches. Choose exactly one to replace, or cancel and delete one in Saved.'}
              </Notice>
              {saved.length === SAVED_SEARCH_LIMIT
                ? saved.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: replaceSavedId === item.id }}
                      onPress={() => setReplaceSavedId(item.id)}
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor: replaceSavedId === item.id ? c.blue : c.line,
                        borderRadius: 8,
                        gap: 4,
                      }}
                    >
                      <Text style={{ color: c.ink, fontWeight: '600' }}>
                        {replaceSavedId === item.id ? 'Selected: ' : ''}
                        {item.name}
                      </Text>
                      <Text style={s.secondaryText}>
                        Saved {localTime(item.savedAt, 'UTC')}{' '}
                        {new Date(item.savedAt).getUTCFullYear()} · {item.vesselName}
                      </Text>
                    </Pressable>
                  ))
                : null}
              {replaceSavedId ? (
                <Text style={s.secondaryText}>
                  The selected snapshot will be permanently replaced after the new snapshot is
                  saved.
                </Text>
              ) : null}
            </View>
          ) : null}
          {saveError ? <Notice tone="warning">{saveError}</Notice> : null}
          <Button
            icon="bookmark"
            disabled={
              saving ||
              saved.length > SAVED_SEARCH_LIMIT ||
              (saved.length === SAVED_SEARCH_LIMIT && !replaceSavedId)
            }
            onPress={() => void saveResults()}
          >
            {saving
              ? 'Saving…'
              : replaceSavedId && saved.length === SAVED_SEARCH_LIMIT
                ? 'Replace selected & save'
                : 'Save results'}
          </Button>
          <Button secondary disabled={saving} onPress={() => setSaveOpen(false)}>
            Cancel
          </Button>
        </Sheet>
      ) : null}
      {tourOpen && !setupOpen && flow !== 'watch' && !watchActive && !watchProblem ? (
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
    minHeight: 72,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: c.white,
    borderBottomWidth: 1,
    borderColor: c.line,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  brand: { flexDirection: 'row', gap: 9, alignItems: 'center', minHeight: 44, flexShrink: 1 },
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
    minHeight: 44,
    maxWidth: '100%',
    flexShrink: 1,
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
    padding: 12,
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
    margin: 12,
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
  bottomTab: {
    flex: 1,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  flowBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: c.white,
    borderBottomWidth: 1,
    borderColor: c.line,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  toast: {
    marginHorizontal: 16,
    marginVertical: 8,
    flexShrink: 0,
    backgroundColor: c.ink,
    padding: 16,
    borderRadius: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
});
