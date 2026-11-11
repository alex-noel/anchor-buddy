import test from 'node:test';
import assert from 'node:assert/strict';
import {
  connectivityFromState,
  shouldRefreshEvidence,
  evidenceRefreshDecision,
} from './connectivityCore.ts';
test('offline hints take precedence but unknown connectivity does not manufacture an outage', () => {
  assert.equal(connectivityFromState({}), 'unknown');
  assert.equal(connectivityFromState({ isConnected: true, isInternetReachable: false }), 'offline');
  assert.equal(connectivityFromState({ isConnected: false }), 'offline');
  assert.equal(connectivityFromState({ isConnected: true }), 'online');
});

test('a quick reconnect retries after cooldown even when a placeholder pack expires an hour later', () => {
  const input = {
    offline: false,
    active: true,
    loading: false,

    now: 20_000,
    lastAttempt: 10_000,
    expiresAt: new Date(3_610_000).toISOString(),
  };
  const delayed = evidenceRefreshDecision(input, true);
  assert.equal(delayed.refresh, false);
  assert.equal(delayed.reconnectPending, true);
  assert.equal(delayed.retryInMs, 50_000);
  const loading = evidenceRefreshDecision(
    { ...input, now: 70_000, loading: true },
    delayed.reconnectPending,
  );
  assert.equal(loading.refresh, false);
  assert.equal(loading.reconnectPending, true);
  assert.equal(loading.retryInMs, null);
  const ready = evidenceRefreshDecision({ ...input, now: 71_000 }, loading.reconnectPending);
  assert.equal(ready.refresh, true);
  assert.equal(ready.reconnectPending, false);
  assert.equal(
    evidenceRefreshDecision({ ...input, now: 71_000 }, ready.reconnectPending).refresh,
    false,
  );
});

test('manual or actual offline mode cancels pending reconnect intent', () => {
  const input = {
    offline: false,
    active: true,
    loading: false,

    now: 70_000,
    lastAttempt: 0,
  };
  for (const change of [{ offline: true }, { active: false }]) {
    const decision = evidenceRefreshDecision({ ...input, ...change }, true);
    assert.equal(decision.refresh, false);
    assert.equal(decision.reconnectPending, false);
    assert.equal(decision.retryInMs, null);
  }
});
test('reassessment refreshes expired data with a cooldown and respects offline or inactive searches', () => {
  const input = {
    offline: false,
    active: true,
    loading: false,

    now: 120_000,
    lastAttempt: 0,
    expiresAt: new Date(100_000).toISOString(),
  };
  assert.equal(shouldRefreshEvidence(input), true);
  for (const change of [
    { offline: true },
    { active: false },
    { loading: true },

    { lastAttempt: 100_000 },
    { expiresAt: new Date(200_000).toISOString() },
  ])
    assert.equal(shouldRefreshEvidence({ ...input, ...change }), false);
  assert.equal(
    shouldRefreshEvidence({ ...input, expiresAt: new Date(200_000).toISOString(), force: true }),
    true,
  );
});
