import React, { useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled={Platform.OS !== 'web'}
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
            flexShrink: 1,
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
            {keyboardVisible ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hide keyboard"
                onPress={Keyboard.dismiss}
                style={{ padding: 10 }}
              >
                <Text style={{ color: c.blue, fontSize: 13, fontWeight: '600' }}>Done</Text>
              </Pressable>
            ) : null}
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
            style={{ flexShrink: 1 }}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
