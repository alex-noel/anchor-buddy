import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { Position, RegionPack } from '@anchor-buddy/domain';
import Chart from './Chart';
import Sheet from './Sheet';
import SelectField from './SelectField';
import { Button, Check, Field, Notice } from './ui';
import { areaBounds } from '../lib/regionalDataCore';
import { parseInputDecimal } from '../lib/inputNumbers';
import { findLocations } from '../lib/regionalData';
import { downloadMapArea, estimateMapArea, type MapArea } from '../lib/worldMaps';
import { colors as c } from '../theme';

export default function MapDownloadsSheet({
  pack,
  center: initialCenter,
  radiusNm = 3,
  resume,
  onSaved,
  onEvidenceDownload,
  onClose,
}: {
  pack: RegionPack;
  center: Position;
  radiusNm?: number;
  resume?: MapArea;
  onSaved: () => void;
  onEvidenceDownload: (center: Position, radiusNm: number) => Promise<void>;
  onClose: () => void;
}) {
  const [center, setCenter] = useState<Position>(
    resume
      ? [(resume.bounds[0] + resume.bounds[2]) / 2, (resume.bounds[1] + resume.bounds[3]) / 2]
      : initialCenter,
  );
  const [radius, setRadius] = useState(String(Number(radiusNm.toFixed(3))));
  const [name, setName] = useState(resume?.name ?? 'Saved map area');
  const [zoom, setZoom] = useState(String(resume?.maxZoom ?? 13));
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState<{ name: string; position: Position }[]>([]);
  const [finding, setFinding] = useState(false);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<MapArea | null>(resume ?? null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const selection = useMemo(() => {
    try {
      const bounds =
        progress?.bounds ?? resume?.bounds ?? areaBounds(center, parseInputDecimal(radius));
      return {
        bounds,
        estimate: estimateMapArea({ bounds, maxZoom: progress?.maxZoom ?? Number(zoom) }),
        error: '',
      };
    } catch (error) {
      return {
        bounds: null,
        estimate: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [center, radius, zoom, resume, progress]);
  const download = async () => {
    if (!selection.bounds || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await downloadMapArea(
        {
          name: name.trim() || 'Saved map area',
          bounds: selection.bounds,
          maxZoom: progress?.maxZoom ?? Number(zoom),
          id: progress?.id ?? resume?.id,
        },
        setProgress,
        abort.signal,
      );
      setProgress(result);
      onSaved();
      setMessage('Map saved on this device.');
      if (includeEvidence && !abort.signal.aborted) {
        try {
          const savedCenter: Position = [
            (result.bounds[0] + result.bounds[2]) / 2,
            (result.bounds[1] + result.bounds[3]) / 2,
          ];
          const savedRadius = Math.min(25, (result.bounds[3] - result.bounds[1]) * 30);
          await onEvidenceDownload(savedCenter, savedRadius);
          setMessage(
            'Map, available place records and weather saved. Forecast expiry dates still apply.',
          );
        } catch (error) {
          setError('The map is saved, but area data could not be downloaded: ' + String(error));
        }
      }
    } catch (error) {
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
      setBusy(false);
    }
  };
  return (
    <Sheet
      title={resume ? 'Resume map download' : 'Download a map area'}
      subtitle="Choose only the area and detail you need. Map files stay in the device cache."
      onClose={() => {
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
          <Field
            label="Find an area"
            value={query}
            onChange={setQuery}
            help="Search for a town, island or harbour; no automatic requests while typing."
          />
          <Button
            secondary
            disabled={busy || finding || query.trim().length < 2}
            onPress={async () => {
              setFinding(true);
              setError('');
              try {
                setLocations(await findLocations(query));
              } catch (e) {
                setError(String(e));
              } finally {
                setFinding(false);
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
                setName(item.name.split(',')[0]);
                setLocations([]);
              }}
            >
              {item.name}
            </Button>
          ))}
        </>
      ) : null}
      <View style={{ height: 270, borderRadius: 12, overflow: 'hidden' }}>
        <Chart
          pack={pack}
          origin={center}
          assessments={[]}
          onlineBasemap
          showDepth={false}
          showBedding={false}
          showMarks={false}
          selectOnTap={!busy && !resume && !progress}
          searchRadiusNm={
            Number.isFinite(parseInputDecimal(radius)) && parseInputDecimal(radius) > 0
              ? parseInputDecimal(radius)
              : 3
          }
          onPin={(position) => {
            if (!busy && !resume && !progress) setCenter(position);
          }}
          onSelect={() => {}}
        />
      </View>
      {!resume && !progress && !busy ? (
        <>
          <Field
            label="Download radius"
            value={radius}
            onChange={setRadius}
            numeric
            suffix="nm"
            help="Tap the map to move the centre. Larger areas need more storage; lower detail uses fewer tiles."
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
      {selection.estimate ? (
        <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
          About {selection.estimate.tileCount} map tiles · estimated{' '}
          {(selection.estimate.estimatedBytes / 1_000_000).toFixed(1)} MB. Actual download is capped
          at {(selection.estimate.maxBytes / 1_000_000).toFixed(0)} MB. Includes attribution and
          fonts.
        </Text>
      ) : null}
      <Check
        label="Also save available places and weather for this area"
        checked={includeEvidence}
        onChange={setIncludeEvidence}
      />
      {parseInputDecimal(radius) > 25 ? (
        <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
          Live place and weather downloads cover up to 25 nm around the centre; map tiles cover the
          full selected area.
        </Text>
      ) : null}
      <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>
        This downloads a display map. Nautical depth, seabed and hazard evidence have separate
        coverage. Keep the app open while downloading; closing this sheet pauses the transfer.
      </Text>
      {selection.error ? <Notice tone="warning">{selection.error}</Notice> : null}
      {error ? <Notice tone="warning">{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {busy ? (
        <>
          <Text accessibilityLiveRegion="polite" style={{ color: c.ink, fontSize: 13 }}>
            Downloading {progress?.completedTiles ?? 0} /{' '}
            {progress?.tileCount ?? selection.estimate?.tileCount ?? 0} tiles ·{' '}
            {((progress?.bytes ?? 0) / 1_000_000).toFixed(1)} MB
          </Text>
          <Button secondary onPress={() => controller.current?.abort()}>
            Pause download
          </Button>
        </>
      ) : progress?.status === 'complete' ? (
        <Button onPress={onClose}>Done</Button>
      ) : (
        <Button
          icon="download"
          disabled={!selection.bounds || !!selection.error}
          onPress={() => void download()}
        >
          {resume || progress ? 'Resume download' : 'Download selected area'}
        </Button>
      )}
    </Sheet>
  );
}
