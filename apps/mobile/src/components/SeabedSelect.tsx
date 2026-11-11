import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BEDDINGS, type Bedding } from '@anchor-buddy/domain';
import { Check, Icon, s } from './ui';
import { colors as c } from '../theme';
export default function SeabedSelect({
  value,
  onChange,
  label = 'Preferred seabeds',
}: {
  value: Bedding[];
  onChange: (value: Bedding[]) => void;
  label?: string;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel="All seabeds — no preference"
        accessibilityState={{ checked: value.length === 0 }}
        aria-checked={value.length === 0}
        onPress={() => onChange([])}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}
      >
        <View
          style={{
            width: 21,
            height: 21,
            borderRadius: 5,
            borderWidth: 1,
            borderColor: value.length ? c.line : c.blue,
            backgroundColor: value.length ? c.white : c.blue,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {value.length === 0 ? <Icon name="check" color="white" size={14} /> : null}
        </View>
        <Text style={{ fontSize: 13, color: c.ink }}>All seabeds — no preference</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2 }}>
        {BEDDINGS.map((bedding) => (
          <View key={bedding} style={{ minWidth: 120, width: '46%' }}>
            <Check
              label={
                bedding === 'unknown' ? 'Unknown' : bedding[0].toUpperCase() + bedding.slice(1)
              }
              checked={value.includes(bedding)}
              onChange={(checked) =>
                onChange(
                  checked
                    ? BEDDINGS.filter((item) => item === bedding || value.includes(item))
                    : value.filter((item) => item !== bedding),
                )
              }
            />
          </View>
        ))}
      </View>
      <Text style={s.help}>
        {value.length
          ? `Match any selected type: ${value.join(', ')}.`
          : 'No preference selected: all seabeds are included.'}{' '}
        Applies to anchor positions only. Evidence, equipment compatibility and habitat restrictions
        still apply.
      </Text>
    </View>
  );
}
