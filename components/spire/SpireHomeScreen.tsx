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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { triLang } from '../../constants/i18n';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { getDevSpireWeekResultOverride } from '../../app/dev_spire_tier';
import { loadSpireConfig, peekSpireConfig } from '../../app/spire_config_client';
import { refreshSpireConfigIfLocked } from '../../app/spire_gate_refresh';
import { useSpireGame } from '../../app/spire/use_spire_game';
import { peekSpireTourSeen, spireMarkTourSeen, spireReadTourSeen } from '../../app/spire/spire_local_store';
import { DebugLogger } from '../../app/debug-logger';
import { useTabNav } from '../../app/TabContext';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import { SPIRE_CONFIG_DEFAULTS, type SpireConfigDoc } from '../../modules/spire/config_contract';
import type { SpireWeekLocal } from '../../modules/spire/report_queue';
import { spireWeekStartMs } from '../../modules/spire/residents';
import { spireTierName } from '../../modules/spire/tier_names';
import EnergyBar from '../EnergyBar';
import { useLang } from '../LangContext';
import { usePremium } from '../PremiumContext';
import { useStudyTarget } from '../StudyTargetContext';
import { useSpireBgBottom, useSpirePalette } from './useSpirePalette';
import { spireScreenLangLock } from './spire_screen_lang_lock';
import SpireEnergyPill from './SpireEnergyPill';
import SpireAllMembers from './SpireAllMembers';
import SpireClimbDock from './SpireClimbDock';
import { logSpireDock, logSpireLayout, roundLayout } from './spire_layout_log';
import SpireFloorInfo from './SpireFloorInfo';
import SpireFriendsRow from './SpireFriendsRow';
import SpireLockedState from './SpireLockedState';
import SpirePodium from './SpirePodium';
import SpireResultPanel from './SpireResultPanel';
import SpireHomeSkeleton from './SpireHomeSkeleton';
import SpireStepScreen from './SpireStepScreen';
import SpireTour from './SpireTour';
import SpireTower from './SpireTower';
import SpireWeekResultCard from './SpireWeekResultCard';
import { useSpirePreview } from './spire_preview_context';
import type { SpireMemberRow } from './spire_room_types';
import { spireText, spireTimeLeftText } from './spire_strings';
import { spirePeopleCount } from './spire_plurals';
import { spireGameText } from './spire_game_strings';
import { SPIRE_FLOOR_COUNT, spireRivalsByFloor, spireTimeLeft } from './spire_tower_model';
import { SPIRE_BETA_LANGS, asSpireLang, peekFirstFrameWeek, readCurrentLocalWeek } from './spire_home_week';

const LOG = '[SPIRE]';
const DASH = '—';
// зачем (координатор 13.10, [SPIRE-LAYOUT] floor 7): запас под списком 120/150/300 — из макета (pb), но док растёт (подпись причины, панель итога, крупный системный шрифт), и константа
// перестаёт его покрывать. Док стоит на `bottomPad - DOCK_LIFT` (стиль дока ниже, значение то же), поэтому последнему блоку нужно `dockH + DOCK_GAP - DOCK_LIFT` сверх bottomPad
// (safe area и панель вкладок уже внутри bottomPad). Макетные значения остаются ПОЛОМ — вид в обычных состояниях не меняется.
const DOCK_LIFT = 24;
const DOCK_GAP = 16;
export default function SpireHomeScreen() {
  const { lang } = useLang();
  const p = useSpirePalette();
  const bgBottom = useSpireBgBottom();
  const { studyTarget } = useStudyTarget();
  const { runtimeOwnerId } = useTabNav();
  const { hasPremiumAccess } = usePremium();
  const realCoinRank = useMyCoinRank();
  const bottomPad = useTabContentBottomPad();
  // зачем (координатор 11.10): DEV-превью на моках (/dev_spire_preview) подаёт сюда готовую модель; в боевом пути preview всегда null,
  // и экран работает как раньше — конфиг, локальная неделя и игра из реальных источников.
  const preview = useSpirePreview();
  const myCoinRank = preview ? preview.coinRank : realCoinRank;

  // Замок 2: null = конфиг ещё не прочитан (кэш), дальше решает config.enabled.
  // зачем (аудит Optimistic UI Шпиля, 13.10): повторный заход не рисует пустой `spire-loading` — берём последний настоящий конфиг из памяти процесса; loadSpireConfig ниже освежает его фоном.
  const [config, setConfig] = useState<SpireConfigDoc | null>(() => preview?.config ?? peekSpireConfig());
  const [week, setWeek] = useState<SpireWeekLocal | null>(() => preview?.week ?? peekFirstFrameWeek(studyTarget));
  const [selected, setSelected] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(preview?.showAll ?? false);
  const [tourSeen, setTourSeen] = useState<boolean | null>(() => (preview ? preview.tourSeen : peekSpireTourSeen()));
  // Измеренная высота дока (кнопка «Подняться» / панель итога): от неё считается нижний запас списка. 0 — ещё не измерен.
  const [dockH, setDockH] = useState(0);

  useEffect(() => {
    if (preview) {
      DebugLogger.info(LOG, 'home: DEV-превью на моках — конфиг, неделя и игра не читаются');
      return undefined;
    }
    let alive = true;
    const enteredAtMs = Date.now();
    DebugLogger.info(LOG, `home: вход, читаем конфиг (кэш 6 ч); первый кадр из памяти процесса: ${config === null ? 'нет (первый заход)' : `да (enabled=${String(config.enabled)})`}`);
    loadSpireConfig()
      .then((next) => {
        if (!alive) return;
        DebugLogger.info(LOG, `home: config.enabled=${String(next.enabled)}`);
        DebugLogger.info('[SPIRE-FIRSTFRAME]', `первый кадр: ${config === null ? 'скелет SpireHomeSkeleton' : 'экран из памяти'}, конфиг пришёл через ${Date.now() - enteredAtMs} мс`);
        setConfig(next);
        if (next.enabled !== true) {
          // зачем (владелец 11.10: «ШПИЛЬ НЕМЕДЛЕННО»): «выключен» может быть старым кэшем (6 ч) — один принудительный
          // перечит config/spire_v1 (не чаще раза в 60 секунд); включён на сервере → открываем Шпиль сразу.
          void refreshSpireConfigIfLocked('spire_home', false).then((enabledNow) => {
            if (!alive || !enabledNow) return;
            DebugLogger.info(LOG, 'home: после перечита сервер включён — открываем Шпиль');
            void loadSpireConfig().then((fresh) => { if (alive) setConfig(fresh); });
          });
        }
      })
      .catch((error: unknown) => {
        // зачем: при сбое остаёмся под замком — дефолт выключен.
        DebugLogger.warn(LOG, `home: конфиг не прочитался, остаёмся под замком (${String(error)})`);
        if (alive) setConfig(SPIRE_CONFIG_DEFAULTS);
      });
    return () => { alive = false; };
  }, []);

  // зачем (владелец 11.10 «Шпиль только ru/uk», п.76, координатор 15.10): вкладка закрыта замком по языку интерфейса, но прямой маршрут /spire и смена языка
  // на открытом экране обходили его — открывались английские подписи с русскими заданиями. Теперь экран сам подчиняется тому же решению (SpireLockedState).
  const langLock = spireScreenLangLock(lang);
  const unlocked = config !== null && config.enabled === true && !langLock.locked;
  const lastLangLockKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${langLock.decision.lang}:${langLock.decision.allowed}`;
    if (lastLangLockKeyRef.current === key) return;
    const before = lastLangLockKeyRef.current;
    lastLangLockKeyRef.current = key;
    console.log('[SPIRE-GATE] screen', JSON.stringify({ lang: langLock.decision.lang, allowed: langLock.decision.allowed, reason: langLock.decision.reason, locked: langLock.locked, previous: before, preview: preview !== null, config: config === null ? 'not_read' : config.enabled === true ? 'enabled' : 'disabled', result: langLock.locked ? 'SpireLockedState' : 'screen_allowed' })); // guard-ok: решение по языку интерфейса, одна строка на смену
  }, [langLock.decision.lang, langLock.decision.allowed, langLock.decision.reason, langLock.locked, preview, config]);
  // зачем (Макеты, spire-gap-018: за шторкой правил на кадре пустой чёрный фон; сперва логи): что реально рисует главный экран, когда шторка правил открыта/закрыта — по строке видно, отрисован ли экран за шторкой
  // (unlocked/langLock/config/weekFloor) или показан замок/загрузка. Только dev, одна строка на смену.
  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    console.log('[SPIRE-RULES] home', JSON.stringify({ unlocked, langLocked: langLock.locked, lang, config: config === null ? 'not_read' : config.enabled === true ? 'enabled' : 'disabled', preview: preview !== null, weekFloor: week ? week.floor : null, tier: week ? week.tier : null, rendered: config === null ? 'spire-loading' : langLock.locked || !unlocked ? 'SpireLockedState' : 'home' })); // guard-ok: dev-журнал, что за шторкой правил
  }, [unlocked, langLock.locked, lang, config, preview, week]);
  const spireLang = asSpireLang(studyTarget);
  // зачем (аудит §AUTH-0110, координатор 15.10): при смене изучаемого языка неделя и выбранный этаж старого языка не должны оставаться до конца чтения новой недели.
  const prevSpireLangRef = useRef(spireLang);
  useEffect(() => {
    const before = prevSpireLangRef.current;
    if (before === spireLang) return;
    prevSpireLangRef.current = spireLang;
    console.log('[SPIRE-TARGET] home: язык', JSON.stringify({ from: before, to: spireLang, reset: { weekFloor: week ? week.floor : null, selected } })); // guard-ok: трассировка сброса при смене изучаемого языка
    setWeek(peekFirstFrameWeek(spireLang)); // неделя нового языка, если её уже читали в этом процессе; иначе null до чтения
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spireLang]);

  useEffect(() => {
    if (!unlocked || preview) return undefined;
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
  const realGame = useSpireGame({ config: preview ? null : config, unlocked: preview ? false : unlocked, lang: spireLang, week, setWeek });
  const game = preview ? preview.game : realGame;
  const devWeekResult = getDevSpireWeekResultOverride(); // dev_state?spireWeek=…: готовый исход «Итога недели» для кадров Сверки (в стор-сборке null)
  // зачем (смета Firebase 13.10, п. 5): потянуть экран = обновить друзей мимо кэша 30 мин. Спиннер держится, пока идёт вызов; повторное потягивание хук игнорирует.
  const [friendsRefreshing, setFriendsRefreshing] = useState(false);
  const onPullRefreshFriends = useCallback(() => {
    setFriendsRefreshing(true);
    void game.refreshFriends().finally(() => setFriendsRefreshing(false));
  }, [game]);
  // зачем (Макеты spire-gap-008: подпись «Задания этой недели ещё готовятся» наезжала на ряд друзей): в макете запас под нижней панелью 120 dp, а с подписью
  // над кнопкой (причина блокировки старта) — 150 dp (подпись 18 + отступ 10 + запас); без этого низ списка на конце прокрутки уходит под подпись.
  const scrollTailPad = game.outcome ? 300 : game.startBlock ? 150 : 120;
  const tailNeeded = dockH > 0 ? Math.ceil(dockH + DOCK_GAP - DOCK_LIFT) : 0;
  const tailPad = Math.max(scrollTailPad, tailNeeded);

  const myFloor = week ? Math.min(week.floor, SPIRE_FLOOR_COUNT) : null;
  // Маркер поднялся на новый этаж — карточка этажа следует за ним.
  useEffect(() => { if (myFloor !== null) setSelected(myFloor); }, [myFloor]);
  const shownFloor = selected ?? myFloor ?? 1;
  // зачем (Макеты spire-gap-009, поручение координатора 15.10; правило «сперва логи»): что именно решает вид кнопки и окна башни — этаж, комната, откуда значения.
  useEffect(() => {
    const reasons: string[] = [];
    if (!game.live) reasons.push('live=false');
    if (game.tier === null) reasons.push('tier=null');
    if (game.session !== null) reasons.push('session!=null');
    if (game.pending !== null) reasons.push('pending!=null');
    logSpireDock('home', {
      source: preview ? 'DEV-превью (моки)' : 'живые данные (week из локального хранилища, комната из кэша)',
      weekFloor: week ? week.floor : null, myFloor, selected, shownFloor,
      rows: game.rows ? game.rows.length : null, tier: game.tier, live: game.live, startBlock: game.startBlock ?? 'none',
      notReadyBecause: reasons.length > 0 ? reasons.join(',') : 'готово', premium: hasPremiumAccess,
      towerWillScrollTo: myFloor !== null ? `свой этаж ${myFloor}` : `низ башни (этажа нет; выбран ${shownFloor})`,
    });
  }, [preview, week, myFloor, selected, shownFloor, game.rows, game.tier, game.live, game.startBlock, game.session, game.pending, hasPremiumAccess]);
  // зачем (координатор 13.10, сперва логи): ОДНА строка отвечает «перекрывает ли док последний блок на конце прокрутки»: endClearance = зазор между низом списка и верхом дока при полной прокрутке
  // (paddingBottom − отступ дока снизу − высота дока); ≥ DOCK_GAP — чисто. Видны оба слагаемых запаса (макетный пол и вычисленный от дока), этаж и откуда значения.
  useEffect(() => {
    logSpireLayout('clearance', {
      floor: shownFloor, myFloor, dockH: roundLayout(dockH), bottomPad: roundLayout(bottomPad), tailFloor: scrollTailPad, tailFromDock: tailNeeded, tailUsed: tailPad,
      endClearance: roundLayout(tailPad + DOCK_LIFT - dockH), minClearance: DOCK_GAP,
      source: preview ? 'DEV-превью' : 'живые данные', outcome: game.outcome ? game.outcome.kind : 'none', startBlock: game.startBlock ?? 'none',
    });
  }, [shownFloor, myFloor, dockH, bottomPad, scrollTailPad, tailNeeded, tailPad, preview, game.outcome, game.startBlock]);
  const onSelect = useCallback((floor: number) => setSelected(floor), []);
  const openAll = useCallback(() => setShowAll(true), []);
  const closeAll = useCallback(() => setShowAll(false), []);
  const finishTour = useCallback(() => {
    DebugLogger.info(LOG, 'home: тур закрыт');
    setTourSeen(true);
    if (!preview) void spireMarkTourSeen();
  }, [preview]);
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
  const allSubtitle = `${game.tier !== null ? spireTierName(game.tier, lang) : DASH} · ${spirePeopleCount(lang, members?.length ?? 0)} · ${spireGameText(lang, 'rankedBySteps')}`;

  if (langLock.locked) return <View style={s.root}><SpireLockedState lang={lang} /></View>; // зачем: язык интерфейса не ru/uk — замок раньше экрана загрузки, чтобы чужой язык не мелькнул
  // зачем (правило 10г, координатор 13.10): пока конфиг не прочитан (холодный старт, память пуста) — не пустой View, а скелет по форме экрана (SpireHomeSkeleton, testID spire-loading).
  if (config === null) return <SpireHomeSkeleton lang={lang} />;
  if (!unlocked) return <View style={s.root}><SpireLockedState lang={lang} /></View>;
  if (game.roomLoad?.status === 'paused' && !game.roomLoad.room) return <View style={s.root}><SpireLockedState lang={lang} /></View>;
  if (showAll && members) {
    return <View style={s.root}><SpireAllMembers lang={lang} members={members} subtitle={allSubtitle} onBack={closeAll} /></View>;
  }

  const climbReady = game.live && game.tier !== null && game.session === null && game.pending === null;
  return (
    <View style={s.root} testID="spire-home">
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + tailPad }]}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        // зачем (смета Firebase 13.10, п. 5): друзья в кэше 30 мин — вручную обновляются потягиванием; спиннер системный, экран не блокируется
        refreshControl={<RefreshControl refreshing={friendsRefreshing} onRefresh={onPullRefreshFriends} tintColor={p.text} colors={[p.text]} progressBackgroundColor={p.control} testID="spire-pull-refresh" />}
        onLayout={(e) => logSpireLayout('scroll', { viewportH: roundLayout(e.nativeEvent.layout.height), bottomPad: roundLayout(bottomPad), paddingBottom: roundLayout(bottomPad + tailPad) })}
        onContentSizeChange={(_w, ch) => logSpireLayout('scroll.content', { contentH: roundLayout(ch) })}
      >
        <View style={s.head}>
          <View style={s.headText}>
            <View style={s.titleRow}>
              <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{spireText(lang, 'title')}</Text>
              {/* зачем (D77, владелец 30.09): пулы es/de/fr без проверки носителем — первые 2–4 недели
                  с пометкой «бета» рядом с языком. Снять: убрать язык из SPIRE_BETA_LANGS. */}
              {spireLang && SPIRE_BETA_LANGS.includes(spireLang) ? (
                <View style={[s.betaPill, { backgroundColor: p.cardRaised }]} testID="spire-beta-pill">
                  <Text style={[s.betaText, { color: p.textSecondary }]}>{triLang(lang, { ru: 'бета', uk: 'бета', en: 'beta', es: 'beta', 'pt-BR': 'beta', vi: 'beta', id: 'beta', tr: 'beta', pl: 'beta' })}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[s.subtitle, { color: p.textSecondary }]}>{subtitle}</Text>
          </View>
          <SpireEnergyPill ownerActive={runtimeOwnerId === 'spire'} />
        </View>
        {offline ? (
          <View style={[s.note, { backgroundColor: p.cardRaised }]} accessibilityLiveRegion="polite" testID="spire-offline">
            <Ionicons name="cloud-offline-outline" size={20} color={p.textSecondary} />
            <Text style={[s.noteText, { color: p.textSecondary }]}>{spireGameText(lang, 'offline')}</Text>
          </View>
        ) : null}
        {game.rejectNotice ? (
          // зачем (решение владельца 13.10, журнал п.86): сервер не засчитал пройденную ступень, маркер откатился — человек должен понять, почему этаж ниже. Текст — точная причина
          // «Ступень не засчиталась. Пройди её ещё раз» (stepNotCounted на 9 языках, Ядро 13.10).
          <View style={[s.note, { backgroundColor: p.cardRaised }]} accessibilityLiveRegion="polite" testID="spire-reject-notice">
            <Ionicons name="alert-circle-outline" size={20} color={p.textSecondary} />
            <Text style={[s.noteText, { color: p.textSecondary }]}>{spireGameText(lang, 'stepNotCounted')}</Text>
          </View>
        ) : null}
        {/* зачем (координатор 13.10): dev_state?spireWeek=… подставляет готовый исход для кадров Сверки; в стор-сборке всегда null */}
        {(devWeekResult ?? game.weekResult) ? (
          <SpireWeekResultCard lang={lang} result={(devWeekResult ?? game.weekResult)!} myCoinRank={myCoinRank} onClose={game.dismissWeekResult} />
        ) : null}
        <View style={s.towerWrap}>
          <SpireTower lang={lang} myFloor={myFloor} selected={shownFloor} onSelect={onSelect} myCoinRank={myCoinRank} rivalsByFloor={rivals} dimRivals={offline} tier={game.tier ?? week?.tier ?? null} />
        </View>
        <SpireFloorInfo lang={lang} floor={shownFloor} myFloor={myFloor} stepInFloor={week ? week.stepInFloor : null} coins={config.coins} others={rivals.get(shownFloor)} />
        {/* Нет сети: свой маркер живой, чужие цифры приглушены (макет §11). */}
        <View
          style={offline ? s.dim : null}
          onLayout={(e) => logSpireLayout('friends+podium', { y: roundLayout(e.nativeEvent.layout.y), h: roundLayout(e.nativeEvent.layout.height), bottom: roundLayout(e.nativeEvent.layout.y + e.nativeEvent.layout.height), friends: game.friends.length, startBlock: game.startBlock ?? 'none' })}
        >
          <SpireFriendsRow lang={lang} friends={game.friends} />
          <SpirePodium lang={lang} members={members} onOpenAll={openAll} />
        </View>
      </ScrollView>
      <View
        pointerEvents="box-none"
        style={[s.dock, { bottom: bottomPad - 24 }]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setDockH((prev) => (Math.abs(prev - h) < 0.5 ? prev : h)); // зачем: порог 0,5 dp — дрожь округления не гоняет перерисовку; док на запас списка не влияет (absolute), цикла нет
          logSpireLayout('dock.wrap', { y: roundLayout(e.nativeEvent.layout.y), h: roundLayout(h), bottomOffset: roundLayout(bottomPad - DOCK_LIFT) });
        }}
      >
        <LinearGradient pointerEvents="none" colors={[`${bgBottom}00`, `${bgBottom}FF`, `${bgBottom}FF`]} locations={[0, 0.32, 1]} style={[s.scrim, { bottom: -Math.max(40, bottomPad - 24) }]} /> {/* зачем (макет `.bp.scrim`, Сверка 11.10): затухание вверх, под кнопкой фон сплошной и в цвет низа градиента темы */}
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
      {game.uid && game.stableId ? (
        <SpireStepScreen
          lang={lang}
          session={game.session}
          pending={game.pending}
          onCancelPending={game.cancelPendingStep}
          uid={game.uid}
          stableId={game.stableId}
          studyTarget={String(studyTarget)}
          showEnergy={!hasPremiumAccess}
          onFinish={game.onStepFinish}
          onAbort={game.onStepAbort}
        />
      ) : null}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  betaPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  betaText: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 0.3 }, // зачем (аудит D145, 11.10): межстрочный ≥ 1.25× — шкала V2_TYPE 13/17
  subtitle: { fontSize: 16, lineHeight: 20, marginTop: 6 },
  note: { marginTop: 16, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noteText: { flex: 1, fontSize: 16, lineHeight: 21 },
  towerWrap: { marginTop: 18 },
  dim: { opacity: 0.55 },
  dock: { position: 'absolute', left: V2.screenPad, right: V2.screenPad },
  scrim: { position: 'absolute', left: -V2.screenPad, right: -V2.screenPad, top: -40, bottom: -40 },
});
