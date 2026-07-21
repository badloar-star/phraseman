import React, { memo } from 'react';
import { LinearGradient } from './SafeLinearGradient';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import GoldBevel from './GoldBevel';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_GRADIENTS, COMPASS_RICH, COMPASS_SURFACE_LOCATIONS, compassShadow } from '../constants/compassTheme';

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

function ThemedChoiceModal({
  visible,
  title,
  message,
  choices,
  onRequestClose,
}: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const dim = 'rgba(0,0,0,0.60)';
  const isGoldTheme = themeMode === 'gold';
  const isCompassTheme = false;
  const modalColors = isGoldTheme
    ? GOLD_GRADIENTS.premiumPanel
    : isCompassTheme
      ? COMPASS_GRADIENTS.premiumPanel
    : ([t.bgCard, t.bgCard, t.bgCard] as [string, string, string]);
  const modalRadius = isCompassTheme ? 14 : 16;
  const buttonRadius = isCompassTheme ? 9 : 12;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <Pressable style={{ flex: 1, backgroundColor: dim, justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={onRequestClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <LinearGradient
            colors={modalColors}
            locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
            start={isGoldTheme || isCompassTheme ? { x: 0, y: 0 } : undefined}
            end={isGoldTheme || isCompassTheme ? { x: 1, y: 1 } : undefined}
            style={{
              borderRadius: modalRadius,
              padding: 22,
              width: '100%',
              maxWidth: 360,
              borderWidth: 0,
              borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : isCompassTheme ? COMPASS_RICH.hairline : t.border,
              overflow: 'hidden',
              ...(isGoldTheme ? goldShadow(3) : isCompassTheme ? compassShadow(3) : {}),
            }}
          >
            {isGoldTheme && <GoldBevel radius={16} intensity="strong" />}
            {isCompassTheme && <CompassDepthSurface radius={modalRadius} selected />}
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
            <View style={{ gap: 4, zIndex: 10 }}>
              {choices.map((c, i) => {
                const primary = c.variant !== 'secondary';
                // Единый стандарт: второе действие — центрированная текстовая
                // кнопка под primary, без заливки и рамки.
                if (!primary) {
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => {
                        hapticTap();
                        // Одно закрытие: choice сам решает, закрывать ли модалку.
                        c.onPress();
                      }}
                      style={{
                        alignSelf: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 20,
                        minHeight: 40,
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: t.textMuted,
                          fontWeight: '600',
                          fontSize: f.body,
                          textAlign: 'center',
                          zIndex: 10,
                        }}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                const buttonColors = isGoldTheme
                  ? GOLD_GRADIENTS.primaryButton
                  : isCompassTheme
                    ? COMPASS_GRADIENTS.primaryButton
                  : ([t.accent, t.accent, t.accent] as [string, string, string]);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      hapticTap();
                      // Одно закрытие: choice сам решает, закрывать ли модалку.
                      // onRequestClose здесь НЕ вызываем — иначе двойной вызов.
                      c.onPress();
                    }}
                    style={{
                      width: '100%',
                      borderRadius: buttonRadius,
                      borderWidth: 0,
                      borderColor: isGoldTheme
                        ? GOLD_RICH.edgeLight
                        : isCompassTheme
                          ? COMPASS_RICH.hairlineStrong
                          : t.accent,
                      overflow: 'hidden',
                      ...(isGoldTheme ? goldShadow(1) : isCompassTheme ? compassShadow(1) : {}),
                    }}
                  >
                    <LinearGradient
                      colors={buttonColors}
                      locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
                      start={isGoldTheme || isCompassTheme ? { x: 0, y: 0 } : undefined}
                      end={isGoldTheme || isCompassTheme ? { x: 1, y: 1 } : undefined}
                      style={{ paddingVertical: 14, alignItems: 'center', paddingHorizontal: 14 }}
                    >
                      {isGoldTheme && <GoldBevel radius={12} intensity="strong" />}
                      {isCompassTheme && <CompassDepthSurface radius={buttonRadius} cream />}
                      <Text
                        style={{
                          color: isGoldTheme
                            ? GOLD_RICH.blackPiano
                            : isCompassTheme
                              ? COMPASS_RICH.textDark
                              : t.correctText,
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

export default memo(ThemedChoiceModal);
