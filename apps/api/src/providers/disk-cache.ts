import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, readdir, unlink, open } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/** Bounded, integrity-checked local cache. Dates belong to the payload and are never refreshed on read. */
export class JsonDiskCache {
  readonly directory: string;
  private cleanup: Promise<void> = Promise.resolve();
  constructor(
    directory: string,
    private readonly limits = {
      entries: 128,
      totalBytes: 128 * 1024 * 1024,
      entryBytes: 12 * 1024 * 1024,
    },
  ) {
    this.directory = resolve(directory);
  }
  private path(key: string) {
    return join(this.directory, createHash('sha256').update(key).digest('hex') + '.json');
  }
  async read<T>(key: string): Promise<T | undefined> {
    try {
      const path = this.path(key);
      if ((await stat(path)).size > this.limits.entryBytes) return undefined;
      const envelope = JSON.parse(await readFile(path, 'utf8')) as {
        schema?: number;
        sha256?: string;
        payload?: string;
      };
      if (
        envelope.schema !== 1 ||
        typeof envelope.payload !== 'string' ||
        createHash('sha256').update(envelope.payload).digest('hex') !== envelope.sha256
      )
        return undefined;
      return JSON.parse(envelope.payload) as T;
    } catch {
      return undefined;
    }
  }
  async write(key: string, value: unknown): Promise<void> {
    const payload = JSON.stringify(value);
    const envelope = JSON.stringify({
      schema: 1,
      sha256: createHash('sha256').update(payload).digest('hex'),
      payload,
    });
    if (Buffer.byteLength(envelope) > this.limits.entryBytes)
      throw new Error('Cache record exceeds the configured limit');
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const destination = this.path(key),
      temporary = destination + '.' + randomUUID() + '.tmp';
    try {
      const handle = await open(temporary, 'wx', 0o600);
      try {
        await handle.writeFile(envelope);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, destination);
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
    const operation = this.cleanup.then(() => this.prune());
    this.cleanup = operation.catch(() => undefined);
    await operation;
  }
  private async prune() {
    const names = (await readdir(this.directory)).filter((name) =>
      /^[a-f0-9]{64}\.json$/.test(name),
    );
    const entries = (
      await Promise.all(
        names.map(async (name) => {
          const path = join(this.directory, name);
          try {
            const info = await stat(path);
            return { path, size: info.size, mtime: info.mtimeMs };
          } catch {
            return undefined;
          }
        }),
      )
    )
      .filter((item): item is { path: string; size: number; mtime: number } => !!item)
      .sort((a, b) => b.mtime - a.mtime);
    let bytes = 0;
    for (let index = 0; index < entries.length; index++) {
      const item = entries[index]!;
      bytes += item.size;
      if (index >= this.limits.entries || bytes > this.limits.totalBytes)
        await unlink(item.path).catch(() => undefined);
    }
  }
}
