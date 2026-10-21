// ═══════════════════════════════════════════════════════════════════════════
// HomeScene.tsx — «Сцена» Главной целиком: выбор героя, тексты, картинка, цвета; шапка и «Нет сети» — поверх сцены.
//
// зачем (владелец 21.10 ~23:40: «ВАРИАНТ 1 СЦЕНА! ОТЛИЧНО, МНЕ ОЧЕНЬ НРАВИТСЯ!»; эталон docs/design/v2-app/home-new-concepts.html,
// раздел A; состояния и приоритеты — home-scene-states.html): заменяет на Главной шапку и карточку «Продолжить». Главная
// передаёт только то, что уже знает (серия, состояние дня, энергия из памяти, Plus, «С возвращением», место продолжения) —
// новых чтений базы нет. Шапка — прежняя HomeV2Header в тоне сцены, кладётся поверх запомненной сцены: новый элемент шапки
// на каждый рендер Главной не перерисовывает фон, героя и текст. Журнал [HOME-SCENE]: решение с причиной, картинка и её источник.
// Источники «серия прервалась», «экзамен главы ждёт», «всё пройдено» ещё не подключены — вход false, это пишется в журнал.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Lang } from '../../../../constants/i18n';
import { V2 } from '../../../../constants/v2Style';
import type { ThemedArtBrightness } from '../../../theme/themed_art_registry';
import HomeSceneStage, { type HomeSceneChip } from './HomeSceneStage';
import { resolveHomeSceneArt } from './home_scene_art';
import { buildHomeSceneCopy, homeSceneChipLabel, homeSceneOfflineLine, type HomeSceneChipKind, type HomeSceneCopyInput } from './home_scene_copy';
import { minutesUntilMidnight, pickHomeSceneState } from './home_scene_state';
import { homeSceneTokens } from './home_scene_tokens';
import { useHomeSceneOffline } from './use_home_scene_offline';

const LOG = '[HOME-SCENE]';

/** Откат одной строкой: false — Главная рисует прежние шапку и карточку «Продолжить». */
export const HOME_SCENE_ENABLED = true;

const CHIP_ICON: Readonly<Record<HomeSceneChipKind, HomeSceneChip['icon']>> = {
  theory: 'book-outline',
  cards: 'copy-outline',
  phrase: 'chatbubble-ellipses-outline',
  video: 'play-circle-outline',
  review: 'copy-outline',
};

/** Место продолжения — то же, что показывала карточка «Продолжить». */
export type HomeScenePlace = Readonly<{
  badge: string | null;
  episode: number | null;
  title: string;
  done: number | null;
  total: number | null;
  /** Номер урока для чипа «Теория»; null — чипа нет. */
  theoryLessonId: number | null;
}>;

type Props = Readonly<{
  lang: Lang;
  /** HomeV2Header с tone="scene". */
  header: React.ReactNode;
  artTone: ThemedArtBrightness;
  /** Акцент темы — из него цвета сцены (home_scene_tokens). */
  accent: string;
  streakDays: number;
  streakToday: 'unknown' | 'counted' | 'pending';
  plus: boolean;
  /** Энергия из памяти (peekEnergy); null — не известна. */
  energy: number | null;
  /** Дней отсутствия из решения «С возвращением»; null — не было. */
  awayDays: number | null;
  /** false — ни одного места продолжения (новичок); null — ещё читается. */
  hasProgress: boolean | null;
  place: HomeScenePlace;
  pending: boolean;
  busy: boolean;
  /** Главная на экране и приложение активно. */
  active: boolean;
  onContinue: () => void;
  onChip: (kind: HomeSceneChipKind) => void;
}>;

export default function HomeScene(p: Props) {
  const offline = useHomeSceneOffline(p.active);
  const [minuteTick, setMinuteTick] = useState(0);
  const now = new Date();
  const hour = now.getHours();
  const dayCounted = p.streakToday === 'unknown' ? null : p.streakToday === 'counted';
  const decision = useMemo(() => pickHomeSceneState({
    hasProgress: p.hasProgress, hour, streakDays: p.streakDays, dayCounted, plus: p.plus, energy: p.energy, daysAway: p.awayDays,
    // зачем (packet home-scene-implementation): источники ещё не подключены без новых чтений — вход false, причина в журнале ниже
    streakLostToday: false, chapterExamReady: false, allReleasedDone: false, offline,
  }), [p.hasProgress, hour, p.streakDays, dayCounted, p.plus, p.energy, p.awayDays, offline]);
  const evening = decision.state === 'streak_risk';
  // зачем: «До полуночи 2 ч 20 мин» не стоит на месте, пока Главная открыта — раз в минуту, только вечером и только на экране
  useEffect(() => {
    if (!evening || !p.active) return undefined;
    const timer = setInterval(() => setMinuteTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, [evening, p.active]);
  const toMidnight = minutesUntilMidnight(now);
  const logKeyRef = useRef('');
  useEffect(() => {
    const key = `${decision.state}|${decision.reason}|${String(decision.offlineLine)}|${String(decision.zeroEnergyNote)}`;
    if (logKeyRef.current === key) return;
    logKeyRef.current = key;
    console.log(LOG, 'decision', JSON.stringify({ state: decision.state, reason: decision.reason, offlineLine: decision.offlineLine, zeroEnergyNote: decision.zeroEnergyNote, offline, streakToday: p.streakToday, energy: p.energy, plus: p.plus, awayDays: p.awayDays, unwired: 'streakLostToday,chapterExamReady,allReleasedDone' })); // guard-ok: одна строка на смену решения
  }, [decision, offline, p.awayDays, p.energy, p.plus, p.streakToday]);
  const tokens = useMemo(() => homeSceneTokens(p.accent, evening), [p.accent, evening]);
  const art = useMemo(() => resolveHomeSceneArt(decision.state, p.artTone), [decision.state, p.artTone]);
  useEffect(() => {
    console.log(LOG, 'art', JSON.stringify({ state: decision.state, name: art.name, origin: art.origin, tone: p.artTone, hasBase: art.base !== null, whiteContrastTop: Number(tokens.whiteContrastTop.toFixed(2)) })); // guard-ok: одна строка на смену героя
  }, [art, decision.state, p.artTone, tokens.whiteContrastTop]);
  const copyInput = useMemo<HomeSceneCopyInput>(() => ({
    lang: p.lang, state: decision.state, zeroEnergyNote: decision.zeroEnergyNote, badge: p.place.badge, episode: p.place.episode, title: p.place.title,
    progress: p.place.done !== null && p.place.total !== null ? { done: p.place.done, total: p.place.total } : null,
    streakDays: p.streakDays, minutesToMidnight: toMidnight, daysAway: p.awayDays, energyMinutes: null, theoryAvailable: p.place.theoryLessonId !== null,
  // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: minuteTick и toMidnight меняют только вечерний текст раз в минуту
  }), [p.lang, decision.state, decision.zeroEnergyNote, p.place.badge, p.place.episode, p.place.title, p.place.done, p.place.total, p.place.theoryLessonId, p.streakDays, p.awayDays, evening ? toMidnight : 0, minuteTick]);
  const copy = useMemo(() => buildHomeSceneCopy(copyInput), [copyInput]);
  const liveEnergy = decision.state === 'no_energy' ? 'title' : evening && decision.zeroEnergyNote ? 'warm' : null;
  const buildLiveText = useCallback((minutes: number | null) => {
    const live = buildHomeSceneCopy({ ...copyInput, energyMinutes: minutes });
    return liveEnergy === 'title' ? live.title : (live.warm ?? '');
  }, [copyInput, liveEnergy]);
  const chips = useMemo<readonly HomeSceneChip[]>(() => copy.chips.map((kind) => ({ kind, label: homeSceneChipLabel(p.lang, kind), icon: CHIP_ICON[kind] })), [copy.chips, p.lang]);
  const offlineLine = useMemo(() => (decision.offlineLine ? homeSceneOfflineLine(p.lang) : null), [decision.offlineLine, p.lang]);
  return (
    <View testID={`home-scene-${decision.state}`} style={s.root}>
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
        artDim={decision.state === 'no_energy'}
        pending={p.pending}
        busy={p.busy}
        onCta={p.onContinue}
        onChip={p.onChip}
      />
      <View style={s.top} pointerEvents="box-none">
        {p.header}
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
  root: { marginHorizontal: -V2.homePad },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingTop: 12, paddingHorizontal: 20, gap: 10 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.16)' },
  offlineText: { flex: 1, color: '#FFFFFF', fontSize: 14, lineHeight: 19 },
  offlineBold: { fontWeight: '700' },
});
