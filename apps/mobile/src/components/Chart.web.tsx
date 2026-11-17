import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import * as maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
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

type SourceEvent = { sourceId?: string; tile?: { tileID?: { key?: string } } };
const sourceResource = (event: SourceEvent) => ({
  sourceId: event.sourceId,
  tileKey: event.tile?.tileID?.key,
});

export default function Chart(props: ChartProps) {
  const div = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const styleReady = useRef(false);
  const appliedStyle = useRef<StyleSpecification | null>(null);
  const retryCamera = useRef<maplibregl.CameraOptions | null>(null);
  const scaleControl = useRef<maplibregl.ScaleControl | null>(null);
  const refs = useRef(props);
  refs.current = props;
  const [attempt, setAttempt] = useState(0);
  const { load, signal } = useChartLoad(attempt);
  const base = useChartStyle(props.pack, props.onlineBasemap, attempt);
  const results = useMemo(
    () =>
      props.results ??
      createResultPresentation(props.assessments ?? [], props.selectedId, props.manualAssessment),
    [props.results, props.assessments, props.selectedId, props.manualAssessment],
  );
  const selected = results.selected?.assessment;
  const revealedPosition = results.selectedBeyondLimit ? selected?.candidate.position : undefined;
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
      base.style,
      props.showBedding,
      props.origin,
      props.searchRadiusNm,
      props.showMarks,
    ],
  );
  const styleRef = useRef(style);
  styleRef.current = style;
  const markers = useRef<maplibregl.Marker[]>([]);
  const evidenceMarkers = useRef<maplibregl.Marker[]>([]);
  const [view, setView] = useState({
    zoom: radiusZoom(props.origin, props.searchRadiusNm, props.initialZoom),
    bearing: 0,
    pitch: 0,
  });
  useEffect(() => {
    const container = div.current;
    if (!container) return;
    let m: maplibregl.Map | undefined;
    let observer: ResizeObserver | undefined;
    try {
      maplibregl.setWorkerUrl(`/maplibre/${maplibregl.getVersion()}/maplibre-gl-worker.mjs`);
      const { origin, searchRadiusNm, initialZoom, units } = refs.current;
      const fit = () => ({
        center: origin,
        zoom: radiusZoom(
          origin,
          searchRadiusNm,
          initialZoom,
          mapFitDiameter(container.clientWidth, container.clientHeight),
        ),
      });
      const restored = retryCamera.current;
      const instance = new maplibregl.Map({
        container,
        style: styleRef.current,
        ...(restored ?? fit()),
        minZoom: 2,
        maxZoom: 18,
        trackResize: false,
        attributionControl: { compact: true },
      });
      m = instance;
      map.current = instance;
      appliedStyle.current = styleRef.current;
      let needsFirstFit = !restored && (!container.clientWidth || !container.clientHeight);
      const resize = () => {
        if (!container.clientWidth || !container.clientHeight) return;
        instance.resize();
        if (needsFirstFit) {
          needsFirstFit = false;
          instance.jumpTo(fit());
        }
      };
      observer = new ResizeObserver(resize);
      observer.observe(container);
      resize();

      instance.on('style.load', () => {
        if (map.current !== instance) return;
        styleReady.current = true;
        if (appliedStyle.current !== styleRef.current) {
          appliedStyle.current = styleRef.current;
          instance.setStyle(styleRef.current, { diff: true });
        }
      });
      instance.on('idle', () => {
        if (map.current !== instance || !styleReady.current) return;
        signal({
          type: 'sourcesDisplayed',
          ids: new Set(Object.keys(instance.getStyle().sources)),
        });
        signal({ type: 'rendered' });
      });
      instance.on('sourcedata', (event) => {
        if (map.current !== instance) return;
        // "Idle" and isSourceLoaded also include failed requests. Match actual content.
        if (event.tile?.state === 'loaded' || (!event.tile && event.sourceDataType === 'content'))
          signal({ type: 'sourceRecovered', source: sourceResource(event) });
      });
      instance.on('error', (event) => {
        if (map.current !== instance) return;
        const resource = sourceResource(event as typeof event & SourceEvent);
        if (resource.sourceId || styleReady.current)
          signal({ type: 'sourceFailed', source: resource });
        else signal({ type: 'rendererFailed' });
      });
      instance.on('webglcontextlost', () => {
        if (map.current !== instance) return;
        styleReady.current = false;
        signal({ type: 'rendererFailed' });
      });
      instance.on('webglcontextrestored', () => {
        if (map.current === instance) signal({ type: 'start' });
      });
      instance.on('moveend', () =>
        setView({
          zoom: instance.getZoom(),
          bearing: instance.getBearing(),
          pitch: instance.getPitch(),
        }),
      );
      instance.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
      scaleControl.current = new maplibregl.ScaleControl({ unit: units ?? 'nautical' });
      instance.addControl(scaleControl.current, 'bottom-left');
      instance.on('contextmenu', (e) => refs.current.onPin([e.lngLat.lng, e.lngLat.lat]));
      instance.on('click', (e) => {
        if (refs.current.selectOnTap) refs.current.onPin([e.lngLat.lng, e.lngLat.lat]);
      });
      instance.on('dblclick', (e) => {
        e.preventDefault();
        refs.current.onPin([e.lngLat.lng, e.lngLat.lat]);
      });
    } catch {
      observer?.disconnect();
      map.current = null;
      m?.remove();
      signal({ type: 'rendererFailed' });
      return;
    }
    return () => {
      observer?.disconnect();
      markers.current.forEach((marker) => marker.remove());
      evidenceMarkers.current.forEach((marker) => marker.remove());
      map.current = null;
      m?.remove();
      scaleControl.current = null;
      styleReady.current = false;
      appliedStyle.current = null;
    };
  }, [attempt, signal]);

  const retry = () => {
    const instance = map.current;
    if (instance) {
      retryCamera.current = {
        center: instance.getCenter(),
        zoom: instance.getZoom(),
        bearing: instance.getBearing(),
        pitch: instance.getPitch(),
      };
    }
    signal({ type: 'start' });
    setAttempt((previous) => previous + 1);
  };
  useEffect(() => {
    scaleControl.current?.setUnit(props.units ?? 'nautical');
  }, [props.units]);
  useEffect(() => {
    if (!styleReady.current || appliedStyle.current === style) return;
    appliedStyle.current = style;
    map.current?.setStyle(style, { diff: true });
  }, [style]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    evidenceMarkers.current.forEach((marker) => marker.remove());
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
    evidenceMarkers.current = labels.map((label) => {
      const el = document.createElement('div');
      el.textContent = label.text;
      el.title = label.detail;
      el.setAttribute('aria-label', label.detail);
      el.style.cssText = `color:${c.ink};background:#ffffffdb;padding:2px 4px;border-radius:3px;font:600 10px system-ui;pointer-events:none;white-space:nowrap;`;
      return new maplibregl.Marker({
        element: el,
        offset: [0, label.kind === 'depth' ? -12 : 12],
      })
        .setLngLat(label.position)
        .addTo(m);
    });
    if (props.showMarks ?? true)
      for (const mark of props.pack.marks ?? []) {
        const el = document.createElement('div');
        const glyph = document.createElement('span');
        glyph.textContent = '◇';
        glyph.style.cssText = 'font-size:24px;line-height:22px;text-shadow:0 0 2px white;';
        const label = document.createElement('span');
        label.textContent = mark.label;
        label.style.cssText = 'padding:1px 3px;background:#ffffffdd;';
        el.append(glyph, label);
        el.title = `Chart mark: ${mark.name} · ${mark.kind.replaceAll('_', ' ')} · ${mark.sourceIds.map((id) => props.pack.sources.find((source) => source.id === id)?.name ?? id).join(', ')}`;
        el.setAttribute('role', 'img');
        el.setAttribute('aria-label', el.title);
        el.style.cssText = `display:flex;flex-direction:column;align-items:center;color:${c.ink};font:600 9px system-ui;pointer-events:none;`;
        evidenceMarkers.current.push(
          new maplibregl.Marker({ element: el }).setLngLat(mark.position).addTo(m),
        );
      }
    return () => {
      evidenceMarkers.current.forEach((marker) => marker.remove());
    };
  }, [
    props.pack,
    props.showDepth,
    props.showBedding,
    props.showMarks,
    results.markers,
    props.origin,
    view,
    attempt,
  ]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((x) => x.remove());
    markers.current = results.markers.map((marker) => {
      const { assessment, selected, status } = marker;
      const el = document.createElement('button');
      const label = markerLabel(marker);
      el.type = 'button';
      el.setAttribute('aria-label', `Select ${label}`);
      el.setAttribute('aria-pressed', String(selected));
      el.title = label;
      const outline = selected ? `0 0 0 3px ${c.action}, ` : '';
      el.style.cssText = `width:44px;height:44px;border:3px solid white;border-radius:50%;background:${status.color};color:white;font:600 12px system-ui;box-shadow:${outline}0 3px 12px #153b3b35;cursor:pointer;z-index:${selected ? 1 : 0};`;
      el.textContent = markerText(marker);
      el.onclick = (event) => {
        event.stopPropagation();
        refs.current.onSelect(assessment.id);
      };
      return new maplibregl.Marker({ element: el })
        .setLngLat(assessment.candidate.position)
        .addTo(m);
    });
    const boat = document.createElement('div');
    boat.style.cssText =
      'width:17px;height:17px;background:#286B90;border:4px solid white;border-radius:50%;box-shadow:0 0 0 9px #397b9225;pointer-events:none';
    boat.title = 'Search origin';
    markers.current.push(new maplibregl.Marker({ element: boat }).setLngLat(props.origin).addTo(m));
  }, [results.markers, props.origin, attempt]);
  useEffect(() => {
    const container = div.current;
    if (!container) return;
    map.current?.easeTo({
      center: props.origin,
      ...(props.searchRadiusNm
        ? {
            zoom: radiusZoom(
              props.origin,
              props.searchRadiusNm,
              props.initialZoom,
              mapFitDiameter(container.clientWidth, container.clientHeight),
            ),
          }
        : {}),
      duration: 500,
    });
  }, [props.origin[0], props.origin[1], props.searchRadiusNm]);
  useEffect(() => {
    if (revealedPosition) map.current?.easeTo({ center: revealedPosition, duration: 300 });
  }, [revealedPosition?.[0], revealedPosition?.[1]]);
  return (
    <View style={{ flex: 1, minHeight: 0, backgroundColor: c.ocean }}>
      <View style={{ flex: 1, minHeight: 100 }}>
        <div key={attempt} ref={div} style={{ position: 'absolute', inset: 0 }} />
      </View>
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
