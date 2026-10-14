// ═══════════════════════════════════════════════════════════════════════════
// MomentDown.tsx — момент m03 «Понижение лиги — мягко, туман» (эталон engagement-moments-v3-all.html, m03; снимок C:/Temp/claude/sec6/m0123.png, правый кадр = после тапа).
//
// зачем (владелец 14.10: «перенести точно по макетам»; D190/D191): понижают 5 последних по монетам недели; окно — при первом открытии после закрытия недели, поверх Главной. Отдельный
// экран темы (туман — НЕПРОЗРАЧНЫЙ фон темы, текст ничего не перекрывает): монета спит («z»), вокруг — пульсирующее кольцо «тапни»; тап — туман светлеет (+12 %), монета
// просыпается с «!», заголовок остаётся «Новая неделя», строка под ним меняется на «{лига} · все с 1 этажа.». Док внизу: «Играть» (главная, стрелка) и «Напомнить вечером» (вторичная).
// Закон владельца 14.10 (уточнён): меняется ТОЛЬКО формулировка — в текстах монета не «задремала/проснулась/разбуди»; анимация сна, «z», «!» и эмоции монеты остаются как в одобренном образце.
// Ранг, монеты и фразы НЕ меняются — компонент ничего не пишет, только показывает; «напомнить вечером» — колбэк наверх (Ядро решает, как ставить напоминание). reduceMotion — без движения.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { spireTierName } from '../../../modules/spire/tier_names';
import { hapticMediumImpact } from '../../../hooks/use-haptics';
import { useRuntimeActive } from '../../../hooks/use_runtime_active';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { V2Button } from '../../v2/V2Kit';
import { useSpirePalette } from '../useSpirePalette';
import { MomentCoin } from './moments_coin';
import { MomentFullScreen } from './moments_layout';
import { MOMENT_SOUND_EVENTS, playMomentSound } from './moments_sound';
import { momentText } from './moments_strings';

export type MomentDownProps = Readonly<{
  lang: Lang;
  /** Лига, В КОТОРУЮ человек спускается (индекс 0…11). */
  newTier: number;
  /** Ранг монеты человека 0…19 (null — базовая монета). */
  coinRank: number | null;
  /** «Играть»: будит монету и ведёт к игре. */
  onPlay: () => void;
  /** «Напомнить вечером»: напоминание решает Ядро; нет колбэка (напоминаний ещё нет) — второй кнопки нет. */
  onRemind?: () => void;
  /** Сразу в состоянии «после тапа» (монета проснулась, «Новая неделя», «{Лига} · все с 1 этажа.»): финальный кадр эталона для сверки; в бою не передаётся. */
  initialAwake?: boolean;
  testID?: string;
}>;

const COIN_SIZE = 110;
/** Верх блока монеты как в эталоне: 300 из 844 — доля высоты экрана. */
const TOP_FRACTION = 300 / 844;
const TAP_RING = 44;

function MomentDown({ lang, newTier, coinRank, onPlay, onRemind, initialAwake = false, testID = 'moment-down' }: MomentDownProps) {
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  const insets = useStableSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [awake, setAwake] = useState(initialAwake);
  const ring = useSharedValue(0);
  const fog = useSharedValue(reduceMotion ? 1 : 0);
  const wake = useSharedValue(initialAwake ? 1 : 0);

  useEffect(() => {
    if (__DEV__) console.log(`[MOMENT-DOWN] показ новая_лига=${newTier} монета=${String(coinRank)} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    playMomentSound(MOMENT_SOUND_EVENTS.downFog);
    if (!reduceMotion) fog.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    return () => { cancelAnimation(ring); cancelAnimation(fog); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: показ один раз на монтирование
  }, []);

  // зачем (perf_freeze_contract «бесконечные анимации под охраной»): кольцо «тапни» пульсирует только пока экран в фокусе, приложение активно и монета ещё спит
  const runtimeActive = useRuntimeActive(true);
  useEffect(() => {
    if (reduceMotion || awake || !runtimeActive) { cancelAnimation(ring); ring.value = 0; return; }
    ring.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(ring);
  }, [awake, reduceMotion, ring, runtimeActive]);

  const doWake = useCallback((source: 'tap' | 'button') => {
    if (awake) return;
    if (__DEV__) console.log(`[MOMENT-DOWN] монета проснулась источник=${source}`); // guard-ok: единичный лог пробуждения
    setAwake(true);
    cancelAnimation(ring);
    ring.value = 0;
    wake.value = reduceMotion ? 1 : withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    playMomentSound(MOMENT_SOUND_EVENTS.downWake);
    void hapticMediumImpact();
  }, [awake, reduceMotion, ring, wake]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: awake ? 0 : 0.8 * (1 - ring.value), transform: [{ scale: 1 + ring.value * 0.9 }] }));
  // «туман светлеет» (`.fog.awake { filter: brightness(1.12) }`): светлая вуаль +12 % поверх фона
  const veilStyle = useAnimatedStyle(() => ({ opacity: wake.value * 0.12 }));
  const fogStyle = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * fog.value }));

  const league = spireTierName(newTier, lang);
  const title = awake ? momentText(lang, 'downWakeTitle') : momentText(lang, 'downTitle', { league });
  const body = awake ? momentText(lang, 'downWakeBody', { league }) : momentText(lang, 'downBody', { league });

  return (
    <MomentFullScreen testID={testID}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: p.bg }, fogStyle]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, veilStyle]} />{/* theme-exempt: светлая вуаль +12 % «проснулась» (эталон brightness 1.12) */}
      <View style={[s.center, { paddingTop: Math.max(insets.top + 40, Math.round(height * TOP_FRACTION)) }]} pointerEvents="box-none">
        <View style={s.coinBox}>
          <MomentCoin
            rank={coinRank}
            size={COIN_SIZE}
            mood={awake ? 'peek' : 'sleep'}
            zz={!awake}
            emote={awake ? 'bang' : null}
            onPress={awake ? undefined : () => doWake('tap')}
            testID={`${testID}-coin`}
          />
          {awake ? null : <Animated.View pointerEvents="none" style={[s.tapRing, ringStyle]} accessible={false} />}
        </View>
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]} testID={`${testID}-title`}>{title}</Text>
        <Text style={[s.body, { color: p.textSecondary }]} testID={`${testID}-body`}>{body}</Text>
      </View>
      <View style={[s.dock, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]}>
        <V2Button label={momentText(lang, 'downWake')} icon="arrow-forward" onPress={() => { doWake('button'); onPlay(); }} testID={`${testID}-play`} />
        {onRemind ? (
          <>
            <View style={s.gap} />
            <V2Button label={momentText(lang, 'downLater')} variant="secondary" onPress={onRemind} testID={`${testID}-remind`} />
          </>
        ) : null}
      </View>
    </MomentFullScreen>
  );
}

const s = StyleSheet.create({
  // блок монеты и текста: колонка по центру, зазор 14, поля 30 (эталон: top 300, padding 0 30)
  center: { alignItems: 'center', gap: 14, paddingHorizontal: 30 },
  coinBox: { width: COIN_SIZE, height: COIN_SIZE, alignItems: 'center', justifyContent: 'center' },
  // `.tapme`: кольцо 44 в центре монеты, пульсирует «тапни»
  tapRing: { position: 'absolute', width: TAP_RING, height: TAP_RING, borderRadius: TAP_RING / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' }, // guard-ok: это не контейнер, а пульсирующее кольцо-подсказка (эталон .tapme); theme-exempt: кольцо-подсказка «тапни» — иллюстрация образца (.tapme)
  title: { fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  // `.dock`: поля 20, снизу 36; кнопки через 12
  dock: { position: 'absolute', left: 20, right: 20, bottom: 0 },
  gap: { height: 12 },
});

export default memo(MomentDown);
