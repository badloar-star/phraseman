// ═══════════════════════════════════════════════════════════════════════════
// SpireHomeScreen.tsx — главный экран «Шпиль» (пакеты A + C, игра — пакеты B, D, E).
//
// зачем (владелец): перенести макет spire.html «1 в 1», но только на РЕАЛЬНЫХ данных и
// за двумя замками. Замок 1 — сегмент в «Сообществе» (app/spire_tab_flag.ts). Замок 2 —
// этот экран: пока config.enabled из config/spire_v1 выключен, он показывает
// «откроется чуть позже» и не читает ни локальную неделю, ни сервер.
// Вся сеть игровой части (комната недели, пакет заданий, итог недели, друзья, досылка
// очереди) живёт в app/spire/use_spire_game.ts и открывается только через
// SpireLiveGate (оба замка разом). Этот файл — вёрстка и состояния экрана.
//
// Firebase-экономия: конфиг — кэш 6 ч; комната — 1 чтение не чаще раза в 6 ч; пакет —
// 1 скачивание в неделю; итог недели — 1 чтение и только если играл. Локальная неделя —
// AsyncStorage, маркер двигается без сети (Optimistic UI).
//
// СПЕРВА ЛОГИ: префикс [SPIRE] — вход, откуда данные, причина каждого раннего выхода.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { spireReadWeekLocal } from '../../app/spire_report_client';
import { loadSpireConfig } from '../../app/spire_config_client';
import { useSpireGame } from '../../app/spire/use_spire_game';
import { peekSpireTourSeen, spireMarkTourSeen, spireReadTourSeen } from '../../app/spire/spire_local_store';
import { DebugLogger } from '../../app/debug-logger';
import { getCanonicalUserId } from '../../app/user_id_policy';
import { useTabNav } from '../../app/TabContext';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import { SPIRE_CONFIG_DEFAULTS, type SpireConfigDoc } from '../../modules/spire/config_contract';
import type { SpireLang, SpireWeekLocal } from '../../modules/spire/report_queue';
import { spireWeekStartMs } from '../../modules/spire/residents';
import { spireTierName } from '../../modules/spire/tier_names';
import EnergyBar from '../EnergyBar';
import { useLang } from '../LangContext';
import { usePremium } from '../PremiumContext';
import { useStudyTarget } from '../StudyTargetContext';
import V2Pressable from '../v2/V2Pressable';
import { useSpirePalette } from './useSpirePalette';
import { lv2Alpha } from '../learning-v2/LearningV2Glass';
import SpireAllMembers from './SpireAllMembers';
import SpireClimbDock from './SpireClimbDock';
import SpireFloorInfo from './SpireFloorInfo';
import SpireFriendsRow from './SpireFriendsRow';
import SpireLockedState from './SpireLockedState';
import SpirePodium from './SpirePodium';
import SpireResultPanel from './SpireResultPanel';
import SpireRulesSheet from './SpireRulesSheet';
import SpireStepScreen from './SpireStepScreen';
import SpireTour from './SpireTour';
import SpireTower from './SpireTower';
import SpireWeekResultCard from './SpireWeekResultCard';
import type { SpireMemberRow } from './spire_room_types';
import { spireText, spireTimeLeftText } from './spire_strings';
import { spireGameText } from './spire_game_strings';
import { SPIRE_FLOOR_COUNT, spireCurrentWeekKey, spireRivalsByFloor, spireTimeLeft } from './spire_tower_model';

const LOG = '[SPIRE]';
const DASH = '—';
const SPIRE_LANGS: readonly SpireLang[] = ['en', 'es', 'de', 'fr'];

function asSpireLang(value: unknown): SpireLang | null {
  return SPIRE_LANGS.includes(value as SpireLang) ? (value as SpireLang) : null;
}

/** Локальная неделя текущей ISO-недели или null (чужая/старая неделя — не показываем как свою). */
async function readCurrentLocalWeek(lang: SpireLang): Promise<SpireWeekLocal | null> {
  const uid = await getCanonicalUserId();
  if (!uid) {
    DebugLogger.info(LOG, 'home: локальная неделя не читается — нет канонического uid (облако выключено)');
    return null;
  }
  const local = await spireReadWeekLocal(uid, lang);
  if (!local) {
    DebugLogger.info(LOG, `home: локальной недели нет (lang=${lang}) — маркер не рисуем`);
    return null;
  }
  const expected = spireCurrentWeekKey(Date.now());
  if (local.weekKey !== expected) {
    DebugLogger.info(LOG, `home: локальная неделя устарела (local=${local.weekKey} сейчас=${expected}) — маркер не рисуем`);
    return null;
  }
  DebugLogger.info(LOG, `home: локальная неделя ok (tier=${local.tier} floor=${local.floor} stepInFloor=${local.stepInFloor} steps=${local.stepsCleared}) из AsyncStorage`);
  return local;
}

export default function SpireHomeScreen() {
  const { lang } = useLang();
  const p = useSpirePalette();
  const { studyTarget } = useStudyTarget();
  const { runtimeOwnerId } = useTabNav();
  const { hasPremiumAccess } = usePremium();
  const myCoinRank = useMyCoinRank();
  const bottomPad = useTabContentBottomPad();

  // Замок 2: null = конфиг ещё не прочитан (кэш), дальше решает config.enabled.
  const [config, setConfig] = useState<SpireConfigDoc | null>(null);
  const [week, setWeek] = useState<SpireWeekLocal | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tourSeen, setTourSeen] = useState<boolean | null>(() => peekSpireTourSeen());

  useEffect(() => {
    let alive = true;
    DebugLogger.info(LOG, 'home: вход, читаем конфиг (кэш 6 ч)');
    loadSpireConfig()
      .then((next) => {
        if (!alive) return;
        DebugLogger.info(LOG, `home: config.enabled=${String(next.enabled)}`);
        setConfig(next);
      })
      .catch((error: unknown) => {
        // зачем: при сбое остаёмся под замком — дефолт выключен.
        DebugLogger.warn(LOG, `home: конфиг не прочитался, остаёмся под замком (${String(error)})`);
        if (alive) setConfig(SPIRE_CONFIG_DEFAULTS);
      });
    return () => { alive = false; };
  }, []);

  const unlocked = config !== null && config.enabled === true;
  const spireLang = asSpireLang(studyTarget);

  useEffect(() => {
    if (!unlocked) return undefined;
    if (!spireLang) {
      DebugLogger.info(LOG, `home: язык изучения ${String(studyTarget)} без пула Шпиля — недели нет`);
      setWeek(null);
      return undefined;
    }
    let alive = true;
    readCurrentLocalWeek(spireLang)
      .then((local) => {
        if (!alive) return;
        setWeek(local);
        setSelected((prev) => prev ?? (local ? Math.min(local.floor, SPIRE_FLOOR_COUNT) : 1));
      })
      .catch((error: unknown) => {
        DebugLogger.warn(LOG, `home: локальная неделя не прочиталась (${String(error)})`);
        if (alive) setWeek(null);
      });
    if (tourSeen === null) void spireReadTourSeen().then((seen) => { if (alive) setTourSeen(seen); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, spireLang, studyTarget]);

  // Игровая часть: вся сеть — только за воротами (оба замка), см. use_spire_game.ts.
  const game = useSpireGame({ config, unlocked, lang: spireLang, week, setWeek });

  const myFloor = week ? Math.min(week.floor, SPIRE_FLOOR_COUNT) : null;
  // Маркер поднялся на новый этаж — карточка этажа следует за ним.
  useEffect(() => { if (myFloor !== null) setSelected(myFloor); }, [myFloor]);
  const shownFloor = selected ?? myFloor ?? 1;
  const onSelect = useCallback((floor: number) => setSelected(floor), []);
  const openAll = useCallback(() => setShowAll(true), []);
  const closeAll = useCallback(() => setShowAll(false), []);
  const openRules = useCallback(() => setRulesOpen(true), []);
  const closeRules = useCallback(() => setRulesOpen(false), []);
  const finishTour = useCallback(() => {
    DebugLogger.info(LOG, 'home: тур закрыт');
    setTourSeen(true);
    void spireMarkTourSeen();
  }, []);
  const climb = useCallback(() => { void game.startStep(); }, [game]);

  const subtitle = useMemo(() => {
    const tier = game.tier ?? week?.tier ?? null;
    const stone = tier !== null ? spireTierName(tier, lang) : DASH;
    const left = spireTimeLeft(Date.now(), spireWeekStartMs(Date.now()));
    return `${stone} · ${spireTimeLeftText(lang, left.days, left.hours)}`;
  }, [game.tier, week, lang]);

  // Комната недели: живые из кэша комнаты + боты формулой + свои локальные ступени.
  const members: readonly SpireMemberRow[] | null = useMemo(
    () => (game.rows ? game.rows.map((r) => ({ uid: r.uid, name: r.name, steps: r.steps, isMe: r.isMe })) : null),
    [game.rows],
  );
  const offline = game.roomLoad?.status === 'offline';
  // Соперники по этажам — из уже закэшированной комнаты (0 новых чтений).
  const rivals = useMemo(() => spireRivalsByFloor(game.rows), [game.rows]);
  const allSubtitle = `${game.tier !== null ? spireTierName(game.tier, lang) : DASH} · ${spireGameText(lang, 'peopleN', { n: members?.length ?? 0 })} · ${spireGameText(lang, 'rankedBySteps')}`;

  if (config === null) return <View style={s.root} testID="spire-loading" />;
  if (!unlocked) return <View style={s.root}><SpireLockedState lang={lang} /></View>;
  if (game.roomLoad?.status === 'paused' && !game.roomLoad.room) return <View style={s.root}><SpireLockedState lang={lang} /></View>;
  if (showAll && members) {
    return <View style={s.root}><SpireAllMembers lang={lang} members={members} subtitle={allSubtitle} onBack={closeAll} /></View>;
  }

  const climbReady = game.live && game.tier !== null && game.session === null;
  return (
    <View style={s.root} testID="spire-home">
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomPad + (game.outcome ? 300 : 120) }]} showsVerticalScrollIndicator={false}>
        <View style={s.head}>
          <View style={s.headText}>
            <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{spireText(lang, 'title')}</Text>
            <Text style={[s.subtitle, { color: p.textSecondary }]}>{subtitle}</Text>
          </View>
          <V2Pressable
            onPress={openRules}
            accessibilityRole="button"
            accessibilityLabel={spireGameText(lang, 'rulesTitle')}
            style={[s.rulesBtn, { backgroundColor: p.control }]}
            testID="spire-rules-open"
          >
            <Ionicons name="information" size={20} color={p.text} />
          </V2Pressable>
          {hasPremiumAccess ? null : <EnergyBar ownerActive={runtimeOwnerId === 'spire'} glass />}
        </View>
        {offline ? (
          <View style={[s.note, { backgroundColor: p.cardRaised }]} accessibilityLiveRegion="polite" testID="spire-offline">
            <Ionicons name="cloud-offline-outline" size={20} color={p.textSecondary} />
            <Text style={[s.noteText, { color: p.textSecondary }]}>{spireGameText(lang, 'offline')}</Text>
          </View>
        ) : null}
        {game.weekResult ? (
          <SpireWeekResultCard lang={lang} result={game.weekResult} myCoinRank={myCoinRank} onClose={game.dismissWeekResult} />
        ) : null}
        <View style={s.towerWrap}>
          <SpireTower lang={lang} myFloor={myFloor} selected={shownFloor} onSelect={onSelect} myCoinRank={myCoinRank} rivalsByFloor={rivals} dimRivals={offline} />
        </View>
        <SpireFloorInfo lang={lang} floor={shownFloor} myFloor={myFloor} stepInFloor={week ? week.stepInFloor : null} coins={config.coins} others={rivals.get(shownFloor)} />
        {/* Нет сети: свой маркер живой, чужие цифры приглушены (макет §11). */}
        <View style={offline ? s.dim : null}>
          <SpireFriendsRow lang={lang} friends={game.friends} />
          <SpirePodium lang={lang} members={members} onOpenAll={openAll} />
        </View>
      </ScrollView>
      <View pointerEvents="box-none" style={[s.dock, { bottom: bottomPad - 24 }]}>
        <LinearGradient pointerEvents="none" colors={[lv2Alpha(p.bg, 0), lv2Alpha(p.bg, 0.96)]} style={s.scrim} />
        {game.outcome ? (
          <SpireResultPanel
            lang={lang}
            outcome={game.outcome}
            coins={config.coins}
            myCoinRank={myCoinRank}
            myPlace={game.myPlace}
            busy={game.starting}
            onHigher={climb}
            onLater={game.dismissOutcome}
          />
        ) : (
          <SpireClimbDock lang={lang} ready={climbReady} busy={game.starting} premium={hasPremiumAccess} block={game.startBlock} onClimb={climb} />
        )}
      </View>
      {game.uid ? (
        <SpireStepScreen
          lang={lang}
          session={game.session}
          uid={game.uid}
          studyTarget={String(studyTarget)}
          showEnergy={!hasPremiumAccess}
          onFinish={game.onStepFinish}
          onAbort={game.onStepAbort}
        />
      ) : null}
      <SpireRulesSheet lang={lang} visible={rulesOpen} coins={config.coins} onClose={closeRules} />
      <SpireTour lang={lang} visible={game.live && tourSeen === false} onDone={finishTour} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: V2.screenPad, paddingTop: 6 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 6 },
  headText: { flex: 1, minWidth: 0 },
  title: { ...V2_TYPE.largeTitle, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 20, marginTop: 6 },
  rulesBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: 16, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noteText: { flex: 1, fontSize: 15, lineHeight: 20 },
  towerWrap: { marginTop: 18 },
  dim: { opacity: 0.55 },
  dock: { position: 'absolute', left: V2.screenPad, right: V2.screenPad },
  scrim: { position: 'absolute', left: -V2.screenPad, right: -V2.screenPad, top: -40, bottom: -40 },
});
