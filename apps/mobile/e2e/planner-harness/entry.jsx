import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PlannerScreen from '../../src/screens/PlannerScreen';
import { createDemoPack, DEFAULT_VESSEL, createDefaultSearch } from '@anchor-buddy/domain/testing';
function App() {
  const [handoff, setHandoff] = useState(null);
  const pack = createDemoPack();
  const search = createDefaultSearch(new Date().toISOString());
  const place = pack.places[0];
  const candidate = { id: place.id, name: place.name, kind: place.kind, position: place.position, place };
  return <><PlannerScreen candidate={candidate} pack={pack} vessel={DEFAULT_VESSEL} search={search} context={{ purpose: 'historical', assessedAt: new Date().toISOString() }} depthAllowancePercent={0} offline={true} units="nautical" nativeWatchAvailable={false} onDetails={() => {}} onWatch={(point, radius) => setHandoff({ point, radius })} /><output data-testid="handoff">{JSON.stringify(handoff)}</output></>;
}
createRoot(document.getElementById('root')).render(<App />);
