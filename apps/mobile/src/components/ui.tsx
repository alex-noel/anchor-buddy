import React, { useId, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors as c, spacing, textScale } from '../theme';
export type IconName = React.ComponentProps<typeof Feather>['name'];
// React Native Web supplies focus in its Pressable style callback.
export type ControlState = { pressed: boolean; focused?: boolean };

export function Icon({
  name,
  size = 18,
  color = c.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Feather
      name={name}
      size={size}
      color={color}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
export function Button({
  children,
  onPress,
  icon,
  secondary = false,
  disabled = false,
  small = false,
}: {
  children: ReactNode;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed, focused }: ControlState) => [
        s.hitTarget,
        s.button,
        secondary && s.secondary,
        small && { paddingVertical: 10 },
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.75 },
        focused && !disabled && s.focusRing,
      ]}
    >
      {icon ? <Icon name={icon} color={secondary ? c.ink : c.white} size={17} /> : null}
      <Text style={[s.buttonText, secondary && { color: c.ink }]}>{children}</Text>
    </Pressable>
  );
}
export function Chip({
  children,
  selected = false,
  onPress,
  icon,
}: {
  children: ReactNode;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const style = [s.chip, selected && { backgroundColor: c.ink, borderColor: c.ink }];
  const content = (
    <>
      {icon ? <Icon name={icon} size={13} color={selected ? 'white' : c.ink} /> : null}
      <Text
        style={{
          fontSize: textScale.compact,
          fontWeight: '600',
          color: selected ? 'white' : c.ink,
        }}
      >
        {children}
      </Text>
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed, focused }: ControlState) => [
        style,
        s.hitTarget,
        pressed && { opacity: 0.75 },
        focused && s.focusRing,
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Field({
  label,
  value,
  onChange,
  suffix,
  numeric = false,
  signed = false,
  help,
  required = false,
  disabled = false,
  error,
  invalid = false,
  inputRef,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  numeric?: boolean;
  signed?: boolean;
  help?: string;
  required?: boolean;
  disabled?: boolean;
  /** Error text is announced with the field's label, unit, and help. */
  error?: string;
  /** Mark invalid while an error message is being prepared or summarized elsewhere. */
  invalid?: boolean;
  /** Lets form owners focus this input without reaching into the rendered tree. */
  inputRef?: React.Ref<React.ComponentRef<typeof TextInput>>;
  onSubmitEditing?: () => void;
}) {
  const hintId = useId();
  const errorId = useId();
  const [focused, setFocused] = useState(false);
  const isInvalid = invalid || Boolean(error);
  const describedBy =
    [help ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ') || undefined;
  return (
    <View style={[{ flex: 1, minWidth: 130, gap: 7 }, s.fieldLayout]}>
      <Text style={s.fieldLabel}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <View style={[s.inputWrap, isInvalid && s.inputInvalid, focused && !disabled && s.focusRing]}>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          editable={!disabled}
          accessibilityState={{ disabled }}
          accessibilityHint={[
            required ? 'Required.' : '',
            suffix ? `Unit: ${suffix}.` : '',
            help ?? '',
            error ? `Error: ${error}` : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-required={required}
          aria-invalid={isInvalid}
          aria-describedby={describedBy}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={
            signed
              ? Platform.OS === 'ios'
                ? 'numbers-and-punctuation'
                : Platform.OS === 'android'
                  ? 'numeric'
                  : 'default'
              : numeric
                ? 'decimal-pad'
                : 'default'
          }
          autoCorrect={false}
          spellCheck={false}
          returnKeyType={onSubmitEditing ? 'search' : 'done'}
          autoCapitalize="none"
          style={[s.input, disabled && { opacity: 0.6 }]}
        />
        {suffix ? (
          <Text style={{ color: c.muted, fontSize: textScale.compact }}>{suffix}</Text>
        ) : null}
      </View>
      {help ? (
        <Text nativeID={hintId} style={s.help}>
          {help}
        </Text>
      ) : null}
      {error ? (
        <Text nativeID={errorId} accessibilityLiveRegion="polite" style={s.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      aria-checked={checked}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={({ pressed, focused }: ControlState) => [
        s.checkRow,
        s.hitTarget,
        pressed && { opacity: 0.75 },
        focused && s.focusRing,
      ]}
    >
      <View style={[s.check, checked && { backgroundColor: c.action, borderColor: c.action }]}>
        {checked ? <Icon name="check" color="white" size={14} /> : null}
      </View>
      <Text style={{ flex: 1, color: c.ink, fontSize: textScale.compact + 1, lineHeight: 20 }}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warning' | 'error' | 'neutral';
}) {
  const noticeTone = {
    info: { background: c.informationLight, foreground: c.information, icon: 'info' as const },
    warning: { background: c.warningLight, foreground: c.warning, icon: 'alert-circle' as const },
    error: { background: c.errorLight, foreground: c.error, icon: 'x-circle' as const },
    neutral: { background: c.neutralLight, foreground: c.neutral, icon: 'minus-circle' as const },
  }[tone];
  return (
    <View style={[s.notice, { backgroundColor: noticeTone.background }]}>
      <Icon name={noticeTone.icon} size={16} color={noticeTone.foreground} />
      <Text style={{ flex: 1, fontSize: textScale.compact, lineHeight: 19, color: c.ink }}>
        {children}
      </Text>
    </View>
  );
}

/** Statuses stay legible without color perception and at reduced color contrast. */
export function StatusPill({ status }: { status: 'passing' | 'excluded' | 'unknown' }) {
  const presentation = {
    passing: {
      label: 'Checks pass',
      icon: 'check-circle' as const,
      color: c.success,
      background: c.successLight,
    },
    excluded: {
      label: 'Excluded',
      icon: 'x-circle' as const,
      color: c.error,
      background: c.errorLight,
    },
    unknown: {
      label: 'Needs more evidence',
      icon: 'help-circle' as const,
      color: c.neutral,
      background: c.neutralLight,
    },
  }[status];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={presentation.label}
      style={[s.statusPill, { backgroundColor: presentation.background }]}
    >
      <Icon name={presentation.icon} size={14} color={presentation.color} />
      <Text style={{ color: presentation.color, fontSize: textScale.compact, fontWeight: '600' }}>
        {presentation.label}
      </Text>
    </View>
  );
}
export const s = StyleSheet.create({
  hitTarget: { minWidth: 44, minHeight: 44 },
  focusRing: {
    outlineColor: c.ink,
    outlineStyle: 'solid',
    outlineWidth: 2,
    outlineOffset: 1,
    boxShadow: `0 0 0 2px ${c.white}`,
  },
  button: {
    backgroundColor: c.action,
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.md + 3,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  secondary: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line },
  buttonText: { color: c.white, fontWeight: '600', fontSize: textScale.compact + 1 },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.line,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: c.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: { fontSize: textScale.caption, fontWeight: '600', letterSpacing: 0.5, color: c.muted },
  card: {
    backgroundColor: c.white,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  fieldLabel: { fontSize: textScale.compact, color: c.ink, fontWeight: '600' },
  // Keep text or help from overflowing the field's flex box inside a web sheet.
  fieldLayout: Platform.OS === 'web' ? { minHeight: 'auto' } : {},
  inputWrap: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.white,
  },
  inputInvalid: { borderColor: c.error },
  input: {
    flex: 1,
    fontSize: textScale.body,
    color: c.ink,
    paddingVertical: 12,
    minHeight: 44,
    minWidth: 0,
  },
  help: { fontSize: textScale.caption, lineHeight: 17, color: c.muted },
  fieldError: { fontSize: textScale.caption, lineHeight: 17, color: c.error },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  check: {
    width: 21,
    height: 21,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  notice: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
});
