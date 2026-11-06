import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Camera, Map, Marker, type StyleSpecification } from '@maplibre/maplibre-react-native';
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
export default function Chart(props: ChartProps) {
  const selected = props.assessments.find((a) => a.id === props.selectedId);
  const base = useChartStyle(props.pack, props.onlineBasemap);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const fitZoom = radiusZoom(
    props.origin,
    props.searchRadiusNm,
    props.initialZoom,
    mapFitDiameter(viewport.width, viewport.height),
  );
  const camera = useMemo(
    () => ({ center: props.origin, zoom: fitZoom }),
    [props.origin[0], props.origin[1], fitZoom],
  );
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
      ...props.assessments.slice(0, 50).map((assessment) => ({
        position: assessment.candidate.position,
        radiusPx: assessment.id === props.selectedId ? 23 : 20,
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
        base,
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
      base,
    ],
  );
  return (
    <Map
      style={{ flex: 1, minHeight: 0 }}
      mapStyle={style}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width <= 0 || height <= 0) return;
        setViewport((previous) =>
          previous.width === width && previous.height === height ? previous : { width, height },
        );
      }}
      onRegionDidChange={(event) => {
        const { zoom, bearing, pitch } = event.nativeEvent;
        setView({ zoom, bearing, pitch });
      }}
      onPress={(e) => {
        if (props.selectOnTap) props.onPin(e.nativeEvent.lngLat);
      }}
      onLongPress={(e) => props.onPin(e.nativeEvent.lngLat)}
    >
      <Camera
        initialViewState={camera}
        center={camera.center}
        zoom={props.searchRadiusNm ? fitZoom : undefined}
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
      {props.assessments.slice(0, 50).map((a, i) => (
        <Marker
          key={a.id}
          id={a.id}
          lngLat={a.candidate.position}
          onPress={() => props.onSelect(a.id)}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor:
                a.id === props.selectedId
                  ? c.orange
                  : a.status === 'passes'
                    ? c.green
                    : a.status === 'excluded'
                      ? c.red
                      : c.muted,
              borderWidth: 3,
              borderColor: 'white',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>
              {a.candidate.kind === 'generated' ? '·' : i + 1}
            </Text>
          </View>
        </Marker>
      ))}
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
  );
}
