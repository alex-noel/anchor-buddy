import test from 'node:test';
import assert from 'node:assert/strict';
import { evidencePresentation } from './evidencePresentation.ts';
const base = {
  preference: false,
  connectivity: 'online' as const,
  loading: false,
  error: '',
  hasEvidence: true,
  partial: true,
  expiresAt: '2026-11-17T12:00:00Z',
  now: Date.parse('2026-11-17T13:00:00Z'),
  lastAttempt: 0,
  selectedArea: true,
};
test('offline intent, disconnection and source failure remain different states', () => {
  assert.equal(
    evidencePresentation({ ...base, preference: true }).connection,
    'Offline planning enabled',
  );
  assert.equal(
    evidencePresentation({ ...base, connectivity: 'offline' }).connection,
    'No network connection',
  );
  const failed = evidencePresentation({ ...base, error: 'Provider unavailable' });
  assert.equal(failed.connection, 'Network connected');
  assert.equal(failed.retrieval, 'Source retrieval needs attention');
  assert.equal(failed.expired, true);
});
test('loading never implies freshness and cooldown/offline blocks manual retry', () => {
  const loading = evidencePresentation({ ...base, loading: true });
  assert.equal(loading.expired, true);
  assert.equal(loading.retryDisabled, true);
  assert.match(loading.retryHelp!, /original dates/);
  assert.equal(
    evidencePresentation({ ...base, lastAttempt: base.now - 59_000 }).retryDisabled,
    true,
  );
  assert.equal(
    evidencePresentation({ ...base, lastAttempt: base.now - 60_000 }).retryDisabled,
    false,
  );
  assert.equal(evidencePresentation({ ...base, preference: true }).retryDisabled, true);
});
