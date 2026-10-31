import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors as c } from '../theme';
import { Icon, s } from './ui';
import SelectField from './SelectField';
import {
  localDateKey,
  localDateLabel,
  localHourCandidates,
  localHourLabel,
  type LocalDateHour,
} from '../lib/localDateHour';

export default function LocalDateHourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LocalDateHour;
  onChange: (value: LocalDateHour) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const [y, m] = value.date.split('-').map(Number);
    return new Date(y, m - 1, 1, 12);
  });
  const candidates = localHourCandidates(value);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leading = (month.getDay() + 6) % 7;
  const cells = Array.from(
    { length: Math.ceil((leading + days) / 7) * 7 },
    (_, index) => index - leading + 1,
  );
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 2, gap: 7 }}>
          <Text style={s.fieldLabel}>{label} date</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} date: ${localDateLabel(value.date)}`}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen(!open)}
            style={{ ...s.inputWrap, minHeight: 46, gap: 8 }}
          >
            <Icon name="calendar" size={16} color={c.muted} />
            <Text style={{ flex: 1, fontSize: 14, color: c.ink, paddingVertical: 12 }}>
              {localDateLabel(value.date)}
            </Text>
          </Pressable>
        </View>
        <SelectField
          label={`${label} hour`}
          value={String(value.hour)}
          options={Array.from({ length: 24 }, (_, h) => ({
            value: String(h),
            label: localHourLabel(h),
          }))}
          onChange={(hour) => onChange({ ...value, hour: Number(hour), occurrence: undefined })}
        />
      </View>
      {open ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: c.line,
            backgroundColor: c.white,
            borderRadius: 12,
            padding: 10,
            gap: 8,
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Previous month for ${label.toLowerCase()}`}
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))}
              style={{ padding: 12 }}
            >
              <Icon name="chevron-left" />
            </Pressable>
            <Text style={{ color: c.ink, fontWeight: '600', fontSize: 14 }}>
              {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Next month for ${label.toLowerCase()}`}
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))}
              style={{ padding: 12 }}
            >
              <Icon name="chevron-right" />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <Text
                key={i}
                style={{
                  width: '14.285714%',
                  textAlign: 'center',
                  color: c.muted,
                  fontSize: 11,
                  paddingVertical: 4,
                }}
              >
                {day}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day, i) => {
              if (day < 1 || day > days)
                return <View key={i} style={{ width: '14.285714%', height: 44 }} />;
              const key = localDateKey(new Date(month.getFullYear(), month.getMonth(), day, 12));
              const active = key === value.date;
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}: ${localDateLabel(key)}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onChange({ ...value, date: key, occurrence: undefined });
                    setOpen(false);
                  }}
                  style={{
                    width: '14.285714%',
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 9,
                    backgroundColor: active ? c.green : c.white,
                  }}
                >
                  <Text
                    style={{ color: active ? c.white : c.ink, fontWeight: active ? '700' : '400' }}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {!candidates.length ? (
        <Text style={{ color: c.red, fontSize: 12, lineHeight: 18 }}>
          This hour is skipped by the local daylight-saving change. Choose another hour.
        </Text>
      ) : null}
      {candidates.length > 1 ? (
        <SelectField
          label={`${label} daylight-saving occurrence`}
          value={value.occurrence === undefined ? '' : String(value.occurrence)}
          options={candidates.map((iso, i) => ({
            value: String(i),
            label: `${i === 0 ? 'First' : 'Second'} ${localHourLabel(value.hour)} · ${new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date(iso)).find((part) => part.type === 'timeZoneName')?.value ?? ''}`,
          }))}
          onChange={(occurrence) => onChange({ ...value, occurrence: Number(occurrence) })}
          help="The clock moves back on this date; choose which occurrence you mean."
        />
      ) : null}
    </View>
  );
}
