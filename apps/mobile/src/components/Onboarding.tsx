import React from 'react';
import { Modal, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import type { UnitSystem } from '@anchor-buddy/domain';
import { Button, Chip, Icon, Notice } from './ui';
import { colors as c } from '../theme';

export interface OnboardingSheetProps {
  units: UnitSystem;
  onUnits: (units: UnitSystem) => void;
  onEditVessel: () => void;
  onEditDefaults: () => void;
  vesselConfigured: boolean;
  defaultsConfigured: boolean;
  onFinish: () => void;
  onClose?: () => void;
  error?: string;
  busy?: boolean;
}

function SetupStep({
  number,
  title,
  description,
  complete,
  action,
  actionLabel,
  disabled = false,
}: {
  number: number;
  title: string;
  description: string;
  complete: boolean;
  action: () => void;
  actionLabel: string;
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        gap: 14,
        padding: 18,
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 14,
        backgroundColor: c.white,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: complete ? c.green : c.mint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {complete ? (
            <Icon name="check" size={15} color={c.white} />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.green }}>{number}</Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>{title}</Text>
          <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>{description}</Text>
        </View>
      </View>
      <Button
        secondary
        disabled={disabled}
        onPress={action}
        icon={complete ? 'edit-2' : 'chevron-right'}
      >
        {complete ? actionLabel.replace('Configure', 'Edit') : actionLabel}
      </Button>
    </View>
  );
}

export function OnboardingSheet({
  units,
  onUnits,
  onEditVessel,
  onEditDefaults,
  vesselConfigured,
  defaultsConfigured,
  onFinish,
  onClose,
  error = '',
  busy = false,
}: OnboardingSheetProps) {
  const { width, height } = useWindowDimensions();
  const ready = vesselConfigured && defaultsConfigured;
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={busy ? () => {} : (onClose ?? (() => {}))}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#0A122A88',
          justifyContent: 'center',
          alignItems: 'center',
          padding: width > 600 ? 24 : 12,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 580,
            maxHeight: height - 32,
            backgroundColor: c.paper,
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: width > 600 ? 24 : 18, gap: 20 }}
          >
            <View style={{ gap: 8 }}>
              <Text
                accessibilityRole="header"
                style={{ fontSize: 25, fontWeight: '600', color: c.ink }}
              >
                Set up Anchor Buddy
              </Text>
              <Text style={{ fontSize: 13, lineHeight: 20, color: c.muted }}>
                Configure your boat and search defaults before your first search. You can change
                them in Settings.
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>Display units</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['nautical', 'metric', 'imperial'] as const).map((unit) => (
                  <Chip
                    key={unit}
                    selected={units === unit}
                    onPress={busy ? undefined : () => onUnits(unit)}
                  >
                    {unit[0].toUpperCase() + unit.slice(1)}
                  </Chip>
                ))}
              </View>
              <Text style={{ fontSize: 12, lineHeight: 18, color: c.muted }}>
                {units === 'nautical'
                  ? 'Nautical miles · metres · knots'
                  : units === 'metric'
                    ? 'Kilometres · metres · km/h'
                    : 'Miles · feet · mph'}
              </Text>
            </View>
            <SetupStep
              number={1}
              title="Your vessel"
              description="Enter dimensions, loaded draft and anchor equipment."
              complete={vesselConfigured}
              action={onEditVessel}
              actionLabel="Configure vessel"
              disabled={busy}
            />
            <SetupStep
              number={2}
              title="Search defaults"
              description="Set your preferred depth, seabed, search radius and operating limits."
              complete={defaultsConfigured}
              action={onEditDefaults}
              actionLabel="Configure defaults"
              disabled={busy}
            />
            <View style={{ gap: 12 }}>
              {error ? (
                <View accessibilityLiveRegion="polite">
                  <Notice tone="warning">{error}</Notice>
                </View>
              ) : null}
              <Button onPress={onFinish} disabled={!ready || busy} icon="arrow-right">
                {busy ? 'Saving setup…' : 'Continue to app tour'}
              </Button>
              {onClose ? (
                <Button secondary disabled={busy} onPress={onClose}>
                  Back to Settings
                </Button>
              ) : null}
              {!ready ? (
                <Text style={{ fontSize: 12, lineHeight: 18, color: c.muted, textAlign: 'center' }}>
                  Complete both steps to continue.
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default OnboardingSheet;
