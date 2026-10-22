// ═══════════════════════════════════════════════════════════════════════════
// HomeScene.tsx — «Сцена» Главной целиком: выбор героя, тексты, картинка, цвета; шапка и «Нет сети» — поверх сцены.
//
// зачем (владелец 21.10 ~23:40: «ВАРИАНТ 1 СЦЕНА! ОТЛИЧНО, МНЕ ОЧЕНЬ НРАВИТСЯ!»; эталон docs/design/v2-app/home-new-concepts.html,
// раздел A; состояния и приоритеты — home-scene-states.html, одобрено владельцем): заменяет на Главной шапку и карточку
// «Продолжить». Главная передаёт только то, что уже знает (серия, состояние дня, энергия из памяти, Plus, место продолжения,
// прогресс урока); дата последнего засчитанного дня и серия — из личного прогресса на телефоне. Новых чтений базы нет.
// Шапка — прежняя HomeV2Header в тоне сцены, кладётся поверх запомненной сцены: новый элемент шапки на каждый рендер Главной
// не перерисовывает фон, героя и текст. Журнал [HOME-SCENE]: решение с причиной, картинка и её источник.
// «Экзамен главы ждёт» выключен: экзамена в приложении ещё нет (координатор 22.10).
// Две части (координатор 22.10, dev-вход «Сверки»): HomeScene собирает факты телефона и зовёт pickHomeSceneState, HomeSceneView
// рисует по готовому решению. /dev_home_scene_preview берёт факты из моков, решение — та же функция, вид — тот же HomeSceneView.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePersonalProgressSnapshot } from '../../../../app/personal_progress_store';
import type { Lang } from '../../../../constants/i18n';
import { V2 } from '../../../../constants/v2Style';
import { useTheme } from '../../../ThemeContext';
import type { ThemedArtBrightness } from '../../../theme/themed_art_registry';
import HomeSceneStage, { HOME_SCENE_PANEL_OVERLAP, type HomeSceneChip } from './HomeSceneStage';
import { resolveHomeSceneArt } from './home_scene_art';
import { buildHomeSceneCopy, homeSceneChipLabel, homeSceneOfflineLine, type HomeSceneChipKind, type HomeSceneCopyInput } from './home_scene_copy';
import { homeSceneAllReleasedDone, homeSceneDaysSince, homeSceneLastActivityDay, homeSceneStreakLost } from './home_scene_inputs';
import { minutesUntilMidnight, pickHomeSceneState, type HomeSceneDecision } from './home_scene_state';
import { homeSceneTokensForTheme, type HomeSceneStageTokens } from './home_scene_tokens';
import { setHomeSceneStatusTint } from './home_scene_status_tint';
import { useHomeSceneOffline } from './use_home_scene_offline';
import { useTabTopBleedInset } from '../../../tab_top_bleed';

const LOG = '[HOME-SCENE]';
/** Верх шапки внутри сцены — под зоной часов (s.top paddingTop). */
const HEADER_TOP = 8;

/**
 * зачем (координатор 22.10): «Сцена» на Главной — в dev-сборке да, в релизе нет, пока владелец не посмотрит её на эмуляторе.
 * В релиз — заменить на true; совсем выключить — false (Главная рисует прежние шапку и карточку «Продолжить»).
 */
export { HOME_SCENE_V2_ENABLED } from './home_scene_flag';
/** зачем (координатор 22.10): чип «Слова» прячем, пока словарь не подключён к «Урокам»; включается этой строкой. */
export const HOME_SCENE_WORDS_CHIP_ENABLED = false;

const CHIP_ICON: Readonly<Record<HomeSceneChipKind, HomeSceneChip['icon']>> = {
  words: 'albums-outline',
  theory: 'book-outline',
  cards: 'copy-outline',
  phrase: 'chatbubble-ellipses-outline',
  video: 'play-circle-outline',
  review: 'copy-outline',
};

/** День, когда «серия прервалась» уже показали (первый вход за день; в памяти процесса). */
let streakLostShownDay: string | null = null;
const dayKeyOf = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Проверка выпуска эпизодов курса — лениво, только когда урок пройден целиком (первый кадр не платит за модуль). */
const isSessionReleased = (lessonOrdinal: number, sessionOrdinal: number): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isLearningV2SessionReleasedV1 } = require('../../../../app/learning_v2_session_availability_v1') as typeof import('../../../../app/learning_v2_session_availability_v1');
  return isLearningV2SessionReleasedV1(lessonOrdinal, sessionOrdinal);
};

/** Место продолжения — то же, что показывала карточка «Продолжить». */
export type HomeScenePlace = Readonly<{
  badge: string | null;
  episode: number | null;
  title: string;
  done: number | null;
  total: number | null;
  /** Номер урока для чипов «Слова» и «Теория»; null — чипов урока нет. */
  theoryLessonId: number | null;
}>;

type Props = Readonly<{
  lang: Lang;
  /** HomeV2Header с tone="scene"; surface — верхний цвет сцены (под значком ◆ кольца Plus). */
  header: (surface: string) => React.ReactNode;
  artTone: ThemedArtBrightness;
  /**
   * Прежний вход цветов сцены. зачем оставлен: Главная ещё передаёт его (app/(tabs)/home.tsx занят чужими правками); с 22.10 цвета —
   * из токенов выбранной темы по эталону home-scene-states.html (useHomeSceneStageTokens). Убрать вместе с правкой Главной.
   */
  accent?: string;
  streakDays: number;
  streakToday: 'unknown' | 'counted' | 'pending';
  plus: boolean;
  /** Энергия из памяти (peekEnergy); null — не известна. */
  energy: number | null;
  /** false — ни одного места продолжения (новичок); null — ещё читается. */
  hasProgress: boolean | null;
  place: HomeScenePlace;
  /** Прогресс урока продолжения: пройдено / выпущено (для «всё пройдено»). */
  courseProgress: Readonly<{ lessonOrdinal: number; done: number; total: number }> | null;
  pending: boolean;
  busy: boolean;
  /** Главная на экране и приложение активно. */
  active: boolean;
  onContinue: () => void;
  onChip: (kind: HomeSceneChipKind) => void;
}>;

export default function HomeScene(p: Props) {
  // зачем (владелец 22.10: «верхняя сейф-зона всегда часть общей композиции»): страница Главной полноэкранная — сцена от верха экрана
  const topInset = useTabTopBleedInset();
  const offline = useHomeSceneOffline(p.active);
  const personal = usePersonalProgressSnapshot();
  const now = new Date();
  const hour = now.getHours();
  const todayKey = dayKeyOf(now);
  const dayCounted = p.streakToday === 'unknown' ? null : p.streakToday === 'counted';
  const lastDay = homeSceneLastActivityDay(personal.activityDates);
  const daysAway = homeSceneDaysSince(lastDay, now);
  const lostCandidate = homeSceneStreakLost({ daysAway, streakCount: personal.streakCount, plus: p.plus });
  // зачем (таблица: «серия прервалась» — только в первый вход за день): снимок «первый ли вход сегодня» берётся при монтировании,
  // отметка ставится после показа — повторный монтаж в тот же день покажет «Продолжить»
  const firstEntryToday = useRef(streakLostShownDay !== todayKey);
  const streakLostToday = lostCandidate && firstEntryToday.current;
  useEffect(() => { if (streakLostToday) streakLostShownDay = todayKey; }, [streakLostToday, todayKey]);
  const allReleasedDone = useMemo(() => homeSceneAllReleasedDone(p.courseProgress, isSessionReleased), [p.courseProgress]);
  const decision = useMemo(() => pickHomeSceneState({
    hasProgress: p.hasProgress, hour, streakDays: p.streakDays, dayCounted, plus: p.plus, energy: p.energy, daysAway,
    streakLostToday, chapterExamReady: false, allReleasedDone, offline,
  }), [p.hasProgress, hour, p.streakDays, dayCounted, p.plus, p.energy, daysAway, streakLostToday, allReleasedDone, offline]);
  const logKeyRef = useRef('');
  useEffect(() => {
    const key = `${decision.state}|${decision.reason}|${String(decision.offlineLine)}|${String(decision.zeroEnergyNote)}`;
    if (logKeyRef.current === key) return;
    logKeyRef.current = key;
    console.log(LOG, 'decision', JSON.stringify({ state: decision.state, reason: decision.reason, offlineLine: decision.offlineLine, zeroEnergyNote: decision.zeroEnergyNote, offline, streakToday: p.streakToday, energy: p.energy, plus: p.plus, lastDay, daysAway, streakCount: personal.streakCount, streakLostToday, allReleasedDone, course: p.courseProgress, examReady: 'off:no_exam_yet' })); // guard-ok: одна строка на смену решения
  }, [decision, offline, p.energy, p.plus, p.streakToday, lastDay, daysAway, personal.streakCount, streakLostToday, allReleasedDone, p.courseProgress]);
  return (
    <HomeSceneView
      lang={p.lang}
      header={p.header}
      artTone={p.artTone}
      decision={decision}
      streakDays={p.streakDays}
      daysAway={daysAway}
      lostStreakDays={streakLostToday ? personal.streakCount : null}
      place={p.place}
      pending={p.pending}
      busy={p.busy}
      active={p.active}
      statusTint
      topInset={topInset}
      onContinue={p.onContinue}
      onChip={p.onChip}
    />
  );
}

export type HomeSceneViewProps = Readonly<{
  lang: Lang;
  header: (surface: string) => React.ReactNode;
  artTone: ThemedArtBrightness;
  /** Решение pickHomeSceneState — у Главной из фактов телефона, у dev-входа из моков. */
  decision: HomeSceneDecision;
  streakDays: number;
  /** Дней без занятий («Тебя не было N дней»); null — неизвестно. */
  daysAway: number | null;
  /** «Было N дней» у «серия прервалась»; null — строки нет. */
  lostStreakDays: number | null;
  /** Минуты до полуночи; не задано — по часам телефона (dev-вход задаёт число, чтобы кадр совпадал с эталоном). */
  minutesToMidnight?: number;
  /** Минуты до энергии; не задано — живой таймер энергии (dev-вход задаёт число). */
  energyMinutes?: number;
  place: HomeScenePlace;
  pending: boolean;
  busy: boolean;
  active: boolean;
  /** Красить полосу под часами над Главной: только настоящая Главная; dev-вход полосу Главной не трогает. */
  statusTint: boolean;
  /**
   * Высота зоны часов, если сцена рисуется от самого верха экрана (полноэкранная страница Главной, TabTopBleedContext); 0 — сцена
   * начинается под отступом. Фон сцены заходит под часы, шапка и содержимое отступают на это значение.
   */
  topInset?: number;
  onContinue: () => void;
  onChip: (kind: HomeSceneChipKind) => void;
}>;

/**
 * Цвета «Сцены» выбранной темы по эталону home-scene-states.html (под замком): всегда токены уровня «Максимум» в оформлении темы
 * (владелец 22.10 — сцена всегда как эталон, ползунок её не меняет); dev-вход берёт те же цвета для полосы под часами.
 */
export function useHomeSceneStageTokens(evening: boolean): HomeSceneStageTokens {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  return useMemo(() => homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance, evening), [liquidGlassThemeId, liquidGlassAppearance, evening]);
}

/** «Сцена» по готовому решению: цвета, картинка, тексты, шапка и строка «Нет сети» поверх. */
export function HomeSceneView(p: HomeSceneViewProps) {
  const { decision } = p;
  const [minuteTick, setMinuteTick] = useState(0);
  const evening = decision.state === 'streak_risk';
  const fixedClock = p.minutesToMidnight !== undefined;
  // зачем: «До полуночи 2 ч 20 мин» не стоит на месте, пока Главная открыта — раз в минуту, только вечером и только на экране
  useEffect(() => {
    if (!evening || !p.active || fixedClock) return undefined;
    const timer = setInterval(() => setMinuteTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, [evening, p.active, fixedClock]);
  const toMidnight = p.minutesToMidnight ?? minutesUntilMidnight(new Date());
  const tokens = useHomeSceneStageTokens(evening);
  const topInset = p.topInset ?? 0;
  // зачем (координатор 22.10): верхний цвет сцены — полосе под часами над Главной (HomeSceneStatusStrip в оболочке вкладок); сцены нет — полосы нет
  useEffect(() => {
    if (!p.statusTint) return undefined;
    setHomeSceneStatusTint(tokens.sceneTop);
    return () => setHomeSceneStatusTint(null);
  }, [tokens.sceneTop, p.statusTint]);
  const art = useMemo(() => resolveHomeSceneArt(decision.state, p.artTone), [decision.state, p.artTone]);
  useEffect(() => {
    console.log(LOG, 'art', JSON.stringify({ state: decision.state, name: art.name, origin: art.origin, tone: p.artTone, hasBase: art.base !== null, whiteContrastTop: Number(tokens.whiteContrastTop.toFixed(2)), seam: Number(tokens.seam.toFixed(2)), scrim: tokens.scrim })); // guard-ok: одна строка на смену героя
  }, [art, decision.state, p.artTone, tokens.whiteContrastTop, tokens.seam, tokens.scrim]);
  const copyInput = useMemo<HomeSceneCopyInput>(() => ({
    lang: p.lang, state: decision.state, zeroEnergyNote: decision.zeroEnergyNote, badge: p.place.badge, episode: p.place.episode, title: p.place.title,
    progress: p.place.done !== null && p.place.total !== null ? { done: p.place.done, total: p.place.total } : null,
    streakDays: p.streakDays, minutesToMidnight: toMidnight, daysAway: p.daysAway, energyMinutes: null,
    theoryAvailable: p.place.theoryLessonId !== null, wordsAvailable: HOME_SCENE_WORDS_CHIP_ENABLED && p.place.theoryLessonId !== null,
    lostStreakDays: p.lostStreakDays,
  // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: minuteTick и toMidnight меняют только вечерний текст раз в минуту
  }), [p.lang, decision.state, decision.zeroEnergyNote, p.place.badge, p.place.episode, p.place.title, p.place.done, p.place.total, p.place.theoryLessonId, p.streakDays, p.daysAway, p.lostStreakDays, evening ? toMidnight : 0, minuteTick]);
  const copy = useMemo(() => buildHomeSceneCopy(copyInput), [copyInput]);
  const liveEnergy = decision.state === 'no_energy' ? 'title' : evening && decision.zeroEnergyNote ? 'warm' : null;
  const fixedEnergyMinutes = p.energyMinutes;
  const buildLiveText = useCallback((minutes: number | null) => {
    const live = buildHomeSceneCopy({ ...copyInput, energyMinutes: fixedEnergyMinutes ?? minutes });
    return liveEnergy === 'title' ? live.title : (live.warm ?? '');
  }, [copyInput, liveEnergy, fixedEnergyMinutes]);
  const chips = useMemo<readonly HomeSceneChip[]>(() => copy.chips.map((kind) => ({ kind, label: homeSceneChipLabel(p.lang, kind), icon: CHIP_ICON[kind] })), [copy.chips, p.lang]);
  const offlineLine = useMemo(() => (decision.offlineLine ? homeSceneOfflineLine(p.lang) : null), [decision.offlineLine, p.lang]);
  // зачем (владелец 22.10 «полоса другого цвета в сейф-зоне»): факт — где по экрану начинается сцена и какой у неё верхний цвет;
  // сравнивается с [SAFE-TOP] status_strip (высота зоны часов и цвет полосы над ней).
  const rootRef = useRef<View>(null);
  const handleRootLayout = useCallback(() => {
    rootRef.current?.measureInWindow((x, y, width, height) => {
      console.log('[SAFE-TOP]', JSON.stringify({ at: 'home_scene', state: decision.state, windowY: Math.round(y), windowX: Math.round(x), width: Math.round(width), height: Math.round(height), sceneTop: tokens.sceneTop, statusTint: p.statusTint, topInset })); // guard-ok: одна строка на раскладку сцены
    });
  }, [decision.state, tokens.sceneTop, p.statusTint, topInset]);
  return (
    <View ref={rootRef} onLayout={handleRootLayout} testID={`home-scene-${decision.state}`} style={s.root}>
      <HomeSceneStage
        state={decision.state}
        evening={evening}
        tokens={tokens}
        copy={copy}
        liveEnergy={liveEnergy}
        buildLiveText={buildLiveText}
        chips={chips}
        art={art.base}
        artAccent={art.accent}
        // зачем: приглушаем только заглушку — своя картинка «0 энергии» (батарейка) сама говорит о состоянии
        artDim={decision.state === 'no_energy' && art.origin.startsWith('placeholder')}
        pending={p.pending}
        busy={p.busy}
        onCta={p.onContinue}
        onChip={p.onChip}
        topInset={topInset}
      />
      {/* зачем (владелец 22.10): фон сцены заходит под часы, шапка — ниже зоны часов на прежние 12 */}
      <View style={[s.top, topInset > 0 ? { paddingTop: HEADER_TOP + topInset } : null]} pointerEvents="box-none">
        {p.header(tokens.sceneTop)}
        {offlineLine ? (
          <View testID="home-scene-offline" style={s.offline} accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={18} color="#FFFFFF" />
            <Text style={s.offlineText}><Text style={s.offlineBold}>{offlineLine.bold}</Text> {offlineLine.rest}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // зачем: сцена во всю ширину — гасим боковой отступ ленты Главной (V2.homePad)
  // зачем (владелец 22.10, вариант 2 scenes-compact.html): карточка «Сегодня» наезжает на низ сцены на 22 (зазор ленты Главной гасим)
  root: { marginHorizontal: -V2.homePad, marginBottom: -(HOME_SCENE_PANEL_OVERLAP + V2.gap) },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingTop: 8, paddingHorizontal: 20, gap: 10 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.14)' }, // аудит контраста 22.10: 14 % вместо 16 % — «Нет сети» ≥ 4,5 в светлых sage/grad_aurora
  // зачем (D145): строка «Нет сети» — шкала 13/17
  offlineText: { flex: 1, color: '#FFFFFF', fontSize: 13, lineHeight: 17 },
  offlineBold: { fontWeight: '700' },
});
