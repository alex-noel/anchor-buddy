import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import WatchScreen from '../../src/screens/WatchScreen';
import ResultCard from '../../src/components/ResultCard';
import { assessmentStatus } from '../../src/lib/resultPresentation';
import { Field } from '../../src/components/ui';
import Details from '../../src/components/Details';
import RegionalDataSheet from '../../src/components/RegionalDataSheet';
import { createForecastStay } from '../../src/lib/forecastPresentation';
import { assessCandidate } from '@anchor-buddy/domain';
import { DEFAULT_VESSEL, createDefaultSearch, createDemoPack } from '@anchor-buddy/domain/testing';
function DetailFixture() {
  const pack = createDemoPack();
  const place = pack.places[0];
  const search = createDefaultSearch();
  const assessed = assessCandidate(
    {
      id: place.id,
      name: 'Test-only long harbour detail — synthetic evidence',
      kind: place.kind,
      position: place.position,
      place,
    },
    DEFAULT_VESSEL,
    search,
    pack,
    { purpose: 'historical', assessedAt: new Date().toISOString() },
  );
  const assessment = {
    ...assessed,
    status: 'excluded',
    reasons: [
      {
        code: 'fixture_exclusion',
        severity: 'excluded',
        message: 'Synthetic exclusion remains visible before planning.',
      },
      {
        code: 'fixture_missing',
        severity: 'insufficient_evidence',
        message: 'Synthetic depth evidence is missing.',
      },
      { code: 'fixture_information', severity: 'info', message: 'Secondary synthetic context.' },
    ],
  };
  return (
    <Details
      assessment={assessment}
      stay={createForecastStay(search)}
      pack={pack}
      units="metric"
      evidenceCachedAt="2026-11-01T12:00:00Z"
      onClose={() => {}}
      onPlan={() => {}}
    />
  );
}
function ForecastFixture() {
  const now = new Date('2026-11-17T09:00:00Z');
  const time = (hours) => new Date(now.getTime() + hours * 3_600_000).toISOString();
  const pack = createDemoPack(now);
  pack.generatedAt = time(-1);
  pack.validUntil = time(40);
  pack.sources[0].retrievedAt = time(-1);
  pack.sources[0].validUntil = time(40);
  const search = {
    ...createDefaultSearch(now),
    arrival: time(1),
    departure: time(3),
    departureContingencyHours: 2,
  };
  const stay = createForecastStay(search, 'America/New_York');
  pack.weather = Array.from({ length: 27 }, (_, index) => ({
    validFrom: time(index < 3 ? index : index + 1),
    validUntil: time(index < 3 ? index + 1 : index + 2),
    windKnots: index === 4 ? null : 10,
    gustKnots: index === 4 ? null : 15,
    windDirectionDeg: 90,
    waveM: index === 4 ? null : 1,
    swellM: null,
    currentKnots: null,
    currentDirectionDeg: null,
    warnings: index === 26 ? ['Controlled official warning after first 24 intervals'] : [],
    coverageAreaIds: ['demo-weather', 'demo-currents'],
    sourceIds: [pack.sources[0].id],
  }));
  const place = pack.places[0];
  const assessed = assessCandidate({ ...place, place }, DEFAULT_VESSEL, search, pack);
  const assessment = { ...assessed, weather: pack.weather };
  const params = new URLSearchParams(location.search);
  return params.has('area') ? (
    <RegionalDataSheet
      pack={pack}
      data={null}
      stay={params.has('preview') ? null : stay}
      error=""
      loading={params.has('loading')}
      connectionSummary="Controlled connection summary"
      retryDisabled={params.has('loading')}
      retryHelp="Controlled retry help"
      onRetry={() => {}}
      onSettings={() => {}}
      onClose={() => {}}
      units="metric"
    />
  ) : (
    <Details
      assessment={assessment}
      pack={pack}
      stay={stay}
      units="metric"
      onClose={() => {}}
      onPlan={() => {}}
    />
  );
}
function Cards() {
  const [selected, setSelected] = useState(-1);
  return (
    <main style={{ maxWidth: 700, padding: 16, display: 'grid', gap: 16 }}>
      <h1>Test-only presentation fixtures</h1>
      {['passes', 'excluded', 'insufficient_evidence'].map((status, index) => (
        <ResultCard
          key={status}
          units="metric"
          onSelect={() => setSelected(index)}
          result={{
            rank: index + 1,
            selected: selected === index,
            status: assessmentStatus(status),
            assessment: {
              candidate: {
                name: 'Long Harbour Name — Eastern Anchorage Beside the Old Lighthouse and Marina Entrance',
                kind: 'anchorage',
              },
              status,
              reasons: [
                {
                  message:
                    index === 0
                      ? 'Fixture checks pass; no real navigation evidence.'
                      : index === 1
                        ? 'An exclusion requires review before proceeding.'
                        : 'Depth and pricing evidence are unavailable.',
                },
              ],
              distanceNm: 1.234,
              maxDepthM: index === 2 ? null : 0,
              depthAllowancePercent: index === 1 ? 20 : 0,
              cost: {
                total: index === 2 ? null : 0,
                status: index === 0 ? 'free' : index === 1 ? 'paid' : 'unknown',
                currency: 'USD',
              },
            },
          }}
        />
      ))}
      <Field
        label="Validation fixture"
        required
        value="bad"
        suffix="m"
        help="Enter a verified value."
        error="Enter a finite positive value."
        onChange={() => {}}
      />
      <p>Opened card: {selected}</p>
    </main>
  );
}
function Harness() {
  const [shown, setShown] = useState(true);
  return (
    <>
      <button onClick={() => setShown(!shown)}>Toggle component</button>
      {shown ? <WatchScreen units="nautical" /> : null}
    </>
  );
}
createRoot(document.getElementById('root')).render(
  new URLSearchParams(location.search).has('forecast') ? (
    <ForecastFixture />
  ) : new URLSearchParams(location.search).has('details') ? (
    <DetailFixture />
  ) : new URLSearchParams(location.search).has('cards') ? (
    <Cards />
  ) : (
    <Harness />
  ),
);
