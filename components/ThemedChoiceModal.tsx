import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import GoldBevel from './GoldBevel';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';

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
  const dim = 'rgba(0,0,0,0.60)';
  const isGoldTheme = themeMode === 'gold';
  const modalColors = isGoldTheme
    ? GOLD_GRADIENTS.premiumPanel
    : ([t.bgCard, t.bgCard, t.bgCard] as [string, string, string]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <Pressable style={{ flex: 1, backgroundColor: dim, justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={onRequestClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <LinearGradient
            colors={modalColors}
            locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
            start={isGoldTheme ? { x: 0, y: 0 } : undefined}
            end={isGoldTheme ? { x: 1, y: 1 } : undefined}
            style={{
              borderRadius: 16,
              padding: 22,
              width: '100%',
              maxWidth: 360,
              borderWidth: 1,
              borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : t.border,
              overflow: 'hidden',
              ...(isGoldTheme ? goldShadow(3) : {}),
            }}
          >
            {isGoldTheme && <GoldBevel radius={16} intensity="strong" />}
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 10, zIndex: 10 }}>
              {title}
            </Text>
            <Text
              style={{
                color: t.textMuted,
                fontSize: f.body,
                lineHeight: f.body * 1.5,
                marginBottom: 18,
                zIndex: 10,
              }}
            >
              {message}
            </Text>
            <View style={{ gap: 10, zIndex: 10 }}>
              {choices.map((c, i) => {
                const primary = c.variant !== 'secondary';
                const buttonColors = isGoldTheme
                  ? primary
                    ? GOLD_GRADIENTS.primaryButton
                    : GOLD_GRADIENTS.raisedTile
                  : ([primary ? t.accent : t.bgSurface, primary ? t.accent : t.bgSurface, primary ? t.accent : t.bgSurface] as [string, string, string]);
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
                      borderWidth: 1,
                      borderColor: isGoldTheme
                        ? primary ? GOLD_RICH.edgeLight : GOLD_RICH.hairline
                        : primary ? t.accent : t.border,
                      overflow: 'hidden',
                      ...(isGoldTheme && primary ? goldShadow(1) : {}),
                    }}
                  >
                    <LinearGradient
                      colors={buttonColors}
                      locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
                      start={isGoldTheme ? { x: 0, y: 0 } : undefined}
                      end={isGoldTheme ? { x: 1, y: 1 } : undefined}
                      style={{ paddingVertical: 14, alignItems: 'center', paddingHorizontal: 14 }}
                    >
                      {isGoldTheme && <GoldBevel radius={12} intensity={primary ? 'strong' : 'quiet'} />}
                      <Text
                        style={{
                          color: isGoldTheme ? primary ? GOLD_RICH.blackPiano : t.textPrimary : primary ? t.correctText : t.textPrimary,
                          fontWeight: '700',
                          fontSize: f.body,
                          zIndex: 10,
                        }}
                      >
                        {c.label}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
