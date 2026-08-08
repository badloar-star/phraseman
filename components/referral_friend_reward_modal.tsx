/**
 * Модалка «друг принёс ключ» — celebration на экране «Награда за друга».
 *
 * зачем: владелец (2026-07-25) — раньше переход статуса приглашения в
 * «ключ готов» (друг оформил Plus/Pro) не давал никакой видимой реакции,
 * кроме тихой перерисовки строки. Лёгкая модалка-подтверждение (spring
 * scale-in + fade, без конфетти — конфетти уже занято RouletteWinModal
 * для самого приза) закрывает разрыв в Optimistic UI: пользователь сразу
 * видит, что действие («пригласил друга») дало результат.
 *
 * Токены темы; fontWeight только 400/700.
 */
import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';

export interface FriendRewardCelebrationData {
  name: string;
}

interface Props {
  data: FriendRewardCelebrationData | null;
  onClose: () => void;
  title: string;
  subtitle: string;
  ctaLabel: string;
}

export default function ReferralFriendRewardModal({ data, onClose, title, subtitle, ctaLabel }: Props) {
  const { theme: t, f, ds } = useTheme();
  const scale = useSharedValue(0.88);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (data) {
      scale.value = 0.88;
      opacity.value = 0;
      scale.value = withSpring(1, { damping: 14, stiffness: 170 });
      opacity.value = withTiming(1, { duration: 200 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!data) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.cardWrap, cardAnim]}>
          <View style={[styles.iconWrap, { backgroundColor: t.accentBg }]}>
            <Ionicons name="key" size={32} color={t.accent} />
          </View>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 ?? 22, fontFamily: ds.fontFamily }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: t.textMuted, fontSize: f.sub, fontFamily: ds.fontFamily }]}>
            {subtitle}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            style={({ pressed }: { pressed: boolean }) => [
              styles.claimBtn,
              ds.shadow.medium,
              { backgroundColor: t.accent, opacity: pressed ? 0.92 : 1, height: ds.buttonHeight },
            ]}
          >
            <Text style={[styles.claimBtnText, { color: t.correctText, fontSize: f.bodyLg, fontFamily: ds.fontFamily }]}>
              {ctaLabel}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  cardWrap: {
    alignItems: 'center',
    width: '100%',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
  claimBtn: {
    marginTop: 24,
    alignSelf: 'stretch',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtnText: {
    fontWeight: '700',
  },
});
