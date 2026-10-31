import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors as c } from '../theme';
export type IconName = React.ComponentProps<typeof Feather>['name'];
export function Icon({
  name,
  size = 18,
  color = c.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Feather name={name} size={size} color={color} />;
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
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        small && { paddingVertical: 10 },
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.75 },
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
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected } : undefined}
      aria-pressed={onPress ? selected : undefined}
      onPress={onPress}
      style={[s.chip, selected && { backgroundColor: c.ink, borderColor: c.ink }]}
    >
      {icon ? <Icon name={icon} size={13} color={selected ? 'white' : c.ink} /> : null}
      <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? 'white' : c.ink }}>
        {children}
      </Text>
    </Pressable>
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
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  numeric?: boolean;
  help?: string;
}) {
  return (
    <View style={{ flex: 1, minWidth: 130, gap: 7 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.inputWrap}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          autoCapitalize="none"
          style={s.input}
        />
        {suffix ? <Text style={{ color: c.muted, fontSize: 12 }}>{suffix}</Text> : null}
      </View>
      {help ? <Text style={s.help}>{help}</Text> : null}
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
      style={s.checkRow}
    >
      <View style={[s.check, checked && { backgroundColor: c.green, borderColor: c.green }]}>
        {checked ? <Icon name="check" color="white" size={14} /> : null}
      </View>
      <Text style={{ flex: 1, color: c.ink, fontSize: 13, lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warning';
}) {
  return (
    <View style={[s.notice, { backgroundColor: tone === 'warning' ? c.orangeLight : c.mint }]}>
      <Icon
        name={tone === 'warning' ? 'alert-circle' : 'info'}
        size={16}
        color={tone === 'warning' ? c.orange : c.green}
      />
      <Text style={{ flex: 1, fontSize: 12, lineHeight: 19, color: c.ink }}>{children}</Text>
    </View>
  );
}
export const s = StyleSheet.create({
  button: {
    backgroundColor: c.green,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  secondary: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line },
  buttonText: { color: c.white, fontWeight: '600', fontSize: 13 },
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
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, color: c.muted },
  card: {
    backgroundColor: c.white,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  fieldLabel: { fontSize: 12, color: c.ink, fontWeight: '600' },
  inputWrap: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.white,
  },
  input: { flex: 1, fontSize: 14, color: c.ink, paddingVertical: 12, minWidth: 0 },
  help: { fontSize: 11, lineHeight: 17, color: c.muted },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
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
});
