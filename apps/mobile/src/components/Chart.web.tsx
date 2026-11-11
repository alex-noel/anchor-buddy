import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
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
export default function Chart(props: ChartProps) {
  const div = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const styleReady = useRef(false);
  const scaleControl = useRef<maplibregl.ScaleControl | null>(null);
  const refs = useRef(props);
  refs.current = props;
  const base = useChartStyle(props.pack, props.onlineBasemap);
  const markers = useRef<maplibregl.Marker[]>([]);
  const evidenceMarkers = useRef<maplibregl.Marker[]>([]);
  const [error, setError] = useState('');
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [view, setView] = useState({
    zoom: radiusZoom(props.origin, props.searchRadiusNm, props.initialZoom),
    bearing: 0,
    pitch: 0,
  });
  useEffect(() => {
    if (!div.current) return;
    try {
      maplibregl.setWorkerUrl(`/maplibre/${maplibregl.getVersion()}/maplibre-gl-worker.mjs`);
      const m = new maplibregl.Map({
        container: div.current,
        style: buildMapStyle(
          refs.current.pack,
          undefined,
          refs.current.onlineBasemap,
          refs.current.showDepth,
          null,
          refs.current.showBedding,
          refs.current.searchRadiusNm
            ? { origin: refs.current.origin, radiusNm: refs.current.searchRadiusNm }
            : undefined,
          refs.current.showMarks,
        ) as StyleSpecification,
        center: refs.current.origin,
        zoom: radiusZoom(
          refs.current.origin,
          refs.current.searchRadiusNm,
          refs.current.initialZoom,
          mapFitDiameter(div.current.clientWidth, div.current.clientHeight),
        ),
        minZoom: 2,
        maxZoom: 18,
        attributionControl: { compact: true },
      });
      map.current = m;
      const ready = () => {
        styleReady.current = true;
      };
      m.on('style.load', ready);
      const resize = () => {
        if (!div.current) return;
        const width = div.current.clientWidth,
          height = div.current.clientHeight;
        // Hidden planner tabs retain their last viewport and the user's camera position.
        if (width <= 0 || height <= 0) return;
        m.resize();
        setViewport((previous) =>
          previous.width === width && previous.height === height ? previous : { width, height },
        );
      };
      const observer = new ResizeObserver(resize);
      observer.observe(div.current);
      resize();
      m.on('moveend', () =>
        setView({ zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() }),
      );
      m.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
      scaleControl.current = new maplibregl.ScaleControl({
        unit: refs.current.units ?? 'nautical',
      });
      m.addControl(scaleControl.current, 'bottom-left');
      m.on('contextmenu', (e) => refs.current.onPin([e.lngLat.lng, e.lngLat.lat]));
      m.on('click', (e) => {
        if (refs.current.selectOnTap) refs.current.onPin([e.lngLat.lng, e.lngLat.lat]);
      });
      m.on('dblclick', (e) => {
        e.preventDefault();
        refs.current.onPin([e.lngLat.lng, e.lngLat.lat]);
      });
      m.on('error', () =>
        setError('Some online map detail is unavailable. Saved map coverage remains visible.'),
      );
      return () => {
        observer.disconnect();
        markers.current.forEach((x) => x.remove());
        evidenceMarkers.current.forEach((x) => x.remove());
        m.remove();
        map.current = null;
        scaleControl.current = null;
        styleReady.current = false;
      };
    } catch {
      setError(
        'Map rendering unavailable on this device. Use the list to explore and enter an anchor position in the planner.',
      );
    }
  }, []);
  useEffect(() => {
    scaleControl.current?.setUnit(props.units ?? 'nautical');
  }, [props.units]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    // isStyleLoaded also waits for source data. style.load may already have fired
    // while a source is pending, so waiting for it here can discard an offline style.
    const update = () =>
      m.setStyle(
        buildMapStyle(
          props.pack,
          props.assessments.find((a) => a.id === props.selectedId),
          props.onlineBasemap,
          props.showDepth,
          base,
          props.showBedding,
          props.searchRadiusNm
            ? { origin: props.origin, radiusNm: props.searchRadiusNm }
            : undefined,
          props.showMarks,
        ) as StyleSpecification,
        { diff: true },
      );
    if (styleReady.current) update();
    else m.once('style.load', update);
    return () => {
      m.off('style.load', update);
    };
  }, [
    props.pack,
    props.selectedId,
    props.assessments,
    props.onlineBasemap,
    props.showDepth,
    props.showBedding,
    props.showMarks,
    props.searchRadiusNm,
    props.origin,
    base,
  ]);
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
    props.assessments,
    props.selectedId,
    props.origin,
    view,
  ]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((x) => x.remove());
    markers.current = props.assessments.slice(0, 50).map((a, i) => {
      const el = document.createElement('button');
      el.setAttribute('aria-label', `Select ${a.candidate.name}`);
      el.title = a.candidate.name;
      const active = a.id === props.selectedId;
      const color = a.status === 'passes' ? c.green : a.status === 'excluded' ? c.red : c.muted;
      el.style.cssText = `width:${active ? 40 : 32}px;height:${active ? 40 : 32}px;border:3px solid white;border-radius:50%;background:${active ? c.orange : color};color:white;font:600 12px system-ui;box-shadow:0 3px 12px #153b3b35;cursor:pointer;`;
      el.textContent = a.candidate.kind === 'generated' ? '·' : String(i + 1);
      el.onclick = (e) => {
        e.stopPropagation();
        refs.current.onSelect(a.id);
      };
      return new maplibregl.Marker({ element: el }).setLngLat(a.candidate.position).addTo(m);
    });
    const boat = document.createElement('div');
    boat.style.cssText =
      'width:17px;height:17px;background:#286B90;border:4px solid white;border-radius:50%;box-shadow:0 0 0 9px #397b9225';
    boat.title = 'Search origin';
    markers.current.push(new maplibregl.Marker({ element: boat }).setLngLat(props.origin).addTo(m));
  }, [props.assessments, props.selectedId, props.origin]);
  useEffect(() => {
    if (!viewport.width || !viewport.height) return;
    map.current?.easeTo({
      center: props.origin,
      ...(props.searchRadiusNm
        ? {
            zoom: radiusZoom(
              props.origin,
              props.searchRadiusNm,
              props.initialZoom,
              mapFitDiameter(viewport.width, viewport.height),
            ),
          }
        : {}),
      duration: 500,
    });
  }, [props.origin[0], props.origin[1], props.searchRadiusNm, viewport.width, viewport.height]);
  return (
    <View style={{ flex: 1, minHeight: 0, backgroundColor: c.ocean }}>
      <div ref={div} style={{ position: 'absolute', inset: 0 }} />
      {error ? (
        <View
          style={{
            position: 'absolute',
            bottom: 45,
            left: 16,
            right: 16,
            padding: 10,
            backgroundColor: '#FFFFFFED',
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 11, color: c.muted }}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
