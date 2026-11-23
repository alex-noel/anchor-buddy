import React, { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type Role,
} from 'react-native';
import { colors as c } from '../theme';
import { Icon, s, type ControlState } from './ui';
import SelectField from './SelectField';
import {
  calendarDate,
  calendarDateKey,
  localDateKey,
  localDateLabel,
  localHourCandidates,
  localHourLabel,
  mondayColumn,
  moveCalendarDate,
  type LocalDateHour,
} from '../lib/localDateHour';

const web = Platform.OS === 'web';
const weekdays = Array.from({ length: 7 }, (_, index) => {
  const day = new Date(Date.UTC(2024, 0, 1 + index));
  return {
    short: day.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }),
    full: day.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' }),
  };
});
const navigationKeys = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);
type CalendarKeyEvent = Parameters<NonNullable<PressableProps['onKeyDownCapture']>>[0];

export default function LocalDateHourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LocalDateHour;
  onChange: (value: LocalDateHour) => void;
}) {
  const gridId = useId();
  const [open, setOpen] = useState(false);
  const [activeDay, setActiveDay] = useState(value.date);
  const trigger = useRef<React.ComponentRef<typeof Pressable>>(null);
  const activeButton = useRef<React.ComponentRef<typeof Pressable>>(null);
  const focusDay = useRef(false);
  const candidates = localHourCandidates(value);
  const date = calendarDate(activeDay) ?? calendarDate(localDateKey(new Date()))!;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const monthName = date.toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leading = mondayColumn(new Date(Date.UTC(year, month, 1)));
  const rowCount = Math.ceil((leading + days) / 7);

  useLayoutEffect(() => {
    if (open && focusDay.current) {
      focusDay.current = false;
      activeButton.current?.focus();
    }
  }, [activeDay, open]);

  function closeCalendar() {
    setOpen(false);
    if (web) trigger.current?.focus();
  }

  function chooseDate(key: string) {
    onChange({ ...value, date: key, occurrence: undefined });
    closeCalendar();
  }

  function navigate(key: string, shift = false, focus = false) {
    const next = moveCalendarDate(activeDay, key, shift);
    if (next === activeDay) return;
    focusDay.current = web && focus;
    setActiveDay(next);
  }

  const keyboard =
    web && open
      ? {
          onKeyUp: (event: CalendarKeyEvent) => {
            if ((event as unknown as KeyboardEvent<HTMLElement>).key !== 'Escape') return;
            // React Native Web's outer Modal also listens for Escape on keyup.
            event.stopPropagation();
            event.preventDefault();
            closeCalendar();
          },
        }
      : undefined;

  return (
    <View style={{ gap: 10 }} {...keyboard}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 2, gap: 7, minWidth: 0 }}>
          <Text style={s.fieldLabel}>{label} date</Text>
          <Pressable
            ref={trigger}
            accessibilityRole="button"
            accessibilityLabel={`${label} date: ${localDateLabel(value.date, true)}`}
            accessibilityState={{ expanded: open }}
            aria-expanded={open}
            {...(web && open ? { 'aria-controls': gridId } : undefined)}
            onPress={() => {
              if (open) {
                closeCalendar();
                return;
              }
              setActiveDay(calendarDate(value.date) ? value.date : localDateKey(new Date()));
              focusDay.current = web;
              setOpen(true);
            }}
            style={({ focused }: ControlState) => [
              s.inputWrap,
              s.hitTarget,
              { gap: 8 },
              focused && s.focusRing,
            ]}
          >
            <Icon name="calendar" size={16} color={c.muted} />
            <Text style={{ flex: 1, minWidth: 0, fontSize: 14, color: c.ink, paddingVertical: 12 }}>
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
        <View style={styles.calendar}>
          <View style={styles.monthRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Previous month for ${label.toLowerCase()}`}
              onPress={() => navigate('PageUp')}
              style={({ focused }: ControlState) => [
                s.hitTarget,
                styles.monthButton,
                focused && s.focusRing,
              ]}
            >
              <Icon name="chevron-left" />
            </Pressable>
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: c.ink, fontWeight: '600', fontSize: 14 }}
            >
              {monthName}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Next month for ${label.toLowerCase()}`}
              onPress={() => navigate('PageDown')}
              style={({ focused }: ControlState) => [
                s.hitTarget,
                styles.monthButton,
                focused && s.focusRing,
              ]}
            >
              <Icon name="chevron-right" />
            </Pressable>
          </View>
          <View
            nativeID={gridId}
            role={web ? 'grid' : undefined}
            accessibilityLabel={`${label} calendar · ${monthName}`}
          >
            <View style={styles.week} role={web ? 'row' : undefined}>
              {weekdays.map((day) => (
                <Text
                  key={day.full}
                  role={web ? 'columnheader' : undefined}
                  accessibilityLabel={day.full}
                  style={[styles.cell, styles.weekday]}
                >
                  {day.short}
                </Text>
              ))}
            </View>
            {Array.from({ length: rowCount }, (_, row) => (
              <View key={row} style={styles.week} role={web ? 'row' : undefined}>
                {Array.from({ length: 7 }, (_, column) => {
                  const day = row * 7 + column - leading + 1;
                  if (day < 1 || day > days)
                    return <View key={column} style={styles.cell} aria-hidden />;
                  const key = calendarDateKey(new Date(Date.UTC(year, month, day)));
                  const selected = key === value.date;
                  return (
                    <View
                      key={key}
                      role={web ? ('gridcell' as Role) : undefined}
                      aria-selected={web ? selected : undefined}
                      style={styles.cell}
                    >
                      <Pressable
                        ref={activeDay === key ? activeButton : undefined}
                        accessibilityRole="button"
                        accessibilityLabel={localDateLabel(key, true)}
                        accessibilityState={web ? undefined : { selected }}
                        tabIndex={web ? (activeDay === key ? 0 : -1) : undefined}
                        onPress={() => chooseDate(key)}
                        {...(web
                          ? {
                              onKeyDownCapture: (event: CalendarKeyEvent) => {
                                const keyEvent = event as unknown as KeyboardEvent<HTMLElement>;
                                if (!navigationKeys.has(keyEvent.key)) return;
                                event.preventDefault();
                                event.stopPropagation();
                                navigate(keyEvent.key, keyEvent.shiftKey, true);
                              },
                            }
                          : undefined)}
                        style={({ focused, pressed }: ControlState) => [
                          styles.day,
                          selected && styles.selected,
                          pressed && { opacity: 0.75 },
                          focused && [s.focusRing, { outlineOffset: -3 }],
                        ]}
                      >
                        <Text
                          style={{
                            color: selected ? c.white : c.ink,
                            fontSize: 13,
                            fontWeight: selected ? '700' : '400',
                          }}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={styles.calendarActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Set ${label.toLowerCase()} date to today`}
              onPress={() => chooseDate(localDateKey(new Date()))}
              style={({ focused }: ControlState) => [
                s.hitTarget,
                styles.calendarAction,
                focused && s.focusRing,
              ]}
            >
              <Text style={styles.actionLabel}>Today</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cancel ${label.toLowerCase()} calendar`}
              onPress={closeCalendar}
              style={({ focused }: ControlState) => [
                s.hitTarget,
                styles.calendarAction,
                focused && s.focusRing,
              ]}
            >
              <Text style={styles.actionLabel}>Cancel</Text>
            </Pressable>
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
          help="The clock moves back on this date. Choose the occurrence you mean."
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.white,
    borderRadius: 12,
    paddingVertical: 8,
    gap: 8,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginHorizontal: 8,
  },
  monthButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  week: { flexDirection: 'row' },
  cell: { width: '14.285714%' },
  weekday: { textAlign: 'center', color: c.muted, fontSize: 11, paddingVertical: 4 },
  day: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  selected: { backgroundColor: c.action },
  calendarActions: { flexDirection: 'row', gap: 8, marginHorizontal: 8 },
  calendarAction: { justifyContent: 'center', borderRadius: 8, paddingHorizontal: 10 },
  actionLabel: { color: c.action, fontWeight: '600', fontSize: 13 },
});
