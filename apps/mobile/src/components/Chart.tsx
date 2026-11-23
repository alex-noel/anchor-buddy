import React, { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import {
  Camera,
  Map,
  Marker,
  type StyleSpecification,
  type ViewState,
} from '@maplibre/maplibre-react-native';
import {
  buildMapStyle,
  declutterEvidenceLabels,
  evidenceLabels,
  mapFitDiameter,
  radiusZoom,
  type ChartProps,
} from './mapStyle';
import { colors as c } from '../theme';
import { useChartStyle } from './useChartStyle';
import { ChartNotice, useChartLoad } from './ChartNotice';
import { ChartLegend } from './ChartLegend';
import { createResultPresentation, markerLabel, markerText } from '../lib/resultPresentation';
export default function Chart(props: ChartProps) {
  const results = useMemo(
    () =>
      props.results ??
      createResultPresentation(props.assessments ?? [], props.selectedId, props.manualAssessment),
    [props.results, props.assessments, props.selectedId, props.manualAssessment],
  );
  const selected = results.selected?.assessment;
  const revealedPosition = results.selectedBeyondLimit ? selected?.candidate.position : undefined;
  const [attempt, setAttempt] = useState(0);
  const activeAttempt = useRef(attempt);
  const { load, signal } = useChartLoad(attempt);
  const styleReady = useRef(false);
  const lastView = useRef<ViewState | null>(null);
  const base = useChartStyle(props.pack, props.onlineBasemap, attempt);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const fitZoom = radiusZoom(
    props.origin,
    props.searchRadiusNm,
    props.initialZoom,
    mapFitDiameter(viewport.width, viewport.height),
  );
  const center = revealedPosition ?? props.origin;
  const camera = useMemo(() => ({ center, zoom: fitZoom }), [center[0], center[1], fitZoom]);
  const [restored, setRestored] = useState<{
    view: ViewState;
    camera: typeof camera;
  } | null>(null);
  const restoredView = restored?.camera === camera ? restored.view : null;
  const retry = () => {
    if (lastView.current) setRestored({ view: lastView.current, camera });
    activeAttempt.current += 1;
    styleReady.current = false;
    signal({ type: 'start' });
    setAttempt(activeAttempt.current);
  };
  const [view, setView] = useState({
    zoom: radiusZoom(props.origin, props.searchRadiusNm, props.initialZoom),
    bearing: 0,
    pitch: 0,
  });
  const labels = declutterEvidenceLabels(
    evidenceLabels(props.pack, props.showDepth, props.showBedding),
    view.zoom,
    view.bearing,
    view.pitch,
    [
      { position: props.origin, radiusPx: 12 },
      ...results.markers.map((marker) => ({
        position: marker.assessment.candidate.position,
        radiusPx: marker.selected ? 25 : 22,
      })),
      ...((props.showMarks ?? true) ? (props.pack.marks ?? []) : []).map((mark) => ({
        position: mark.position,
        radiusPx: 18,
      })),
    ],
  );
  const style = useMemo(
    () =>
      buildMapStyle(
        props.pack,
        selected,
        props.onlineBasemap,
        props.showDepth,
        base.style,
        props.showBedding,
        props.searchRadiusNm ? { origin: props.origin, radiusNm: props.searchRadiusNm } : undefined,
        props.showMarks,
      ) as StyleSpecification,
    [
      props.pack,
      selected,
      props.onlineBasemap,
      props.showDepth,
      props.showBedding,
      props.showMarks,
      props.origin,
      props.searchRadiusNm,
      base.style,
    ],
  );
  return (
    <View style={{ flex: 1, minHeight: 0, backgroundColor: c.ocean }}>
      <Map
        key={attempt}
        style={{ flex: 1, minHeight: 100 }}
        onWillStartLoadingMap={() => {
          if (activeAttempt.current !== attempt) return;
          styleReady.current = false;
          signal({ type: 'start' });
        }}
        onDidFinishLoadingStyle={() => {
          if (activeAttempt.current === attempt) styleReady.current = true;
        }}
        onDidFailLoadingMap={() => {
          if (activeAttempt.current !== attempt) return;
          signal(
            styleReady.current ? { type: 'sourceFailed', source: {} } : { type: 'rendererFailed' },
          );
        }}
        onDidFinishRenderingMapFully={() => {
          if (activeAttempt.current !== attempt || !styleReady.current) return;
          signal({ type: 'sourceRecovered', source: {} });
          signal({ type: 'rendered' });
        }}
        mapStyle={style}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          if (width <= 0 || height <= 0) return;
          // Keep the fit size stable as notices appear and disappear.
          setViewport((previous) => (previous.width ? previous : { width, height }));
        }}
        onRegionDidChange={(event) => {
          if (activeAttempt.current !== attempt) return;
          const { center, zoom, bearing, pitch, bounds } = event.nativeEvent;
          lastView.current = { center, zoom, bearing, pitch, bounds };
          setView({ zoom, bearing, pitch });
        }}
        onPress={(e) => {
          if (props.selectOnTap) props.onPin(e.nativeEvent.lngLat);
        }}
        onLongPress={(e) => props.onPin(e.nativeEvent.lngLat)}
      >
        <Camera
          initialViewState={restoredView ?? camera}
          center={restoredView?.center ?? camera.center}
          zoom={restoredView?.zoom ?? (props.searchRadiusNm ? fitZoom : undefined)}
          bearing={restoredView?.bearing}
          pitch={restoredView?.pitch}
        />
        {labels.map((label) => (
          <Marker key={label.id} id={label.id} lngLat={label.position}>
            <View
              pointerEvents="none"
              style={{ transform: [{ translateY: label.kind === 'depth' ? -12 : 12 }] }}
            >
              <Text
                accessibilityLabel={label.detail}
                style={{
                  color: c.ink,
                  backgroundColor: '#FFFFFFDB',
                  paddingHorizontal: 4,
                  paddingVertical: 2,
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: '600',
                }}
              >
                {label.text}
              </Text>
            </View>
          </Marker>
        ))}
        {(props.showMarks ?? true) &&
          (props.pack.marks ?? []).map((mark) => (
            <Marker key={mark.id} id={`chart-mark-${mark.id}`} lngLat={mark.position}>
              <View
                pointerEvents="none"
                accessibilityLabel={`Chart mark: ${mark.name}. ${mark.kind.replaceAll('_', ' ')}`}
                style={{ alignItems: 'center' }}
              >
                <Text
                  style={{
                    color: c.ink,
                    fontSize: 18,
                    textShadowColor: 'white',
                    textShadowRadius: 2,
                  }}
                >
                  ◇
                </Text>
                <Text
                  style={{
                    color: c.ink,
                    backgroundColor: '#FFFFFFDD',
                    fontSize: 9,
                    paddingHorizontal: 3,
                  }}
                >
                  {mark.label}
                </Text>
              </View>
            </Marker>
          ))}
        {results.markers.map((marker) => {
          const { assessment, selected, status } = marker;
          const select = () => props.onSelect(assessment.id);
          return (
            <Marker
              key={assessment.id}
              id={assessment.id}
              lngLat={assessment.candidate.position}
              onPress={select}
            >
              <View
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Select ${markerLabel(marker)}`}
                accessibilityState={{ selected }}
                accessibilityActions={[{ name: 'activate' }]}
                onAccessibilityAction={select}
                onAccessibilityTap={select}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 3,
                  borderColor: selected ? c.action : 'white',
                  backgroundColor: status.color,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>
                  {markerText(marker)}
                </Text>
              </View>
            </Marker>
          );
        })}
        <Marker id="origin" lngLat={props.origin}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#286B90',
              borderWidth: 4,
              borderColor: 'white',
            }}
          />
        </Marker>
      </Map>
      <ChartLegend results={results} />
      <ChartNotice
        load={load}
        online={props.onlineBasemap}
        cached={base.cached}
        onRetry={retry}
        onShowList={props.onShowList}
      />
    </View>
  );
}
