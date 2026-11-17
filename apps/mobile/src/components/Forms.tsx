import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Linking, Pressable, Text, View } from 'react-native';
import {
  getPreferredBeddings,
  CANONICAL_CONVERSIONS,
  validateSearch,
  validateVessel,
  type Assessment,
  type Bedding,
  type Position,
  type RegionPack,
  type SearchRequest,
  type UnitSystem,
  type VesselProfile,
} from '@anchor-buddy/domain';
import Sheet from './Sheet';
import { FormDisclosure, FormGroup } from './FormGroup';
import Chart from './Chart';
import SelectField from './SelectField';
import SeabedSelect from './SeabedSelect';
import MapRegionPicker from './MapRegionPicker';
import { MAP_REGIONS } from '../lib/mapRegions';
import { parseInputDecimal } from '../lib/inputNumbers';
import {
  equipmentChanged,
  moveStayArrival,
  partitionFormErrors,
  parseUnitDraft,
  readCoordinateDraft,
  withDefaultStayDuration,
} from '../lib/formDrafts';
import LocalDateHourField from './LocalDateHourField';
import { Button, Chip, Field, Icon, Notice, s } from './ui';
import { colors as c } from '../theme';
import { fromIsoToLocalHour, localHourToIso, timezoneLabel } from '../lib/localDateHour';

const emptyAssessments: Assessment[] = [];
const startingLimits = { maxWindKnots: 15, maxGustKnots: 20, maxWaveM: 0.5, maxCurrentKnots: 1 };
const depthFields = ['preferredMaxDepthM', 'minUnderKeelClearanceM', 'safetyMarginM'] as const;
const operatingFields = ['maxWindKnots', 'maxGustKnots', 'maxWaveM', 'maxCurrentKnots'] as const;
const numericKeys = [
  'maxDistanceNm',
  'departureContingencyHours',
  ...depthFields,
  ...operatingFields,
] as const;
type NumericKey = (typeof numericKeys)[number];
const feetPerMetre = 1 / CANONICAL_CONVERSIONS.metresPerFoot;
const kilometresPerNauticalMile = CANONICAL_CONVERSIONS.kilometresPerNauticalMile;
const statuteMilesPerNauticalMile =
  CANONICAL_CONVERSIONS.metresPerNauticalMile / CANONICAL_CONVERSIONS.metresPerStatuteMile;
function numericUnit(key: NumericKey, units: UnitSystem) {
  if (key === 'departureContingencyHours') return { ratio: 1, label: 'hours' };
  if (key === 'maxDistanceNm')
    return units === 'metric'
      ? { ratio: kilometresPerNauticalMile, label: 'km' }
      : units === 'imperial'
        ? { ratio: statuteMilesPerNauticalMile, label: 'mi' }
        : { ratio: 1, label: 'nm' };
  if (['maxWindKnots', 'maxGustKnots', 'maxCurrentKnots'].includes(key))
    return units === 'metric'
      ? { ratio: kilometresPerNauticalMile, label: 'km/h' }
      : units === 'imperial'
        ? { ratio: statuteMilesPerNauticalMile, label: 'mph' }
        : { ratio: 1, label: 'kt' };
  return units === 'imperial' ? { ratio: feetPerMetre, label: 'ft' } : { ratio: 1, label: 'm' };
}
function formatted(value: number) {
  return String(Number(value.toFixed(2)));
}

function useDirtyDraft(values: readonly unknown[]) {
  const snapshot = JSON.stringify(values);
  const [initial] = useState(snapshot);
  return snapshot !== initial;
}

function useInvalidFields<Key extends string>(order: readonly Key[], reveal?: (key: Key) => void) {
  type Errors = Partial<Record<Key, string>>;
  const inputs = useRef<Partial<Record<Key, { focus(): void } | null>>>({});
  const [messages, setMessages] = useState<Errors>({});
  const [focus, setFocus] = useState<{ key: Key }>();
  useEffect(() => {
    if (focus) inputs.current[focus.key]?.focus();
  }, [focus]);
  return {
    props(key: Key) {
      return {
        error: messages[key],
        inputRef: (node: { focus(): void } | null) => {
          inputs.current[key] = node;
        },
      };
    },
    clear(key: Key) {
      if (messages[key]) setMessages((previous) => ({ ...previous, [key]: undefined }));
    },
    report(domainErrors: string[], local: Errors = {}) {
      const { fields, summary } = partitionFormErrors(domainErrors);
      const next = { ...local };
      for (const [key, errors] of Object.entries(fields)) {
        if (order.includes(key as Key))
          next[key as Key] = [next[key as Key], ...errors].filter(Boolean).join(' ');
        else summary.push(...errors);
      }
      setMessages(next);
      const first = order.find((key) => next[key]);
      if (first !== undefined) reveal?.(first);
      setFocus(first === undefined ? undefined : { key: first });
      return summary.join(' ');
    },
  };
}

const searchFieldOrder = [
  'latitude',
  'longitude',
  'maxDistanceNm',
  'stayHours',
  'departureContingencyHours',
  ...depthFields,
  ...operatingFields,
] as const;
const vesselFieldOrder = [
  'name',
  'type',
  'lengthM',
  'beamM',
  'loadedDraftM',
  'displacementKg',
  'anchorDesign',
  'rodeType',
  'usableLengthM',
  'bowRollerHeightM',
  'airDraftM',
] as const;
type VesselFieldKey = (typeof vesselFieldOrder)[number];
type VesselNumberKey = Exclude<VesselFieldKey, 'name' | 'type' | 'anchorDesign' | 'rodeType'>;

export function SearchSheet({
  search,
  onSave,
  onClose,
  pack,
  offline = false,
  units = 'nautical',
  mode = 'search',
  onFindLocation,
  initialRegionId,
  initialRegionName,
  initialRegionTimezone,
  initialAreaConfirmed = false,
}: {
  search: SearchRequest;
  onSave: (
    s: SearchRequest,
    selection?: { regionName: string; timezone: string },
  ) => void | Promise<void>;
  onClose: () => void;
  pack?: RegionPack;
  offline?: boolean;
  units?: UnitSystem;
  mode?: 'search' | 'defaults';
  onFindLocation?: (query: string) => Promise<{ name: string; position: Position }[]>;
  initialRegionId?: string;
  initialRegionName?: string;
  initialRegionTimezone?: string;
  initialAreaConfirmed?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [values, setValues] = useState<Record<NumericKey, string>>(
    () =>
      Object.fromEntries(
        numericKeys.map((key) => [key, formatted(search[key] * numericUnit(key, units).ratio)]),
      ) as Record<NumericKey, string>,
  );
  const numericReference = useRef<Record<NumericKey, number>>(
    Object.fromEntries(numericKeys.map((key) => [key, search[key]])) as Record<NumericKey, number>,
  );
  const [areaConfirmed, setAreaConfirmed] = useState(initialAreaConfirmed || mode === 'defaults');
  const [lat, setLat] = useState(
    initialAreaConfirmed || mode === 'defaults' ? String(search.origin[1]) : '',
  );
  const [lon, setLon] = useState(
    initialAreaConfirmed || mode === 'defaults' ? String(search.origin[0]) : '',
  );
  const [visitMode, setVisitMode] = useState(search.visitMode);
  const [bedding, setBedding] = useState<Bedding[]>(() => getPreferredBeddings(search));
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<
    { id?: string; regionName: string; timezone: string } | undefined
  >(() => {
    const preset = MAP_REGIONS.find((region) => region.id === initialRegionId);
    if (preset && preset.center.every((coordinate, index) => coordinate === search.origin[index]))
      return { id: preset.id, regionName: preset.name, timezone: preset.timezone };
    return initialRegionName
      ? {
          regionName: initialRegionName,
          timezone: initialRegionTimezone ?? pack?.timezone ?? 'UTC',
        }
      : undefined;
  });
  const [locationResults, setLocationResults] = useState<{ name: string; position: Position }[]>(
    [],
  );
  const [locationError, setLocationError] = useState('');
  const [findingLocation, setFindingLocation] = useState(false);
  const locationRequest = useRef(0);
  const [arrival, setArrival] = useState(() => fromIsoToLocalHour(search.arrival));
  const [departure, setDeparture] = useState(() => fromIsoToLocalHour(search.departure));
  const [stayHours, setStayHours] = useState(() =>
    String(
      Math.max(
        1,
        Math.round((Date.parse(search.departure) - Date.parse(search.arrival)) / 3_600_000),
      ),
    ),
  );
  const [coordinatesOpen, setCoordinatesOpen] = useState(!pack);
  const [depthOpen, setDepthOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const invalid = useInvalidFields(searchFieldOrder, (key) => {
    if (depthFields.some((field) => field === key)) setDepthOpen(true);
    if (operatingFields.some((field) => field === key)) setLimitsOpen(true);
  });
  const displayValue = (key: NumericKey) => {
    const draft = values[key].trim();
    return draft ? `${draft} ${numericUnit(key, units).label}` : 'not set';
  };
  const seabedSummary = bedding.length
    ? bedding.map((value) => value[0].toUpperCase() + value.slice(1)).join(', ')
    : 'Any seabed';
  const valueInBaseUnits = (key: NumericKey) => {
    const ratio = numericUnit(key, units).ratio;
    return parseUnitDraft(values[key], numericReference.current[key], ratio);
  };
  const dirty = useDirtyDraft([
    values,
    numericKeys.map(valueInBaseUnits),
    lat,
    lon,
    areaConfirmed && Boolean(lat || lon),
    selectedArea,
    visitMode,
    bedding,
    ...(mode === 'search' ? [arrival, departure, locationQuery] : [stayHours]),
  ]);
  const radius = valueInBaseUnits('maxDistanceNm');
  const liveRadius = pack?.validation.status !== 'reviewed' && (mode === 'defaults' || !offline);
  const minRadius = liveRadius ? 0.25 : 0.01;
  const maxRadius = liveRadius ? 25 : 50;
  const position = useMemo(() => readCoordinateDraft(lat, lon), [lat, lon]);
  const setPosition = (p: Position) => {
    setAreaConfirmed(true);
    setError('');
    setLat(p[1].toFixed(6));
    setLon(p[0].toFixed(6));
    setSelectedArea(undefined);
    invalid.clear('latitude');
    invalid.clear('longitude');
  };
  const findLocation = async () => {
    if (!onFindLocation || !locationQuery.trim() || offline) return;
    const request = ++locationRequest.current;
    setFindingLocation(true);
    setLocationError('');
    setLocationResults([]);
    try {
      const matches = await onFindLocation(locationQuery.trim());
      if (request !== locationRequest.current) return;
      setLocationResults(matches);
      if (!matches.length)
        setLocationError('No locations found. Try a nearby town or choose a point on the map.');
    } catch (error) {
      if (request === locationRequest.current)
        setLocationError(
          error instanceof Error
            ? error.message
            : 'Location search is unavailable. Choose a point on the map.',
        );
    } finally {
      if (request === locationRequest.current) setFindingLocation(false);
    }
  };
  const field = (key: NumericKey, label: string, help?: string) => (
    <Field
      key={key}
      label={label}
      suffix={numericUnit(key, units).label}
      numeric
      required
      value={values[key]}
      help={help}
      disabled={saving}
      {...invalid.props(key)}
      onChange={(v) => {
        setValues((p) => ({ ...p, [key]: v }));
        setError('');
        invalid.clear(key);
      }}
    />
  );
  const resizeArea = (factor: number) => {
    const nextRadius = Math.max(
      minRadius,
      Math.min(maxRadius, (Number.isFinite(radius) ? radius : search.maxDistanceNm) * factor),
    );
    numericReference.current.maxDistanceNm = nextRadius;
    setValues((p) => ({
      ...p,
      maxDistanceNm: formatted(nextRadius * numericUnit('maxDistanceNm', units).ratio),
    }));
    setError('');
    invalid.clear('maxDistanceNm');
  };
  const save = async () => {
    if (saveLock.current) return;
    if (mode === 'search' && !areaConfirmed) {
      invalid.report([]);
      setError(
        'Choose a coastal region, find a location, or enter your coordinates before searching.',
      );
      return;
    }
    if (mode === 'search' && !position) {
      setCoordinatesOpen(true);
      const latitude = parseInputDecimal(lat);
      const longitude = parseInputDecimal(lon);
      setError(
        invalid.report([], {
          latitude:
            Number.isFinite(latitude) && Math.abs(latitude) <= 85
              ? undefined
              : 'Enter latitude from −85 to 85 in decimal degrees.',
          longitude:
            Number.isFinite(longitude) && Math.abs(longitude) <= 180
              ? undefined
              : 'Enter longitude from −180 to 180 in decimal degrees.',
        }),
      );
      return;
    }
    if (!Number.isFinite(radius) || radius < minRadius || radius > maxRadius) {
      const unit = numericUnit('maxDistanceNm', units);
      setError(
        invalid.report([], {
          maxDistanceNm: `Search radius must be between ${formatted(minRadius * unit.ratio)} and ${formatted(maxRadius * unit.ratio)} ${unit.label}${liveRadius ? ' for live sources' : ''}.`,
        }),
      );
      return;
    }
    let next: SearchRequest = {
      ...search,
      origin: [
        lon.trim() ? parseInputDecimal(lon) : NaN,
        lat.trim() ? parseInputDecimal(lat) : NaN,
      ],
      visitMode,
      preferredBedding: undefined,
      preferredBeddings: bedding,
    };
    for (const key of numericKeys) next[key] = valueInBaseUnits(key);
    try {
      if (mode === 'search') {
        next.arrival = localHourToIso(arrival);
        next.departure = localHourToIso(departure);
        if (Date.parse(next.departure) <= Date.now())
          throw new Error('Departure is in the past. Choose a future departure to plan a stay.');
      } else {
        next = withDefaultStayDuration(next, stayHours);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Choose a valid stay window.';
      setError(
        mode === 'defaults'
          ? invalid.report([], { stayHours: message })
          : invalid.report([message]),
      );
      return;
    }
    const errors = validateSearch(next);
    if (errors.length) {
      setError(invalid.report(errors));
      return;
    }
    saveLock.current = true;
    Keyboard.dismiss();
    setSaving(true);
    setError('');
    setSaveError('');
    try {
      await onSave(
        next,
        selectedArea
          ? { regionName: selectedArea.regionName, timezone: selectedArea.timezone }
          : undefined,
      );
      onClose();
    } catch (e) {
      setSaveError(
        'Could not save on this device: ' + (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };
  return (
    <Sheet
      title={mode === 'defaults' ? 'Search defaults' : 'Plan the stay'}
      onClose={() => {
        if (!saveLock.current) onClose();
      }}
      dirty={dirty}
      pending={saving}
      footer={
        <>
          {saveError || error ? <Notice tone="warning">{saveError || error}</Notice> : null}
          <Button
            disabled={saving}
            onPress={() => void save()}
            icon={mode === 'defaults' ? 'check' : 'search'}
          >
            {saving ? 'Saving…' : mode === 'defaults' ? 'Save defaults' : 'Search this area'}
          </Button>
        </>
      }
    >
      <FormGroup
        title={mode === 'search' ? 'Search area' : 'Area defaults'}
        help={mode === 'defaults' ? 'Choose the centre when you start a search.' : undefined}
      >
        {mode === 'search' ? (
          <View style={{ gap: 12 }}>
            <MapRegionPicker
              units={units}
              selectedId={selectedArea?.id}
              onSelect={(preset) => {
                setAreaConfirmed(true);
                setError('');
                setLat(String(preset.center[1]));
                setLon(String(preset.center[0]));
                numericReference.current.maxDistanceNm = preset.radiusNm;
                setValues((previous) => ({
                  ...previous,
                  maxDistanceNm: formatted(
                    preset.radiusNm * numericUnit('maxDistanceNm', units).ratio,
                  ),
                }));
                setSelectedArea({
                  id: preset.id,
                  regionName: preset.name,
                  timezone: preset.timezone,
                });
                setLocationResults([]);
                setLocationQuery('');
                setLocationError('');
                locationRequest.current++;
                setFindingLocation(false);
              }}
            />
            {selectedArea ? (
              <Text style={s.help}>Selected area · {selectedArea.regionName}</Text>
            ) : null}
            {onFindLocation ? (
              <View style={{ gap: 10 }}>
                <Field
                  label="Town, harbour or address"
                  value={locationQuery}
                  onChange={(value) => {
                    setLocationQuery(value);
                    setLocationResults([]);
                    setLocationError('');
                    locationRequest.current++;
                    setFindingLocation(false);
                  }}
                  help={
                    offline
                      ? 'Location lookup needs a connection. You can still choose a point on the map or enter coordinates.'
                      : undefined
                  }
                />
                <Button
                  secondary
                  small
                  icon="search"
                  disabled={offline || findingLocation || !locationQuery.trim()}
                  onPress={() => void findLocation()}
                >
                  {findingLocation ? 'Finding locations…' : 'Find location'}
                </Button>
                {locationResults.map((match, index) => (
                  <Pressable
                    key={`${match.name}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${match.name}`}
                    onPress={() => {
                      setPosition(match.position);
                      setLocationQuery(match.name);
                      setLocationResults([]);
                    }}
                    style={{
                      padding: 12,
                      borderWidth: 1,
                      borderColor: c.line,
                      borderRadius: 8,
                      backgroundColor: c.white,
                      flexDirection: 'row',
                      gap: 10,
                    }}
                  >
                    <Icon name="map-pin" size={16} />
                    <Text style={{ flex: 1, color: c.ink, fontSize: 13, lineHeight: 19 }}>
                      {match.name}
                    </Text>
                  </Pressable>
                ))}
                {locationError ? (
                  <Text style={{ color: c.red, fontSize: 12, lineHeight: 18 }}>
                    {locationError}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {pack && areaConfirmed && position ? (
              <>
                <Text style={s.help}>Tap the map to set the centre. Adjust the radius below.</Text>
                <View
                  style={{
                    height: 270,
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: c.line,
                  }}
                >
                  <Chart
                    units={units}
                    pack={pack}
                    assessments={emptyAssessments}
                    origin={position}
                    onSelect={() => {}}
                    onPin={setPosition}
                    onlineBasemap={!offline}
                    selectOnTap
                    searchRadiusNm={Number.isFinite(radius) && radius > 0 ? radius : undefined}
                    initialZoom={12.2}
                    showBedding={false}
                    showMarks={false}
                  />
                </View>
              </>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: coordinatesOpen }}
              onPress={() => setCoordinatesOpen(!coordinatesOpen)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}
            >
              <Icon name={coordinatesOpen ? 'chevron-up' : 'chevron-down'} size={16} />
              <Text style={{ color: c.ink, fontSize: 13 }}>
                {areaConfirmed && position
                  ? `Coordinates · ${position[1].toFixed(4)}, ${position[0].toFixed(4)}`
                  : areaConfirmed
                    ? 'Complete valid coordinates'
                    : 'Enter coordinates'}
              </Text>
            </Pressable>
            {coordinatesOpen ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Field
                  signed
                  label="Latitude"
                  required
                  help="Decimal degrees, −85 to 85; south is negative."
                  value={lat}
                  disabled={saving}
                  {...invalid.props('latitude')}
                  onChange={(value) => {
                    setLat(value);
                    setAreaConfirmed(true);
                    setError('');
                    setSelectedArea(undefined);
                    invalid.clear('latitude');
                  }}
                />
                <Field
                  signed
                  label="Longitude"
                  required
                  help="Decimal degrees, −180 to 180; west is negative."
                  value={lon}
                  disabled={saving}
                  {...invalid.props('longitude')}
                  onChange={(value) => {
                    setLon(value);
                    setAreaConfirmed(true);
                    setError('');
                    setSelectedArea(undefined);
                    invalid.clear('longitude');
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={{ gap: 10 }}>
          {field(
            'maxDistanceNm',
            'Search radius',
            liveRadius
              ? 'Straight-line distance from the selected centre. Live sources support 0.25–25 nm (about 0.46–46.3 km). Downloaded or reviewed searches can cover larger areas when evidence is available.'
              : 'Straight-line distance from the selected centre. This search uses downloaded or reviewed evidence and supports up to 50 nm where coverage exists.',
          )}
          {mode === 'search' ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button secondary small icon="minus" onPress={() => resizeArea(0.8)}>
                  Smaller area
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button secondary small icon="plus" onPress={() => resizeArea(1.25)}>
                  Larger area
                </Button>
              </View>
            </View>
          ) : null}
        </View>
      </FormGroup>
      <FormGroup
        title={mode === 'search' ? 'Stay window' : 'Stay defaults'}
        help={mode === 'search' ? `Your local time · ${timezoneLabel()}` : undefined}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip
            selected={visitMode === 'overnight'}
            onPress={() => setVisitMode('overnight')}
            icon="moon"
          >
            Overnight
          </Chip>
          <Chip
            selected={visitMode === 'daytime'}
            onPress={() => setVisitMode('daytime')}
            icon="sun"
          >
            Day stop
          </Chip>
        </View>
        {mode === 'search' ? (
          <View style={{ gap: 16 }}>
            <LocalDateHourField
              label="Arrival"
              value={arrival}
              onChange={(next) => {
                setDeparture(moveStayArrival(arrival, departure, next));
                setArrival(next);
                setError('');
              }}
            />
            <LocalDateHourField
              label="Departure"
              value={departure}
              onChange={(next) => {
                setDeparture(next);
                setError('');
              }}
            />
            <Text style={s.help}>
              Changing arrival moves departure too. Review both dates after changing them,
              especially across a clock change. Stays may be up to seven days.
            </Text>
          </View>
        ) : null}
        {mode === 'defaults' ? (
          <Field
            label="Default stay duration"
            numeric
            required
            suffix="hours"
            value={stayHours}
            disabled={saving}
            {...invalid.props('stayHours')}
            onChange={(value) => {
              setStayHours(value);
              setError('');
              invalid.clear('stayHours');
            }}
            help="1–168 hours. Each new search starts at the next local hour and uses this duration; you can adjust its dates."
          />
        ) : null}
        {visitMode === 'daytime' ? (
          <Text style={s.help}>
            Stays over 12 hours or crossing midnight at the destination still require overnight
            permission.
          </Text>
        ) : null}
        {field(
          'departureContingencyHours',
          'Departure contingency',
          'Keep checking conditions after the planned departure in case you leave late.',
        )}
      </FormGroup>
      <FormDisclosure
        title="Depth & seabed"
        summary={`Preferred depth ${displayValue('preferredMaxDepthM')} · Under-keel clearance ${displayValue('minUnderKeelClearanceM')} · Swing margin ${displayValue('safetyMarginM')} · ${seabedSummary}`}
        expanded={depthOpen}
        onToggle={() => setDepthOpen(!depthOpen)}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {field('preferredMaxDepthM', 'Preferred maximum depth')}
          {field(
            'minUnderKeelClearanceM',
            'Under-keel clearance',
            'Minimum water below your loaded keel.',
          )}
        </View>
        <SeabedSelect value={bedding} onChange={setBedding} />
        {field(
          'safetyMarginM',
          'Swing-footprint margin',
          'Extra space beyond the full vessel and rode footprint.',
        )}
        <Text style={s.help}>
          If needed, separately labelled +20% and +30% deeper alternatives retain every clearance
          and equipment check.
        </Text>
      </FormDisclosure>
      <FormDisclosure
        title="Operating limits"
        summary={`Wind ${displayValue('maxWindKnots')} · Gusts ${displayValue('maxGustKnots')} · Waves ${displayValue('maxWaveM')} · Current ${displayValue('maxCurrentKnots')}`}
        expanded={limitsOpen}
        onToggle={() => setLimitsOpen(!limitsOpen)}
      >
        <Text style={s.help}>
          Set limits for your boat, equipment and crew. Starting values are editable planning
          examples; they are not equipment ratings or a safe-weather guarantee.
        </Text>
        <Button
          small
          secondary
          onPress={() => {
            Object.assign(numericReference.current, startingLimits);
            setValues((p) => ({
              ...p,
              ...Object.fromEntries(
                Object.entries(startingLimits).map(([key, value]) => [
                  key,
                  formatted(value * numericUnit(key as NumericKey, units).ratio),
                ]),
              ),
            }));
            setError('');
            for (const key of operatingFields) invalid.clear(key);
          }}
        >
          Use starting defaults
        </Button>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {field('maxWindKnots', 'Sustained wind', 'Maximum forecast steady wind during the stay.')}
          {field(
            'maxGustKnots',
            'Wind gusts',
            'Maximum brief peak; consider your anchor and windage.',
          )}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {field(
            'maxWaveM',
            'Wave height',
            'Maximum significant wave height or swell. Individual waves may be higher; period and exposure also matter.',
          )}
          {field(
            'maxCurrentKnots',
            'Current',
            'Maximum forecast current; allow for reversing flow.',
          )}
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL('https://www.weather.gov/safety/safeboating-marine')}
        >
          <Text style={{ color: c.green, fontSize: 12, textDecorationLine: 'underline' }}>
            NWS marine forecast guidance
          </Text>
        </Pressable>
      </FormDisclosure>
    </Sheet>
  );
}

const anchorOptions = [
  { value: 'modern-scoop', label: 'Modern scoop', description: 'Concave scoop-style anchor' },
  {
    value: 'plough',
    label: 'Plough',
    description: 'Plough-shaped anchor, including hinged and fixed designs',
  },
  { value: 'claw', label: 'Claw', description: 'Three-claw design' },
  { value: 'fluke', label: 'Fluke', description: 'Pivoting flat-fluke design' },
  {
    value: 'fisherman',
    label: 'Fisherman / Admiralty',
    description: 'Stocked anchor with two arms',
  },
  { value: 'grapnel', label: 'Grapnel', description: 'Multiple fixed or folding prongs' },
  { value: 'mushroom', label: 'Mushroom', description: 'Rounded mushroom-shaped design' },
  {
    value: 'other',
    label: 'Other / unknown',
    description: 'Select until your equipment can be identified',
  },
];
export function ProfileSheet({
  vessel,
  onSave,
  onClose,
  title = 'Vessel settings',
  saveLabel = 'Save vessel',
  units = 'nautical',
}: {
  vessel: VesselProfile;
  onSave: (v: VesselProfile) => void | Promise<void>;
  onClose: () => void;
  title?: string;
  saveLabel?: string;
  units?: UnitSystem;
}) {
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [v, setV] = useState(() => JSON.parse(JSON.stringify(vessel)) as VesselProfile);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [airDraftOpen, setAirDraftOpen] = useState(false);
  const invalid = useInvalidFields(vesselFieldOrder, (key) => {
    if (key === 'airDraftM') setAirDraftOpen(true);
  });
  const { inputRef: vesselTypeRef, error: vesselTypeError } = invalid.props('type');
  const { inputRef: anchorDesignRef, error: anchorDesignError } = invalid.props('anchorDesign');
  const { inputRef: rodeTypeRef, error: rodeTypeError } = invalid.props('rodeType');
  const lengthRatio = units === 'imperial' ? feetPerMetre : 1;
  const massRatio = units === 'imperial' ? 1 / CANONICAL_CONVERSIONS.kilogramsPerPound : 1;
  const lengthUnit = units === 'imperial' ? 'ft' : 'm';
  const originalValues: Record<string, number | undefined> = {
    lengthM: vessel.lengthM,
    beamM: vessel.beamM,
    loadedDraftM: vessel.loadedDraftM,
    displacementKg: vessel.displacementKg,
    airDraftM: vessel.airDraftM,
    usableLengthM: vessel.anchor.usableLengthM,
    bowRollerHeightM: vessel.anchor.bowRollerHeightM,
  };
  const ratioFor = (key: string) => (key === 'displacementKg' ? massRatio : lengthRatio);
  const [dimensions, setDimensions] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(originalValues).map(([key, value]) => [
        key,
        value === undefined ||
        (value === 0 && vessel.id === 'unconfigured-vessel' && key !== 'bowRollerHeightM')
          ? ''
          : formatted(value * ratioFor(key)),
      ]),
    ),
  );
  const dirty = useDirtyDraft([v, dimensions]);
  const number = (key: VesselNumberKey, label: string, help?: string) => (
    <Field
      key={key}
      label={label}
      suffix={key === 'displacementKg' ? (units === 'imperial' ? 'lb' : 'kg') : lengthUnit}
      value={dimensions[key]}
      numeric
      required={key !== 'airDraftM'}
      help={help}
      disabled={saving}
      {...invalid.props(key)}
      onChange={(x) => {
        setDimensions((p) => ({ ...p, [key]: x }));
        setError('');
        invalid.clear(key);
      }}
    />
  );
  const parsed = (key: string) => {
    const original = originalValues[key];
    return original === undefined
      ? parseInputDecimal(dimensions[key]) / ratioFor(key)
      : parseUnitDraft(dimensions[key], original, ratioFor(key));
  };
  const save = async () => {
    if (saveLock.current) return;
    const next = profileDraft();
    if (equipmentChanged(vessel, next)) next.anchor.scopeGuidance = null;
    const errors = validateVessel(next);
    if (errors.length) {
      const local: Partial<Record<VesselFieldKey, string>> = {};
      const summary = errors.filter((message) => {
        if (message === 'Vessel name is required.') local.name = message;
        else if (message === 'Unsupported vessel type.') local.type = message;
        else if (message === 'Anchor type is required.') local.anchorDesign = message;
        else if (message === 'Rode type is required.') local.rodeType = message;
        else if (message.startsWith('Air draft must')) local.airDraftM = message;
        else if (message.startsWith('Usable rode must')) local.usableLengthM = message;
        else if (message.startsWith('Bow roller height must')) local.bowRollerHeightM = message;
        else if (message.startsWith('Beam cannot exceed')) local.beamM = message;
        else return true;
        return false;
      });
      setError(invalid.report(summary, local));
      return;
    }
    saveLock.current = true;
    Keyboard.dismiss();
    setSaving(true);
    setError('');
    setSaveError('');
    try {
      await onSave(next);
      onClose();
    } catch (e) {
      setSaveError(
        'Could not save on this device: ' + (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };
  const profileDraft = (): VesselProfile => ({
    ...v,
    id: v.id === 'unconfigured-vessel' ? 'local-vessel' : v.id,
    name: v.name.trim(),
    lengthM: parsed('lengthM'),
    beamM: parsed('beamM'),
    loadedDraftM: parsed('loadedDraftM'),
    displacementKg: parsed('displacementKg'),
    airDraftM: dimensions.airDraftM.trim() === '' ? undefined : parsed('airDraftM'),
    anchor: {
      ...v.anchor,
      usableLengthM: parsed('usableLengthM'),
      bowRollerHeightM: parsed('bowRollerHeightM'),
      scopeGuidance: vessel.anchor.scopeGuidance,
    },
  });
  const knownType = anchorOptions.some((option) => option.value === v.anchor.type);
  return (
    <Sheet
      title={title}
      onClose={() => {
        if (!saveLock.current) onClose();
      }}
      dirty={dirty}
      pending={saving}
      footer={
        <>
          {saveError || error ? <Notice tone="warning">{saveError || error}</Notice> : null}
          <Button disabled={saving} icon="check" onPress={() => void save()}>
            {saving ? 'Saving…' : saveLabel}
          </Button>
        </>
      }
    >
      <FormGroup title="Vessel" help="Enter your vessel’s details and select its hull type.">
        <Field
          label="Vessel name"
          required
          value={v.name}
          disabled={saving}
          {...invalid.props('name')}
          onChange={(name) => {
            setV((p) => ({ ...p, name }));
            setError('');
            invalid.clear('name');
          }}
        />
        <SelectField
          label="Vessel type"
          disabled={saving}
          required
          controlRef={vesselTypeRef}
          error={vesselTypeError}
          help="For a sailing or powered multihull, choose Catamaran or Trimaran so beam and tariff checks use its hull type."
          value={v.type}
          options={[
            { value: 'sailboat', label: 'Sailboat' },
            { value: 'powerboat', label: 'Powerboat' },
            { value: 'catamaran', label: 'Catamaran' },
            { value: 'trimaran', label: 'Trimaran' },
          ]}
          onChange={(type) => {
            setV((p) => ({ ...p, type: type as VesselProfile['type'] }));
            invalid.clear('type');
          }}
        />
      </FormGroup>
      <FormGroup
        title="Vessel dimensions"
        help={
          units === 'imperial'
            ? 'Dimensions in feet · Displacement in pounds'
            : 'Dimensions in metres · Displacement in kilograms'
        }
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {number('lengthM', 'Length overall')}
          {number('beamM', 'Beam')}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {number('loadedDraftM', 'Loaded draft', 'Include fuel, water, stores and people.')}
          {number('displacementKg', 'Displacement')}
        </View>
      </FormGroup>
      <FormGroup title="Anchoring equipment" help="Enter the equipment and usable rode you carry.">
        <SelectField
          label="Anchor design"
          disabled={saving}
          required
          controlRef={anchorDesignRef}
          error={anchorDesignError}
          value={v.anchor.type}
          options={
            knownType
              ? anchorOptions
              : [
                  ...anchorOptions,
                  {
                    value: v.anchor.type,
                    label: v.anchor.type || 'Select your anchor design',
                    description: v.anchor.type
                      ? 'Previously saved design'
                      : 'Required before saving',
                  },
                ]
          }
          onChange={(type) => {
            setV((p) => ({ ...p, anchor: { ...p.anchor, type } }));
            invalid.clear('anchorDesign');
          }}
          help="Choose the design family of the anchor you use."
        />
        <SelectField
          label="Rode configuration"
          disabled={saving}
          required
          controlRef={rodeTypeRef}
          error={rodeTypeError}
          value={v.anchor.rodeType}
          options={[
            { value: 'chain', label: 'All chain' },
            { value: 'mixed', label: 'Chain and rope' },
            { value: 'rope', label: 'Rope' },
          ]}
          onChange={(rodeType) => {
            setV((p) => ({
              ...p,
              anchor: { ...p.anchor, rodeType: rodeType as VesselProfile['anchor']['rodeType'] },
            }));
            invalid.clear('rodeType');
          }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {number(
            'usableLengthM',
            'Usable rode length',
            'Total deployable chain and rope, excluding any length that cannot be safely let out.',
          )}
          {number('bowRollerHeightM', 'Bow roller above water')}
        </View>
        <Text style={s.help}>
          {equipmentChanged(vessel, profileDraft()) || !vessel.anchor.scopeGuidance
            ? 'Anchoring assessments require scope guidance reviewed for your vessel and equipment.'
            : `Current scope guidance: ${vessel.anchor.scopeGuidance.ratio}:1 within its published operating limits. See result evidence for its source and review status.`}
        </Text>
      </FormGroup>
      <FormDisclosure
        title="Optional air draft"
        summary={
          dimensions.airDraftM.trim()
            ? `${dimensions.airDraftM} ${lengthUnit}`
            : 'Height above the waterline'
        }
        expanded={airDraftOpen}
        onToggle={() => setAirDraftOpen(!airDraftOpen)}
      >
        {number(
          'airDraftM',
          'Air draft (optional)',
          'Include the mast and any aerials above the waterline.',
        )}
      </FormDisclosure>
    </Sheet>
  );
}
