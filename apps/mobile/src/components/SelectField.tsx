import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors as c } from '../theme';
import { Icon, s } from './ui';
export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}
export function SelectField({
  label,
  value,
  options,
  onChange,
  help,
  required = false,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  help?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View style={{ flex: 1, minWidth: 130, gap: 7 }}>
      <Text style={s.fieldLabel}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'Choose'}`}
        accessibilityState={{ expanded: open }}
        accessibilityHint={[required ? 'Required.' : '', help ?? ''].filter(Boolean).join(' ')}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        style={{ ...s.inputWrap, minHeight: 46, gap: 12 }}
      >
        <Text style={{ flex: 1, color: c.ink, fontSize: 14, paddingVertical: 12 }}>
          {selected?.label ?? 'Choose'}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.muted} />
      </Pressable>
      {open ? (
        <ScrollView
          accessibilityLabel={`${label} options`}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          style={{
            maxHeight: 240,
            flexGrow: 0,
            flexShrink: 0,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 10,
            backgroundColor: c.white,
          }}
        >
          {options.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === value }}
              aria-pressed={option.value === value}
              accessibilityLabel={option.label}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 13,
                minHeight: 44,
                backgroundColor: option.value === value ? c.mint : c.white,
                flexDirection: 'row',
                gap: 10,
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  style={{
                    color: c.ink,
                    fontSize: 14,
                    fontWeight: option.value === value ? '600' : '400',
                  }}
                >
                  {option.label}
                </Text>
                {option.description ? (
                  <Text style={{ color: c.muted, fontSize: 12, lineHeight: 18 }}>
                    {option.description}
                  </Text>
                ) : null}
              </View>
              {option.value === value ? <Icon name="check" size={16} color={c.green} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {help ? <Text style={s.help}>{help}</Text> : null}
    </View>
  );
}
export default SelectField;
