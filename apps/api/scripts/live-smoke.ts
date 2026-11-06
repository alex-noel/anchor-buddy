import { createApp } from '../src/server.js';
import { validateRegionPack } from '@anchor-buddy/domain';

// Deliberate, bounded, read-only calls. No world downloads or private position data.
const app = createApp();
try {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/regions/discover',
    payload: { center: [5.36, 43.29], radiusNm: 2, name: 'Marseille live smoke' },
  });
  if (response.statusCode !== 200) throw new Error(response.body);
  const data = response.json();
  const errors = validateRegionPack(data.pack);
  if (errors.length) throw new Error(errors.join('; '));
  console.log(
    JSON.stringify(
      {
        region: data.pack.id,
        version: data.pack.version,
        status: data.pack.validation.status,
        places: data.pack.places.length,
        marks: data.pack.marks.length,
        forecastIntervals: data.pack.weather.length,
        sources: data.pack.sources.map((source: { name: string }) => source.name),
        providers: data.providers,
      },
      null,
      2,
    ),
  );
  if (!data.pack.sources.length) process.exitCode = 1;
} finally {
  await app.close();
}
