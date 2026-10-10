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
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { ThemedArt } from '../app/theme/ThemedArt';
import { THEMED_ART_ALL_NAMES, resolveThemedArt, type ThemedArtName } from '../app/theme/themed_art_registry';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { ROULETTE_PRIZES, rouletteCoinsLabel, roulettePrizeLabel } from '../app/roulette_prizes';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import DuoPressable from './DuoPressable';
import RewardImpactRings from './celebration/RewardImpactRings';
import { useRewardImpactHybrid, type RewardImpactRarity } from './celebration/use_reward_impact_hybrid';
import { LUM } from '../constants/motionHybrid';

import { noAndroidOutline } from '../constants/androidGlow';

const EXEMPT_COLOR_1 = '#000000'; // theme-exempt: тень и затемнение окна — постоянные
const EXEMPT_COLOR_2 = '#000000'; // theme-exempt: тень и затемнение окна — постоянные
export interface RouletteWinData {
  prizeIndex: number;
  prizeDays: number;
  /** vipUntil из ответа referralSpin (ms). */
  vipUntil: number;
  /** зачем: D100 (владелец, 2026-09-30) — Pro (lifetime) выигрывает МОНЕТЫ вместо дней. */
  prizeKind?: 'days' | 'coins';
  prizeCoins?: number;
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

// зачем (координатор 04.10, решение по кадру OM-ROULETTE-WIN): сцена окна — нейтральная плашка с глифом
// срока («7»), как в макете; картинка-карточка приза (решение 26.07) больше не показывается. Глиф —
// окончательный вариант: владелец 04.10 запретил генерировать новые картинки, билетов prize_* не будет.
// Проверка реестра ThemedArt оставлена (ничего не стоит) — сработает, только если имя когда-нибудь появится.
const PRIZE_TICKET_SUFFIX_BY_DAYS: Readonly<Record<number, string>> = { 1: '1d', 7: '7d', 30: '1m', 90: '3m', 180: '6m', 365: '1y' };

function prizeTicketName(days: number): ThemedArtName | null {
  const suffix = PRIZE_TICKET_SUFFIX_BY_DAYS[days];
  if (!suffix) return null;
  const candidate = `prize_${suffix}`;
  return (THEMED_ART_ALL_NAMES as readonly string[]).includes(candidate) ? candidate as ThemedArtName : null;
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
  const { theme: t, f, ds, liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  // зачем (overlays-more OM-ROULETTE-WIN): обычное окно — материал активной темы Liquid Glass.
  const glass = liquidGlassTokens(liquidGlassThemeId);
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

  const ticketName = data && data.prizeKind !== 'coins' ? prizeTicketName(data.prizeDays) : null;
  const ticketOrigin = ticketName ? resolveThemedArt(ticketName, liquidGlassAppearance).origin : 'none';
  const showTicket = ticketName !== null && (ticketOrigin === 'v2art' || ticketOrigin === 'v2art_other_brightness');
  useEffect(() => {
    if (!data || isHybrid) return;
    console.log('[ROULETTE-ART]', JSON.stringify({ prizeIndex: data.prizeIndex, prizeDays: data.prizeDays, prizeKind: data.prizeKind ?? 'days', ticketName, origin: ticketOrigin, shown: showTicket ? 'ticket' : 'glyph' }));
  }, [data, isHybrid, ticketName, ticketOrigin, showTicket]);

  if (!data) return null;
  const prize = ROULETTE_PRIZES[data.prizeIndex] ?? ROULETTE_PRIZES[0];
  // Глиф сцены: число срока («7», «1» для месяца/года) или сумма монет для Pro (D100).
  const sceneGlyph = data.prizeKind === 'coins' && (data.prizeCoins ?? 0) > 0 ? String(data.prizeCoins) : prize.num;
  const dateLocale = DATE_LOCALE_BY_LANG[lang as Lang] ?? 'ru-RU';
  const vipDate = data.vipUntil > 0 ? new Date(data.vipUntil).toLocaleDateString(dateLocale) : '—';
  const daysShort = `+${data.prizeDays} ${L('дн.', 'd.', 'дн.', 'd.', 'd.', 'ngày', 'hari', 'gün', 'dn.')}`;
  // Pro (lifetime): приз — монеты (D100), строка про дату Plus не показывается.
  const isCoins = data.prizeKind === 'coins' && (data.prizeCoins ?? 0) > 0;
  const heroLine = isCoins
    ? `+${rouletteCoinsLabel(data.prizeCoins ?? 0, lang as Lang)}`
    : `+${roulettePrizeLabel(data.prizeDays, lang as Lang)} Plus`;
  const winTitleText = L('Поздравляем!', 'Congratulations!', 'Вітаємо!', '¡Felicidades!', 'Parabéns!', 'Chúc mừng!', 'Selamat!', 'Tebrikler!', 'Gratulacje!');
  const winSubCoinsText = L('Монеты уже на балансе', 'Coins are already in your balance', 'Монети вже на балансі', 'Las monedas ya están en tu saldo', 'As moedas já estão no seu saldo', 'Xu đã vào số dư của bạn', 'Koin sudah masuk saldomu', 'Jetonlar bakiyene eklendi', 'Monety są już na twoim saldzie');
  const winSubPlusPrefix = L('Твой Plus теперь до', 'Your Plus now lasts until', 'Твій Plus тепер до', 'Tu Plus ahora hasta', 'Seu Plus agora até', 'Plus của bạn đến', 'Plus-mu sampai', 'Plus artık şu tarihe kadar:', 'Twój Plus teraz do');
  const doneLabel = L('Готово', 'Done', 'Готово', 'Listo', 'Pronto', 'Xong', 'Selesai', 'Tamam', 'Gotowe');

  if (isHybrid) {
    return (
      <HybridAlertShell visible onRequestClose={onClose} shadowColor={EXEMPT_COLOR_1} testID="roulette-win-hybrid-backdrop">
        <View style={[styles.card, { backgroundColor: t.bgCard, shadowColor: EXEMPT_COLOR_2 }]}>
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
              {isCoins ? winSubCoinsText : (
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
        {/* `.om-modal`: радиус 26, поля 21, непрозрачная основа темы */}
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: glass.opaqueSheet, shadowColor: '#000000' }, // theme-exempt: тень и затемнение окна — постоянные
            cardAnim,
          ]}
        >
          {/* `.om-art` 202×160 r22: билет приза из ThemedArt, пока его нет — глиф срока 48/800. */}
          <View
            testID="roulette-win-scene"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.prizeImageWrap, styles.scene, { backgroundColor: glass.selected }]}
          >
            {showTicket && ticketName ? (
              <ThemedArt name={ticketName} width={202} height={160} />
            ) : (
              <Text maxFontSizeMultiplier={1.2} style={[styles.sceneGlyph, { color: glass.text }]}>{sceneGlyph}</Text>
            )}
          </View>

          {/* `.om-title` 25/31 */}
          <Text
            maxFontSizeMultiplier={1.2}
            accessibilityRole="header"
            style={[styles.winTitle, { color: glass.text }]}
          >
            {winTitleText}
          </Text>
          {/* `.om-prize` 28 */}
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.winDays, { color: glass.text }]}
          >
            {heroLine}
          </Text>
          {/* `.om-copy` — шкала D145 16/22, дата выделена цветом текста */}
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.winSub, { color: glass.secondary }]}
          >
            {isCoins ? (
              winSubCoinsText
            ) : (
              <>
                {winSubPlusPrefix}
                {' '}
                <Text maxFontSizeMultiplier={1.2} style={{ color: glass.text, fontWeight: '700' }}>{vipDate}</Text>
                {' · '}
                {daysShort}
              </>
            )}
          </Text>

          {/* `.cta` 48/24 */}
          <Pressable
            testID="roulette-win-claim"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={doneLabel}
            style={({ pressed }: { pressed: boolean }) => [
              styles.claimBtn,
              { backgroundColor: glass.accent, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.2}
              style={[styles.claimBtnText, { color: glass.accentInk }]}
            >
              {doneLabel}
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
    backgroundColor: 'rgba(0,0,0,0.72)', // theme-exempt: тень и затемнение окна — постоянные
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 48,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 26,
    padding: 21,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    ...noAndroidOutline,
  },
  prizeImageWrap: {
    width: 202,
    height: 160,
    marginTop: 14,
    borderRadius: 22,
    overflow: 'hidden',
  },
  prizeImage: {
    width: '100%',
    height: '100%',
  },
  scene: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `.om-art .glyph` 48/800
  sceneGlyph: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '800',
  },
  winTitle: {
    marginTop: 7,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    textAlign: 'center',
  },
  winDays: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  winSub: {
    marginTop: 9,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '400',
  },
  claimBtn: {
    marginTop: 18,
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
