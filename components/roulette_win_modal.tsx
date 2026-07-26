/**
 * Модалка выигрыша «Награда за друга».
 *
 * зачем: владелец (2026-07-26) — прежний вариант растягивался на весь экран и
 * вылезал за рамки (картинка и системное масштабирование шрифтов не были
 * ограничены). Теперь это компактная центрированная карточка: ассет клипается
 * внутри карточки (max 220pt), все тексты с maxFontSizeMultiplier, кнопка
 * всегда в пределах экрана. Праздничная анимация живёт отдельно в
 * RouletteWinCelebration и запускается только после закрытия этой модалки.
 *
 * Все цвета — токены темы; fontWeight только 400/700; тени shadowColor '#000000';
 * без обводок — карточка отделяется тоном и тенью.
 */
import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { ROULETTE_PRIZES, roulettePrizeLabel } from '../app/roulette_prizes';

export interface RouletteWinData {
  prizeIndex: number;
  prizeDays: number;
  /** vipUntil из ответа referralSpin (ms). */
  vipUntil: number;
}

interface Props {
  data: RouletteWinData | null;
  onClose: () => void;
}

const DATE_LOCALE_BY_LANG: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  pl: 'pl-PL',
};

// Локализованное имя приза («1 месяц», не «30 дн.») — канон в roulette_prizes.ts.

export default function RouletteWinModal({ data, onClose }: Props) {
  const { theme: t, f, ds } = useTheme();
  const { lang } = useLang();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const L = (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang as Lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  useEffect(() => {
    if (!data) return;
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    scale.value = 0.85;
    opacity.value = 0;
    scale.value = withSpring(1, { damping: 13, stiffness: 160 });
    opacity.value = withTiming(1, { duration: 220 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, reduceMotion]);

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!data) return null;
  const prize = ROULETTE_PRIZES[data.prizeIndex] ?? ROULETTE_PRIZES[0];
  const dateLocale = DATE_LOCALE_BY_LANG[lang as Lang] ?? 'ru-RU';
  const vipDate = data.vipUntil > 0 ? new Date(data.vipUntil).toLocaleDateString(dateLocale) : '—';
  const daysShort = `+${data.prizeDays} ${L('дн.', 'дн.', 'd.', 'd.', 'ngày', 'hari', 'gün', 'dn.')}`;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: t.bgCard, shadowColor: '#000000' },
            cardAnim,
          ]}
        >
          {/* Ассет клипается скруглением внутри карточки — всегда в рамках экрана. */}
          <View style={styles.prizeImageWrap}>
            <Image
              source={prize.image}
              style={styles.prizeImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessible={false}
            />
          </View>

          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.winTitle, { color: t.textPrimary, fontSize: f.h2 ?? 22, fontFamily: ds.fontFamily }]}
          >
            {L('Поздравляем!', 'Вітаємо!', '¡Felicidades!', 'Parabéns!', 'Chúc mừng!', 'Selamat!', 'Tebrikler!', 'Gratulacje!')}
          </Text>
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.winDays, { color: t.accent, fontSize: (f.numLg ?? 28) + 2, fontFamily: ds.fontFamily }]}
          >
            +{roulettePrizeLabel(data.prizeDays, lang as Lang)} Plus
          </Text>
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.winSub, { color: t.textMuted, fontSize: f.sub ?? 13, fontFamily: ds.fontFamily }]}
          >
            {L('Твой Plus теперь до', 'Твій Plus тепер до', 'Tu Plus ahora hasta', 'Seu Plus agora até', 'Plus của bạn đến', 'Plus-mu sampai', 'Plus artık şu tarihe kadar:', 'Twój Plus teraz do')}
            {' '}
            <Text maxFontSizeMultiplier={1.2} style={{ color: t.textPrimary, fontWeight: '700' }}>{vipDate}</Text>
            {' · '}
            <Text maxFontSizeMultiplier={1.2} style={{ color: t.accent, fontWeight: '700' }}>{daysShort}</Text>
          </Text>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }: { pressed: boolean }) => [
              styles.claimBtn,
              ds.shadow.medium,
              { backgroundColor: t.accent, opacity: pressed ? 0.92 : 1, height: ds.buttonHeight },
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.2}
              style={[styles.claimBtnText, { color: t.correctText, fontSize: f.bodyLg ?? 16, fontFamily: ds.fontFamily }]}
            >
              {L('Готово', 'Готово', 'Listo', 'Pronto', 'Xong', 'Selesai', 'Tamam', 'Gotowe')}
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
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  card: {
    width: '100%',
    maxWidth: 330,
    borderRadius: 28,
    paddingTop: 22,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 12,
  },
  prizeImageWrap: {
    width: '100%',
    maxWidth: 220,
    borderRadius: 18,
    overflow: 'hidden',
  },
  prizeImage: {
    width: '100%',
    aspectRatio: 3 / 2,
  },
  winTitle: {
    marginTop: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  winDays: {
    marginTop: 6,
    fontWeight: '700',
    textAlign: 'center',
  },
  winSub: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
  claimBtn: {
    marginTop: 20,
    alignSelf: 'stretch',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtnText: {
    fontWeight: '700',
  },
});
