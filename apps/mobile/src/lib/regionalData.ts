import { Platform } from 'react-native';
import { fetch } from 'expo/fetch';
import { readBoundedResponseText } from './httpResponse';
import type { Position, SearchRequest } from '@anchor-buddy/domain';
import { getLocal } from './storage';
import { providerBase, readRegionalData } from './regionalDataCore';

export async function getAPIBase() {
  const saved = await getLocal<string>('provider-api-url');
  return providerBase(
    saved ||
      process.env.EXPO_PUBLIC_API_URL ||
      (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001'),
  );
}

async function request(path: string, init: RequestInit = {}, signal?: AbortSignal) {
  const base = await getAPIBase();
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, 60_000);
  try {
    const response = await fetch(base + path, { ...init, signal: controller.signal });
    const text = await readBoundedResponseText(response, 4_000_000);
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error('The API did not return regional data.');
    }
    if (!response.ok) {
      const error = value as { message?: string; error?: string };
      throw new Error(
        error.message || error.error || 'Data service returned HTTP ' + response.status + '.',
      );
    }
    return value;
  } catch (error) {
    if (signal?.aborted) throw new Error('Search cancelled.');
    if (controller.signal.aborted)
      throw new Error('The data service timed out. Retry or choose a smaller area.');
    throw new Error(
      (error instanceof Error ? error.message : String(error)) +
        ' Check Settings → Data connection; local development needs the API running.',
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export async function discoverRegion(
  search: SearchRequest,
  signal?: AbortSignal,
  regionName?: string,
  timezone?: string,
) {
  if (search.maxDistanceNm > 25)
    throw new Error(
      'Live discovery currently supports areas up to 25 nm. Reduce the radius; larger map areas can still be downloaded separately.',
    );
  const until = new Date(
    Date.parse(search.departure) + search.departureContingencyHours * 3_600_000,
  ).toISOString();
  return readRegionalData(
    await request(
      '/v1/regions/discover',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center: search.origin,
          radiusNm: Math.max(0.25, search.maxDistanceNm),
          from: search.arrival,
          until,
          ...(regionName?.trim() ? { name: regionName.trim().slice(0, 100) } : {}),
          ...(timezone ? { timezone } : {}),
        }),
      },
      signal,
    ),
  );
}

export async function findLocations(
  query: string,
): Promise<{ name: string; position: Position }[]> {
  const value = (await request('/v1/geocode?q=' + encodeURIComponent(query.trim()))) as {
    results?: unknown;
  };
  if (!Array.isArray(value.results))
    throw new Error('The location service returned an invalid response.');
  return value.results
    .filter(
      (row): row is { name: string; position: Position } =>
        row &&
        typeof row.name === 'string' &&
        Array.isArray(row.position) &&
        row.position.length === 2 &&
        row.position.every(Number.isFinite) &&
        Math.abs(row.position[0]) <= 180 &&
        Math.abs(row.position[1]) <= 85,
    )
    .slice(0, 6);
}
