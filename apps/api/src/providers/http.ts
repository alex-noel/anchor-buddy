import type { HttpTransport, Sourced } from './contracts.js';

export class ProviderError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** Small bounded cache; no stale-success fallback and no arbitrary URL proxy. */
export class GovernmentHttp implements HttpTransport {
  private readonly cache = new Map<string, Sourced<unknown>>();
  private readonly pending = new Map<string, Promise<Sourced<unknown>>>();
  private readonly modified = new Map<string, string>();
  private nextRequest = 0;
  private blockedUntil = 0;
  private queue: Promise<void> = Promise.resolve();
  constructor(
    private readonly options: {
      providerId: string;
      userAgent: string;
      hosts: readonly string[];
      fetch?: typeof fetch;
      now?: () => number;
      ttlSeconds?: number;
      timeoutMs?: number;
      minIntervalMs?: number;
      maxPending?: number;
      maxBytes?: number;
      respectServerExpiry?: boolean;
      postForm?: boolean;
    },
  ) {}

  async json<T>(address: string): Promise<Sourced<T>> {
    const url = new URL(address);
    if (
      url.protocol !== 'https:' ||
      !this.options.hosts.includes(url.hostname) ||
      url.username ||
      url.password
    ) {
      throw new ProviderError('INVALID_SOURCE', 'Provider URL is outside its allowlist');
    }
    const now = this.options.now ?? Date.now;
    const cached = this.cache.get(url.href);
    if (cached && Date.parse(cached.provenance.validUntil) > now()) return cached as Sourced<T>;
    if (this.blockedUntil > now())
      throw new ProviderError('RATE_LIMITED', 'Provider requested a cooldown; retry later', 429);
    const existing = this.pending.get(url.href);
    if (existing) return existing as Promise<Sourced<T>>;
    if (this.pending.size >= (this.options.maxPending ?? 8))
      throw new ProviderError('PROVIDER_BUSY', 'Provider queue is full; retry later', 429);
    const operation = this.load<T>(url, now);
    this.pending.set(url.href, operation);
    try {
      return await operation;
    } finally {
      this.pending.delete(url.href);
    }
  }

  private async load<T>(url: URL, now: () => number): Promise<Sourced<T>> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      if (this.blockedUntil > now())
        throw new ProviderError('RATE_LIMITED', 'Provider requested a cooldown; retry later', 429);
      const delay = Math.max(0, this.nextRequest - now());
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      this.nextRequest = now() + (this.options.minIntervalMs ?? 250);
      const address = new URL(url);
      const form = this.options.postForm ? new URLSearchParams(address.searchParams) : undefined;
      if (form) address.search = '';
      const response = await (this.options.fetch ?? fetch)(address, {
        ...(form ? { method: 'POST', body: form } : {}),
        headers: {
          'User-Agent': this.options.userAgent,
          Accept: 'application/geo+json, application/json',
          ...(this.modified.has(url.href)
            ? { 'If-Modified-Since': this.modified.get(url.href)! }
            : {}),
        },
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 10000),
        redirect: 'error',
      });
      const prior = this.cache.get(url.href);
      if (!response.ok && !(response.status === 304 && prior)) {
        if (response.status === 429) {
          const retry = response.headers.get('retry-after') ?? '';
          const seconds = /^\d+$/.test(retry) ? Number(retry) : (Date.parse(retry) - now()) / 1000;
          this.blockedUntil =
            now() + Math.min(3600, Math.max(60, Number.isFinite(seconds) ? seconds : 60)) * 1000;
        }
        await response.body?.cancel();
        throw new ProviderError(
          response.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_UNAVAILABLE',
          'Public data provider request failed',
          response.status,
        );
      }
      let data: T;
      if (response.status === 304 && prior) data = prior.data as T;
      else {
        const bytes = await readBoundedBody(response, this.options.maxBytes ?? 12_000_000);
        try {
          data = JSON.parse(new TextDecoder().decode(bytes)) as T;
        } catch {
          throw new ProviderError('INVALID_RESPONSE', 'Provider returned invalid JSON');
        }
      }
      const maxAge = /max-age=(\d+)/i.exec(response.headers.get('cache-control') ?? '');
      const expires = Date.parse(response.headers.get('expires') ?? '');
      const serverTtl = Number.isFinite(expires)
        ? Math.max(0, (expires - now()) / 1000)
        : maxAge
          ? Number(maxAge[1])
          : undefined;
      const ttl = /no-store/i.test(response.headers.get('cache-control') ?? '')
        ? 0
        : this.options.respectServerExpiry
          ? Math.min(86400, serverTtl ?? this.options.ttlSeconds ?? 900)
          : Math.min(this.options.ttlSeconds ?? 900, serverTtl ?? this.options.ttlSeconds ?? 900);
      const publicUrl = new URL(url);
      for (const name of ['apikey', 'api_key', 'key', 'token']) publicUrl.searchParams.delete(name);
      const result: Sourced<T> = {
        data,
        provenance: {
          providerId: this.options.providerId,
          url: publicUrl.href,
          retrievedAt: new Date(now()).toISOString(),
          validUntil: new Date(now() + ttl * 1000).toISOString(),
          ...(response.headers.get('etag') ? { etag: response.headers.get('etag')! } : {}),
        },
      };
      if (response.headers.get('last-modified'))
        this.modified.set(url.href, response.headers.get('last-modified')!);
      if (this.cache.size >= 128) {
        const oldest = this.cache.keys().next().value!;
        this.cache.delete(oldest);
        this.modified.delete(oldest);
      }
      this.cache.set(url.href, result);
      return result;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(
        'UPSTREAM_UNAVAILABLE',
        'Public data provider request failed or timed out',
      );
    } finally {
      release();
    }
  }
}

export async function readBoundedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > maxBytes) {
    await response.body?.cancel();
    throw new ProviderError('RESPONSE_TOO_LARGE', 'Provider response exceeds limit');
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ProviderError('RESPONSE_TOO_LARGE', 'Provider response exceeds limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
