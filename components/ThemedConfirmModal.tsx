import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  /** JSX alternative to message — use when you need inline images/icons */
  messageNode?: React.ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Accent confirm button (e.g. go to shop) */
  confirmVariant?: 'default' | 'accent';
};

export default function ThemedConfirmModal({
  visible,
  title,
  message,
  messageNode,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmVariant = 'accent',
}: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const dim =
    themeMode === 'ocean' || themeMode === 'sakura' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.60)';
  const confirmBg = confirmVariant === 'accent' ? t.accent : t.bgSurface;
  const confirmText = confirmVariant === 'accent' ? t.correctText : t.textPrimary;
  const confirmBorder = confirmVariant === 'accent' ? t.accent : t.border;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: dim,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: t.bgCard,
            borderRadius: 16,
            padding: 22,
            width: '100%',
            maxWidth: 360,
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 10 }}>
            {title}
          </Text>
          {messageNode ?? (
            <Text
              style={{
                color: t.textMuted,
                fontSize: f.body,
                lineHeight: f.body * 1.5,
                marginBottom: 22,
              }}
            >
              {message}
            </Text>
          )}
          {/* Stacked full-width actions: equal flex:1 in a row forces identical
              narrow columns and awkward wraps for long localized labels. */}
          <View style={{ flexDirection: 'column', gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                hapticTap();
                onCancel();
              }}
              style={{
                width: '100%',
                backgroundColor: t.bgSurface,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: t.border,
              }}
            >
              <Text style={{ color: t.textPrimary, fontWeight: '600', textAlign: 'center', fontSize: f.body }}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                hapticTap();
                onConfirm();
              }}
              style={{
                width: '100%',
                backgroundColor: confirmBg,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: confirmBorder,
              }}
            >
              <Text style={{ color: confirmText, fontWeight: '700', textAlign: 'center', fontSize: f.body }}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
