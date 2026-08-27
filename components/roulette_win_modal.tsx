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
import { ROULETTE_PRIZES, roulettePearlsLabel, roulettePrizeLabel } from '../app/roulette_prizes';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import DuoPressable from './DuoPressable';
import RewardImpactRings from './celebration/RewardImpactRings';
import { useRewardImpactHybrid, type RewardImpactRarity } from './celebration/use_reward_impact_hybrid';
import { LUM } from '../constants/motionHybrid';

import { noAndroidOutline } from '../constants/androidGlow';
export interface RouletteWinData {
  prizeIndex: number;
  prizeDays: number;
  /** vipUntil из ответа referralSpin (ms). */
  vipUntil: number;
  /** зачем: владелец (2026-07-26) — Pro (lifetime) выигрывает жемчужины вместо дней. */
  prizeKind?: 'days' | 'pearls';
  prizePearls?: number;
}

interface Props {
  data: RouletteWinData | null;
  onClose: () => void;
  /**
   * зачем: гибрид «Световод + Чекан» (макет .motion-mockups/phraseman-hybrid.html,
   * сцена M3 «Сундук-награда») — редкость приза (по весу в ROULETTE_PRIZES)
   * должна визуально отличаться: common тихая база, rare/epic/legendary — сильнее
   * bloom + единственный удар у приза. Боевой дефолт — 'classic'.
   */
  motionVariant?: 'classic' | 'hybrid';
}

/**
 * Редкость приза рулетки по индексу — зеркалит вес ROULETTE_PRIZES (0/1 частые
 * призы = common, 2 = rare, 3 = epic, 4/5 редчайшие = legendary).
 */
function rouletteRarity(prizeIndex: number): RewardImpactRarity {
  if (prizeIndex <= 1) return 'common';
  if (prizeIndex === 2) return 'rare';
  if (prizeIndex === 3) return 'epic';
  return 'legendary';
}

const DATE_LOCALE_BY_LANG: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  en: 'en-US',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  pl: 'pl-PL',
};

// Локализованное имя приза («1 месяц», не «30 дн.») — канон в roulette_prizes.ts.

export default function RouletteWinModal({ data, onClose, motionVariant = 'classic' }: Props) {
  const { theme: t, f, ds } = useTheme();
  const { lang } = useLang();
  const isHybrid = motionVariant === 'hybrid';
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const L = (ru: string, en: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang as Lang, { ru, en, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  const rarity = rouletteRarity(data?.prizeIndex ?? 0);
  const impact = useRewardImpactHybrid({
    visible: isHybrid && !!data,
    rarity,
    impactSoundId: 'pm.reward.chest_open',
    scope: 'roulette-win-hybrid',
  });

  useEffect(() => {
    if (!data || isHybrid) return;
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
  }, [data, isHybrid, reduceMotion]);

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!data) return null;
  const prize = ROULETTE_PRIZES[data.prizeIndex] ?? ROULETTE_PRIZES[0];
  const dateLocale = DATE_LOCALE_BY_LANG[lang as Lang] ?? 'ru-RU';
  const vipDate = data.vipUntil > 0 ? new Date(data.vipUntil).toLocaleDateString(dateLocale) : '—';
  const daysShort = `+${data.prizeDays} ${L('дн.', 'd.', 'дн.', 'd.', 'd.', 'ngày', 'hari', 'gün', 'dn.')}`;
  // Pro (lifetime): приз — жемчужины, строка про дату Plus не показывается.
  const isPearls = data.prizeKind === 'pearls' && (data.prizePearls ?? 0) > 0;
  const heroLine = isPearls
    ? `+${roulettePearlsLabel(data.prizePearls ?? 0, lang as Lang)}`
    : `+${roulettePrizeLabel(data.prizeDays, lang as Lang)} Plus`;
  const winTitleText = L('Поздравляем!', 'Congratulations!', 'Вітаємо!', '¡Felicidades!', 'Parabéns!', 'Chúc mừng!', 'Selamat!', 'Tebrikler!', 'Gratulacje!');
  const winSubPearlsText = L('Жемчужины уже на балансе', 'Pearls are already in your balance', 'Перлини вже на балансі', 'Las perlas ya están en tu saldo', 'As pérolas já estão no seu saldo', 'Ngọc trai đã vào số dư của bạn', 'Mutiara sudah masuk saldomu', 'İnciler bakiyene eklendi', 'Perły są już na twoim saldzie');
  const winSubPlusPrefix = L('Твой Plus теперь до', 'Your Plus now lasts until', 'Твій Plus тепер до', 'Tu Plus ahora hasta', 'Seu Plus agora até', 'Plus của bạn đến', 'Plus-mu sampai', 'Plus artık şu tarihe kadar:', 'Twój Plus teraz do');
  const doneLabel = L('Готово', 'Done', 'Готово', 'Listo', 'Pronto', 'Xong', 'Selesai', 'Tamam', 'Gotowe');

  if (isHybrid) {
    return (
      <HybridAlertShell visible onRequestClose={onClose} shadowColor="#000000" testID="roulette-win-hybrid-backdrop">
        <View style={[styles.card, { backgroundColor: t.bgCard, shadowColor: '#000000' }]}>
          <View style={styles.prizeImageWrap}>
            <RewardImpactRings
              show={impact.showRings}
              dustCount={impact.dustCount}
              color={t.accent}
              ring0Style={impact.styles.ring0}
              ring1Style={impact.styles.ring1}
            />
            <Image
              source={prize.image}
              style={styles.prizeImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessible={false}
            />
          </View>

          <CascadeItem delay={LUM.ladder[2]} reduceMotion={reduceMotion}>
            <Text
              maxFontSizeMultiplier={1.2}
              style={[styles.winTitle, { color: t.textPrimary, fontSize: f.h2 ?? 22, fontFamily: ds.fontFamily }]}
            >
              {winTitleText}
            </Text>
          </CascadeItem>

          <CascadeItem delay={LUM.ladder[3]} reduceMotion={reduceMotion}>
            <Text
              maxFontSizeMultiplier={1.2}
              style={[styles.winDays, { color: t.accent, fontSize: (f.numLg ?? 28) + 2, fontFamily: ds.fontFamily }]}
            >
              {heroLine}
            </Text>
          </CascadeItem>

          <CascadeItem delay={LUM.ladder[3]} reduceMotion={reduceMotion}>
            <Text
              maxFontSizeMultiplier={1.2}
              style={[styles.winSub, { color: t.textMuted, fontSize: f.sub ?? 13, fontFamily: ds.fontFamily }]}
            >
              {isPearls ? winSubPearlsText : (
                <>
                  {winSubPlusPrefix}
                  {' '}
                  <Text maxFontSizeMultiplier={1.2} style={{ color: t.textPrimary, fontWeight: '700' }}>{vipDate}</Text>
                  {' · '}
                  <Text maxFontSizeMultiplier={1.2} style={{ color: t.accent, fontWeight: '700' }}>{daysShort}</Text>
                </>
              )}
            </Text>
          </CascadeItem>

          <CascadeItem delay={LUM.ladder[4]} reduceMotion={reduceMotion}>
            <DuoPressable
              testID="roulette-win-claim-hybrid"
              onPress={onClose}
              edgeColor={t.bgSurface2}
              edgeHeight={4}
              style={[styles.claimBtn, { backgroundColor: t.accent, height: ds.buttonHeight, marginTop: 20 }]}
            >
              <Text
                maxFontSizeMultiplier={1.2}
                style={[styles.claimBtnText, { color: t.correctText, fontSize: f.bodyLg ?? 16, fontFamily: ds.fontFamily }]}
              >
                {doneLabel}
              </Text>
            </DuoPressable>
          </CascadeItem>
        </View>
      </HybridAlertShell>
    );
  }

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
            {L('Поздравляем!', 'Congratulations!', 'Вітаємо!', '¡Felicidades!', 'Parabéns!', 'Chúc mừng!', 'Selamat!', 'Tebrikler!', 'Gratulacje!')}
          </Text>
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.winDays, { color: t.accent, fontSize: (f.numLg ?? 28) + 2, fontFamily: ds.fontFamily }]}
          >
            {heroLine}
          </Text>
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.winSub, { color: t.textMuted, fontSize: f.sub ?? 13, fontFamily: ds.fontFamily }]}
          >
            {isPearls ? (
              L('Жемчужины уже на балансе', 'Pearls are already in your balance', 'Перлини вже на балансі', 'Las perlas ya están en tu saldo', 'As pérolas já estão no seu saldo', 'Ngọc trai đã vào số dư của bạn', 'Mutiara sudah masuk saldomu', 'İnciler bakiyene eklendi', 'Perły są już na twoim saldzie')
            ) : (
              <>
                {L('Твой Plus теперь до', 'Your Plus now lasts until', 'Твій Plus тепер до', 'Tu Plus ahora hasta', 'Seu Plus agora até', 'Plus của bạn đến', 'Plus-mu sampai', 'Plus artık şu tarihe kadar:', 'Twój Plus teraz do')}
                {' '}
                <Text maxFontSizeMultiplier={1.2} style={{ color: t.textPrimary, fontWeight: '700' }}>{vipDate}</Text>
                {' · '}
                <Text maxFontSizeMultiplier={1.2} style={{ color: t.accent, fontWeight: '700' }}>{daysShort}</Text>
              </>
            )}
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
              {L('Готово', 'Done', 'Готово', 'Listo', 'Pronto', 'Xong', 'Selesai', 'Tamam', 'Gotowe')}
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
    ...noAndroidOutline,
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
