import React, { type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { colors as c } from '../theme';
import { Icon } from './ui';
export default function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: '#10182880',
          justifyContent: 'center',
          alignItems: 'center',
          padding: width > 600 ? 24 : 8,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 680,
            maxHeight: height - (width > 600 ? 48 : 24),
            backgroundColor: c.paper,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              padding: width > 600 ? 24 : 16,
              borderBottomWidth: 1,
              borderBottomColor: c.line,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <View style={{ flex: 1, gap: 5 }}>
              <Text
                accessibilityRole="header"
                style={{ fontSize: 23, fontWeight: '600', color: c.ink, letterSpacing: -0.5 }}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text style={{ fontSize: 12, lineHeight: 18, color: c.muted }}>{subtitle}</Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={onClose}
              style={{ padding: 10 }}
            >
              <Icon name="x" />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: width > 600 ? 24 : 16, gap: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
