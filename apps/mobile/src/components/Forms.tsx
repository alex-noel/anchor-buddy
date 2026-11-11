import React, { useMemo, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import {
  getPreferredBeddings,
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
import Chart from './Chart';
import SelectField from './SelectField';
import SeabedSelect from './SeabedSelect';
import MapRegionPicker from './MapRegionPicker';
import { MAP_REGIONS } from '../lib/mapRegions';
import { parseInputDecimal } from '../lib/inputNumbers';
import {
  equipmentChanged,
  moveStayArrival,
  parseUnitDraft,
  readCoordinateDraft,
  readableFormErrors,
  withDefaultStayDuration,
} from '../lib/formDrafts';
import LocalDateHourField from './LocalDateHourField';
import { Button, Chip, Eyebrow, Field, Icon, Notice, s } from './ui';
import { colors as c } from '../theme';
import { fromIsoToLocalHour, localHourToIso, timezoneLabel } from '../lib/localDateHour';

const emptyAssessments: Assessment[] = [];
const startingLimits = { maxWindKnots: 15, maxGustKnots: 20, maxWaveM: 0.5, maxCurrentKnots: 1 };
const numericKeys = [
  'maxDistanceNm',
  'departureContingencyHours',
  'preferredMaxDepthM',
  'minUnderKeelClearanceM',
  'maxWindKnots',
  'maxGustKnots',
  'maxWaveM',
  'maxCurrentKnots',
  'safetyMarginM',
] as const;
type NumericKey = (typeof numericKeys)[number];
function numericUnit(key: NumericKey, units: UnitSystem) {
  if (key === 'departureContingencyHours') return { ratio: 1, label: 'hours' };
  if (key === 'maxDistanceNm')
    return units === 'metric'
      ? { ratio: 1.852, label: 'km' }
      : units === 'imperial'
        ? { ratio: 1.15078, label: 'mi' }
        : { ratio: 1, label: 'nm' };
  if (['maxWindKnots', 'maxGustKnots', 'maxCurrentKnots'].includes(key))
    return units === 'metric'
      ? { ratio: 1.852, label: 'km/h' }
      : units === 'imperial'
        ? { ratio: 1.15078, label: 'mph' }
        : { ratio: 1, label: 'kt' };
  return units === 'imperial' ? { ratio: 3.280839895, label: 'ft' } : { ratio: 1, label: 'm' };
}
function formatted(value: number) {
  return String(Number(value.toFixed(2)));
}

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
  onSave: (s: SearchRequest, selection?: { regionName: string; timezone: string }) => void;
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
  const [error, setError] = useState('');
  const valueInBaseUnits = (key: NumericKey) => {
    const ratio = numericUnit(key, units).ratio;
    return parseUnitDraft(values[key], numericReference.current[key], ratio);
  };
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
      onChange={(v) => {
        setValues((p) => ({ ...p, [key]: v }));
        setError('');
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
  };
  const save = () => {
    if (mode === 'search' && !areaConfirmed) {
      setError(
        'Choose a coastal region, find a location, or enter your coordinates before searching.',
      );
      return;
    }
    if (mode === 'search' && !position) {
      setCoordinatesOpen(true);
      setError(
        'Enter a complete latitude from −85 to 85 and longitude from −180 to 180, in decimal degrees.',
      );
      return;
    }
    if (!Number.isFinite(radius) || radius < minRadius || radius > maxRadius) {
      const unit = numericUnit('maxDistanceNm', units);
      setError(
        `Search radius must be between ${formatted(minRadius * unit.ratio)} and ${formatted(maxRadius * unit.ratio)} ${unit.label}${liveRadius ? ' for live sources' : ''}.`,
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
      setError(e instanceof Error ? e.message : 'Choose a valid stay window.');
      return;
    }
    const errors = validateSearch(next);
    if (errors.length) {
      setError(readableFormErrors(errors));
      return;
    }
    onSave(
      next,
      selectedArea
        ? { regionName: selectedArea.regionName, timezone: selectedArea.timezone }
        : undefined,
    );
    onClose();
  };
  return (
    <Sheet title={mode === 'defaults' ? 'Search defaults' : 'Plan the stay'} onClose={onClose}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip
          selected={visitMode === 'overnight'}
          onPress={() => setVisitMode('overnight')}
          icon="moon"
        >
          Overnight
        </Chip>
        <Chip selected={visitMode === 'daytime'} onPress={() => setVisitMode('daytime')} icon="sun">
          Day stop
        </Chip>
      </View>
      {mode === 'search' ? (
        <View style={{ gap: 12 }}>
          <Eyebrow>Search area</Eyebrow>
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
                <Text style={{ color: c.red, fontSize: 12, lineHeight: 18 }}>{locationError}</Text>
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
                onChange={(value) => {
                  setLat(value);
                  setAreaConfirmed(true);
                  setError('');
                  setSelectedArea(undefined);
                }}
              />
              <Field
                signed
                label="Longitude"
                required
                help="Decimal degrees, −180 to 180; west is negative."
                value={lon}
                onChange={(value) => {
                  setLon(value);
                  setAreaConfirmed(true);
                  setError('');
                  setSelectedArea(undefined);
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
      {mode === 'search' ? (
        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Eyebrow>Stay window</Eyebrow>
            <Text style={s.help}>Your local time · {timezoneLabel()}</Text>
          </View>
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
            Changing arrival moves departure too. Review both dates after changing them, especially
            across a clock change. Stays may be up to seven days.
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
          onChange={(value) => {
            setStayHours(value);
            setError('');
          }}
          help="1–168 hours. Each new search starts at the next local hour and uses this duration; you can adjust its dates."
        />
      ) : null}
      {visitMode === 'daytime' ? (
        <Text style={s.help}>
          Day stop does not override the dates: stays over 12 hours or crossing midnight at the
          destination still require overnight permission.
        </Text>
      ) : null}
      {field(
        'departureContingencyHours',
        'Departure contingency',
        'Keep checking conditions after the planned departure in case you leave late.',
      )}
      <View style={{ gap: 16 }}>
        <Eyebrow>Depth & seabed</Eyebrow>
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
      </View>
      <View style={{ gap: 16 }}>
        <Eyebrow>Operating limits</Eyebrow>
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
      </View>
      {error ? <Notice tone="warning">{error}</Notice> : null}
      <Button onPress={save} icon={mode === 'defaults' ? 'check' : 'search'}>
        {mode === 'defaults' ? 'Save defaults' : 'Search this area'}
      </Button>
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
  onSave: (v: VesselProfile) => void;
  onClose: () => void;
  title?: string;
  saveLabel?: string;
  units?: UnitSystem;
}) {
  const [v, setV] = useState(() => JSON.parse(JSON.stringify(vessel)) as VesselProfile);
  const [error, setError] = useState('');
  const lengthRatio = units === 'imperial' ? 3.280839895 : 1;
  const massRatio = units === 'imperial' ? 2.20462262 : 1;
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
        value === undefined || (value === 0 && vessel.id === 'unconfigured-vessel')
          ? ''
          : formatted(value * ratioFor(key)),
      ]),
    ),
  );
  const number = (key: string, label: string, help?: string) => (
    <Field
      key={key}
      label={label}
      suffix={key === 'displacementKg' ? (units === 'imperial' ? 'lb' : 'kg') : lengthUnit}
      value={dimensions[key]}
      numeric
      required={key !== 'airDraftM'}
      help={help}
      onChange={(x) => {
        setDimensions((p) => ({ ...p, [key]: x }));
        setError('');
      }}
    />
  );
  const parsed = (key: string) => {
    const original = originalValues[key];
    if (original !== undefined && dimensions[key] === formatted(original * ratioFor(key)))
      return original;
    return parseInputDecimal(dimensions[key]) / ratioFor(key);
  };
  const save = () => {
    const next = profileDraft();
    if (equipmentChanged(vessel, next)) next.anchor.scopeGuidance = null;
    const errors = validateVessel(next);
    if (errors.length) {
      setError(readableFormErrors(errors));
      return;
    }
    onSave(next);
    onClose();
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
    <Sheet title={title} onClose={onClose}>
      <Field
        label="Vessel name"
        required
        value={v.name}
        onChange={(name) => {
          setV((p) => ({ ...p, name }));
          setError('');
        }}
      />
      <SelectField
        label="Vessel type"
        help="For a sailing or powered multihull, choose Catamaran or Trimaran so beam and tariff checks use its hull type."
        value={v.type}
        options={[
          { value: 'sailboat', label: 'Sailboat' },
          { value: 'powerboat', label: 'Powerboat' },
          { value: 'catamaran', label: 'Catamaran' },
          { value: 'trimaran', label: 'Trimaran' },
        ]}
        onChange={(type) => setV((p) => ({ ...p, type: type as VesselProfile['type'] }))}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {number('lengthM', 'Length overall')}
        {number('beamM', 'Beam')}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {number('loadedDraftM', 'Loaded draft', 'Include fuel, water, stores and people.')}
        {number('displacementKg', 'Displacement')}
      </View>
      {number(
        'airDraftM',
        'Air draft (optional)',
        'Height above the waterline, including mast or aerials.',
      )}
      <Eyebrow>Anchoring equipment</Eyebrow>
      <SelectField
        label="Anchor design"
        required
        value={v.anchor.type}
        options={
          knownType
            ? anchorOptions
            : [
                ...anchorOptions,
                {
                  value: v.anchor.type,
                  label: v.anchor.type || 'Select your anchor design',
                  description: v.anchor.type ? 'Previously saved design' : 'Required before saving',
                },
              ]
        }
        onChange={(type) => setV((p) => ({ ...p, anchor: { ...p.anchor, type } }))}
        help="Choose the design family. Reviewed guidance must still match your actual anchor and boat."
      />
      <SelectField
        label="Rode configuration"
        value={v.anchor.rodeType}
        options={[
          { value: 'chain', label: 'All chain' },
          { value: 'mixed', label: 'Chain and rope' },
          { value: 'rope', label: 'Rope' },
        ]}
        onChange={(rodeType) =>
          setV((p) => ({
            ...p,
            anchor: { ...p.anchor, rodeType: rodeType as VesselProfile['anchor']['rodeType'] },
          }))
        }
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
          ? 'Boat or equipment changes require reviewed scope guidance before anchoring assessments can pass. Choosing a design does not select a safe scope ratio.'
          : `Current scope guidance: ${vessel.anchor.scopeGuidance.ratio}:1 within its published operating limits. See result evidence for its source and review status.`}
      </Text>
      {error ? <Notice tone="warning">{error}</Notice> : null}
      <Button icon="check" onPress={save}>
        {saveLabel}
      </Button>
    </Sheet>
  );
}
