import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import {
  assessCandidate,
  type Assessment,
  type AssessmentContext,
  type Candidate,
  type Position,
  type RegionPack,
  type SearchRequest,
  type UnitSystem,
  type VesselProfile,
} from '@anchor-buddy/domain';
import * as Location from 'expo-location';
import { Button, Card, Check, Eyebrow, Field, Notice } from '../components/ui';
import { StatusBadge } from '../components/ResultCard';
import { colors as c } from '../theme';
import { depth } from '../lib/units';
import Chart from '../components/Chart';
import {
  parseInputDecimal,
  createLengthDraft,
  convertLengthDraft,
  readLengthDraft,
  lengthInputUnit,
} from '../lib/inputNumbers';

export default function PlannerScreen({
  candidate,
  pack,
  vessel,
  search,
  context,
  depthAllowancePercent,
  offline,
  units,
  onWatch,
  onDetails,
  layers,
}: {
  candidate: Candidate;
  pack: RegionPack;
  vessel: VesselProfile;
  search: SearchRequest;
  context: AssessmentContext;
  depthAllowancePercent: 0 | 20 | 30;
  offline: boolean;
  units: UnitSystem;
  onWatch: (p: Position, r: number, request?: SearchRequest) => void;
  onDetails: (a: Assessment, request?: SearchRequest) => void;
  layers?: { depth: boolean; bedding: boolean; marks: boolean };
}) {
  const { width } = useWindowDimensions();
  const [lat, setLat] = useState(String(candidate.position[1]));
  const [lon, setLon] = useState(String(candidate.position[0]));
  const [rodeDraft, setRodeDraft] = useState(() => createLengthDraft(search.deployedRodeM, units));
  const currentRodeDraft = convertLengthDraft(rodeDraft, units);
  const rode = currentRodeDraft.text;
  const deployedRodeM = readLengthDraft(currentRodeDraft);
  const setRode = (text: string) => setRodeDraft({ ...currentRodeDraft, text });
  const [checks, setChecks] = useState<boolean[]>([false, false, false, false]);
  const [error, setError] = useState('');
  const effectiveSearch = useMemo<SearchRequest>(() => {
    const { deployedRodeM: _priorRode, ...preferences } = search;
    return { ...preferences, ...(rode.trim() ? { deployedRodeM } : {}) };
  }, [search, rode, deployedRodeM]);
  const pin = useMemo<Candidate>(
    () => ({
      ...candidate,
      id: 'planned-pin',
      name: 'Your planned anchor position',
      kind: 'generated',
      place: undefined,
      position: [parseInputDecimal(lon), parseInputDecimal(lat)],
    }),
    [candidate, lon, lat],
  );
  const calculation = useMemo<{ assessment: Assessment | null; error: string }>(() => {
    if (
      !lat.trim() ||
      !lon.trim() ||
      !Number.isFinite(parseInputDecimal(lat)) ||
      !Number.isFinite(parseInputDecimal(lon))
    ) {
      return {
        assessment: null,
        error: 'Enter a complete latitude and longitude to reassess this position.',
      };
    }
    if (rode.trim() && !Number.isFinite(deployedRodeM)) {
      return {
        assessment: null,
        error: `Enter the deployed rode length as a number of ${lengthInputUnit(units) === 'ft' ? 'feet' : 'metres'}.`,
      };
    }
    try {
      return {
        assessment: assessCandidate(
          pin,
          vessel,
          effectiveSearch,
          pack,
          context,
          depthAllowancePercent,
        ),
        error: '',
      };
    } catch (cause) {
      return {
        assessment: null,
        error: cause instanceof Error ? cause.message : 'This position could not be assessed.',
      };
    }
  }, [
    pin,
    vessel,
    effectiveSearch,
    pack,
    context,
    depthAllowancePercent,
    rode,
    deployedRodeM,
    lat,
    lon,
    units,
  ]);
  const assessment = calculation.assessment;
  const elapsedEvidence = assessment?.reasons.some(
    (reason) => reason.code === 'elapsed_stay' || reason.code.startsWith('currently_'),
  );
  const change = (set: (s: string) => void) => (value: string) => {
    set(value);
    setChecks([false, false, false, false]);
    setError('');
  };
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: width < 700 ? 16 : 24,
        paddingBottom: 32,
        gap: 20,
        maxWidth: 900,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '600', color: c.ink }}>
        Anchor plan
      </Text>
      <Text style={{ fontSize: 14, lineHeight: 22, color: c.muted }}>
        Confirm the drop position, deployed rode and full swing footprint. Complete arrival checks
        before setting up the watch.
      </Text>
      {depthAllowancePercent ? (
        <Notice>
          Explicit +{depthAllowancePercent}% depth alternative. Clearance, equipment and every other
          check remain unchanged.
        </Notice>
      ) : null}
      <Card>
        <Eyebrow>1 · DROP POSITION</Eyebrow>
        {assessment ? (
          <View style={{ height: width < 700 ? 300 : 340, borderRadius: 12, overflow: 'hidden' }}>
            <Chart
              pack={pack}
              assessments={[assessment]}
              selectedId={assessment.id}
              origin={pin.position}
              onlineBasemap={!offline}
              showDepth={layers?.depth ?? true}
              showBedding={layers?.bedding ?? true}
              showMarks={layers?.marks ?? false}
              initialZoom={16}
              onSelect={() => onDetails(assessment, effectiveSearch)}
              onPin={(position) => {
                setLon(String(position[0]));
                setLat(String(position[1]));
                setChecks([false, false, false, false]);
                setError('');
              }}
            />
          </View>
        ) : null}
        <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
          The shaded circle shows the complete assessed footprint. Long-press the map on mobile, or
          double-click in the browser, to adjust the drop point.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Field signed label="Latitude" value={lat} onChange={change(setLat)} />
          <Field signed label="Longitude" value={lon} onChange={change(setLon)} />
        </View>
        <Button
          secondary
          icon="crosshair"
          onPress={async () => {
            try {
              const permission = await Location.requestForegroundPermissionsAsync();
              if (!permission.granted) throw new Error('Location permission denied.');
              const fix = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
              });
              if ((fix.coords.accuracy ?? Infinity) > 15)
                throw new Error('Wait for a more accurate position.');
              setLat(String(fix.coords.latitude));
              setLon(String(fix.coords.longitude));
              setChecks([false, false, false, false]);
              setError('');
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : String(cause));
            }
          }}
        >
          Use current position
        </Button>
        {calculation.error ? (
          <Notice tone="warning">
            {calculation.error} No current assessment is available until the inputs are valid.
          </Notice>
        ) : null}
        {assessment ? (
          <>
            <StatusBadge assessment={assessment} />
            <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
              {[
                [
                  'MIN / MAX DEPTH',
                  depth(assessment.minDepthM, units) + ' / ' + depth(assessment.maxDepthM, units),
                ],
                ['REQUIRED RODE', depth(assessment.requiredRodeM, units)],
                ['SWING RADIUS', depth(assessment.swingRadiusM, units)],
              ].map(([label, value]) => (
                <View key={label} style={{ gap: 8, minWidth: 130 }}>
                  <Eyebrow>{label}</Eyebrow>
                  <Text style={{ fontSize: 20, color: c.ink }}>{value}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
        {assessment?.reasons
          .filter((reason) => reason.severity !== 'info')
          .slice(0, 5)
          .map((reason, index) => (
            <Notice key={index} tone="warning">
              {reason.message}
            </Notice>
          ))}
        <Button
          secondary
          disabled={!assessment}
          onPress={() => {
            if (assessment) onDetails(assessment, effectiveSearch);
          }}
        >
          Review assessment & sources
        </Button>
        {pack.validation.status === 'synthetic' ? (
          <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
            This position is based on bundled sample geometry, not a reviewed anchorage.
          </Text>
        ) : null}
      </Card>
      <Card>
        <Eyebrow>2 · DEPLOYED RODE</Eyebrow>
        <Field
          label="Planned deployed rode"
          value={rode}
          onChange={change(setRode)}
          numeric
          suffix={lengthInputUnit(units)}
          help="Optional. Recalculates the full footprint; confirm the actual deployed length on arrival."
        />
        <Text style={{ fontSize: 12, color: c.muted }}>
          On board: {depth(vessel.anchor.usableLengthM, units)}. Longer deployed rode increases the
          area checked.
        </Text>
        <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
          The full-circle footprint is checked in every wind direction. A forecast swing arc does
          not reduce the clearance required.
        </Text>
      </Card>
      <Card>
        <Eyebrow>3 · ARRIVAL CHECKS</Eyebrow>
        {[
          'Confirm actual depth, seabed and local anchoring restrictions.',
          'Check room for other boats, fishing gear and the complete swing circle.',
          'Set and test the anchor; verify holding against fixed references.',
          'Prepare required lights/day shapes, changing-weather watch and an escape plan.',
        ].map((label, index) => (
          <Check
            key={label}
            label={label}
            checked={checks[index]}
            onChange={(value) =>
              setChecks((previous) => previous.map((item, i) => (i === index ? value : item)))
            }
          />
        ))}
        <View style={{ height: 1, backgroundColor: c.line, marginVertical: 4 }} />
        <Eyebrow>4 · ANCHOR WATCH</Eyebrow>
        <Button
          icon="radio"
          disabled={!assessment || !!elapsedEvidence || !checks.every(Boolean)}
          onPress={() => {
            if (assessment && checks.every(Boolean))
              onWatch(pin.position, assessment.swingRadiusM ?? 50, effectiveSearch);
          }}
        >
          Continue to anchor watch
        </Button>
        <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
          A position watch can be set independently of an assessment. It does not validate this
          anchorage or guarantee holding.
        </Text>
      </Card>
      {error ? <Notice tone="warning">{error}</Notice> : null}
    </ScrollView>
  );
}
