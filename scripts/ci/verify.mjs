import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const target = process.argv[2];
if (!['checks', 'web', 'ios-js', 'android-js'].includes(target)) {
  console.error('Usage: node scripts/ci/verify.mjs checks | web | ios-js | android-js');
  process.exit(1);
}

const env = { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', EXPO_OFFLINE: '1' };
const node = process.execPath;
const commands = [];
const version = (command, args) => {
  const result = spawnSync(command, args, { env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Could not identify ${command}.`);
  return result.stdout.trim();
};
const digest = () => createHash('sha256').update(readFileSync('package-lock.json')).digest('hex');
const evidence = {
  target,
  commit: version('git', ['rev-parse', 'HEAD']),
  dirty: version('git', ['status', '--porcelain']) !== '',
  lockfileSha256: digest(),
  node: process.version,
  npm: version('npm', ['--version']),
  platform: process.platform,
  architecture: process.arch,
  commands,
  result: 'failed',
};

function run(command, args, cwd = '.') {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  commands.push({
    cwd,
    command: [command === node ? 'node' : command, ...args],
    exitCode: result.status,
    signal: result.signal,
  });
  if (result.status !== 0)
    throw new Error(
      `Verification command failed (${result.status ?? result.signal ?? 'could not start'}).`,
    );
}

try {
  run(node, ['scripts/ci/scan.mjs', 'source']);
  run('npm', ['ci', '--no-audit', '--no-fund', '--fetch-retries=1', '--fetch-timeout=30000']);
  if (digest() !== evidence.lockfileSha256)
    throw new Error('Locked install changed package-lock.json.');
  if (target === 'checks') {
    evidence.python = version('python3', ['--version']);
    run('npm', ['run', 'check']);
  } else if (target === 'web') {
    run('npm', ['run', 'export:web', '--workspace=@anchor-buddy/mobile', '--', '--source-maps']);
    run(node, ['scripts/ci/scan.mjs', 'web', 'apps/mobile/dist']);
  } else {
    const platform = target === 'ios-js' ? 'ios' : 'android';
    run(
      'npm',
      [
        'exec',
        '--',
        'expo',
        'export',
        '--platform',
        platform,
        '--output-dir',
        'dist-native',
        '--source-maps',
      ],
      'apps/mobile',
    );
    run(node, ['scripts/ci/scan.mjs', 'hermes', 'apps/mobile/dist-native']);
  }
  evidence.result = 'passed';
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  mkdirSync('.artifacts/ci', { recursive: true });
  writeFileSync(`.artifacts/ci/${target}.json`, JSON.stringify(evidence, null, 2) + '\n');
}
