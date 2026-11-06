import { ProviderError, readBoundedBody } from './http.js';
import { PROJECT_USER_AGENT } from './live-types.js';

/** Fixed provider only. It cannot proxy arbitrary URLs or forward client credentials. */
export class OpenFreeMapProxy {
  private active = 0;
  constructor(private readonly request: typeof fetch = fetch) {}
  async resource(address: unknown) {
    let url: URL;
    try {
      url = new URL(typeof address === 'string' ? address : '');
    } catch {
      throw new ProviderError(
        'INVALID_MAP_URL',
        'A permitted OpenFreeMap resource URL is required',
        400,
      );
    }
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'tiles.openfreemap.org' ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      url.search ||
      url.href.length > 2048
    )
      throw new ProviderError(
        'INVALID_MAP_URL',
        'Only HTTPS tiles.openfreemap.org resources are permitted',
        400,
      );
    if (this.active >= 4)
      throw new ProviderError(
        'RATE_LIMITED',
        'Map download concurrency is limited to four resources',
        429,
      );
    this.active++;
    try {
      const response = await this.request(url, {
        headers: { 'User-Agent': PROJECT_USER_AGENT + ' (user-selected offline area)' },
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new ProviderError(
          response.status === 429 ? 'RATE_LIMITED' : 'MAP_UPSTREAM_UNAVAILABLE',
          'OpenFreeMap resource could not be downloaded',
          response.status,
        );
      }
      return {
        bytes: Buffer.from(await readBoundedBody(response, 8 * 1024 * 1024)),
        contentType: response.headers.get('content-type') ?? 'application/octet-stream',
        cacheControl: response.headers.get('cache-control') ?? 'public, max-age=3600',
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(
        'MAP_UPSTREAM_UNAVAILABLE',
        'OpenFreeMap request failed or timed out',
      );
    } finally {
      this.active--;
    }
  }
}
