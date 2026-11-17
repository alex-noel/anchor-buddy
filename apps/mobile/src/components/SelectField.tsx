import React, {
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type PressableProps,
  type Role,
} from 'react-native';
import { colors as c } from '../theme';
import { Icon, s, type ControlState } from './ui';

const web = Platform.OS === 'web';
type PressableKeyEvent = Parameters<NonNullable<PressableProps['onKeyDownCapture']>>[0];

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
  error,
  controlRef,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  help?: string;
  error?: string;
  controlRef?: React.Ref<{ focus(): void }>;
  required?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const listId = id + '-options';
  const trigger = useRef<React.ComponentRef<typeof Pressable>>(null);
  const typed = useRef({ text: '', at: 0 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];
  const unavailable = disabled || options.length === 0;
  // Close an expanded list when the parent disables the field.
  if (unavailable && activeIndex !== null) setActiveIndex(null);
  const open = activeIndex !== null && !unavailable;
  const highlighted = open ? Math.min(activeIndex, options.length - 1) : null;
  const optionId = (index: number) => listId + '-' + index;
  const highlightedId = highlighted === null ? undefined : optionId(highlighted);
  const describedBy = [help ? id + '-help' : '', error ? id + '-error' : '']
    .filter(Boolean)
    .join(' ');

  useImperativeHandle(
    controlRef,
    () => ({
      focus() {
        const control = trigger.current;
        if (!control) return;
        if (web) control.focus();
        else AccessibilityInfo.sendAccessibilityEvent(control, 'focus');
      },
    }),
    [],
  );

  useLayoutEffect(() => {
    if (web && highlightedId) {
      document.getElementById(highlightedId)?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedId]);

  const close = () => {
    setActiveIndex(null);
    typed.current = { text: '', at: 0 };
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!unavailable && option) {
      if (web) trigger.current?.focus();
      close();
      onChange(option.value);
    }
  };

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (unavailable || event.ctrlKey || event.metaKey) return;
    const current = highlighted ?? Math.max(selectedIndex, 0);
    let next: number;
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) {
          if (open) choose(current);
          else setActiveIndex(current);
        }
        return;
      case 'ArrowDown':
        next = open ? Math.min(current + 1, options.length - 1) : current;
        break;
      case 'ArrowUp':
        next = open ? Math.max(current - 1, 0) : current;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      case 'Escape':
        if (!open) return;
        // The enclosing React Native Web modal closes on Escape keyup.
        event.preventDefault();
        event.stopPropagation();
        return;
      default: {
        if (event.altKey || event.key.length !== 1) return;
        const letter = event.key.toLocaleLowerCase();
        const prefix = event.timeStamp - typed.current.at < 500 ? typed.current.text : '';
        const cycling = prefix === letter;
        const query = cycling ? letter : prefix + letter;
        typed.current = { text: query, at: event.timeStamp };
        const start = prefix && !cycling ? current : current + 1;
        const ordered = options.slice(start).concat(options.slice(0, start));
        const match = ordered.findIndex((option) =>
          option.label.toLocaleLowerCase().startsWith(query),
        );
        if (match < 0) return;
        next = (start + match) % options.length;
      }
    }
    event.preventDefault();
    event.stopPropagation();
    setActiveIndex(next);
  }

  const keyboard = web
    ? {
        'aria-controls': open ? listId : undefined,
        'aria-activedescendant': highlightedId,
        'aria-haspopup': 'listbox',
        // React Native Web forwards DOM keyboard events to these web-only handlers.
        onKeyDownCapture: (event: PressableKeyEvent) =>
          onKeyDown(event as unknown as KeyboardEvent<HTMLElement>),
        onKeyUpCapture: (event: PressableKeyEvent) => {
          if (open && (event as unknown as KeyboardEvent<HTMLElement>).key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        },
        onBlur: close,
      }
    : undefined;
  return (
    <View style={{ flexGrow: 1, flexShrink: 0, minWidth: 130, gap: 7 }}>
      <Text style={s.fieldLabel}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <Pressable
        ref={trigger}
        accessibilityRole={web ? 'combobox' : 'button'}
        accessibilityLabel={web ? label : `${label}: ${selected?.label ?? 'Choose'}`}
        accessibilityState={{ expanded: open, disabled: unavailable }}
        accessibilityHint={[
          required ? 'Required.' : '',
          help,
          error ? `Error: ${error}` : undefined,
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={unavailable}
        aria-expanded={open}
        aria-required={web ? required : undefined}
        aria-invalid={web ? Boolean(error) : undefined}
        aria-describedby={web && describedBy ? describedBy : undefined}
        {...keyboard}
        onPress={() => {
          if (unavailable) return;
          if (web) trigger.current?.focus();
          if (open) close();
          else setActiveIndex(Math.max(selectedIndex, 0));
        }}
        style={({ pressed, focused }: ControlState) => [
          s.inputWrap,
          error && s.inputInvalid,
          s.hitTarget,
          { gap: 12 },
          (unavailable || pressed) && { opacity: unavailable ? 0.55 : 0.75 },
          focused && s.focusRing,
        ]}
      >
        <Text style={{ flex: 1, color: c.ink, fontSize: 14, paddingVertical: 12 }}>
          {selected?.label ?? 'Choose'}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.muted} />
      </Pressable>
      {open ? (
        <ScrollView
          nativeID={web ? listId : undefined}
          // The native role union omits listbox, which React Native Web forwards.
          role={web ? ('listbox' as Role) : undefined}
          accessibilityLabel={`${label} options`}
          tabIndex={web ? -1 : undefined}
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
          {options.map((option, index) => (
            <Pressable
              key={option.value}
              nativeID={web ? optionId(index) : undefined}
              accessibilityRole={web ? undefined : 'button'}
              role={web ? 'option' : undefined}
              accessibilityState={{ selected: option.value === value }}
              aria-selected={web ? option.value === value : undefined}
              aria-describedby={web && option.description ? optionId(index) + '-help' : undefined}
              accessibilityLabel={option.label}
              tabIndex={web ? -1 : undefined}
              {...(web
                ? { onMouseDown: (event: React.MouseEvent) => event.preventDefault() }
                : undefined)}
              onPress={() => choose(index)}
              style={({ pressed }) => [
                s.hitTarget,
                {
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  backgroundColor: option.value === value ? c.mint : c.white,
                  flexDirection: 'row',
                  gap: 10,
                },
                pressed && { opacity: 0.75 },
                web && index === highlighted && [s.focusRing, { outlineOffset: -3 }],
              ]}
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
                  <Text
                    nativeID={web ? optionId(index) + '-help' : undefined}
                    style={{ color: c.muted, fontSize: 12, lineHeight: 18 }}
                  >
                    {option.description}
                  </Text>
                ) : null}
              </View>
              {option.value === value ? <Icon name="check" size={16} color={c.green} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {help ? (
        <Text nativeID={web ? id + '-help' : undefined} style={s.help}>
          {help}
        </Text>
      ) : null}
      {error ? (
        <Text
          nativeID={web ? id + '-error' : undefined}
          accessibilityLiveRegion="polite"
          style={s.fieldError}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
export default SelectField;
