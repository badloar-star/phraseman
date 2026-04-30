import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';

export type ThemedChoice = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

type Props = {
  visible: boolean;
  title: string;
  message: string;
  choices: ThemedChoice[];
  onRequestClose: () => void;
};

export default function ThemedChoiceModal({
  visible,
  title,
  message,
  choices,
  onRequestClose,
}: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const dim =
    themeMode === 'ocean' || themeMode === 'sakura' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.60)';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <Pressable style={{ flex: 1, backgroundColor: dim, justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={onRequestClose}>
        <Pressable onPress={e => e.stopPropagation()}>
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
            <Text
              style={{
                color: t.textMuted,
                fontSize: f.body,
                lineHeight: f.body * 1.5,
                marginBottom: 18,
              }}
            >
              {message}
            </Text>
            <View style={{ gap: 10 }}>
              {choices.map((c, i) => {
                const primary = c.variant !== 'secondary';
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      hapticTap();
                      c.onPress();
                      onRequestClose();
                    }}
                    style={{
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      backgroundColor: primary ? t.accent : t.bgSurface,
                      borderWidth: 1,
                      borderColor: primary ? t.accent : t.border,
                    }}
                  >
                    <Text
                      style={{
                        color: primary ? t.correctText : t.textPrimary,
                        fontWeight: '700',
                        fontSize: f.body,
                      }}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
