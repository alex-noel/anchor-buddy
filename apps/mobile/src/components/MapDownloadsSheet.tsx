import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { Position, RegionPack, UnitSystem } from '@anchor-buddy/domain';
import Chart from './Chart';
import Sheet from './Sheet';
import SelectField from './SelectField';
import MapRegionPicker from './MapRegionPicker';
import { Button, Check, Field, Notice } from './ui';
import { areaBounds } from '../lib/regionalDataCore';
import {
  convertRadiusDraft,
  createRadiusDraft,
  evidenceRadiusNm,
  radiusInputUnit,
  readRadiusDraft,
} from '../lib/mapDownloadControls';
import { distance } from '../lib/units';
import { findLocations } from '../lib/regionalData';
import { downloadMapArea, estimateMapArea, type MapArea } from '../lib/worldMaps';
import type { MapRegionPreset } from '../lib/mapRegions';
import { colors as c } from '../theme';

export default function MapDownloadsSheet({
  pack,
  center: initialCenter,
  radiusNm = 3,
  units = 'nautical',
  resume,
  offline = false,
  initialAreaConfirmed = false,
  onSaved,
  onEvidenceDownload,
  onClose,
}: {
  pack: RegionPack;
  center: Position;
  radiusNm?: number;
  units?: UnitSystem;
  resume?: MapArea;
  offline?: boolean;
  initialAreaConfirmed?: boolean;
  onSaved: () => void;
  onEvidenceDownload: (
    center: Position,
    radiusNm: number,
    signal?: AbortSignal,
    regionName?: string,
    timezone?: string,
  ) => Promise<void>;
  onClose: () => void;
}) {
  const [areaConfirmed, setAreaConfirmed] = useState(initialAreaConfirmed || !!resume);
  const [center, setCenter] = useState<Position>(
    resume
      ? [(resume.bounds[0] + resume.bounds[2]) / 2, (resume.bounds[1] + resume.bounds[3]) / 2]
      : initialCenter,
  );
  const [radiusDraft, setRadiusDraft] = useState(() =>
    createRadiusDraft(resume ? (resume.bounds[3] - resume.bounds[1]) * 30 : radiusNm, units),
  );
  const currentRadiusDraft = convertRadiusDraft(radiusDraft, units);
  const radius = currentRadiusDraft.text;
  const selectedRadiusNm = readRadiusDraft(currentRadiusDraft);
  const setRadius = (text: string) => setRadiusDraft({ ...currentRadiusDraft, text });
  const [name, setName] = useState(resume?.name ?? 'Saved map area');
  const [zoom, setZoom] = useState(String(resume?.maxZoom ?? 13));
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState<{ name: string; position: Position }[]>([]);
  const [finding, setFinding] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<MapRegionPreset | undefined>();
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'map' | 'evidence' | null>(null);
  const [evidenceFailed, setEvidenceFailed] = useState(false);
  const [progress, setProgress] = useState<MapArea | null>(resume ?? null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const controller = useRef<AbortController | null>(null);
  const closed = useRef(false);
  const locationRequest = useRef(0);
  useEffect(() => {
    closed.current = false;
    return () => {
      closed.current = true;
      locationRequest.current++;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (offline) {
      locationRequest.current++;
      setFinding(false);
      setLocations([]);
      controller.current?.abort();
    }
  }, [offline]);
  const selection = useMemo(() => {
    try {
      const bounds = progress?.bounds ?? resume?.bounds ?? areaBounds(center, selectedRadiusNm);
      const estimate = estimateMapArea({ bounds, maxZoom: progress?.maxZoom ?? Number(zoom) });
      return {
        bounds,
        estimate,
        error:
          !progress && estimate.estimatedBytes > estimate.maxBytes
            ? `The estimated download exceeds ${estimate.maxBytes / 1_000_000} MB. Choose lower detail or a smaller area.`
            : '',
      };
    } catch (error) {
      return {
        bounds: null,
        estimate: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [center, selectedRadiusNm, zoom, resume, progress]);
  const download = async () => {
    if (!areaConfirmed || !selection.bounds || selection.error || busy || offline) return;
    setBusy(true);
    setPhase('map');
    setError('');
    setMessage('');
    setEvidenceFailed(false);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result =
        progress?.status === 'complete'
          ? progress
          : await downloadMapArea(
              {
                name: name.trim() || 'Saved map area',
                bounds: selection.bounds,
                maxZoom: progress?.maxZoom ?? Number(zoom),
                id: progress?.id ?? resume?.id,
              },
              (area) => {
                if (!closed.current) setProgress(area);
              },
              abort.signal,
            );
      if (closed.current) return;
      setProgress(result);
      onSaved();
      setMessage('Map saved on this device.');
      if (includeEvidence && !abort.signal.aborted) {
        setPhase('evidence');
        try {
          const savedCenter: Position = [
            (result.bounds[0] + result.bounds[2]) / 2,
            (result.bounds[1] + result.bounds[3]) / 2,
          ];
          const savedRadius = evidenceRadiusNm(result.bounds);
          await onEvidenceDownload(
            savedCenter,
            savedRadius,
            abort.signal,
            name.trim() || undefined,
            selectedRegion?.timezone,
          );
          if (closed.current) return;
          if (abort.signal.aborted) throw new Error('Data download cancelled.');
          setMessage(
            'Map and available regional evidence saved. Open Sources & coverage for missing data and expiry dates.',
          );
        } catch (error) {
          if (closed.current) return;
          setEvidenceFailed(true);
          setError(
            abort.signal.aborted
              ? 'Map saved. Area data download cancelled; previously saved data is retained.'
              : 'The map is saved, but area data could not be downloaded: ' + String(error),
          );
        }
      }
    } catch (error) {
      if (closed.current) return;
      setError(
        abort.signal.aborted
          ? 'Download paused. Resume it from Saved; completed resources are retained.'
          : error instanceof Error
            ? error.message
            : String(error),
      );
      onSaved();
    } finally {
      controller.current = null;
      if (!closed.current) {
        setBusy(false);
        setPhase(null);
      }
    }
  };
  return (
    <Sheet
      title={resume ? 'Resume map download' : 'Download a map area'}
      subtitle="Choose only the area and detail you need. Map files stay in the device cache."
      onClose={() => {
        closed.current = true;
        locationRequest.current++;
        controller.current?.abort();
        onSaved();
        onClose();
      }}
    >
      {!progress ? (
        <Field label="Map name" value={name} onChange={setName} />
      ) : (
        <Text style={{ color: c.ink, fontSize: 16, fontWeight: '600' }}>{progress.name}</Text>
      )}
      {!resume && !progress && !busy ? (
        <>
          <MapRegionPicker
            units={units}
            selectedId={selectedRegion?.id}
            onSelect={(preset) => {
              setCenter(preset.center);
              setAreaConfirmed(true);
              setRadiusDraft(createRadiusDraft(preset.radiusNm, units));
              setName(preset.name);
              setSelectedRegion(preset);
              const detail = estimateMapArea({
                bounds: areaBounds(preset.center, preset.radiusNm),
              });
              setZoom(String(Math.min(Number(zoom), detail.maxZoom)));
              setLocations([]);
              setQuery('');
              setError('');
              setFinding(false);
              locationRequest.current++;
            }}
          />
          <Field
            label="Find an area"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setLocations([]);
              locationRequest.current++;
              setFinding(false);
            }}
            help={
              offline
                ? 'Location lookup needs a connection. Built-in coastal regions and downloaded maps remain available.'
                : 'Search for a town, island or harbour; no automatic requests while typing.'
            }
          />
          <Button
            secondary
            disabled={offline || busy || finding || query.trim().length < 2}
            onPress={async () => {
              const request = ++locationRequest.current;
              setFinding(true);
              setError('');
              try {
                const matches = await findLocations(query);
                if (!closed.current && request === locationRequest.current) {
                  setLocations(matches);
                  if (!matches.length)
                    setError('No locations found. Try a nearby town or choose a coastal region.');
                }
              } catch (e) {
                if (!closed.current && request === locationRequest.current) setError(String(e));
              } finally {
                if (!closed.current && request === locationRequest.current) setFinding(false);
              }
            }}
          >
            {finding ? 'Finding…' : 'Find location'}
          </Button>
          {locations.map((item, index) => (
            <Button
              key={index}
              secondary
              small
              onPress={() => {
                setCenter(item.position);
                setAreaConfirmed(true);
                setSelectedRegion(undefined);
                setName(item.name.split(',')[0]);
                setQuery(item.name);
                setLocations([]);
                setError('');
                locationRequest.current++;
                setFinding(false);
              }}
            >
              {item.name}
            </Button>
          ))}
        </>
      ) : null}
      {areaConfirmed && selection.bounds ? (
        <View style={{ height: 270, borderRadius: 12, overflow: 'hidden' }}>
          <Chart
            units={units}
            pack={pack}
            origin={center}
            assessments={[]}
            onlineBasemap={!offline}
            showDepth={false}
            showBedding={false}
            showMarks={false}
            selectOnTap={!busy && !resume && !progress}
            searchRadiusNm={selectedRadiusNm}
            onPin={(position) => {
              if (!busy && !resume && !progress) {
                setCenter(position);
                setSelectedRegion(undefined);
                setLocations([]);
                setQuery('');
                setError('');
                locationRequest.current++;
                setFinding(false);
              }
            }}
            onSelect={() => {}}
          />
        </View>
      ) : (
        <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>
          {areaConfirmed
            ? 'Enter a valid radius to preview the selected area.'
            : 'Choose a coastal region or find a location to select the area to download.'}
        </Text>
      )}
      {!resume && !progress && !busy ? (
        <>
          <Field
            label="Download radius"
            value={radius}
            onChange={setRadius}
            numeric
            suffix={radiusInputUnit(units)}
            help={`Tap the map to move the centre. Maximum radius ${distance(50, units)}. Larger areas need more storage; lower detail uses fewer tiles.`}
          />
          <SelectField
            label="Map detail"
            value={zoom}
            onChange={setZoom}
            options={[
              {
                value: '10',
                label: 'Coastal overview',
                description: 'Small download; towns and major coastlines.',
              },
              {
                value: '11',
                label: 'Regional coast',
                description: 'Coastal context across a larger area.',
              },
              {
                value: '12',
                label: 'Harbours',
                description: 'Local context with moderate storage.',
              },
              { value: '13', label: 'Detailed coast' },
              {
                value: '14',
                label: 'High detail',
                description: 'Choose a small area to stay within the download limit.',
              },
            ]}
          />
        </>
      ) : null}
      {areaConfirmed && selection.estimate ? (
        <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
          About {selection.estimate.tileCount} map tiles · estimated{' '}
          {(selection.estimate.estimatedBytes / 1_000_000).toFixed(1)} MB. Actual download is capped
          at {(selection.estimate.maxBytes / 1_000_000).toFixed(0)} MB. Includes attribution and
          fonts.
        </Text>
      ) : null}
      {!busy && progress?.status !== 'complete' ? (
        <Check
          label="Also save available places and weather for this area"
          checked={includeEvidence}
          onChange={setIncludeEvidence}
        />
      ) : null}
      {selectedRadiusNm > 25 && includeEvidence ? (
        <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
          Live place and weather downloads cover up to {distance(25, units)} around the centre; map
          tiles cover the full selected area.
        </Text>
      ) : null}
      <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
        This downloads a display map. Nautical depth, seabed and hazard evidence have separate
        coverage. Keep the app open while downloading; closing this sheet pauses the transfer.
      </Text>
      {includeEvidence && selectedRadiusNm < 0.25 && areaConfirmed ? (
        <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
          Places and weather use the provider’s minimum {distance(0.25, units)} area around this
          centre.
        </Text>
      ) : null}
      {offline ? (
        <Notice>
          Offline: choose an area now, then reconnect to download or resume. Saved map coverage
          remains available.
        </Notice>
      ) : null}
      {areaConfirmed && selection.error ? <Notice tone="warning">{selection.error}</Notice> : null}
      {error ? <Notice tone="warning">{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {progress?.status === 'partial' && typeof progress.usableZoom === 'number' ? (
        <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
          Coarse coverage is ready through zoom {progress.usableZoom} of {progress.maxZoom}. You can
          pause and open this partial map from Saved.
        </Text>
      ) : null}
      {busy ? (
        <>
          <Text accessibilityLiveRegion="polite" style={{ color: c.ink, fontSize: 13 }}>
            {phase === 'evidence' ? (
              'Saving available places and weather…'
            ) : (
              <>
                Downloading {progress?.completedTiles ?? 0} /{' '}
                {progress?.tileCount ?? selection.estimate?.tileCount ?? 0} tiles ·{' '}
                {((progress?.bytes ?? 0) / 1_000_000).toFixed(1)} MB
              </>
            )}
          </Text>
          <Button secondary onPress={() => controller.current?.abort()}>
            {phase === 'evidence' ? 'Cancel data download' : 'Pause download'}
          </Button>
        </>
      ) : progress?.status === 'complete' ? (
        <>
          {evidenceFailed && includeEvidence ? (
            <Button secondary disabled={offline} onPress={() => void download()}>
              Retry places and weather
            </Button>
          ) : null}
          <Button onPress={onClose}>Done</Button>
        </>
      ) : (
        <Button
          icon="download"
          disabled={offline || !areaConfirmed || !selection.bounds || !!selection.error}
          onPress={() => void download()}
        >
          {resume || progress ? 'Resume download' : 'Download selected area'}
        </Button>
      )}
    </Sheet>
  );
}
