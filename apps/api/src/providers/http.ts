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
  private nextRequest = 0;
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
    const existing = this.pending.get(url.href);
    if (existing) return existing as Promise<Sourced<T>>;
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
      const delay = Math.max(0, this.nextRequest - now());
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      this.nextRequest = now() + 250;
      const response = await (this.options.fetch ?? fetch)(url, {
        headers: {
          'User-Agent': this.options.userAgent,
          Accept: 'application/geo+json, application/json',
        },
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 10000),
        redirect: 'error',
      });
      if (!response.ok)
        throw new ProviderError(
          response.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_UNAVAILABLE',
          'Government provider request failed',
          response.status,
        );
      const text = await response.text();
      if (text.length > 12_000_000)
        throw new ProviderError('RESPONSE_TOO_LARGE', 'Provider response exceeds limit');
      const data = JSON.parse(text) as T;
      const maxAge = /max-age=(\d+)/i.exec(response.headers.get('cache-control') ?? '');
      const ttl = Math.min(this.options.ttlSeconds ?? 900, maxAge ? Number(maxAge[1]) : 900);
      const result: Sourced<T> = {
        data,
        provenance: {
          providerId: this.options.providerId,
          url: url.href,
          retrievedAt: new Date(now()).toISOString(),
          validUntil: new Date(now() + ttl * 1000).toISOString(),
          ...(response.headers.get('etag') ? { etag: response.headers.get('etag')! } : {}),
        },
      };
      if (this.cache.size >= 128) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(url.href, result);
      return result;
    } finally {
      release();
    }
  }
}
