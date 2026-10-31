import { createApp } from './server.js';
import { FilePackStore } from './packs.js';
import { resolve } from 'node:path';

const app = createApp({
  packStore: new FilePackStore(resolve(process.env.PACK_ROOT ?? './data/packs')),
  logger: true,
});
try {
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: process.env.HOST ?? '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void app.close();
  });
