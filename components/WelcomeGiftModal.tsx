/**
 * WelcomeGiftModal — приветственная церемония нового (и вернувшегося после
 * обновления) пользователя над Главной.
 *
 * зачем (владелец, 2026-08-26): «убери модал-лист "спасибо за установку",
 * замени на красивый анимированный модал, который сразу приветствует юзера и
 * начисляет 100 жемчужин и 300 рун просто так — анимированно, красиво, и
 * мгновенно, чтобы юзер не видел нулей с самого первого входа». Правка тем же
 * днём: текст должен ЗВУЧАТЬ как прежняя шторка-благодарность («Спасибо, что
 * установил приложение»), а награда — не «стартовый подарок», а небольшой
 * бонус, который помогает освоиться.
 *
 * Показывается ОДИН раз в жизни аккаунта, поэтому по частотному закону движения
 * (редкое событие = можно праздник) собран на полном celebration-движке
 * useRewardImpactHybrid (rarity 'legendary'): блум → карточка из света →
 * герой-дар падает и БЬЁТ (кольца + пыль + звук сундука + haptic) → каскад
 * заголовка/подводки → плитки валют со СЧЁТЧИКАМИ 0→100 и 0→300 (крещендо:
 * руны стартуют на 180мс позже и закрывают аккорд лёгким хаптиком) → CTA.
 * Хореография ДЕКОРАТИВНА: начисление уже прошло в welcome_gift.ts до показа,
 * закрытие в любой момент ничего не теряет.
 *
 * Ассет руны — тот же боевой `level-spin-rewards/stars_10.webp`, что рисуют
 * HomeRuneBalance/LearningV2RuneFlight (владелец, 26.08 правка: «руна должна
 * быть картинкой, а не буквой» — тот же принцип, что уже закреплён в
 * LearningV2RuneFlight owner correction). Текстовый глиф футарка остаётся
 * только декоративными искрами вокруг настоящего ассета (RuneGlyphDrift), не
 * подменяет собой саму валюту.
 *
 * Правила владельца: токены темы, без обводок контейнеров (тон), fontWeight
 * только 400/700, крупная типографика (эталон «Статистика»), Reduce Motion =
 * один финальный кадр (движок + прогресс shared values ставится в 1 сразу).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Reanimated, {
  Easing as REasing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import DuoPressable from './DuoPressable';
import RewardImpactRings from './celebration/RewardImpactRings';
import { useRewardImpactHybrid } from './celebration/use_reward_impact_hybrid';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { pickRuneGlyphs, runeWord } from '../constants/runes';
import {
  ruKnowledgeShardsAfterNumber,
  ukKnowledgeShardsAfterNumber,
} from '../constants/shard_plurals';
import { noAndroidOutline } from '../constants/androidGlow';
import { pearlIconForTheme } from '../app/coin_icons';
import { WELCOME_GIFT_PEARLS, WELCOME_GIFT_RUNES } from '../app/welcome_gift';
import { hapticTap } from '../hooks/use-haptics';
import { isLowEndDevice } from '../hooks/device_perf_tier';

// Единый боевой ассет валюты «руны» — тот же файл, что в шапке Главной
// (HomeRuneBalance) и в полёте валюты после урока (LearningV2RuneFlight).
const RUNE_ASSET = require('../assets/images/level-spin-rewards/stars_10.webp');

// зачем (владелец, 2026-08-26 — «анимация дёргается, цифры прерываются и
// резко скачут в конце»): AnimatedTextInput типизирован только у
// Reanimated.createAnimatedComponent (тот же паттерн, что RankChangeBanner —
// закон №6 «никогда setState на каждый тик»). Прежняя версия гоняла useCountUp
// (JS-поток, setState на каждый requestAnimationFrame) параллельно с звуком/
// хаптиком/кольцами удара — JS-поток был занят их обработкой, RAF ронял кадры,
// и число реально «прыгало» прямо к концу вместо плавного счёта. Здесь счёт
// живёт в useSharedValue/useAnimatedProps целиком на UI-потоке — тот же поток,
// что уже держит celebration-движок, конкуренции с JS-работой больше нет.
const AnimatedTextInput = Reanimated.createAnimatedComponent(TextInput);

interface Props {
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

/** Слово «жемчужин» под числом 100: ru/uk — точным склонением, остальные — множественным. */
function pearlsWord(lang: Lang, amount: number): string {
  if (lang === 'ru') return ruKnowledgeShardsAfterNumber(amount);
  if (lang === 'uk') return ukKnowledgeShardsAfterNumber(amount);
  return triLang(lang, {
    ru: 'жемчужин', uk: 'перлин', en: 'pearls', es: 'perlas', 'pt-BR': 'pérolas',
    vi: 'ngọc trai', id: 'mutiara', tr: 'inci', pl: 'pereł',
  } as Record<Lang, string>);
}

/**
 * Одноразовый подъём рунических глифов за плиткой рун — эхо «полёта футарка»
 * с Главной. Конечная анимация (~1.1с), НЕ цикл: отработала и замерла.
 */
function RuneGlyphDrift({ color }: { color: string }) {
  // Глифы фиксируются на первый рендер: пересборка меняла бы их в кадре.
  const glyphs = useMemo(() => pickRuneGlyphs(4), []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {glyphs.map((glyph, index) => (
        <DriftGlyph key={`${glyph}-${index}`} glyph={glyph} index={index} color={color} />
      ))}
    </View>
  );
}

function DriftGlyph({ glyph, index, color }: { glyph: string; index: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 90,
      withTiming(1, { duration: 820, easing: REasing.out(REasing.cubic) }),
    );
    return () => cancelAnimation(progress);
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    // Треугольная кривая 0→0.55→0: глиф рождается, всплывает и растворяется.
    opacity: 0.55 * (1 - Math.abs(progress.value * 2 - 1)),
    transform: [
      { translateY: 14 - 40 * progress.value },
      { translateX: (index - 1.5) * 16 },
    ],
  }));

  return (
    <Reanimated.View pointerEvents="none" style={[styles.driftGlyphWrap, style]}>
      <Text style={[styles.driftGlyph, { color }]} allowFontScaling={false}>{glyph}</Text>
    </Reanimated.View>
  );
}

function WelcomeGiftModal({ visible, onClose, testID }: Props) {
  const { theme: t, f, ds, themeMode } = useTheme();
  const { lang } = useLang();
  const L = (copy: Record<Lang, string>) => triLang(lang, copy);
  const lowEnd = isLowEndDevice(Platform);

  // Полный celebration-движок: он же играет звук сундука и haptic удара.
  const impact = useRewardImpactHybrid({
    visible,
    rarity: 'legendary',
    scope: 'welcome-gift-hybrid',
  });
  const reduceMotion = impact.reduceMotion;

  // ── Счётчики: shared values на UI-потоке, БЕЗ setState на тик ────────────
  // зачем: см. комментарий у AnimatedTextInput выше — прежняя версия дёргалась
  // из-за setState на каждый кадр, конкурирующего с JS-работой удара
  // (звук/хаптик/кольца). Прогресс 0→1 анимируется Reanimated'ом, текст читает
  // его через useAnimatedProps — ни одного React re-render за весь счёт.
  const pearlsProgress = useSharedValue(0);
  const runesProgress = useSharedValue(0);
  // Дрейф глифов рун — единственный потребитель вне worklet-мира, поэтому это
  // остаётся обычным React state (переключается ровно один раз за показ).
  const [runesStarted, setRunesStarted] = useState(false);

  useEffect(() => {
    // зачем: onImpact внутри use_reward_impact_hybrid.ts уже переносится на
    // JS-поток через runOnJS(dispatchImpact) — это ОБЫЧНЫЙ JS-callback, не
    // worklet. Присваивать sharedValue.value отсюда можно напрямую: сама
    // анимация (withTiming) всё равно уйдёт исполняться на UI-поток, а вот
    // finished-колбэк withTiming уже работает КАК worklet, поэтому там
    // runOnJS(hapticTap) обязателен.
    impact.setOnImpact(() => {
      if (reduceMotion) {
        pearlsProgress.value = 1;
        runesProgress.value = 1;
        setRunesStarted(true);
        return;
      }
      pearlsProgress.value = withTiming(1, { duration: 620, easing: REasing.out(REasing.cubic) });
      // Крещендо: жемчужины идут первыми, руны догоняют вторым, большим
      // аккордом — задержка живёт внутри Reanimated (withDelay), а не в
      // отдельном React setTimeout/setState.
      runesProgress.value = withDelay(
        180,
        withTiming(1, { duration: 620, easing: REasing.out(REasing.cubic) }, (finished) => {
          // Финальный аккорд: один лёгкий хаптик, когда руны досчитали. Не
          // спамим — сильный hapticSuccess уже был на ударе heroImpact-ом.
          if (finished) runOnJS(hapticTap)();
        }),
      );
      setRunesStarted(true);
    });
  });

  useEffect(() => {
    if (!visible) {
      // зачем (аудит 2026-08-26): cancelAnimation ДО сброса числа — если модалку
      // закрыли ровно в момент незавершённого withTiming, его finished-колбэк
      // (у рун — runOnJS(hapticTap)) иначе сработал бы позже, уже после
      // закрытия: пользователь почувствовал бы лишний тик вибрации вхолостую.
      cancelAnimation(pearlsProgress);
      cancelAnimation(runesProgress);
      pearlsProgress.value = 0;
      runesProgress.value = 0;
      setRunesStarted(false);
    }
  }, [visible, pearlsProgress, runesProgress]);

  const pearlsAnimatedProps = useAnimatedProps(() => ({
    text: `+${Math.round(WELCOME_GIFT_PEARLS * pearlsProgress.value)}`,
    defaultValue: '+0',
  }));
  const runesAnimatedProps = useAnimatedProps(() => ({
    text: `+${Math.round(WELCOME_GIFT_RUNES * runesProgress.value)}`,
    defaultValue: '+0',
  }));

  // Закрытие — единственное действие; начисление от него не зависит.
  const handleClose = useCallback(() => {
    void hapticTap();
    onClose();
  }, [onClose]);

  // зачем (владелец, 2026-08-26): тон — прямое продолжение прежней шторки
  // («Спасибо, что установил приложение»), НЕ «вот твой стартовый подарок».
  // Небольшой бонус объясняется как помощь освоиться, а не как самоценный приз.
  const title = L({ ru: 'Спасибо, что установил приложение!', uk: 'Дякуємо, що встановили застосунок!', en: 'Thanks for installing the app!', es: '¡Gracias por instalar la aplicación!', 'pt-BR': 'Obrigado por instalar o aplicativo!', vi: 'Cảm ơn bạn đã cài đặt ứng dụng!', id: 'Terima kasih telah memasang aplikasi!', tr: 'Uygulamayı yüklediğin için teşekkürler!', pl: 'Dziękujemy za zainstalowanie aplikacji!' } as Record<Lang, string>);
  const lead = L({ ru: 'Вот небольшой бонус, чтобы было проще освоиться.', uk: 'Ось невеликий бонус, щоб було простіше освоїтися.', en: "Here's a small bonus to help you get started.", es: 'Aquí tienes un pequeño bono para que te resulte más fácil empezar.', 'pt-BR': 'Aqui está um pequeno bônus para facilitar seu início.', vi: 'Đây là một chút thưởng nhỏ để bạn dễ làm quen hơn.', id: 'Ini bonus kecil supaya kamu lebih mudah memulai.', tr: 'İşe kolay başlaman için küçük bir bonus.', pl: 'Oto mały bonus, który ułatwi Ci start.' } as Record<Lang, string>);
  const ctaLabel = L({ ru: 'Начнём!', uk: 'Почнімо!', en: "Let's go!", es: '¡Vamos!', 'pt-BR': 'Vamos lá!', vi: 'Bắt đầu!', id: 'Ayo mulai!', tr: 'Başlayalım!', pl: 'Zaczynamy!' } as Record<Lang, string>);
  const pearlsLabel = pearlsWord(lang, WELCOME_GIFT_PEARLS);
  const runesLabelText = runeWord(lang, WELCOME_GIFT_RUNES);
  // Скринридеру — сразу весь подарок, без ожидания счётчиков.
  const giftA11yLabel = `+${WELCOME_GIFT_PEARLS} ${pearlsLabel}, +${WELCOME_GIFT_RUNES} ${runesLabelText}`;

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.root} testID={testID ?? 'welcome-gift-modal'}>
        <Reanimated.View style={[styles.backdrop, impact.styles.backdrop]} />

        <View style={styles.center} pointerEvents="box-none">
          {/* Источник света загорается первым (закон «Световод»). */}
          <Reanimated.View pointerEvents="none" style={[styles.bloom, impact.styles.bloom]}>
            <View style={[styles.bloomHalo, { backgroundColor: `${t.accent}14` }]} />
            <View style={[styles.bloomCore, { backgroundColor: `${t.accent}29` }]} />
          </Reanimated.View>

          <Reanimated.View
            accessibilityViewIsModal
            onAccessibilityEscape={handleClose}
            style={[
              styles.card,
              { backgroundColor: t.bgCard, shadowColor: '#000000' },
              impact.styles.card,
              noAndroidOutline,
            ]}
          >
            {/* Герой-дар: жемчужина и руна падают одной горстью и бьют. */}
            <View style={styles.heroZone}>
              <RewardImpactRings
                show={impact.showRings}
                dustCount={impact.dustCount}
                color={t.accent}
                ring0Style={impact.styles.ring0}
                ring1Style={impact.styles.ring1}
              />
              <Reanimated.View style={[styles.heroDuo, impact.styles.hero]}>
                <Image
                  source={pearlIconForTheme(themeMode)}
                  style={styles.heroPearl}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  accessible={false}
                />
                <Image
                  source={RUNE_ASSET}
                  style={styles.heroRuneAsset}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  accessible={false}
                />
              </Reanimated.View>
            </View>

            <Reanimated.View style={impact.styles.text}>
              <Text
                accessibilityRole="header"
                maxFontSizeMultiplier={1.2}
                style={[styles.title, { color: t.textPrimary, fontSize: (f.h2 ?? 18) + 6, fontFamily: ds.fontFamily }]}
              >
                {title}
              </Text>
            </Reanimated.View>

            <Reanimated.View style={impact.styles.subtitle}>
              <Text
                maxFontSizeMultiplier={1.2}
                style={[styles.lead, { color: t.textSecond, fontSize: f.body, fontFamily: ds.fontFamily }]}
              >
                {lead}
              </Text>
            </Reanimated.View>

            <Reanimated.View
              accessible
              accessibilityLabel={giftA11yLabel}
              style={[styles.tilesRow, impact.styles.rows]}
            >
              <View style={[styles.tile, { backgroundColor: t.bgSurface2 }]}>
                <Image
                  source={pearlIconForTheme(themeMode)}
                  style={styles.tileIcon}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  accessible={false}
                />
                <AnimatedTextInput
                  editable={false}
                  pointerEvents="none"
                  accessibilityElementsHidden
                  animatedProps={pearlsAnimatedProps as never}
                  style={[styles.tileAmount, { color: t.textPrimary, fontFamily: ds.fontFamily }]}
                />
                <Text
                  accessibilityElementsHidden
                  maxFontSizeMultiplier={1.2}
                  style={[styles.tileWord, { color: t.textSecond, fontSize: f.body, fontFamily: ds.fontFamily }]}
                >
                  {pearlsLabel}
                </Text>
              </View>

              <View style={[styles.tile, { backgroundColor: t.bgSurface2 }]}>
                {runesStarted && !reduceMotion && !lowEnd ? <RuneGlyphDrift color={t.accent} /> : null}
                <Image
                  source={RUNE_ASSET}
                  style={styles.tileIcon}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  accessible={false}
                />
                <AnimatedTextInput
                  editable={false}
                  pointerEvents="none"
                  accessibilityElementsHidden
                  animatedProps={runesAnimatedProps as never}
                  style={[styles.tileAmount, { color: t.textPrimary, fontFamily: ds.fontFamily }]}
                />
                <Text
                  accessibilityElementsHidden
                  maxFontSizeMultiplier={1.2}
                  style={[styles.tileWord, { color: t.textSecond, fontSize: f.body, fontFamily: ds.fontFamily }]}
                >
                  {runesLabelText}
                </Text>
              </View>
            </Reanimated.View>

            <Reanimated.View style={[styles.ctaWrap, impact.styles.cta]}>
              <DuoPressable
                onPress={handleClose}
                accessibilityLabel={ctaLabel}
                testID="welcome-gift-modal-cta"
                style={{ backgroundColor: t.accent, borderRadius: 16 }}
                edgeColor={t.accent}
                edgeHeight={6}
                withHaptic={false}
              >
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={[styles.ctaLabel, { color: t.correctText, fontSize: f.bodyLg, fontFamily: ds.fontFamily }]}
                >
                  {ctaLabel}
                </Text>
              </DuoPressable>
            </Reanimated.View>
          </Reanimated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.66)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  bloom: {
    position: 'absolute',
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloomHalo: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  bloomCore: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 16,
  },
  // Фиксированная сцена героя: падение живёт внутри, вёрстка не прыгает.
  heroZone: {
    width: '100%',
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  heroDuo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroPearl: {
    width: 84,
    height: 84,
    transform: [{ rotate: '-8deg' }],
  },
  heroRuneAsset: {
    width: 84,
    height: 84,
    marginLeft: -6,
    transform: [{ rotate: '10deg' }],
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  lead: {
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
  },
  tilesRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 16,
  },
  tile: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 128,
    overflow: 'hidden',
  },
  tileIcon: {
    width: 40,
    height: 40,
  },
  // tabular-nums + запас ширины: «+1» и «+300» занимают одно место, без прыжков.
  tileAmount: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    minWidth: 86,
  },
  tileWord: {
    marginTop: 2,
    fontWeight: '400',
    textAlign: 'center',
  },
  driftGlyphWrap: {
    position: 'absolute',
    top: 34,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  driftGlyph: {
    fontSize: 16,
    fontWeight: '700',
  },
  ctaWrap: {
    alignSelf: 'stretch',
    marginTop: 18,
  },
  ctaLabel: {
    fontWeight: '700',
  },
});

export default React.memo(WelcomeGiftModal);
