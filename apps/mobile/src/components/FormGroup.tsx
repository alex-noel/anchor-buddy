import React, { useId, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors as c, textScale } from '../theme';
import { Icon, s, type ControlState } from './ui';

export function FormGroup({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={styles.heading}>
          {title}
        </Text>
        {help ? <Text style={s.help}>{help}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function FormDisclosure({
  title,
  summary,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const summaryId = useId();
  return (
    <View style={styles.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={expanded ? undefined : summary}
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        aria-describedby={expanded ? undefined : summaryId}
        onPress={onToggle}
        style={({ focused, pressed }: ControlState) => [
          styles.toggle,
          s.hitTarget,
          focused && s.focusRing,
          pressed && { opacity: 0.75 },
        ]}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.heading}>{title}</Text>
          {!expanded ? (
            <Text nativeID={summaryId} style={s.help}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} color={c.muted} />
      </Pressable>
      {expanded ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 12,
    backgroundColor: c.white,
    padding: 14,
    gap: 14,
  },
  heading: { color: c.ink, fontSize: textScale.bodyLarge, fontWeight: '600' },
  disclosure: { borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.white },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  content: { gap: 14, padding: 14, paddingTop: 2 },
});
