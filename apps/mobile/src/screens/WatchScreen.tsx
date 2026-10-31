import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import * as Watch from '@anchor-buddy/anchor-watch';
import * as Location from 'expo-location';
import type { Position, UnitSystem } from '@anchor-buddy/domain';
import { Button, Card, Check, Eyebrow, Field, Icon, Notice } from '../components/ui';
import { colors as c } from '../theme';
import { depth } from '../lib/units';
import { setLocal } from '../lib/storage';

const activeStates = new Set<Watch.WatchState>([
  'arming',
  'monitoring',
  'position_uncertain',
  'alarm',
]);
const elapsed = () => globalThis.performance?.now() ?? Date.now();

export default function WatchScreen({
  position,
  radius,
  units,
}: {
  position: Position;
  radius: number;
  units: UnitSystem;
}) {
  const { width } = useWindowDimensions();
  const [status, setStatus] = useState<Watch.WatchStatus | null>(null);
  const [error, setError] = useState('');
  const [latitude, setLatitude] = useState(String(position[1]));
  const [longitude, setLongitude] = useState(String(position[0]));
  const [radiusText, setRadius] = useState(String(Math.ceil(radius)));
  const [newRadius, setNewRadius] = useState('');
  const [radiusConfirmed, setRadiusConfirmed] = useState(false);
  const [anchorConfirmed, setAnchorConfirmed] = useState(false);
  const [checklist, setChecklist] = useState(false);
  const [tested, setTested] = useState(false);
  const [heard, setHeard] = useState(false);
  const [simulation, setSimulation] = useState(false);
  const [permissions, setPermissions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [clock, setClock] = useState(elapsed());
  const lastContact = useRef(-Infinity);
  const previous = useRef<Watch.WatchStatus | null>(null);
  const lastSaved = useRef('');
  const inFlight = useRef(false);
  const snapshotEpoch = useRef(0);

  const resetConfirmations = useCallback(() => {
    setAnchorConfirmed(false);
    setChecklist(false);
    setTested(false);
    setHeard(false);
    setPermissions(false);
    setRadiusConfirmed(false);
  }, []);
  const accept = useCallback(
    (next: Watch.WatchStatus) => {
      snapshotEpoch.current++;
      const before = previous.current;
      if (
        (next.state === 'interrupted' && before?.state !== 'interrupted') ||
        (next.state === 'idle' && before && activeStates.has(before.state))
      )
        resetConfirmations();
      if (next.sessionId !== before?.sessionId || next.radiusM !== before?.radiusM) {
        setNewRadius(next.radiusM === undefined ? '' : String(next.radiusM));
        setRadiusConfirmed(false);
      }
      previous.current = next;
      lastContact.current = elapsed();
      setClock(lastContact.current);
      setVerified(true);
      setSimulation(next.simulation);
      setStatus(next);
      // Save transitions, not every heartbeat. Persisted UI history is never treated as live monitoring.
      const key = JSON.stringify([
        next.sessionId,
        next.state,
        next.radiusM,
        next.alerts.map((a) => [a.id, a.acknowledged]),
      ]);
      if (next.sessionId && key !== lastSaved.current) {
        lastSaved.current = key;
        void setLocal('last-watch', next).catch(() => {});
      }
    },
    [resetConfirmations],
  );

  useEffect(() => {
    let mounted = true;
    let query = 0;
    const refresh = async () => {
      const id = ++query;
      const epoch = snapshotEpoch.current;
      try {
        const next = await Watch.getStatus();
        // An alarm event or newer reply received while this request was in flight wins.
        if (mounted && id === query && epoch === snapshotEpoch.current) accept(next);
      } catch (cause) {
        if (mounted && id === query && epoch === snapshotEpoch.current) {
          setVerified(false);
          setError(String(cause));
        }
      }
    };
    setVerified(false);
    void refresh();
    const off = Watch.subscribe((next) => {
      if (mounted) accept(next);
    });
    const app = AppState.addEventListener('change', (state) => {
      setVerified(false);
      if (state === 'active') void refresh();
    });
    const timer = setInterval(() => {
      setClock(elapsed());
      if (AppState.currentState === 'active' || AppState.currentState === null) void refresh();
    }, 5_000);
    return () => {
      mounted = false;
      query++;
      off();
      app.remove();
      clearInterval(timer);
    };
  }, [accept, simulation]);

  const run = async (action: () => Promise<unknown>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      setError('');
      await action();
      const epoch = snapshotEpoch.current;
      const next = await Watch.getStatus();
      if (epoch === snapshotEpoch.current) accept(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const capture = () =>
    run(async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted')
        throw new Error('Location permission is required to capture the anchor position.');
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      if ((fix.coords.accuracy ?? Infinity) > 15 || Date.now() - fix.timestamp > 15_000) {
        throw new Error(
          'A recent position accurate to 15 m or better is required. Wait for a better fix or enter a verified anchor position.',
        );
      }
      setLatitude(fix.coords.latitude.toFixed(6));
      setLongitude(fix.coords.longitude.toFixed(6));
      setAnchorConfirmed(false);
    });
  const armed = status !== null && activeStates.has(status.state);
  const hasAlarm = Boolean(status?.alerts.some((alert) => !alert.acknowledged));
  const statusIsCurrent = verified && clock - lastContact.current < 12_000;
  const isLive = armed && statusIsCurrent && status?.serviceRunning;
  const title = !status
    ? 'Checking watch status'
    : armed && !statusIsCurrent
      ? 'Monitoring status unverified'
      : status.state === 'monitoring' && isLive
        ? simulation
          ? 'Simulation running'
          : 'Watch is running'
        : status.state === 'alarm'
          ? 'Check your position'
          : status.state === 'position_uncertain'
            ? 'Position uncertain'
            : status.state === 'arming'
              ? 'Acquiring position'
              : status.state === 'interrupted'
                ? 'Watch interrupted'
                : armed
                  ? 'Native service unverified'
                  : 'Watch not armed';
  const simulateFix = (northM: number, accuracyM = 3) =>
    run(async () => {
      if (!status?.anchor) return;
      Watch.injectSimulationFix({
        latitude: status.anchor.latitude + northM / 111_195.0802335329,
        longitude: status.anchor.longitude,
        accuracyM,
        timestamp: Date.now(),
      });
    });
  const shownRadius = status?.radiusM ?? Number(radiusText);
  const lastFix = status?.lastFix;
  const fixAge = lastFix ? Date.now() - lastFix.timestamp : Infinity;
  const showPosition = Boolean(
    armed &&
    statusIsCurrent &&
    status?.anchor &&
    lastFix &&
    shownRadius > 0 &&
    fixAge >= -5_000 &&
    fixAge <= (status?.staleAfterMs ?? 30_000),
  );
  let boatX = 140;
  let boatY = 130;
  let offScale = false;
  if (showPosition && status?.anchor && lastFix) {
    const northM = (lastFix.latitude - status.anchor.latitude) * 111_195.0802335329;
    const longitudeDelta = ((lastFix.longitude - status.anchor.longitude + 540) % 360) - 180;
    const eastM =
      longitudeDelta * 111_195.0802335329 * Math.cos((status.anchor.latitude * Math.PI) / 180);
    let x = (eastM / shownRadius) * 90;
    let y = (-northM / shownRadius) * 90;
    const displayDistance = Math.hypot(x, y);
    if (displayDistance > 112) {
      x *= 112 / displayDistance;
      y *= 112 / displayDistance;
      offScale = true;
    }
    boatX += x;
    boatY += y;
  }
  const attention =
    hasAlarm ||
    status?.state === 'alarm' ||
    status?.state === 'position_uncertain' ||
    status?.state === 'interrupted' ||
    (armed && !statusIsCurrent);

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
    >
      <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '600', color: c.ink }}>
        Anchor watch
      </Text>
      <Text style={{ fontSize: 14, lineHeight: 23, color: c.muted }}>
        Monitor distance from the confirmed anchor position. The anchor position and alarm radius
        never change automatically.
      </Text>
      {simulation ? (
        <Notice tone="warning">
          Simulator active. Artificial positions only; no boat monitoring or audible native alarm.
        </Notice>
      ) : null}
      <Card>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View style={{ gap: 7, flex: 1 }}>
            <Eyebrow>
              {simulation
                ? 'WATCH SIMULATOR'
                : status?.nativeAvailable
                  ? 'ON-DEVICE WATCH'
                  : 'WATCH STATUS'}
            </Eyebrow>
            <Text style={{ fontSize: 22, fontWeight: '600', color: attention ? c.red : c.ink }}>
              {title}
            </Text>
          </View>
          <Icon
            name={attention ? 'alert-triangle' : 'radio'}
            size={25}
            color={attention ? c.red : c.green}
          />
        </View>
        <View style={{ alignItems: 'center', width: '100%', maxWidth: 320, alignSelf: 'center' }}>
          <Svg
            width="100%"
            height={260}
            viewBox="0 0 280 260"
            accessibilityLabel="Anchor boundary diagram. The plotted dot uses the latest position; the dashed circle is the confirmed alarm radius."
          >
            <Circle cx="140" cy="130" r="110" fill={attention ? c.orangeLight : c.mint} />
            <Circle
              cx="140"
              cy="130"
              r="90"
              fill="none"
              stroke={attention ? c.red : c.green}
              strokeDasharray="5 6"
              strokeWidth="1.5"
            />
            <Circle cx="140" cy="130" r="60" fill="none" stroke={c.line} />
            <Circle cx="140" cy="130" r="30" fill="none" stroke={c.line} />
            <Line x1="30" y1="130" x2="250" y2="130" stroke={c.line} />
            <Line x1="140" y1="20" x2="140" y2="240" stroke={c.line} />
            <Circle cx="140" cy="130" r="7" fill={c.ink} />
            <SvgText x="140" y="151" textAnchor="middle" fontSize="10" fill={c.muted}>
              ANCHOR
            </SvgText>
            {showPosition ? (
              <>
                <Circle
                  cx={boatX}
                  cy={boatY}
                  r={Math.min(70, ((lastFix?.accuracyM ?? 0) / shownRadius) * 90)}
                  fill={attention ? `${c.red}22` : `${c.blue}22`}
                  stroke={attention ? c.red : c.blue}
                />
                <Circle
                  cx={boatX}
                  cy={boatY}
                  r="7"
                  fill={attention ? c.red : c.blue}
                  stroke="white"
                  strokeWidth="2"
                />
              </>
            ) : (
              <SvgText x="140" y="215" textAnchor="middle" fontSize="10" fill={c.muted}>
                NO VERIFIED CURRENT POSITION
              </SvgText>
            )}
            <SvgText x="140" y="13" textAnchor="middle" fontSize="10" fill={c.muted}>
              N
            </SvgText>
          </Svg>
        </View>
        {offScale ? (
          <Text style={{ fontSize: 11, color: c.red }}>
            Position is beyond the diagram scale. Use the distance reading below.
          </Text>
        ) : null}
        {showPosition && ((lastFix?.accuracyM ?? 0) / shownRadius) * 90 > 70 ? (
          <Text style={{ fontSize: 11, color: c.red }}>
            The position accuracy area exceeds the diagram scale. Use the accuracy reading below.
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          {[
            ['BOUNDARY', depth(shownRadius, units)],
            ['LAST DISTANCE', depth(status?.distanceM, units)],
            ['LAST ACCURACY', depth(lastFix?.accuracyM, units)],
          ].map(([label, value]) => (
            <View key={label} style={{ gap: 7, alignItems: 'center' }}>
              <Eyebrow>{label}</Eyebrow>
              <Text style={{ fontSize: 19, color: c.ink, fontWeight: '500' }}>{value}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>
          {simulation ? 'Replay harness' : 'Native service'}:{' '}
          {isLive
            ? 'running'
            : armed && !statusIsCurrent
              ? 'unverified'
              : 'not verified as running'}{' '}
          · Last fix: {lastFix ? new Date(lastFix.timestamp).toLocaleTimeString() : 'none'} · Last
          heartbeat:{' '}
          {status?.lastHeartbeatAt ? new Date(status.lastHeartbeatAt).toLocaleTimeString() : 'none'}
          {status?.message ? ' · ' + status.message : ''}
        </Text>
        {armed && !statusIsCurrent ? (
          <Notice tone="warning">
            The app has not verified the native service recently. Check your vessel and device. A
            saved watch state is not proof that monitoring is running.
          </Notice>
        ) : null}
        {status?.alerts
          .filter((alert) => !alert.acknowledged)
          .concat(status.alerts.filter((alert) => alert.acknowledged).slice(-3))
          .map((alert) => (
            <Notice key={alert.id} tone="warning">
              {alert.message}
              {alert.acknowledged ? ' (acknowledged)' : ''}
            </Notice>
          ))}
        {hasAlarm ? (
          <Button icon="check" disabled={busy} onPress={() => void run(Watch.acknowledge)}>
            Acknowledge alerts
          </Button>
        ) : null}
      </Card>
      {!status?.nativeAvailable && !simulation ? (
        <Card>
          <Eyebrow>DEVICE MONITORING UNAVAILABLE</Eyebrow>
          <Text style={{ fontSize: 13, lineHeight: 21, color: c.muted }}>
            The native iOS or Android app is required for background monitoring. Enable the
            simulator to test the watch controls here.
          </Text>
          <Button
            secondary
            icon="play"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                Watch.enableSimulation();
                setSimulation(true);
                resetConfirmations();
              })
            }
          >
            Enable watch simulator
          </Button>
        </Card>
      ) : null}
      {!armed ? (
        <Card>
          <Eyebrow>1 · ANCHOR POSITION & RADIUS</Eyebrow>
          <Notice>
            Record the anchor at the moment it drops, or enter its verified position. Your phone
            measures the vessel, not the anchor. A suggested map pin is only a starting point.
          </Notice>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Field
              label="Anchor latitude"
              value={latitude}
              onChange={(value) => {
                setLatitude(value);
                setAnchorConfirmed(false);
              }}
            />
            <Field
              label="Anchor longitude"
              value={longitude}
              onChange={(value) => {
                setLongitude(value);
                setAnchorConfirmed(false);
              }}
            />
          </View>
          {!simulation ? (
            <Button
              secondary
              icon="crosshair"
              disabled={busy || !status?.nativeAvailable}
              onPress={capture}
            >
              Capture position at anchor drop
            </Button>
          ) : null}
          <Field
            label="Alarm radius"
            value={radiusText}
            numeric
            suffix="m"
            onChange={(value) => {
              setRadius(value);
              setAnchorConfirmed(false);
            }}
            help="Metres. Set from your actual anchor, deployed rode and reviewed swing space; this is not a suggested safe clearance."
          />
          <Check
            label="I verified the actual anchor position and alarm radius."
            checked={anchorConfirmed}
            onChange={setAnchorConfirmed}
          />
          <Check
            label="I set and tested the anchor, checked local conditions and nearby boats, and have an exit plan."
            checked={checklist}
            onChange={setChecklist}
          />
          <View style={{ height: 1, backgroundColor: c.line, marginVertical: 4 }} />
          <Eyebrow>2 · PERMISSIONS & ALARM TEST</Eyebrow>
          <Button
            secondary
            icon="map-pin"
            disabled={busy || (!status?.nativeAvailable && !simulation)}
            onPress={() =>
              void run(async () => {
                const permission = await Watch.requestPermissions();
                setPermissions(simulation || permission.canArm);
                if (!simulation && !permission.canArm)
                  throw new Error(
                    permission.message ??
                      'Precise location and audible notification permissions are required.',
                  );
              })
            }
          >
            {simulation
              ? 'Check simulator readiness'
              : permissions
                ? 'Recheck permissions'
                : 'Allow location and alerts'}
          </Button>
          {!simulation && status?.nativeAvailable ? (
            <Button
              secondary
              small
              onPress={() => {
                void Linking.openSettings().catch((cause) => setError(String(cause)));
              }}
            >
              Open device settings
            </Button>
          ) : null}
          <Button
            secondary
            icon="volume-2"
            disabled={busy || !permissions}
            onPress={() =>
              void run(async () => {
                setHeard(false);
                await Watch.testAlarm();
                setTested(true);
              })
            }
          >
            {simulation ? 'Run simulated alarm test' : 'Test alarm'}
          </Button>
          {tested ? (
            <Check
              label={
                simulation
                  ? 'I understand this is a silent simulation, not a real alarm.'
                  : 'I heard the test alarm on this device with my current sound settings.'
              }
              checked={heard}
              onChange={setHeard}
            />
          ) : null}
          <View style={{ height: 1, backgroundColor: c.line, marginVertical: 4 }} />
          <Eyebrow>3 · START WATCH</Eyebrow>
          <Button
            icon="radio"
            disabled={busy || !anchorConfirmed || !checklist || !tested || !heard || !permissions}
            onPress={() =>
              void run(async () => {
                if (!latitude.trim() || !longitude.trim() || !radiusText.trim())
                  throw new Error('Enter the verified anchor coordinates and alarm radius.');
                await Watch.arm({
                  anchor: { latitude: Number(latitude), longitude: Number(longitude) },
                  radiusM: Number(radiusText),
                  anchorConfirmed: true,
                  checklistConfirmed: true,
                  testAlarmConfirmed: true,
                });
                if (simulation)
                  Watch.injectSimulationFix({
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    accuracyM: 3,
                    timestamp: Date.now(),
                  });
              })
            }
          >
            {simulation ? 'Start simulated watch' : 'Arm anchor watch'}
          </Button>
        </Card>
      ) : (
        <Card>
          <Eyebrow>CONFIRMED ANCHOR</Eyebrow>
          <Text style={{ fontSize: 13, lineHeight: 21, color: c.ink }}>
            {status?.anchor?.latitude.toFixed(6)}, {status?.anchor?.longitude.toFixed(6)}. Stop the
            watch before selecting another anchor.
          </Text>
          <Field
            label="New alarm radius"
            value={newRadius}
            numeric
            suffix="m"
            onChange={(value) => {
              setNewRadius(value);
              setRadiusConfirmed(false);
            }}
          />
          <Check
            label="I reviewed the deployed rode, swing space and nearby hazards, and explicitly confirm this new alarm radius."
            checked={radiusConfirmed}
            onChange={setRadiusConfirmed}
          />
          <Button
            secondary
            disabled={busy || !radiusConfirmed || !statusIsCurrent}
            onPress={() =>
              void run(async () => {
                if (!newRadius.trim()) throw new Error('Enter the new alarm radius.');
                await Watch.updateRadius(Number(newRadius), true);
                setRadiusConfirmed(false);
              })
            }
          >
            Apply confirmed radius
          </Button>
          {simulation ? (
            <View style={{ gap: 12 }}>
              <Button
                secondary
                icon="navigation"
                disabled={busy}
                onPress={() => void simulateFix((status?.radiusM ?? 100) + 30)}
              >
                Simulate drift beyond boundary
              </Button>
              <Button secondary disabled={busy} onPress={() => void simulateFix(0)}>
                Simulate return inside
              </Button>
              <Button secondary disabled={busy} onPress={() => void simulateFix(0, 100)}>
                Simulate poor accuracy
              </Button>
              <Button
                secondary
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    Watch.interruptSimulation();
                  })
                }
              >
                Simulate interrupted service
              </Button>
            </View>
          ) : null}
          <Button secondary icon="square" disabled={busy} onPress={() => void run(Watch.stop)}>
            Stop watch
          </Button>
        </Card>
      )}
      {error ? <Notice tone="warning">{error}</Notice> : null}
      <Notice>
        Supplemental watch only. Force quit, battery loss and OS restrictions can stop monitoring.
        Silent mode, Focus or notification settings may prevent sound. Keep an independent watch
        appropriate to the conditions. An alarm cannot be delivered after the device or monitoring
        process has stopped.
      </Notice>
    </ScrollView>
  );
}
