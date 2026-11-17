import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import WatchScreen from '../../src/screens/WatchScreen';
import ResultCard from '../../src/components/ResultCard';
import { Field } from '../../src/components/ui';
function Cards() {
  const [selected, setSelected] = useState(-1);
  return (
    <main style={{ maxWidth: 700, padding: 16, display: 'grid', gap: 16 }}>
      <h1>Test-only presentation fixtures</h1>
      {['passes', 'excluded', 'insufficient_evidence'].map((status, index) => (
        <ResultCard
          key={status}
          index={index}
          units="metric"
          selected={selected === index}
          onSelect={() => setSelected(index)}
          assessment={{
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
  new URLSearchParams(location.search).has('cards') ? <Cards /> : <Harness />,
);
