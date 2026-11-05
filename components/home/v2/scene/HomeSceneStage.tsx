// ═══════════════════════════════════════════════════════════════════════════
// HomeSceneStage.tsx — «Сцена» Главной: свет и глубина, текстовый следующий шаг.
//
// зачем (владелец 21.10 ~23:40: «ВАРИАНТ 1 СЦЕНА! ОТЛИЧНО, МНЕ ОЧЕНЬ НРАВИТСЯ!»; эталон docs/design/v2-app/home-new-concepts.html,
// раздел A, под замком 9e9e23b0b): сцена — градиент из токенов темы (homeSceneThemeTokens по эталону home-scene-states.html), свет
// в левом верхнем углу и текстовый следующий шаг; шапка (серия, монеты | энергия, колокол, аватар)
// лежит на сцене стеклом; внизу — место, крупный заголовок, строка прогресса, белая главная кнопка и стеклянные чипы.
// Вид — только из пропсов: что показывать, решают pickHomeSceneState и buildHomeSceneCopy. Перерисовка — по данным:
// обработчики берутся из ref (как у HomeV2ContinueCard), иначе каждый рендер Главной перерисовывал бы сцену.
// Движение: специальный текст входит мягко на UI-потоке, с «Уменьшить движение» — сразу; нажатие — 0.97.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { msSinceJsEntry } from '../../../../app/cold_start_entry_mark';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { PixelRatio, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import SceneBackdrop from '../../../scene/SceneBackdrop';
import SceneBlockShadow from '../../../scene/SceneBlockShadow';
import { isPremiumSceneTheme, sceneFrameToneHex, scenePaletteCached } from '../../../scene/scene_palette';
import { logSceneEdge, logSceneLayers, logSceneTheme } from './scene_theme_log';
import Animated, { Easing, FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { renderWindowEpoch, useRenderCause } from '../../../../app/render_cause_probe';
import { useScaledTextStyles } from '../../../../hooks/useLineScale';
import { useEnergyCountdown } from '../../../EnergyContext';
import V2Pressable from '../../../v2/V2Pressable';
import { colorWithAlpha } from '../../../v2/plateAlpha';
import { useTabPillTop } from '../../../../hooks/use-tab-content-bottom-pad';
import type { HomeSceneChipKind, HomeSceneCopy } from './home_scene_copy';
import { homeSceneStageHeight } from './home_scene_fit';
import { homeSceneWarmTone } from './home_scene_warm_tone';
import { useShadowGlass } from '../../../v2/ShadowSurface';
import type { HomeSceneState } from './home_scene_state';
import type { HomeSceneStageTokens } from './home_scene_tokens';
import { PremiumThemeMotion } from './PremiumThemeMotion';
import { useTheme } from '../../../ThemeContext';
import { useLang } from '../../../LangContext';
import LessonPrepCtaBody from '../../../lesson_prep/LessonPrepCtaBody';
// зачем (Темы 25.10, перепись цветов b5a22eebb): белые чернила, стекло и кнопка сцены — свет сцены, одинаковый во всех темах; живут в одном модуле (как SPIRE_SCENE_INK у Пика), замер контраста читает отсюда
import { HOME_SCENE_INK } from './home_scene_ink';
import KitProgressFill from '../../../KitProgressFill';

const LOG = '[HOME-SCENE]';
/** Доля экрана под сцену вместе со строкой статуса: владелец 22.10 выбрал вариант 2 scenes-compact.html — 392 из 844 (46 %). */
export const HOME_SCENE_SCREEN_SHARE = 392 / 844;
/** Длинный заголовок набирается кеглем 26/32, иначе на 360–390 он переносится в две строки. */
const TITLE_LONG_CHARS = 18;
/** Высота сцены варианта 2 на экране 844; на крупном шрифте сцена растёт, а не режет текст. */
export const HOME_SCENE_STAGE_MIN_HEIGHT = 280;
/** Панель «Сегодня» наезжает на сцену (вариант 2: −22). */
export const HOME_SCENE_PANEL_OVERLAP = 44; // зачем (слово владельца 29.10): край сцены заходит под карточку «Сегодня», под её заголовок (карточка поверх сцены)
/** Резерв под наложенную шапку внутри компактной сцены. */
const TOP_SPACE = 52;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/**
 * Особая сцена (владелец 25.10): текст входит один раз — 300 мс, снизу на 10, ease-out, на UI-потоке; «Уменьшить движение» — сразу.
 * зачем: особая сцена приходит, когда телефон дочитал свои данные, — смена текста видна как событие, а не как скачок.
 */
const PENDING_ENTER = FadeIn.duration(160).easing(EASE_OUT); // зачем (ТОП-20 №18, 05.11): заголовок появляется из скелета мягко; без скелета (кэш) анимации нет — первый кадр не замедляем
const SPECIAL_ENTER = FadeInDown.duration(300).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] });

export type HomeSceneChip = Readonly<{ kind: HomeSceneChipKind; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }>;

type Props = {
  state: HomeSceneState;
  evening: boolean;
  tokens: HomeSceneStageTokens;
  copy: HomeSceneCopy;
  /** Где живые минуты до энергии: в заголовке («нет энергии») или в тёплой строке (вечер при 0); null — нигде. */
  liveEnergy: 'title' | 'warm' | null;
  /** Текст с живыми минутами (null — минуты неизвестны). */
  buildLiveText: (minutes: number | null) => string;
  chips: readonly HomeSceneChip[];
  /** Место продолжения ещё читается с диска — та же геометрия, вместо текста заготовка (первый кадр = финальная геометрия). */
  pending: boolean;
  /** Занятие курса готовится — кнопка приглушена и помечена занятой. */
  busy: boolean;
  active: boolean;
  onCta: () => void;
  onChip: (kind: HomeSceneChipKind) => void;
  /** Высота зоны часов, если сцена рисуется от верха экрана: фон заходит под часы, раскладка отступает (0 — как раньше). */
  topInset?: number;
  /** Измеренная высота абсолютной шапки: Stage резервирует её, чтобы крупный системный текст не наложился на copy. */
  headerHeight?: number;
  /** Особая сцена (`состояние:ключ`); смена ключа — текст входит заново один раз. null — обычный герой. */
  specialKey?: string | null;
};

const HOME_STAGE_MODULE_AT = Date.now(); // [TOP-BAND]: отсчёт времени до первой раскладки сцены

export default function HomeSceneStage(props: Props) {
  const latestRef = useRef<Props>(props);
  latestRef.current = props;
  const cta = useCallback(() => latestRef.current.onCta(), []);
  const chip = useCallback((kind: HomeSceneChipKind) => latestRef.current.onChip(kind), []);
  const live = useCallback((minutes: number | null) => latestRef.current.buildLiveText(minutes), []);
  return <HomeSceneStageView {...props} onCta={cta} onChip={chip} buildLiveText={live} />;
}

const HomeSceneStageView = memo(function HomeSceneStageView({ state, evening, tokens, copy, liveEnergy, buildLiveText, chips, pending, busy, active, onCta, onChip, topInset = 0, headerHeight = 0, specialKey = null }: Props) {
  useRenderCause('home:scene', () => ({ state, evening, tokens, copy, liveEnergy, chips, pending, busy }), renderWindowEpoch()); // зачем: причина каждой перерисовки в окне 10 с, [HOME-RENDERS]; в релизе пустая функция
  const reduceMotion = useReducedMotion();
  const { lang } = useLang();
  const { liquidGlassThemeId, liquidGlassAppearance, isDark } = useTheme();
  const isPremium = isPremiumSceneTheme(liquidGlassThemeId);
  const s = useScaledTextStyles(baseStyles); // зачем (FONTSCALE2): межстрочный растёт вместе с системным шрифтом, иначе строки наезжают
  const { fontScale, height: windowH, width: windowW } = useWindowDimensions();
  const pillTop = useTabPillTop();
  // зачем (владелец кнопкой 22.10): огонёк серии — в оттенок текущей темы, не персиковый
  const warmTone = homeSceneWarmTone(useShadowGlass().accent).flame;
  // зачем (владелец 22.10, вариант 2): сцена — 46 % экрана вместе со строкой статуса
  // зачем (Сверка 22.10, «Фраза дня» уходила под таб-бар): сцена сжимается ровно настолько, чтобы вся Главная до «Фразы дня» была видна над капсулой (home_scene_fit); остальное не сжимается
  const sawPendingRef = useRef(false); // скелет реально показывали → при готовности заголовок проявляется
  if (pending) sawPendingRef.current = true;
  const firstLayoutLoggedRef = useRef(false); // [HOME-SCENE-FIRST]: первая раскладка сцены — одна строка
  const glowLoggedRef = useRef(false);
  const stageH = homeSceneStageHeight({ windowH, windowW, pillTop, fontScale, share: HOME_SCENE_SCREEN_SHARE });
  // Header начинается в координате сцены, а Stage уже добавляет topInset как padding.
  // Поэтому резервируем только часть измеренной шапки ниже safe area; 52dp остаётся baseline.
  const reservedTopSpace = Math.max(TOP_SPACE, headerHeight - topInset);
  // зачем (вердикт владельца 29.10, scenePalette; координатор: «палитра и звёзды — один раз на (тема, оформление, экран, размер), замер первого кадра в [SCENE-THEME]»):
  // цвет фона Главной — из единой функции; кэш модуля, поэтому на следующих кадрах/перерисовках расчёта нет. Размер — в px эталонной канвы (dp × PixelRatio).
  const dpr = PixelRatio.get();
  const scenePal = useMemo(() => {
    const t0 = Date.now();
    const pal = scenePaletteCached(liquidGlassThemeId, liquidGlassAppearance, 'home', windowW * dpr, stageH * dpr, dpr, evening); // вечер: «небо + тёплый край» (владелец 29.10), без красного и углей
    logSceneTheme('home:stage', liquidGlassThemeId, liquidGlassAppearance, 'scenePalette(' + pal.mode + ')', { mode: pal.mode, ms: Date.now() - t0, evening: evening ? 1 : 0, guard: JSON.stringify(pal.guard) });
    return pal;
  }, [liquidGlassThemeId, liquidGlassAppearance, windowW, stageH, dpr, evening]);
  // зачем (слово владельца 29.10, [SCENE-EDGE]): блок сцены Главной — высота, доля окна, нижний край (радиус 32, без плавного ухода в фон), источник палитры
  useEffect(() => {
    logSceneEdge('home', { sceneH: Math.round(stageH), sceneW: Math.round(windowW), windowH: Math.round(windowH), shareOfWindow: Math.round((stageH / windowH) * 100), bottomRadius: 28, fadeToBg: false, panelOverlap: HOME_SCENE_PANEL_OVERLAP, themeId: liquidGlassThemeId, appearance: liquidGlassAppearance, mode: scenePal.mode, source: isPremium ? 'premiumThemeVisualSpec' : 'scenePalette', evening });
    // зачем ([SCENE-SOURCE], слово владельца 29.10: «темы за достижения сломаны»; сперва логи): откуда сцена и иконки у темы сейчас
    console.log('[SCENE-SOURCE]', JSON.stringify({ screen: 'home', themeId: liquidGlassThemeId, appearance: liquidGlassAppearance, scene: isPremium ? 'premiumThemeVisualSpec(как 2.0.3)' : 'scenePalette', motion: isPremium ? 'PremiumThemeMotion' : 'none', stars: isPremium ? 'свои' : 'общие', art: 'off:approved_compact_upper' })); // guard-ok: одна строка на смену темы/оформления
  }, [stageH, windowW, windowH, liquidGlassThemeId, liquidGlassAppearance, scenePal.mode, evening, isPremium]);
  // Верхняя сцена одобрена без иллюстрации: остаются только фон, движение темы и текстовый слой.
  useEffect(() => {
    logSceneLayers('home', [
      { name: 'SceneBackdrop(' + scenePal.mode + ')', kind: 'paint', opacity: 1 }, { name: 'PremiumThemeMotion', kind: 'paint' },
      { name: 'body', kind: 'text' },
    ], { evening });
  }, [scenePal.mode, evening]);
  // зачем (Сверка home7, [HOME-FIT]): заголовок «Продолжим с эпизода 1» на 390 переносился на 2 строки (+42 dp) и уводил «Фразу дня» под панель; длинный заголовок — кегль 26/32 (как long у обложки Сезона), первый кадр без измерения, без ужатия
  const titleStyle = copy.title.length > TITLE_LONG_CHARS ? s.titleLong : s.title;
  const pressCta = () => {
    if (pending) { console.warn(LOG, 'cta:ignored', JSON.stringify({ reason: 'pending_skeleton', state })); return; } // guard-ok: ранний выход называет причину
    if (busy) { console.warn(LOG, 'cta:ignored', JSON.stringify({ reason: 'busy_launching', state })); return; } // guard-ok
    console.log(LOG, 'cta', JSON.stringify({ state, label: copy.cta })); // guard-ok: одна строка на тап
    onCta();
  };
  return (
    // зачем (владелец 22.10: «ВЕРХНЯЯ СЕЙФ-ЗОНА ВСЕГДА ЧАСТЬ ОБЩЕЙ КОМПОЗИЦИИ»): градиент и свет сцены — от верха экрана, под часами;
    // высота сцены считается от верха экрана, как в эталоне (.a-stage 540 вместе со строкой статуса), раскладка отступает на зону часов
    <SceneBlockShadow tone={isPremium ? tokens.sceneBottom : sceneFrameToneHex(scenePal)} flat>
    <View
      testID="home-scene-stage"
      style={[s.stage, { minHeight: stageH }, topInset > 0 ? { paddingTop: topInset } : null]}
      onLayout={(e) => {
        // зачем (Сверка home5, «Фраза дня» срезана на 390): цифры вместо догадки — расчётная и фактическая высота сцены, окно, верх капсулы; временно, [HOME-FIT]
        console.log('[HOME-FIT]', JSON.stringify({ planned: stageH, actual: Math.round(e.nativeEvent.layout.height), headerHeight: Math.round(headerHeight), reservedTopSpace: Math.round(reservedTopSpace), windowH, windowW, pillTop, fontScale, title: copy.title })); // guard-ok: одна строка на смену высоты
        // зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10, «верх цельный»; координатор: полоса у владельца на Главной в 7:56 — первый кадр или возврат на вкладку?): когда сцена встала,
        // от какой высоты экрана она красит верх, каким цветом и готова ли (pending — скелет). Мс — от загрузки модуля сцены.
        // зачем (координатор 25.10, 2.0.3: «фон без пустоты на холодном старте»; сперва логи): когда сцена впервые встала и чем нарисован её фон
        if (!firstLayoutLoggedRef.current) { firstLayoutLoggedRef.current = true; console.log('[HOME-SCENE-FIRST]', JSON.stringify({ at: 'stage_first_layout', msSinceJsEntry: msSinceJsEntry(), source: 'native_gradient', sceneReady: !pending, state, sceneTop: tokens.sceneTop })); } // guard-ok: одна строка на монтирование
        console.log('[TOP-BAND]', JSON.stringify({ at: 'home_scene_stage_layout', msSinceModule: Math.round(Date.now() - HOME_STAGE_MODULE_AT), sceneReady: !pending, state, topInset: Math.round(topInset), y: Math.round(e.nativeEvent.layout.y), sceneTop: tokens.sceneTop })); // guard-ok: одна строка на смену раскладки
      }}
    >
      {/* зачем (вердикт владельца 29.10, scenePalette): фон Главной — утверждённая сцена; тёмное «Глубокое небо», светлое «А»; вечер — «Небо + тёплый край» (справа внизу тёплый отсвет оттенка темы, без красного света и углей) */}
      {/* зачем (слово владельца 29.10: «темы за достижения сломаны, там были свои уникальные сцены, не надо было трогать»): у 6 тем за награды фон сцены свой — градиент из premiumThemeVisualSpec и свет края, как на da0a435e3; общего неба и звёзд у них нет */}
      {isPremium ? <LinearGradient colors={[tokens.sceneTop, tokens.sceneBottom]} start={{ x: 0.22, y: 0 }} end={{ x: 0.78, y: 1 }} style={StyleSheet.absoluteFill} /> : <SceneBackdrop palette={scenePal} idPrefix="homeSc" active={active} />}
      <PremiumThemeMotion themeId={liquidGlassThemeId} isLight={!isDark} width={windowW} height={stageH} />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" onLayout={() => { if (!glowLoggedRef.current) { glowLoggedRef.current = true; console.log('[HOME-SCENE-FIRST]', JSON.stringify({ at: 'glow_first_layout', msSinceJsEntry: msSinceJsEntry(), source: 'svg_glow' })); } /* guard-ok: одна строка на монтирование */ }}>
        <Defs>
          {isPremium ? (
            <RadialGradient id="sceneLight" cx={evening ? '82%' : '18%'} cy="0%" rx="70%" ry="50%" fx={evening ? '82%' : '18%'} fy="0%">
              <Stop offset="0" stopColor={evening ? tokens.eveningGlow : tokens.sceneGlow} stopOpacity="1" />
              <Stop offset="1" stopColor={evening ? tokens.eveningGlow : tokens.sceneGlow} stopOpacity="0" />
            </RadialGradient>
          ) : null}
          {/* слово владельца 29.10: «убрать какие-то свечения вокруг иконки» — ореола вокруг героя нет */}
        </Defs>
        {/* зачем (Темы 25.10, season-home-contrast): при крупном шрифте герой уходит в свободное место над текстом — ореол уходит вместе с ним, иначе светлое пятно остаётся под надзаголовком */}
        {isPremium ? <Rect x="0" y="0" width="100%" height="100%" fill="url(#sceneLight)" /> : null}
      </Svg>
      {/* зачем (эталон: у тёмной сцены затемнения низа нет — иначе стык с карточками сливается; шов ≥ 1,34) */}
      <View style={[s.topSpace, { height: reservedTopSpace }]} />
      <View style={s.body}>
        {pending ? (
          <>
            <View style={[s.skel, { width: 150, height: 14 }]} />
            <View style={[s.skel, { width: '72%', height: 30, marginTop: 10 }]} />
            <View style={[s.skel, { width: 120, height: 12, marginTop: 14 }]} />
          </>
        ) : (
          <Animated.View key={specialKey ?? 'base'} entering={reduceMotion ? undefined : specialKey ? SPECIAL_ENTER : sawPendingRef.current ? PENDING_ENTER : undefined}>
            {/* зачем (Темы 25.10, home-scene-special-contrast + season-home-contrast: надзаголовок 86 % при крупном шрифте — 20/58 у особых и 25/58 у обычных сцен ниже 4,5): надзаголовок белый 100 % у ВСЕХ сцен */}
            {copy.kicker ? <Text testID="home-scene-kicker" style={s.kicker}>{copy.kicker}</Text> : null}
            {liveEnergy === 'title'
              ? <LiveEnergyText testID="home-scene-title" header build={buildLiveText} style={titleStyle} />
              : <Text testID="home-scene-title" accessibilityRole="header" style={titleStyle}>{copy.title}</Text>}
            {copy.warm ? (
              <View style={s.warmRow}>
                <Ionicons name="flame" size={16} color={warmTone} />
                {liveEnergy === 'warm' ? <LiveEnergyText testID="home-scene-warm" build={buildLiveText} style={[s.warm, { color: warmTone }]} /> : <Text style={[s.warm, { color: warmTone }]}>{copy.warm}</Text>}
              </View>
            ) : null}
            {copy.line ? (
              <View style={s.lineRow}>
                {copy.bar !== null ? <View style={s.bar}><KitProgressFill ratio={copy.bar} style={s.barFill} /></View> : null}
                <Text style={s.line}>{copy.line}</Text>
              </View>
            ) : null}
          </Animated.View>
        )}
        {copy.cta ? (
          <V2Pressable
            testID="home-scene-cta"
            accessibilityRole="button"
            accessibilityLabel={pending ? copy.cta : `${copy.cta}: ${copy.title}`}
            accessibilityState={{ busy: pending || busy }}
            onPress={pressCta}
            scaleTo={0.97}
            style={s.cta}
          >
            {/* зачем (живой макет lesson-preparing-live.html, владелец 25.10): обычно занятие уже собрано — кнопка не меняется; в крайнем случае (> 0,35 с) кольцо хода, «Готовим занятие…», мягкая заливка. Прежнее приглушение до 72 % убрано */}
            <LessonPrepCtaBody source="home" lang={lang} label={copy.cta} ink={CTA_INK} fillColor={CTA_PREP_FILL} idleIcon={<Ionicons name="play" size={18} color={CTA_INK} />} labelStyle={s.ctaText} testID="home-scene-cta-prep" />
          </V2Pressable>
        ) : null}
        {chips.length > 0 ? (
          <View style={s.chips}>
            {chips.map((c) => (
              <V2Pressable key={c.kind} testID={`home-scene-chip-${c.kind}`} accessibilityRole="button" accessibilityLabel={c.label}
                onPress={() => { console.log(LOG, 'chip', JSON.stringify({ state, kind: c.kind })); onChip(c.kind); }} scaleTo={0.96} style={s.chip}>{/* guard-ok: одна строка на тап */}
                <Ionicons name={c.icon} size={16} color={HOME_SCENE_INK.text} />
                <Text style={s.chipText}>{c.label}</Text>
              </V2Pressable>
            ))}
          </View>
        ) : null}
        {copy.note ? <Text style={s.note}>{copy.note}</Text> : null}
      </View>
    </View>
    </SceneBlockShadow>
  );
});

/**
 * Живые минуты до энергии. зачем: таймер энергии тикает раз в секунду — подписан только этот текст, сцена не перерисовывается.
 */
function LiveEnergyText({ build, style, testID, header = false }: Readonly<{ build: (minutes: number | null) => string; style: object; testID: string; header?: boolean }>) {
  const { timeUntilNextMs } = useEnergyCountdown({ visible: true });
  const minutes = timeUntilNextMs > 0 ? Math.max(1, Math.ceil(timeUntilNextMs / 60000)) : null;
  return <Text testID={testID} accessibilityRole={header ? 'header' : undefined} style={style}>{build(minutes)}</Text>;
}

/** Тень текста сцены на фоне палитры (тон — чёрный, мягко). */
const TEXT_OVER_HERO_SHADOW = { textShadowColor: 'rgba(0,0,0,0.38)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } } as const; // theme-exempt: тень текста сцены

const baseStyles = StyleSheet.create({
  // зачем: сцена во всю ширину экрана, скругление только снизу — как .a-stage (0 0 36 36)
  stage: { minHeight: HOME_SCENE_STAGE_MIN_HEIGHT, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', justifyContent: 'space-between' },
  // зачем: место под шапку — сама шапка лежит поверх сцены из контейнера HomeScene
  topSpace: { height: TOP_SPACE },
  // зачем: текст сцены у нижнего края (.a-body bottom 58) — место под панель «Сегодня», которая наезжает на 38
  body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 44 },
  // зачем (D145, владелец: шрифты 16/13 главнее макета): подписи сцены — 13/17, крупные строки и кнопка — 16/21
  kicker: { color: HOME_SCENE_INK.kicker, fontSize: 13, lineHeight: 17, ...TEXT_OVER_HERO_SHADOW },
  title: { color: HOME_SCENE_INK.text, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6, marginTop: 4, ...TEXT_OVER_HERO_SHADOW },
  titleLong: { color: HOME_SCENE_INK.text, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5, marginTop: 4, ...TEXT_OVER_HERO_SHADOW },
  warmRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  warm: { fontSize: 16, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  bar: { width: 72, height: 4, borderRadius: 2, backgroundColor: HOME_SCENE_INK.barTrack, overflow: 'hidden' },
  barFill: { backgroundColor: HOME_SCENE_INK.text }, // зачем (ТОП-20 №4, 05.11): заливка едет через KitProgressFill (transform, 800 мс), высота — у трека
  line: { color: HOME_SCENE_INK.line, fontSize: 13, lineHeight: 17, flexShrink: 1, fontVariant: ['tabular-nums'], ...TEXT_OVER_HERO_SHADOW },
  cta: { marginTop: 16, minHeight: 50, paddingVertical: 8, borderRadius: 25, backgroundColor: HOME_SCENE_INK.cta, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 22, overflow: 'hidden' },
  ctaText: { color: HOME_SCENE_INK.ctaInk, fontSize: 16, lineHeight: 21, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { minHeight: 34, paddingVertical: 4, maxWidth: '100%', borderRadius: 17, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: HOME_SCENE_INK.glass }, // аудит контраста 22.10: чип 14 % вместо 16 % — текст на нём ≥ 4,5 в светлых sage/grad_aurora
  chipText: { color: HOME_SCENE_INK.text, fontSize: 16, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  note: { color: HOME_SCENE_INK.note, fontSize: 13, lineHeight: 17, marginTop: 12 },
  skel: { borderRadius: 8, backgroundColor: HOME_SCENE_INK.skeleton },
});

// зачем (ратчет цветовых литералов, Ревизор 25.10): тёмный текст на белой кнопке сцены задан ОДИН раз — в ctaText; значок и мягкая заливка хода «Готовим занятие…» берут тот же цвет оттуда, а не новыми литералами
const CTA_INK = String(StyleSheet.flatten(baseStyles.ctaText).color); // baseStyles — модульный; `s` живёт только внутри компонента (падение сцены 25.10)
const CTA_PREP_FILL = colorWithAlpha(CTA_INK, 0.09);
