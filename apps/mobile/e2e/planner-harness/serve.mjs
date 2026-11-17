import { build } from 'esbuild';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const result = await build({ entryPoints: [here + 'entry.jsx'], bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"', __DEV__: 'true' }, alias: { '@anchor-buddy/domain/testing': here + '../../../../packages/domain/src/testing.ts', 'react-native': here + '../watch-harness/native.js', 'expo-location': here + '../watch-harness/bridge.ts', 'react-native-svg': here + '../watch-harness/svg.tsx', '@expo/vector-icons/Feather': here + '../watch-harness/icon.tsx' }, plugins: [{ name: 'chart', setup(build) { build.onResolve({ filter: /^\.\.\/components\/Chart$/ }, () => ({ path: here + 'chart.jsx' })); } }] });
const server = createServer((req, res) => { res.setHeader('Content-Type', req.url === '/bundle.js' ? 'text/javascript' : 'text/html'); res.end(req.url === '/bundle.js' ? result.outputFiles[0].contents : '<!doctype html><html><body><div id="root"></div><script src="/bundle.js"></script></body></html>'); });
server.listen(18184, '127.0.0.1');
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close(() => process.exit(0)));
