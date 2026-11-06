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
import { parseInputDecimal } from '../lib/inputNumbers';
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
}: {
  search: SearchRequest;
  onSave: (s: SearchRequest) => void;
  onClose: () => void;
  pack?: RegionPack;
  offline?: boolean;
  units?: UnitSystem;
  mode?: 'search' | 'defaults';
  onFindLocation?: (query: string) => Promise<{ name: string; position: Position }[]>;
}) {
  const [values, setValues] = useState<Record<NumericKey, string>>(
    () =>
      Object.fromEntries(
        numericKeys.map((key) => [key, formatted(search[key] * numericUnit(key, units).ratio)]),
      ) as Record<NumericKey, string>,
  );
  const [lat, setLat] = useState(String(search.origin[1]));
  const [lon, setLon] = useState(String(search.origin[0]));
  const [visitMode, setVisitMode] = useState(search.visitMode);
  const [bedding, setBedding] = useState<Bedding[]>(() => getPreferredBeddings(search));
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<{ name: string; position: Position }[]>(
    [],
  );
  const [locationError, setLocationError] = useState('');
  const [findingLocation, setFindingLocation] = useState(false);
  const locationRequest = useRef(0);
  const [arrival, setArrival] = useState(() => fromIsoToLocalHour(search.arrival));
  const [departure, setDeparture] = useState(() => fromIsoToLocalHour(search.departure));
  const [coordinatesOpen, setCoordinatesOpen] = useState(!pack);
  const [error, setError] = useState('');
  const valueInBaseUnits = (key: NumericKey) => {
    const ratio = numericUnit(key, units).ratio;
    // A display-unit round trip must not silently change the stored safety threshold.
    if (values[key] === formatted(search[key] * ratio)) return search[key];
    return parseInputDecimal(values[key]) / ratio;
  };
  const radius = valueInBaseUnits('maxDistanceNm');
  const position = useMemo<Position>(
    () =>
      lat.trim() &&
      lon.trim() &&
      Number.isFinite(parseInputDecimal(lat)) &&
      Number.isFinite(parseInputDecimal(lon)) &&
      Math.abs(parseInputDecimal(lat)) <= 85 &&
      Math.abs(parseInputDecimal(lon)) <= 180
        ? [parseInputDecimal(lon), parseInputDecimal(lat)]
        : search.origin,
    [lat, lon, search.origin],
  );
  const setPosition = (p: Position) => {
    setLat(p[1].toFixed(6));
    setLon(p[0].toFixed(6));
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
      value={values[key]}
      help={help}
      onChange={(v) => setValues((p) => ({ ...p, [key]: v }))}
    />
  );
  const resizeArea = (factor: number) =>
    setValues((p) => ({
      ...p,
      maxDistanceNm: formatted(
        Math.max(
          0.01,
          Math.min(50, (Number.isFinite(radius) ? radius : search.maxDistanceNm) * factor),
        ) * numericUnit('maxDistanceNm', units).ratio,
      ),
    }));
  const save = () => {
    const next: SearchRequest = {
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
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Choose a valid stay window.');
      return;
    }
    const errors = validateSearch(next);
    if (errors.length) {
      setError(errors.join('; '));
      return;
    }
    onSave(next);
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

          {pack ? (
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
              Coordinates · {position[1].toFixed(4)}, {position[0].toFixed(4)}
            </Text>
          </Pressable>
          {coordinatesOpen ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field signed label="Latitude" value={lat} onChange={setLat} />
              <Field signed label="Longitude" value={lon} onChange={setLon} />
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={{ gap: 10 }}>
        {field(
          'maxDistanceNm',
          'Search radius',
          'Straight-line distance from the selected centre. Live places/weather searches support up to 25 nm; reviewed or downloaded-data searches support up to 50 nm when coverage is available.',
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
          <LocalDateHourField label="Arrival" value={arrival} onChange={setArrival} />
          <LocalDateHourField label="Departure" value={departure} onChange={setDeparture} />
        </View>
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
          onPress={() =>
            setValues((p) => ({
              ...p,
              ...Object.fromEntries(
                Object.entries(startingLimits).map(([key, value]) => [
                  key,
                  formatted(value * numericUnit(key as NumericKey, units).ratio),
                ]),
              ),
            }))
          }
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
            'Maximum forecast waves or swell. Period and exposure also matter.',
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
        value === undefined ? '' : formatted(value * ratioFor(key)),
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
      help={help}
      onChange={(x) => setDimensions((p) => ({ ...p, [key]: x }))}
    />
  );
  const parsed = (key: string) => {
    const original = originalValues[key];
    if (original !== undefined && dimensions[key] === formatted(original * ratioFor(key)))
      return original;
    return parseInputDecimal(dimensions[key]) / ratioFor(key);
  };
  const save = () => {
    const changedEquipment =
      v.anchor.type !== vessel.anchor.type || v.anchor.rodeType !== vessel.anchor.rodeType;
    const next: VesselProfile = {
      ...v,
      lengthM: parsed('lengthM'),
      beamM: parsed('beamM'),
      loadedDraftM: parsed('loadedDraftM'),
      displacementKg: parsed('displacementKg'),
      airDraftM: dimensions.airDraftM.trim() === '' ? undefined : parsed('airDraftM'),
      anchor: {
        ...v.anchor,
        usableLengthM: parsed('usableLengthM'),
        bowRollerHeightM: parsed('bowRollerHeightM'),
        scopeGuidance: changedEquipment ? null : vessel.anchor.scopeGuidance,
      },
    };
    const errors = validateVessel(next);
    if (errors.length) {
      setError(errors.join('; '));
      return;
    }
    onSave(next);
    onClose();
  };
  const knownType = anchorOptions.some((option) => option.value === v.anchor.type);
  return (
    <Sheet title={title} onClose={onClose}>
      <Field
        label="Vessel name"
        value={v.name}
        onChange={(name) => setV((p) => ({ ...p, name }))}
      />
      <SelectField
        label="Vessel type"
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
        label="Anchor model / type"
        value={v.anchor.type}
        options={
          knownType
            ? anchorOptions
            : [
                ...anchorOptions,
                {
                  value: v.anchor.type,
                  label: v.anchor.type,
                  description: 'Previously saved model',
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
        {number('usableLengthM', 'Usable rode length')}
        {number('bowRollerHeightM', 'Bow roller above water')}
      </View>
      <Text style={s.help}>
        {v.anchor.type !== vessel.anchor.type ||
        v.anchor.rodeType !== vessel.anchor.rodeType ||
        !vessel.anchor.scopeGuidance
          ? 'Equipment changes require reviewed scope guidance before anchoring assessments can pass.'
          : `Current scope guidance: ${vessel.anchor.scopeGuidance.ratio}:1 within its published operating limits. See result evidence for its source and review status.`}
      </Text>
      {error ? <Notice tone="warning">{error}</Notice> : null}
      <Button icon="check" onPress={save}>
        {saveLabel}
      </Button>
    </Sheet>
  );
}
