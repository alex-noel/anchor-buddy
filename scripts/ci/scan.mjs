import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const [kind, directory] = process.argv.slice(2);
if (kind !== 'source' && !(['web', 'hermes'].includes(kind) && directory)) {
  console.error('Usage: node scripts/ci/scan.mjs source | (web | hermes) <export-directory>');
  process.exit(1);
}

const credentialFile =
  /(?:^\.(?:env(?:\..+)?|npmrc|netrc)$|^credentials\.json$|^service-account.*\.json$|^google-services\.json$|^GoogleService-Info\.plist$|\.(?:pem|key|p12|pfx|jks|keystore|mobileprovision|gpx|kml|kmz)$)/i;
const credentials = [
  /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|(?:AKIA|ASIA)[A-Z0-9]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{24,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/,
  /\b(?:[A-Z][A-Z0-9_]*_)?(?:API_KEY|ACCESS_TOKEN|CLIENT_SECRET|PASSWORD)["']?\s*[:=]\s*["']?(?!(?:replace-with-a-local-development-password|choose-a-local-development-password)\b)[A-Za-z0-9_/-]{20,}(?=[\s"',;]|$)/,
];
const runtimeMarkers = [
  'Anchor Buddy synthetic test fixture',
  'Simulation only. This environment cannot monitor or sound a native alarm.',
];
const testModules =
  /(?:(?:packages|@anchor-buddy)\/domain\/src\/testing\.[a-z]+|(?:modules|@anchor-buddy)\/anchor-watch\/src\/testing\/)/;
const results = { credentials: 0, runtime: 0, maps: 0, bundles: 0 };

function sourcePaths(map) {
  if (map?.version !== 3) throw new Error('Invalid bundle source map');
  if (Array.isArray(map.sections)) return map.sections.flatMap(({ map }) => sourcePaths(map));
  if (!Array.isArray(map.sources)) throw new Error('Invalid bundle source map');
  return map.sources.map((source) => join(map.sourceRoot ?? '', source).replaceAll('\\', '/'));
}

function scan(file) {
  const name = basename(file);
  if (name !== '.env.example' && credentialFile.test(name)) results.credentials++;
  if (!lstatSync(file).isFile()) return;
  const bytes = readFileSync(file);
  const binary = bytes.includes(0);
  if (kind === 'source' && binary) return;
  const contents = bytes.toString('utf8');
  if (credentials.some((pattern) => pattern.test(contents))) results.credentials++;
  if (kind === 'source') return;
  const extension = extname(file);
  if (extension === '.map') {
    const sources = sourcePaths(JSON.parse(contents));
    if (!sources.length) throw new Error('Empty bundle source map');
    results.maps++;
    if (sources.some((source) => testModules.test(source))) results.runtime++;
  }
  if ((kind === 'hermes' ? ['.hbc'] : ['.js', '.mjs']).includes(extension)) results.bundles++;
  if (runtimeMarkers.some((marker) => contents.includes(marker))) results.runtime++;
}

function scanDirectory(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) scanDirectory(file);
    else if (entry.isSymbolicLink()) throw new Error('Unexpected symlink in bundle');
    else scan(file);
  }
}

try {
  if (kind === 'source') {
    const names = execFileSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--deduplicate'],
      { encoding: 'utf8' },
    );
    for (const file of names.split('\0').filter(Boolean)) {
      // A staged or unstaged deletion has no content to scan.
      if (lstatSync(file, { throwIfNoEntry: false })) scan(file);
    }
  } else {
    scanDirectory(directory);
    if (!results.maps || !results.bundles) throw new Error('Missing bundle or source map');
  }
} catch {
  // File paths and parser errors may include a matched value or private data.
  console.error('Verification scan could not read the expected input.');
  process.exit(1);
}

if (results.credentials || results.runtime) {
  console.error(
    `Verification scan failed (${results.credentials} credential or private-file findings, ${results.runtime} test-runtime findings).`,
  );
  process.exit(1);
}
console.log(`${kind === 'source' ? 'Source' : 'Bundle'} scan passed.`);
