import React, { useSyncExternalStore } from 'react';
import { Text } from 'react-native';
import { Button, Card, Notice } from './ui';
import { colors as c } from '../theme';
import {
  getOfflineShellStatus,
  prepareOfflineShell,
  subscribeOfflineShell,
} from '../lib/offlineShell';

export default function OfflineReadiness() {
  const state = useSyncExternalStore(
    subscribeOfflineShell,
    getOfflineShellStatus,
    getOfflineShellStatus,
  );
  return (
    <Card>
      <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>
        Application available offline
      </Text>
      {state.platform === 'native' ? (
        <Text style={{ color: c.muted }}>
          Application screens are included in this installed app. Maps and nautical evidence require
          separate downloads.
        </Text>
      ) : state.platform === 'development' ? (
        <Text style={{ color: c.muted }}>
          This development preview does not save application files for offline startup. Use an
          exported browser build to check offline readiness.
        </Text>
      ) : (
        <>
          <Text accessibilityLiveRegion="polite" style={{ color: c.ink }}>
            {state.ready
              ? 'Application files are ready for offline startup.'
              : state.phase === 'preparing'
                ? 'Saving and verifying application files…'
                : 'Application files are not yet ready for offline startup.'}
          </Text>
          <Text style={{ color: c.muted }}>
            This status is separate from saved maps and dated nautical evidence.
          </Text>
          {state.updateWaiting ? (
            <Notice>
              A verified update is waiting. Close all Anchor Buddy browser tabs, then reopen the app
              to use it. Your current complete version remains available.
            </Notice>
          ) : null}
          {state.error ? <Notice tone="warning">{state.error}</Notice> : null}
          <Button
            secondary
            disabled={state.phase === 'preparing'}
            onPress={() => {
              void prepareOfflineShell().catch(() => {});
            }}
          >
            {state.phase === 'preparing'
              ? 'Preparing application…'
              : state.error
                ? 'Retry application download'
                : state.ready
                  ? 'Check application update'
                  : 'Prepare application for offline use'}
          </Button>
        </>
      )}
    </Card>
  );
}
