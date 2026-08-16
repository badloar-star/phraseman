/**
 * PremiumCelebrationHybrid — v2 хореография «Световод + Чекан» для празднования
 * покупки Plus/Pro: «Премиум · созвездие фич» (макет-эталон: сцена P1 в
 * .motion-mockups/phraseman-hybrid.html).
 *
 * зачем: владелец утвердил гибридный редизайн (2026-08-15) — не лента строк,
 * а созвездие: эмблема выходит из света, фичи-звёзды разлетаются на орбиту и
 * зажигаются по одной неравномерной лестницей, орбита прочерчивается сквозь
 * все зажжённые, финал — ЕДИНСТВЕННЫЙ удар (Чекан) на эмблеме. Подключается
 * ТОЛЬКО через motionVariant='hybrid' в PremiumCelebrationModal — боевое
 * поведение по умолчанию ('classic') не меняется.
 *
 * Информационная насыщенность сохранена: тот же список фич по тиру
 * (CELEBRATION_FEATURES), тот же заголовок/подзаголовок по variant, тот же
 * CTA — меняется только ПОДАЧА и ДВИЖЕНИЕ, не содержимое.
 */
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Reanimated, {
  Easing as REasing,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from '../SafeLinearGradient';
import DuoPressable from '../DuoPressable';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { hapticSuccess, hapticTap } from '../../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { isLowEndDevice } from '../../hooks/device_perf_tier';
import { soundDirector } from '../../modules/audio/sound_director';
import { LUM, CHK } from '../../constants/motionHybrid';
import {
  CELEBRATION_FEATURES,
  CELEBRATION_PALETTES,
  type CelebrationFeature,
  type CelebrationVariant,
} from './celebrationContent';

interface PremiumCelebrationHybridProps {
  visible: boolean;
  onClose: () => void;
  variant?: CelebrationVariant;
}

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

/** Орбита: максимум 6 звёзд-фич на кольце вокруг эмблемы (макет: N=6, R=96). */
const ORBIT_MAX = 6;
const ORBIT_RADIUS = 96;
// зачем: неравномерная лестница разлёта из макета (1000 + k*70) и зажигания
// (1500 + k*320) — законы Motion DNA запрещают ровный метроном. LUM.ladder
// (6 ступеней) покрывает до 6 звёзд, шаг чуть уже макетного 320мс, но остаётся
// неравномерным — единый словарь важнее точного повтора константы макета.
const FLY_LADDER = LUM.ladder; // [0,74,172,306,478,688] — старт разлёта звезды k
const LIGHT_STEP_MS = 320; // шаг зажигания звезды (макет P1)

function localeText(map: CelebrationFeature['title'], lang: ReturnType<typeof useLang>['lang']): string {
  return (map as Record<string, string>)[lang] ?? map.ru;
}

function PremiumCelebrationHybrid({ visible, onClose, variant = 'premium' }: PremiumCelebrationHybridProps) {
  const { width: winW } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { f } = useTheme();
  const { lang } = useLang();
  const palette = CELEBRATION_PALETTES[variant];
  const reduceMotion = useReducedMotion();

  // зачем: слабые Android — меньше звёзд на орбите (деградация по правилу
  // Firebase/perf-бюджета), первые ORBIT_MAX самых ценных фич остаются видны
  // как список текстом ниже (полнота информации не теряется, см. renderFullList).
  const lowEnd = useMemo(() => isLowEndDevice({ OS: Platform.OS as 'ios' | 'android', Version: Platform.Version }), []);
  const orbitCount = lowEnd ? 4 : ORBIT_MAX;
  const orbitFeatures = CELEBRATION_FEATURES.slice(0, orbitCount);
  const restFeatures = CELEBRATION_FEATURES.slice(orbitCount);

  const [litCount, setLitCount] = useState(0);
  const [skipped, setSkipped] = useState(false);

  const waveY = useSharedValue(0);
  const embOpacity = useSharedValue(0);
  const embScale = useSharedValue(0.6);
  const embSquashX = useSharedValue(1);
  const embSquashY = useSharedValue(1);
  const orbitOpacity = useSharedValue(0);
  const orbitProg = useSharedValue(0);
  const headingT = useSharedValue(0);
  const ctaT = useSharedValue(0);

  const clearAll = useCallback(() => {
    cancelAnimation(waveY); cancelAnimation(embOpacity); cancelAnimation(embScale);
    cancelAnimation(embSquashX); cancelAnimation(embSquashY);
    cancelAnimation(orbitOpacity); cancelAnimation(orbitProg);
    cancelAnimation(headingT); cancelAnimation(ctaT);
  }, [waveY, embOpacity, embScale, embSquashX, embSquashY, orbitOpacity, orbitProg, headingT, ctaT]);

  useEffect(() => {
    if (!visible) {
      clearAll();
      waveY.value = 0; embOpacity.value = 0; embScale.value = 0.6;
      embSquashX.value = 1; embSquashY.value = 1;
      orbitOpacity.value = 0; orbitProg.value = 0;
      headingT.value = 0; ctaT.value = 0;
      setLitCount(0); setSkipped(false);
      return;
    }

    hapticSuccess();
    soundDirector.request(variant === 'pro' ? 'pm.reward.vip_open' : 'pm.reward.premium_open', {
      scope: 'premium-celebration-hybrid',
      dedupeKey: `${variant}:open`,
    });

    const finaleAt = 1500 + orbitCount * LIGHT_STEP_MS + 400; // орбита смыкается
    const strikeAt = finaleAt + 550; // удар эмблемы
    const ctaAt = strikeAt + 300;

    if (reduceMotion) {
      // Reduce Motion = один финальный кадр: всё уже на месте, зажжено, эмблема в покое.
      waveY.value = 620;
      embOpacity.value = 1; embScale.value = 1;
      orbitOpacity.value = 0.8; orbitProg.value = 360;
      headingT.value = 1; ctaT.value = 1;
      setLitCount(orbitCount);
      soundDirector.request(variant === 'pro' ? 'pm.reward.vip_finale' : 'pm.reward.premium_finale', {
        scope: 'premium-celebration-hybrid',
        dedupeKey: `${variant}:finale`,
      });
      return;
    }

    // волна золота проливается сверху (LUM.bloom — источник света первым)
    waveY.value = withTiming(620, { duration: 1100, easing: REasing.bezier(0.3, 0, 0.2, 1) });

    // эмблема выходит из света в центре (LUM.resolve + back-выброс)
    embOpacity.value = withDelay(LUM.bloomMs, withTiming(1, { duration: LUM.resolveMs, easing: REasing.out(REasing.quad) }));
    embScale.value = withDelay(LUM.bloomMs, withSpring(1, { mass: 0.8, damping: 12, stiffness: 130 }));

    // зажигание по одной звезде — неравномерная лестница, хаптик-тап на каждую
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let k = 0; k < orbitCount; k += 1) {
      const d = 1500 + k * LIGHT_STEP_MS;
      const timer = setTimeout(() => {
        setLitCount((prev) => (prev > k ? prev : k + 1));
        hapticTap();
      }, d);
      timers.push(timer);
    }

    // орбита прочерчивается сквозь все зажжённые (conic-progress, паттерн ArenaTimerRing)
    orbitOpacity.value = withDelay(finaleAt - 100, withTiming(0.8, { duration: 200, easing: REasing.out(REasing.quad) }));
    orbitProg.value = withDelay(finaleAt - 50, withTiming(360, { duration: 700, easing: REasing.inOut(REasing.quad) }));

    // финал: ЕДИНСТВЕННЫЙ удар кадра — squash на эмблеме (закон №1: Чекан только у героя)
    const strikeTimer = setTimeout(() => {
      embSquashY.value = withSpring(1, CHK.squash);
      embSquashY.value = withSequence(withTiming(0.84, { duration: 0 }), withSpring(1, CHK.squash));
      embSquashX.value = withSequence(withTiming(1.16, { duration: 0 }), withSpring(1, CHK.squash));
      hapticSuccess();
      soundDirector.request(variant === 'pro' ? 'pm.reward.vip_finale' : 'pm.reward.premium_finale', {
        scope: 'premium-celebration-hybrid',
        dedupeKey: `${variant}:finale`,
      });
    }, strikeAt);
    timers.push(strikeTimer);

    headingT.value = withDelay(strikeAt, withTiming(1, { duration: LUM.resolveMs, easing: REasing.out(REasing.quad) }));
    ctaT.value = withDelay(ctaAt, withSpring(1, { mass: 0.6, damping: 12, stiffness: 120 }));

    return () => { timers.forEach(clearTimeout); clearAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, variant, reduceMotion, orbitCount]);

  const skip = useCallback(() => {
    clearAll();
    setSkipped(true);
    setLitCount(orbitCount);
    waveY.value = 620; embOpacity.value = 1; embScale.value = 1;
    embSquashX.value = 1; embSquashY.value = 1;
    orbitOpacity.value = 0.8; orbitProg.value = 360;
    headingT.value = 1; ctaT.value = 1;
  }, [clearAll, orbitCount, waveY, embOpacity, embScale, embSquashX, embSquashY, orbitOpacity, orbitProg, headingT, ctaT]);

  const handleClose = useCallback(() => { onClose(); }, [onClose]);
  const handleBack = useCallback(() => {
    if (skipped) { handleClose(); return; }
    skip();
  }, [skipped, skip, handleClose]);

  const waveStyle = useAnimatedStyle(() => ({ transform: [{ translateY: waveY.value - 620 }] }));
  const embWrapStyle = useAnimatedStyle(() => ({
    opacity: embOpacity.value,
    transform: [{ scale: embScale.value }],
  }));
  const embSquashStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: embSquashX.value }, { scaleY: embSquashY.value }],
  }));
  const headingStyle = useAnimatedStyle(() => ({
    opacity: headingT.value,
    transform: [{ translateY: interpolate(headingT.value, [0, 1], [10, 0]) }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaT.value,
    transform: [{ translateY: interpolate(ctaT.value, [0, 1], [16, 0]) }, { scale: interpolate(ctaT.value, [0, 1], [0.94, 1]) }],
  }));

  const orbitCircleProps = useAnimatedProps(() => {
    const r = ORBIT_RADIUS;
    const c = 2 * Math.PI * r;
    return {
      strokeDashoffset: c * (1 - orbitProg.value / 360),
      opacity: orbitOpacity.value,
    };
  });

  const stageSize = ORBIT_RADIUS * 2 + 80;
  const ctaBottom = 28 + bottomInset;

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleBack}>
      <View style={[styles.root, { backgroundColor: palette.bg[2] }]}>
        <LinearGradient
          pointerEvents="none"
          colors={palette.bg}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* волна золота проливается сверху — один translateY, LUM.bloom */}
        <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, waveStyle]}>
          <LinearGradient
            colors={[`${palette.main}00`, `${palette.main}33`, `${palette.main}00`]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ width: winW, height: 260 }}
          />
        </Reanimated.View>

        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={skipped ? handleClose : skip}
          accessibilityRole="button"
        />

        {!skipped ? (
          <View pointerEvents="none" style={[styles.skipHint, { top: insets.top + 14 }]}>
            <Text style={styles.skipHintText}>
              {triLang(lang, { ru: 'тапни, чтобы пропустить', uk: 'тапни, щоб пропустити', es: 'toca para saltar', 'pt-BR': 'toque para pular', vi: 'chạm để bỏ qua', id: 'ketuk untuk lewati', tr: 'geçmek için dokun', pl: 'dotknij, by pominąć' })}
            </Text>
          </View>
        ) : null}

        <View style={styles.center}>
          {/* ── СЦЕНА: эмблема + орбита + звёзды ── */}
          <View style={[styles.stage, { width: stageSize, height: stageSize }]} pointerEvents="none">
            <Svg width={stageSize} height={stageSize} style={StyleSheet.absoluteFill}>
              <Defs>
                <RadialGradient id="embGlow" cx="50%" cy="50%" r="55%">
                  <Stop offset="0" stopColor={palette.main} stopOpacity="0.35" />
                  <Stop offset="1" stopColor={palette.main} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx={stageSize / 2} cy={stageSize / 2} r={stageSize / 2} fill="url(#embGlow)" />
              <AnimatedCircle
                cx={stageSize / 2}
                cy={stageSize / 2}
                r={ORBIT_RADIUS}
                stroke={palette.main}
                strokeWidth={1.5}
                fill="none"
                strokeDasharray={2 * Math.PI * ORBIT_RADIUS}
                strokeLinecap="round"
                animatedProps={orbitCircleProps}
                transform={`rotate(-90 ${stageSize / 2} ${stageSize / 2})`}
              />
            </Svg>

            {orbitFeatures.map((feat, k) => {
              const angle = -Math.PI / 2 + k * ((Math.PI * 2) / orbitFeatures.length);
              return (
                <StarSlot
                  key={`${variant}_star_${k}`}
                  feature={feat}
                  angle={angle}
                  radius={ORBIT_RADIUS}
                  flyDelay={LUM.bloomMs + FLY_LADDER[Math.min(k, FLY_LADDER.length - 1)]}
                  lightAt={1500 + k * LIGHT_STEP_MS}
                  lit={skipped || litCount > k}
                  palette={palette}
                  f={f}
                  lang={lang}
                  reduceMotion={reduceMotion}
                />
              );
            })}

            <Reanimated.View style={[styles.embWrap, embWrapStyle]}>
              <Reanimated.View style={[styles.embGlowWrap, { shadowColor: palette.main }, embSquashStyle]}>
                <View style={styles.embDisc}>
                  <LinearGradient
                    colors={[`${palette.main}33`, '#0f0b03']}
                    start={{ x: 0.4, y: 0.2 }}
                    end={{ x: 0.6, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.embEmoji}>{palette.emblem}</Text>
                </View>
              </Reanimated.View>
            </Reanimated.View>
          </View>

          {/* ── заголовок ── */}
          <Reanimated.View style={[styles.heading, headingStyle]}>
            <Text style={[styles.title, { color: palette.bright, fontSize: Math.max(23, f.h1 + 1), textShadowColor: `${palette.main}80` }]}>
              {variant === 'pro'
                ? triLang(lang, { ru: 'Pro активирован', uk: 'Pro активовано', es: 'Pro activado', 'pt-BR': 'Pro ativado', vi: 'Đã kích hoạt Pro', id: 'Pro aktif', tr: 'Pro etkinleştirildi', pl: 'Pro aktywowany' })
                : triLang(lang, { ru: 'Plus активирован', uk: 'Plus активовано', es: 'Plus activado', 'pt-BR': 'Plus ativado', vi: 'Đã kích hoạt Plus', id: 'Plus aktif', tr: 'Plus etkinleştirildi', pl: 'Plus aktywowany' })}
            </Text>
            <Text style={[styles.subtitle, { color: palette.text, fontSize: f.body }]}>
              {variant === 'pro'
                ? triLang(lang, { ru: 'Phraseman Pro: разовая покупка, энергия и все функции — без подписки', uk: 'Phraseman Pro: разова покупка, енергія й усі функції — без підписки', es: 'Phraseman Pro: compra única, energía y todo, sin suscripción', 'pt-BR': 'Phraseman Pro: compra única, energia e tudo, sem assinatura', vi: 'Phraseman Pro: mua một lần, năng lượng và mọi tính năng', id: 'Phraseman Pro: pembelian sekali, energi dan semua fitur', tr: 'Phraseman Pro: tek seferlik satın alma, enerji ve tüm özellikler', pl: 'Phraseman Pro: zakup jednorazowy, energia i wszystkie funkcje' })
                : variant === 'vip'
                ? triLang(lang, { ru: 'Plus-доступ открыт: энергия и все функции', uk: 'Plus-доступ відкрито: енергія й усі функції', es: 'Acceso Plus: energía y todo desbloqueado', 'pt-BR': 'Acesso Plus: energia e tudo liberado', vi: 'Plus: năng lượng và mọi tính năng', id: 'Akses Plus: energi dan semua fitur', tr: 'Plus: enerji ve tüm özellikler', pl: 'Dostęp Plus: energia i wszystkie funkcje' })
                : triLang(lang, { ru: 'Всё открыто. Прокачивайся без лимитов — прямо сейчас', uk: 'Усі можливості розблоковано — поїхали', es: 'Todo desbloqueado — empieza ahora', 'pt-BR': 'Tudo desbloqueado — comece agora', vi: 'Đã mở mọi thứ — bắt đầu ngay', id: 'Semua terbuka — mulai sekarang', tr: 'Her şey açıldı — hemen başla', pl: 'Wszystko odblokowane — zaczynamy' })}
            </Text>
          </Reanimated.View>

          {/* ── остаток списка фич текстом (полнота информации при >orbitCount) ── */}
          {restFeatures.length > 0 ? (
            <View style={styles.restList} pointerEvents="none">
              {restFeatures.map((feat, idx) => (
                <View key={`${variant}_rest_${idx}`} style={styles.restRow}>
                  <Text style={styles.restEmoji}>{feat.emoji}</Text>
                  <Text style={[styles.restTitle, { color: palette.rowText, fontSize: f.caption }]} numberOfLines={1}>
                    {localeText(feat.title, lang)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* ── CTA ── */}
        <Reanimated.View style={[styles.ctaWrap, { bottom: ctaBottom }, ctaStyle]}>
          <DuoPressable
            testID={`${variant}-celebration-hybrid-cta`}
            onPress={() => { hapticSuccess(); handleClose(); }}
            edgeColor={palette.bg[2]}
            edgeHeight={6}
            gradientColors={palette.cta}
            gradientStart={{ x: 0, y: 0 }}
            gradientEnd={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={[styles.ctaText, { color: palette.ctaText, fontSize: f.bodyLg + 1 }]}>
              {triLang(lang, { ru: 'Поехали', uk: 'Поїхали', es: 'Empezar', 'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Ayo mulai', tr: 'Hadi başla', pl: 'Zaczynamy' })}
            </Text>
          </DuoPressable>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

/** Обёртка над ConstellationStar: пробрасывает lang извне (замыкание, не проп-дрилл текста). */
function StarSlot({
  feature, angle, radius, flyDelay, lightAt, lit, palette, f, lang, reduceMotion,
}: {
  feature: CelebrationFeature;
  angle: number;
  radius: number;
  flyDelay: number;
  lightAt: number;
  lit: boolean;
  palette: typeof CELEBRATION_PALETTES['premium'];
  f: ReturnType<typeof useTheme>['f'];
  lang: ReturnType<typeof useLang>['lang'];
  reduceMotion: boolean;
}) {
  const fly = useSharedValue(0);
  const glow = useSharedValue(0);
  const labelT = useSharedValue(0);
  const tx = Math.round(Math.cos(angle) * radius);
  const ty = Math.round(Math.sin(angle) * radius);

  useEffect(() => {
    if (reduceMotion) { fly.value = 1; return; }
    fly.value = withDelay(flyDelay, withSpring(1, { mass: 0.8, damping: 14, stiffness: 120 }));
    return () => cancelAnimation(fly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, flyDelay]);

  useEffect(() => {
    if (reduceMotion) { glow.value = lit ? 1 : 0; labelT.value = lit ? 1 : 0; return; }
    if (!lit) { glow.value = 0; labelT.value = 0; return; }
    glow.value = withSpring(1, { mass: 0.5, damping: 10, stiffness: 190 });
    labelT.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.quad) });
    return () => { cancelAnimation(glow); cancelAnimation(labelT); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lit, reduceMotion]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: fly.value,
    transform: [
      { translateX: interpolate(fly.value, [0, 1], [0, tx]) },
      { translateY: interpolate(fly.value, [0, 1], [0, ty]) },
    ],
  }));
  const tileStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(glow.value, [0, 0.5, 1], [1, 1.14, 1]) }],
    opacity: interpolate(glow.value, [0, 1], [0.42, 1]),
    shadowOpacity: interpolate(glow.value, [0, 1], [0, 0.85]),
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelT.value }));
  void lightAt;

  return (
    <Reanimated.View pointerEvents="none" style={[styles.star, wrapStyle]}>
      {/* Тень-свечение на НЕ обрезанном слое (overflow:hidden ниже иначе съел бы shadow),
          тёмная база + акцентная вуаль внутри — разделение тоном, не обводкой. */}
      <Reanimated.View style={[styles.starGlowWrap, { shadowColor: palette.main }, tileStyle]}>
        <View style={styles.starTile}>
          <View style={[StyleSheet.absoluteFill, styles.starTileBase]} />
          <View style={[StyleSheet.absoluteFill, styles.starTileTint, { backgroundColor: `${palette.main}33` }]} />
          <Text style={styles.starEmoji}>{feature.emoji}</Text>
        </View>
      </Reanimated.View>
      <Reanimated.Text
        numberOfLines={1}
        style={[styles.starLabel, { color: palette.rowText, fontSize: f.caption }, labelStyle]}
      >
        {localeText(feature.title, lang)}
      </Reanimated.Text>
    </Reanimated.View>
  );
}

export default memo(PremiumCelebrationHybrid);

const styles = StyleSheet.create({
  root: { flex: 1 },
  skipHint: { position: 'absolute', right: 18, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.28)' },
  skipHintText: { color: 'rgba(255,255,255,0.5)', fontSize: 12.5, fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  stage: { alignItems: 'center', justifyContent: 'center' },

  embWrap: { alignItems: 'center', justifyContent: 'center' },
  embGlowWrap: {
    width: 92, height: 92, borderRadius: 46,
    shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  embDisc: {
    flex: 1, borderRadius: 46,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  embEmoji: { fontSize: 46 },

  star: { position: 'absolute', alignItems: 'center', width: 64 },
  starGlowWrap: {
    width: 44, height: 44, borderRadius: 22,
    shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  starTile: {
    flex: 1, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  starTileBase: { borderRadius: 22, backgroundColor: 'rgba(8,10,9,0.82)' },
  starTileTint: { borderRadius: 22 },
  starEmoji: { fontSize: 21 },
  starLabel: { marginTop: 4, fontWeight: '700', textAlign: 'center' },

  heading: { marginTop: 34, alignItems: 'center' },
  title: {
    fontWeight: '900', textAlign: 'center', letterSpacing: 0.3,
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12,
  },
  subtitle: { textAlign: 'center', marginTop: 8, opacity: 0.85, fontWeight: '600', lineHeight: 20 },

  restList: { marginTop: 18, gap: 6, alignItems: 'center' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restEmoji: { fontSize: 14 },
  restTitle: { fontWeight: '700' },

  ctaWrap: { position: 'absolute', left: 24, right: 24 },
  ctaGradient: { height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  ctaText: { fontWeight: '900', letterSpacing: 0.3 },
});
