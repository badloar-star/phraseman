// ═══════════════════════════════════════════════════════════════════════════
// WelcomeBackMoment.tsx — окно «С возвращением» (D193; образец m21 engagement-moments-v3-all.html, «ОДОБРЕН»).
//
// зачем (владелец 14.10: вместо пейвола по возвращении — «вот этот будет лучше»; координатор: строго по образцу): полноэкранный момент
// (`.full`): монета ранга спит («z») → 1,0 с выглядывает с «!» (хаптик medium) → 1,8 с радость и сердца ×5 (хаптик success), строки
// проявляются по 300 мс (emUp 500 мс, кривая --em-ease). Цифры — настоящие, из решения гейта. Кнопки — «N карточек — 1 минута»
// (только если карточки есть) и «На Главную». Звуки — события-заглушки до лаборатории. «Уменьшить движение» — всё сразу, монета стоит.
// В тексте монета не одушевляется (владелец 14.10).
// ═══════════════════════════════════════════════════════════════════════════
import type { SoundV2EventId } from '../../modules/sound_v2/catalog';
import { tryPlayV2Event } from '../../modules/sound_v2/legacy_bridge';
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import { hapticMediumImpact, hapticSuccess } from '../../hooks/use-haptics';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { V2Button } from '../v2/V2Kit';
import { useSpirePalette } from '../spire/useSpirePalette';
import { MomentFullScreen } from '../spire/moments/moments_layout';
import MomentCoin, { type MomentCoinEmote, type MomentCoinMood } from './MomentCoin';
import type { WelcomeBackDecision } from '../../modules/welcome_back/welcome_back_model';
import { welcomeBackCardsLabel, welcomeBackHomeLabel, welcomeBackStatsLine, welcomeBackTitle } from '../../modules/welcome_back/welcome_back_strings';

/** Тайм-лист образца m21. */
export const WELCOME_BACK_TIMELINE = { peekMs: 1000, cheerMs: 1800, beatStepMs: 300, beatMs: 500 } as const;
/** Звуковые события (тайм-лист m21: learn gain .5 → know → ob_correct). Файлы — из лаборатории звуков. */
export const WELCOME_BACK_SOUND_EVENTS = { asleep: 'moment.back.learn', peek: 'moment.back.know', cheer: 'moment.back.ob' } as const;

const EASE = Easing.bezier(0.2, 1, 0.3, 1); // --em-ease

export type WelcomeBackMomentProps = Readonly<{
  lang: Lang;
  /** Ранг монеты для картинки (null — базовая). */
  coinRank: number | null;
  decision: Extract<WelcomeBackDecision, { show: true }>;
  /** «N карточек — 1 минута». */
  onCards: () => void;
  /** «На Главную» — закрыть окно. */
  onHome: () => void;
  testID?: string;
}>;

// зачем (координатор 14.10, п.4): «С возвращением» — звуки V2 по тайм-листу m21 (tap на выглянувшей монете, new_week на радости); флаг sound_v2 выключен — заглушка с журналом
const WELCOME_BACK_V2: Readonly<Record<string, SoundV2EventId | null>> = { 'moment.back.learn': null, 'moment.back.know': 'tap', 'moment.back.ob': 'new_week' };

function playSound(event: string): void {
  const v2 = WELCOME_BACK_V2[event];
  if (v2 && tryPlayV2Event(v2, event)) return;
  if (__DEV__) console.log(`[MOMENT-SOUND] ${event} (заглушка: файла звука пока нет)`); // guard-ok: единичный лог события
}

function Beat({ index, on, reduceMotion, children }: Readonly<{ index: number; on: boolean; reduceMotion: boolean; children: React.ReactNode }>) {
  const p = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) { p.value = 1; return; }
    if (on) p.value = withDelay(index * WELCOME_BACK_TIMELINE.beatStepMs, withTiming(1, { duration: WELCOME_BACK_TIMELINE.beatMs, easing: EASE }));
  }, [index, on, p, reduceMotion]);
  // emUp: from opacity 0, translateY 18 → to none.
  const st = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: 18 * (1 - p.value) }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

function WelcomeBackMoment({ lang, coinRank, decision, onCards, onHome, testID = 'welcome-back' }: WelcomeBackMomentProps) {
  const p = useSpirePalette();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [mood, setMood] = useState<MomentCoinMood>(reduceMotion ? 'still' : 'sleep');
  const [emote, setEmote] = useState<MomentCoinEmote | null>(null);
  const [beatsOn, setBeatsOn] = useState(reduceMotion);

  useEffect(() => {
    console.log(`[WELCOME-BACK] экран: дней=${decision.stats.awayDays} фраз=${decision.stats.phrasesLearned} ранг=${decision.stats.coinRank} энергия_полная=${String(decision.stats.energyFull)} кнопка=${decision.primary.kind} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    if (reduceMotion) return undefined;
    playSound(WELCOME_BACK_SOUND_EVENTS.asleep);
    const peek = setTimeout(() => {
      setMood('peek');
      setEmote('bang');
      void hapticMediumImpact();
      playSound(WELCOME_BACK_SOUND_EVENTS.peek);
    }, WELCOME_BACK_TIMELINE.peekMs);
    const cheer = setTimeout(() => {
      setMood('cheer');
      setEmote('heart');
      setBeatsOn(true);
      void hapticSuccess();
      playSound(WELCOME_BACK_SOUND_EVENTS.cheer);
    }, WELCOME_BACK_TIMELINE.cheerMs);
    return () => { clearTimeout(peek); clearTimeout(cheer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий играет один раз на монтирование окна
  }, []);

  const statsLine = welcomeBackStatsLine(lang, {
    awayDays: decision.stats.awayDays,
    phrasesLearned: decision.stats.phrasesLearned,
    coinRank: decision.stats.coinRank > 0 ? decision.stats.coinRank : null,
    energyFull: decision.stats.energyFull,
  });
  const cardsCount = decision.primary.kind === 'cards' ? decision.primary.count : 0;

  return (
    <MomentFullScreen testID={testID}>
      {/* зачем (самопроверка по m21, 15.10): 76/36 образца считаются от края телефона (кадр 412×915 со статус-баром и полосой жестов);
          безопасная зона сверх них поднимала кнопки выше эталона. Та же формула, что у MomentPromotion/MomentDown. */}
      <View style={[s.full, { paddingTop: Math.max(insets.top + 28, 76), paddingBottom: Math.max(insets.bottom, 12) + 24 }]}>
        <View style={s.body}>
          <MomentCoin
            rank={coinRank}
            size={110}
            mood={mood}
            zz={mood === 'sleep'}
            emote={emote}
            emoteCount={emote === 'heart' ? 5 : 1}
            emoteKey={emote === 'heart' ? 2 : 1}
            testID={`${testID}-coin`}
          />
          <Beat index={0} on={beatsOn} reduceMotion={reduceMotion}>
            <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{welcomeBackTitle(lang)}</Text>
          </Beat>
          <Beat index={1} on={beatsOn} reduceMotion={reduceMotion}>
            <Text style={[s.body16, { color: p.textSecondary }]} testID={`${testID}-stats`}>{statsLine}</Text>
          </Beat>
        </View>
        <Beat index={2} on={beatsOn} reduceMotion={reduceMotion}>
          <View style={s.foot}>
            {cardsCount > 0 ? (
              <V2Button label={welcomeBackCardsLabel(lang, cardsCount)} icon="arrow-forward" onPress={onCards} testID={`${testID}-cards`} />
            ) : null}
            <V2Button label={welcomeBackHomeLabel(lang)} variant="secondary" onPress={onHome} testID={`${testID}-home`} />
          </View>
        </Beat>
      </View>
    </MomentFullScreen>
  );
}

const s = StyleSheet.create({
  // `.full`: колонка, поля 24, сверху 76, снизу 36 — от края экрана (безопасные зоны внутри, см. разметку)
  full: { flex: 1, paddingHorizontal: 24 },
  // `.full .body`: по центру
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // `.h-xl` 34/40/800, −0.6; отступ 22 под монетой
  title: { marginTop: 22, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  // `.p` 16/22, вторичный; отступ 8
  body16: { marginTop: 8, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  // `.full .foot`: колонка, зазор 12
  foot: { gap: 12 },
});

export default memo(WelcomeBackMoment);
