import React, { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
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
import { Button, Icon, s, type ControlState } from './ui';

const web = Platform.OS === 'web';

export default function Sheet({
  title,
  subtitle,
  onClose,
  footer,
  dirty = false,
  pending = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ReactNode;
  dirty?: boolean;
  pending?: boolean;
  children: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const titleId = useId();
  const subtitleId = useId();
  const promptId = useId();
  const panel = useRef<React.ComponentRef<typeof View>>(null);
  const body = useRef<React.ComponentRef<typeof View>>(null);
  const closeButton = useRef<React.ComponentRef<typeof Pressable>>(null);
  const keepButton = useRef<React.ComponentRef<typeof Pressable>>(null);
  const releaseBackground = useRef<(() => void) | undefined>(undefined);
  const previousControl = useRef<HTMLElement | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const locked = pending || confirmDiscard;
  const padding = width > 600 ? 24 : 16;

  useEffect(() => {
    if (web) return;
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  // RN Web Modal already traps and restores focus. Release inert before its
  // restoration, with a fallback if the modal's opener is still connected.
  useLayoutEffect(() => {
    if (!web) return;
    const opener = document.activeElement;
    return () => {
      releaseBackground.current?.();
      if (opener instanceof HTMLElement) {
        requestAnimationFrame(() => {
          if (
            opener.isConnected &&
            !opener.closest('[inert]') &&
            document.activeElement === document.body
          )
            opener.focus({ preventScroll: true });
        });
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!web || !body.current) return;
    const content = body.current as unknown as HTMLElement;
    if (locked) {
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && content.contains(focused)) focused.blur();
      content.inert = true;
      content.setAttribute('aria-hidden', 'true');
    } else {
      content.inert = false;
      content.removeAttribute('aria-hidden');
    }
  }, [locked]);

  useLayoutEffect(() => {
    if (confirmDiscard && keepButton.current) {
      if (web) keepButton.current.focus();
      else AccessibilityInfo.sendAccessibilityEvent(keepButton.current, 'focus');
    } else if (web && previousControl.current) {
      previousControl.current.focus({ preventScroll: true });
      previousControl.current = null;
    }
  }, [confirmDiscard]);

  function onShow() {
    if (!web || !panel.current || releaseBackground.current) return;
    const sheet = panel.current as unknown as HTMLElement;
    let portal = sheet;
    while (portal.parentElement && portal.parentElement !== document.body)
      portal = portal.parentElement;
    if (portal.parentElement !== document.body) return;
    if (!sheet.contains(document.activeElement)) closeButton.current?.focus();
    const background = Array.from(document.body.children)
      .filter(
        (child): child is HTMLElement =>
          child !== portal && child instanceof HTMLElement && !child.inert,
      )
      .map((element) => ({ element, hidden: element.getAttribute('aria-hidden') }));
    for (const { element } of background) {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    }
    releaseBackground.current = () => {
      for (const { element, hidden } of background) {
        element.inert = false;
        if (hidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', hidden);
      }
      releaseBackground.current = undefined;
    };
  }

  function requestClose() {
    if (pending) return;
    if (confirmDiscard) {
      setConfirmDiscard(false);
      return;
    }
    if (!dirty) {
      onClose();
      return;
    }
    if (web && document.activeElement instanceof HTMLElement)
      previousControl.current = document.activeElement;
    Keyboard.dismiss();
    setConfirmDiscard(true);
  }

  const modalLabel = web
    ? {
        'aria-labelledby': confirmDiscard ? promptId : titleId,
        'aria-describedby': subtitle && !confirmDiscard ? subtitleId : undefined,
        'aria-busy': pending || undefined,
      }
    : {};
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={requestClose}
      onShow={onShow}
      {...modalLabel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled={!web}
        style={{
          flex: 1,
          backgroundColor: '#10182880',
          justifyContent: 'center',
          alignItems: 'center',
          padding: width > 600 ? 24 : 8,
        }}
      >
        <View
          ref={panel}
          accessibilityViewIsModal
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
              padding,
              borderBottomWidth: 1,
              borderBottomColor: c.line,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <View style={{ flex: 1, gap: 5 }}>
              <Text
                nativeID={titleId}
                accessibilityRole="header"
                style={{ fontSize: 23, fontWeight: '600', color: c.ink, letterSpacing: -0.5 }}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  nativeID={subtitleId}
                  style={{ fontSize: 12, lineHeight: 18, color: c.muted }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {keyboardVisible ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hide keyboard"
                onPress={Keyboard.dismiss}
                style={({ focused }: ControlState) => [
                  s.hitTarget,
                  { justifyContent: 'center', paddingHorizontal: 8 },
                  focused && s.focusRing,
                ]}
              >
                <Text style={{ color: c.blue, fontSize: 13, fontWeight: '600' }}>Done</Text>
              </Pressable>
            ) : null}
            <Pressable
              ref={closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              accessibilityState={{ disabled: locked }}
              disabled={locked}
              onPress={requestClose}
              style={({ pressed, focused }: ControlState) => [
                s.hitTarget,
                { alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
                (pressed || locked) && { opacity: locked ? 0.45 : 0.75 },
                focused && !locked && s.focusRing,
              ]}
            >
              <Icon name="x" />
            </Pressable>
          </View>
          <View
            ref={body}
            style={{ flexShrink: 1 }}
            pointerEvents={locked ? 'none' : 'auto'}
            accessibilityElementsHidden={locked}
            importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}
          >
            <ScrollView
              contentContainerStyle={{ padding, gap: 20 }}
              style={{ flexShrink: 1 }}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              scrollEnabled={!locked}
            >
              {children}
            </ScrollView>
          </View>
          {confirmDiscard || footer ? (
            <View
              style={{
                padding,
                paddingVertical: 12,
                gap: 8,
                borderTopWidth: 1,
                borderTopColor: c.line,
              }}
            >
              {confirmDiscard ? (
                <>
                  <Text
                    nativeID={promptId}
                    accessibilityRole="header"
                    style={{ fontSize: 16, fontWeight: '600', color: c.ink }}
                  >
                    Discard changes?
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <Pressable
                      ref={keepButton}
                      accessibilityRole="button"
                      onPress={() => setConfirmDiscard(false)}
                      style={({ pressed, focused }: ControlState) => [
                        s.hitTarget,
                        s.button,
                        s.secondary,
                        pressed && { opacity: 0.75 },
                        focused && s.focusRing,
                      ]}
                    >
                      <Text style={[s.buttonText, { color: c.ink }]}>Keep editing</Text>
                    </Pressable>
                    <Button onPress={onClose}>Discard</Button>
                  </View>
                </>
              ) : (
                footer
              )}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
