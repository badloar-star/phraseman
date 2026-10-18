// ═══ Церемония повышения уровня «Монетный двор» (PM-077) ═════════════════════
// зачем (владелец 2026-09-24, D49): из трёх HTML-прототипов выбран вариант B.
// Экран уходит в темноту, из светящейся щели пресса выходит текущая монета, делает
// один тяжёлый оборот — на обороте новая монета; чеканка: тёплая вспышка, удар
// камеры, искры, ореол; затем название уровня, «Уровень N» и «Продолжить».
// Эталон и тайминги: docs/design/level-up-animation/variant-b.html ↔ level_up_mint_timeline.ts.
//
// Как устроено: ОДНИ часы (shared value 0→total, линейно) идут на UI-потоке, раз в кадр
// чистая функция sampleMintFrame(t) считает все числа сцены, стили только читают их.
// Тап = досмотр ускоренно (те же часы доводятся до конца в 6 раз быстрее).
//
// Законы проекта, которые тут соблюдены:
// • Празднование НЕ durable: компонент ничего не пишет на диск. Показывать его вызывающий
//   обязан сразу после подтверждённого апгрейда; пропущенный показ ничего не стоит.
// • Звуков нет (владелец добавит сам): наружу отдаются только метки onCue.
// • «Уменьшение движения» — короткая версия без полёта монеты.
// • Бесконечное парение монеты после чеканки гейтится фокусом/фоном (useRuntimeActive).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  type ImageSourcePropType,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from '../SafeLinearGradient';
import PressableScale from '../PressableScale';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang } from '../../constants/i18n';
import { hapticMediumImpact, hapticTap } from '../../hooks/use-haptics';
import { useReduceMotionPreference } from '../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { DebugLogger } from '../../app/debug-logger';
import MintCoin from './MintCoin';
import MintSparks from './MintSparks';
import { MINT_BG, MintBackdrop, MintFlash, MintHalo, MintPool, MintRing, MintSlitGlow } from './MintSceneArt';
import type { CoinMetal } from './coin_metal_palette';
import {
  MINT_TIMELINE,
  type MintSoundCue,
  buildMintSparks,
  crossedCues,
  mintButtonAtMs,
  mintSkipDurationMs,
  mintTotalMs,
  sampleMintFrame,
} from './level_up_mint_timeline';

const LOG = '[LEVEL-UP-MINT]';

/** Трассировка церемонии: единый префикс, чтобы вытащить всю цепочку одним поиском. */
function trace(message: string, data?: Record<string, unknown>): void {
  DebugLogger.info(LOG, data ? `${message} ${JSON.stringify(data)}` : message);
}

export type LevelUpMintSide = Readonly<{
  /** Номер уровня (ранг монеты) 0…19, см. app/coin_rank_table_v1.ts. */
  level: number;
  /** Название уровня уже на языке интерфейса (из таблицы рангов вызывающего). */
  name: string;
  metal: CoinMetal;
  /** Картинка монеты ранга (PM-073, coinRankMintSide). Без неё — процедурная монета. */
  coinSource?: ImageSourcePropType;
}>;

export type LevelUpMintCeremonyProps = Readonly<{
  visible: boolean;
  from: LevelUpMintSide;
  to: LevelUpMintSide;
  /** «Продолжить» или системное «назад» после финала. Вызывается ровно один раз за показ. */
  onDone: () => void;
  /** Метки для будущей озвучки: drop, riser, flip, mint, shimmer. */
  onCue?: (cue: MintSoundCue) => void;
}>;

/** Пропорции сцены из эталона (экран 390×844, монета 220 px, пол на 540 px). */
const COIN_TO_WIDTH = 0.564;
const COIN_MAX = 240;
const HORIZON_TO_HEIGHT = 0.64;
const REFLECTION_OPACITY = 0.16;

export default function LevelUpMintCeremony({ visible, from, to, onDone, onCue }: LevelUpMintCeremonyProps) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  // зачем: CTA церемонии — нейтральный токен темы Liquid Glass (макет coins.html PAY-05), а не жёстко белая кнопка.
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const reducePref = useReduceMotionPreference();

  // Геометрия: всё считается от ширины и высоты экрана, первый кадр = финальная раскладка.
  const coinSize = Math.round(Math.min(W * COIN_TO_WIDTH, COIN_MAX));
  const horizonY = Math.round(Math.max(H * HORIZON_TO_HEIGHT, insets.top + coinSize * 1.6));
  const restCenterY = horizonY + MINT_TIMELINE.rise.to * coinSize;

  const clock = useSharedValue(0);
  const reducedSV = useSharedValue(false);
  const cueCursor = useSharedValue(-1);
  const readySV = useSharedValue(false);
  const idle = useSharedValue(0);

  const [ready, setReady] = useState(false);
  const [runReduced, setRunReduced] = useState(false);
  const [playSeed, setPlaySeed] = useState(1);
  const skippedRef = useRef(false);
  const doneRef = useRef(false);
  const reducePrefRef = useRef(reducePref);
  reducePrefRef.current = reducePref;
  const onCueRef = useRef(onCue);
  onCueRef.current = onCue;

  const sparks = useMemo(() => buildMintSparks(playSeed), [playSeed]);

  const copy = useMemo(
    () => ({
      level: triLang(lang, {
        ru: 'Уровень', uk: 'Рівень', en: 'Level', es: 'Nivel', 'pt-BR': 'Nível', vi: 'Cấp', id: 'Level', tr: 'Seviye', pl: 'Poziom',
      }),
      cta: triLang(lang, {
        ru: 'Продолжить', uk: 'Продовжити', en: 'Continue', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Dalej',
      }),
      newLevel: triLang(lang, {
        ru: 'Новый уровень', uk: 'Новий рівень', en: 'New level', es: 'Nuevo nivel', 'pt-BR': 'Novo nível', vi: 'Cấp mới', id: 'Level baru', tr: 'Yeni seviye', pl: 'Nowy poziom',
      }),
      skipHint: triLang(lang, {
        ru: 'Коснитесь, чтобы досмотреть быстрее', uk: 'Торкніться, щоб дивитися швидше', en: 'Tap to fast-forward', es: 'Toca para avanzar más rápido',
        'pt-BR': 'Toque para avançar mais rápido', vi: 'Chạm để tua nhanh', id: 'Ketuk untuk mempercepat', tr: 'Hızlandırmak için dokunun', pl: 'Dotknij, aby przyspieszyć',
      }),
    }),
    [lang],
  );
  const levelLine = `${copy.level} ${to.level}`;

  // ── Старт показа: ровно один раз на каждое visible=true, когда настройка движения прочитана ──
  const prefKnown = reducePref !== null;
  useEffect(() => {
    if (!visible) {
      trace('не показываем: visible=false');
      return;
    }
    if (!prefKnown) {
      // зачем: до чтения системной настройки не знаем, какую версию играть; сцена прозрачна, ждём кадр-другой.
      trace('ждём настройку «уменьшение движения»', { reducePref: reducePrefRef.current });
      return;
    }
    const isReduced = reducePrefRef.current === true;
    const total = mintTotalMs(isReduced);
    trace('старт', { from: from.level, to: to.level, reduced: isReduced, totalMs: total, W, H, coinSize });
    skippedRef.current = false;
    doneRef.current = false;
    readySV.value = false;
    reducedSV.value = isReduced;
    cueCursor.value = -1;
    setReady(false);
    setRunReduced(isReduced);
    setPlaySeed((s) => s + 1);
    clock.value = 0;
    clock.value = withTiming(total, { duration: total, easing: Easing.linear });
    return () => {
      cancelAnimation(clock);
    };
    // Остальные значения читаются через ref: смена языка или настройки посреди показа не перезапускает его.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, prefKnown]);

  // ── Метки звука и готовность кнопки — по часам, на UI-потоке ──
  const handleCues = useCallback(
    (cues: MintSoundCue[]) => {
      for (const cue of cues) {
        // При ускоренном досмотре оставляем только удар и шиммер — иначе каша (как в эталоне).
        if (skippedRef.current && cue !== 'mint' && cue !== 'shimmer') continue;
        if (cue === 'mint') void hapticMediumImpact();
        if (cue === 'shimmer') AccessibilityInfo.announceForAccessibility(`${copy.newLevel}: ${to.name}. ${levelLine}`);
        try {
          onCueRef.current?.(cue);
        } catch (error) {
          DebugLogger.warn(LOG, `onCue бросил исключение — показ продолжается ${JSON.stringify({ cue, error: String(error) })}`);
        }
      }
    },
    [copy.newLevel, levelLine, to.name],
  );
  const markReady = useCallback(() => {
    trace('кнопка «Продолжить» доступна', { skipped: skippedRef.current });
    setReady(true);
  }, []);

  useAnimatedReaction(
    () => clock.value,
    (t) => {
      const cues = crossedCues(cueCursor.value, t, reducedSV.value);
      cueCursor.value = t;
      if (cues.length > 0) runOnJS(handleCues)(cues);
      if (!readySV.value && t >= mintButtonAtMs(reducedSV.value)) {
        readySV.value = true;
        runOnJS(markReady)();
      }
    },
  );

  // ── Парение после чеканки: бесконечный цикл только пока экран в фокусе и приложение активно ──
  const runtimeActive = useRuntimeActive(visible);
  useEffect(() => {
    if (visible && ready && !runReduced && runtimeActive) {
      idle.value = withRepeat(
        withTiming(1, { duration: MINT_TIMELINE.idle.halfPeriod, easing: Easing.inOut(Easing.sin) }),
        // зачем (PM-032, решение координатора 01.10): декор — 2–3 повтора и покой, не вечный цикл.
        4,
        true,
      );
    } else {
      cancelAnimation(idle);
      idle.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.quad) });
    }
    return () => cancelAnimation(idle);
  }, [visible, ready, runReduced, runtimeActive, idle]);

  // ── Действия ──
  const skip = useCallback(() => {
    if (ready || skippedRef.current) return;
    skippedRef.current = true;
    const t = clock.value;
    const reduced = reducedSV.value;
    const duration = mintSkipDurationMs(t, reduced);
    trace('досмотр по тапу', { atMs: Math.round(t), durationMs: Math.round(duration) });
    clock.value = withTiming(mintTotalMs(reduced), { duration, easing: Easing.linear });
  }, [ready, clock, reducedSV]);

  const finish = useCallback(() => {
    if (doneRef.current) {
      trace('повторное «Продолжить» проигнорировано');
      return;
    }
    doneRef.current = true;
    trace('закрыто пользователем', { to: to.level });
    void hapticTap();
    onDone();
  }, [onDone, to.level]);

  const onRequestClose = useCallback(() => {
    // Системное «назад»: до финала — досмотреть быстрее, после — закрыть.
    if (ready) finish();
    else skip();
  }, [ready, finish, skip]);

  // ── Кадр сцены ──
  const frame = useDerivedValue(() => sampleMintFrame(clock.value, reducedSV.value));

  const sceneStyle = useAnimatedStyle(() => ({ opacity: frame.value.scene }));
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: frame.value.shakeX }, { translateY: frame.value.shakeY }],
  }));
  const slitStyle = useAnimatedStyle(() => ({ opacity: frame.value.slitGlow }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: frame.value.haloOpacity, transform: [{ scale: frame.value.haloScale }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: frame.value.ringOpacity, transform: [{ scale: frame.value.ringScale }] }));
  const poolStyle = useAnimatedStyle(() => ({ opacity: frame.value.pool }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: frame.value.flash }));
  const titleStyle = useAnimatedStyle(() => {
    const p = frame.value.title;
    return { opacity: p, transform: [{ translateY: 18 * (1 - p) }, { scale: 0.92 + 0.08 * p }] };
  });
  const subStyle = useAnimatedStyle(() => {
    const p = frame.value.sub;
    return { opacity: p, transform: [{ translateY: 12 * (1 - p) }] };
  });
  const buttonStyle = useAnimatedStyle(() => {
    const p = frame.value.button;
    return { opacity: p, transform: [{ translateY: 16 * (1 - p) }] };
  });

  const haloSize = coinSize * 1.636;
  const ringSize = coinSize * 1.364;
  const poolW = coinSize * 1.455;
  const poolH = coinSize * 0.318;
  const slitW = coinSize * 1.136;
  const coinLeft = (W - coinSize) / 2;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onRequestClose}>
      {/* зачем фон на корне: на Android окно модалки со statusBarTranslucent выше, чем useWindowDimensions — без него снизу просвечивал бы экран */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.root, sceneStyle]} accessibilityViewIsModal>
        <Animated.View style={[StyleSheet.absoluteFill, shakeStyle]} pointerEvents="none">
          <MintBackdrop width={W} height={H} horizonY={horizonY} coinSize={coinSize} />

          <Animated.View style={[styles.abs, { left: (W - haloSize) / 2, top: restCenterY - haloSize / 2 }, haloStyle]}>
            <MintHalo size={haloSize} />
          </Animated.View>

          {/* отражение в полу: та же монета зеркально, тихо и коротко */}
          <View style={[styles.abs, styles.clip, { left: 0, right: 0, top: horizonY, height: H - horizonY, opacity: REFLECTION_OPACITY }]}>
            <View style={[styles.abs, { left: coinLeft, top: -coinSize / 2 }]}>
              <MintCoin frame={frame} idle={idle} size={coinSize} mirrored fromMetal={from.metal} toMetal={to.metal} fromSource={from.coinSource} toSource={to.coinSource} />
            </View>
          </View>
          <LinearGradient
            colors={['rgba(11,10,13,0)', '#0b0a0d']} // theme-exempt: иллюстрация церемонии повышения уровня
            style={[styles.abs, { left: 0, right: 0, top: horizonY + 1, height: coinSize * 0.74 }]}
          />
          <View style={[styles.abs, { left: 0, right: 0, top: horizonY + coinSize * 0.74, bottom: 0, backgroundColor: 'rgba(8,8,10,0.94)' }]} />{/* theme-exempt: иллюстрация церемонии повышения уровня */}

          <Animated.View style={[styles.abs, { left: (W - poolW) / 2, top: horizonY - poolH / 2 }, poolStyle]}>
            <MintPool width={poolW} height={poolH} />
          </Animated.View>
          <Animated.View style={[styles.abs, { left: (W - slitW * 1.6) / 2, top: horizonY - 35 }, slitStyle]}>
            <MintSlitGlow width={slitW} />
          </Animated.View>

          {/* сама монета: выше линии пола, ниже неё её не видно — «выходит из щели» */}
          <View style={[styles.abs, styles.clip, { left: 0, right: 0, top: 0, height: horizonY }]}>
            <View style={[styles.abs, { left: coinLeft, top: horizonY - coinSize / 2 }]}>
              <MintCoin frame={frame} idle={idle} size={coinSize} mirrored={false} fromMetal={from.metal} toMetal={to.metal} fromSource={from.coinSource} toSource={to.coinSource} />
            </View>
          </View>

          <Animated.View style={[styles.abs, { left: (W - ringSize) / 2, top: restCenterY - ringSize / 2 }, ringStyle]}>
            <MintRing size={ringSize} />
          </Animated.View>
          <MintSparks sparks={sparks} clock={clock} size={coinSize} color={to.metal.hi} cx={W / 2} cy={restCenterY} />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, flashStyle]} pointerEvents="none">
          <MintFlash width={W} height={H} cy={restCenterY} />
        </Animated.View>

        {/* тап в любом месте до финала — досмотреть быстрее */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={skip}
          disabled={ready}
          accessibilityRole="button"
          accessibilityLabel={copy.skipHint}
          accessibilityState={{ disabled: ready }}
          accessibilityElementsHidden={ready}
          importantForAccessibility={ready ? 'no-hide-descendants' : 'auto'}
        />

        <View
          style={[styles.abs, styles.bottom, { top: horizonY + 44, paddingBottom: insets.bottom + 28 }]}
          pointerEvents="box-none"
        >
          <View style={styles.caption} pointerEvents="none">
            <Animated.View style={titleStyle}>
              <Text style={styles.eyebrow}>{copy.newLevel}</Text>
              <Text style={styles.title} accessibilityRole="header">
                {to.name}
              </Text>
            </Animated.View>
            <Animated.View style={subStyle}>
              <Text style={styles.sub}>{levelLine}</Text>
            </Animated.View>
          </View>
          <Animated.View style={buttonStyle} pointerEvents={ready ? 'auto' : 'none'}>
            {/* зачем (Макеты 18.10, кадры level_up_mint_hybrid_*_b): PressableScale кладёт подпись во внутренний слой на всю
                ширину — alignItems у внешнего стиля её не центрировал, «Продолжить» прижималась к левому краю. Центруем внутри. */}
            <PressableScale variant="primary" onPress={finish} disabled={!ready} withHaptic={false} style={[styles.button, { backgroundColor: glass.accent }]} contentStyle={styles.buttonContent}>
              <Text style={[styles.buttonText, { color: glass.accentInk }]}>{copy.cta}</Text>
            </PressableScale>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: MINT_BG },
  abs: { position: 'absolute' },
  clip: { overflow: 'hidden' },
  bottom: { left: 24, right: 24, bottom: 0, justifyContent: 'space-between' },
  caption: { alignItems: 'center' },
  eyebrow: {
    color: 'rgba(245,245,247,0.62)', // theme-exempt: иллюстрация церемонии повышения уровня
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  title: {
    marginTop: 8,
    color: '#f5f5f7', // theme-exempt: иллюстрация церемонии повышения уровня
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  sub: {
    marginTop: 8,
    color: 'rgba(245,245,247,0.62)', // theme-exempt: иллюстрация церемонии повышения уровня
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
  },
  button: {
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.94)', // theme-exempt: иллюстрация церемонии повышения уровня
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: { alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#0b0b0f', fontSize: 16, fontWeight: '700', textAlign: 'center' }, // theme-exempt: иллюстрация церемонии повышения уровня
});

export { MINT_BG };
