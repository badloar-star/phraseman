/**
 * Экран поиска соперника — ЗРИТЕЛЬ, а не владелец очереди.
 *
 * зачем (владелец 2026-09-20): «сделай так чтобы соперник продолжал искаться
 * даже если выйти и зайти в другой раздел». Раньше очередь жила в рефах этого
 * экрана (requestId, heartbeat, срок бота, сдача) и умирала вместе с ним, а
 * уход отменял поиск и возвращал энергию. Теперь владелец — синглтон
 * `arenaBackgroundSearch`; экран лишь показывает его состояние и даёт кнопку
 * «Отмена». Уйти с экрана больше НЕ значит бросить поиск.
 *
 * Энергия здесь только ПРОВЕРЯЕТСЯ (владелец: «поиск не начинается если не
 * хватает энергии»), а списывается при принятии матча — в
 * `components/arena/ArenaOpponentFoundHost.tsx`. Поэтому на этом экране нет
 * ни списания, ни возврата: возвращать нечего.
 *
 * Находку показывает тост поверх любого экрана, включая этот.
 * Логи — общий префикс `[ARENA-BGSEARCH]`.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaSearchPulse } from '../components/arena/ArenaSearchPulse';
import { ArenaStateCard } from '../components/arena/ArenaExpansionUI';
import { ArenaRankMatchmakingScene } from '../components/arena/ArenaRankMatchmakingScene';
import { V2Card, V2Cta } from '../components/ui/v2_ui';
import { useTournamentPalette } from '../components/ui/v2_theme';
import { arenaText } from '../modules/arena/copy';
import { type ArenaQueueMode } from '../modules/arena/contract';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useVisibleWallClock } from '../hooks/use_visible_wall_clock';
import { useArenaSound } from '../hooks/use_arena_sound';
import { arenaV2Home } from './arena_client';
import { arenaRouteStudyTarget } from './arena_route_target';
import { arenaBackgroundSearch, useArenaBackgroundSearchState } from './arena_background_search';
import { DebugLogger } from './debug-logger';
import { activityEnergyCost } from './energy_contract';
import { useEnergy } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';

/**
 * Ноль секундомера до подтверждения очереди. Формат и ширина совпадают с
 * рабочим значением (tabular-nums), поэтому старт поиска не двигает геометрию.
 */
const ZERO_ELAPSED_LABEL = '0:00';

export default function ArenaMatchmakingScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget: currentStudyTarget } = useStudyTarget();
  const P = useTournamentPalette();
  const params = useLocalSearchParams<{ mode?: string; viewerStars?: string; studyTarget?: string }>();
  const studyTarget = arenaRouteStudyTarget(params.studyTarget, currentStudyTarget) ?? currentStudyTarget;
  const mode: ArenaQueueMode = params.mode === 'ranked' ? 'ranked' : 'quick';
  const active = useRuntimeActive();
  const reduceMotion = useReduceMotion();
  const viewerStarsParam = typeof params.viewerStars === 'string' && /^\d+$/.test(params.viewerStars)
    ? params.viewerStars
    : null;
  const viewerStars = viewerStarsParam === null ? null : Number(viewerStarsParam);
  const now = useVisibleWallClock(active, 1_000);
  const playSound = useArenaSound();

  const search = useArenaBackgroundSearchState();
  const [targetGate, setTargetGate] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const [noEnergy, setNoEnergy] = useState(false);

  /**
   * Энергия ПРОВЕРЯЕТСЯ, но не списывается.
   *
   * зачем (владелец 2026-09-20): «поиск не начинается если не хватает энергии»
   * плюс «энергия должна списываться только после начала матча». Значит здесь
   * — чтение баланса, а плата берётся на кнопке «Принять».
   *
   * `energyReady` обязателен: до первого чтения из хранилища контекст отдаёт
   * значение по умолчанию (MAX_ENERGY), и решать по нему нельзя — ровно на
   * таком поспешном суждении уже ломался вход в Арену (2026-08-28).
   */
  const { energy, bonusEnergy, isUnlimited, energyReady } = useEnergy();
  const energyCost = activityEnergyCost('arena_match');
  const hasEnergy = isUnlimited || (energy + bonusEnergy) >= energyCost;

  useEffect(() => {
    let alive = true;
    setTargetGate('checking');
    void arenaV2Home(studyTarget).then((home) => {
      if (alive) setTargetGate(home.availability.enabled ? 'ready' : 'unavailable');
    }).catch((reason: unknown) => {
      // Молчать нельзя: без причины «Арена недоступна» выглядит как поломка.
      DebugLogger.warn('arena_matchmaking',
        `[ARENA-BGSEARCH] target gate failed target=${studyTarget}: ${String(reason)}`);
      if (alive) setTargetGate('unavailable');
    });
    return () => { alive = false; };
  }, [studyTarget]);

  /**
   * Запуск поиска — единственное действие этого экрана, и ровно ОДИН раз за
   * вход на него.
   *
   * зачем замок `startedOnceRef` (найдено аудитом 2026-09-20): без него эффект
   * перезапускался на каждой смене фазы, и отказ от матча воскрешал поиск.
   * Человек на экране Арены жал «Отклонить» в тосте, фаза становилась
   * 'stopped' — а эффект тут же начинал искать заново, прямо нарушая правило
   * владельца «если отклонить, то поиск должен остановиться».
   *
   * Повторный вход на экран при живом поиске второй очереди тоже не создаёт:
   * эта защита стоит внутри синглтона, потому что экран может смонтироваться
   * дважды (StrictMode, возврат назад).
   */
  const startedOnceRef = useRef(false);
  useEffect(() => {
    if (startedOnceRef.current) return;
    if (targetGate !== 'ready' || !energyReady) return;
    // Поиск уже идёт (пришли с хаба по «продолжить») — экран просто смотрит.
    if (search.phase === 'searching' || search.phase === 'paused' || search.phase === 'found') {
      startedOnceRef.current = true;
      return;
    }
    if (!hasEnergy) {
      DebugLogger.warn('arena_matchmaking',
        `[ARENA-BGSEARCH] search refused: energy=${energy}+${bonusEnergy} cost=${energyCost}`);
      startedOnceRef.current = true;
      setNoEnergy(true);
      return;
    }
    // Прошлый поиск мог закончиться отказом: фаза 'stopped' — это ПОКАЗАННЫЙ
    // итог, а не помеха. Сбрасываем её перед новым стартом, иначе новый вход
    // на экран не начал бы поиск вовсе.
    if (search.phase === 'stopped') arenaBackgroundSearch.reset();
    startedOnceRef.current = true;
    playSound('searchStart');
    arenaBackgroundSearch.start(mode, studyTarget);
  }, [bonusEnergy, energy, energyCost, energyReady, hasEnergy, mode, playSound,
    search.phase, studyTarget, targetGate]);

  /**
   * Поиск закончился, пока человек стоит на этом экране (отказ в тосте,
   * молчание, неудача) — показывать пульс дальше было бы ложью. Уходим на хаб.
   *
   * зачем не сразу: кадр нужен, чтобы тост успел доиграть свой уход, иначе
   * экран схлопывается под ним и движение выглядит рваным.
   */
  useEffect(() => {
    if (!startedOnceRef.current || search.phase !== 'stopped') return undefined;
    DebugLogger.info('arena_matchmaking',
      `[ARENA-BGSEARCH] search ended on screen reason=${search.stopReason ?? 'unknown'} — leaving to hub`);
    const timer = setTimeout(() => router.replace('/arena' as never), 220);
    return () => clearTimeout(timer);
  }, [router, search.phase, search.stopReason]);

  // Тихий луп ожидания: глохнет, как только соперник найден — под тостом он
  // неуместен (владелец 2026-08-30, раунд 5).
  useEffect(() => {
    if (search.phase !== 'searching' || !active) return undefined;
    let interval: ReturnType<typeof setInterval> | null = null;
    const first = setTimeout(() => {
      playSound('searchLoop');
      interval = setInterval(() => playSound('searchLoop'), 3050);
    }, 2100);
    return () => {
      clearTimeout(first);
      if (interval) clearInterval(interval);
    };
  }, [active, playSound, search.phase]);

  useEffect(() => {
    if (search.phase === 'found') playSound('opponentFound');
  }, [playSound, search.phase]);

  /**
   * Уход с экрана НЕ останавливает поиск — в этом вся суть правки. Кнопка
   * «Отмена» останавливает явно: человек сказал «хватит».
   */
  const cancel = useCallback(() => {
    DebugLogger.info('arena_matchmaking', '[ARENA-BGSEARCH] cancelled from search screen');
    arenaBackgroundSearch.stop('cancelled');
    router.replace('/arena' as never);
  }, [router]);

  /** Просто уйти, оставив поиск работать. Это теперь обычный «назад». */
  const leaveSearchRunning = useCallback(() => {
    router.replace('/arena' as never);
  }, [router]);

  const elapsedLabel = useMemo(() => {
    const startedAtMs = search.startedAtMs;
    if (startedAtMs === null) return ZERO_ELAPSED_LABEL;
    const seconds = Math.max(0, Math.floor((now - startedAtMs) / 1_000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }, [now, search.startedAtMs]);

  if (targetGate === 'unavailable') {
    return (
      <ArenaScreen title={arenaText(lang, 'title')} variant="lobby" onBack={leaveSearchRunning}>
        <ArenaStateCard state="unavailable" title={arenaText(lang, 'valueUnknown')} body={arenaText(lang, 'modeOff')} />
      </ArenaScreen>
    );
  }

  if (noEnergy) {
    return (
      <ArenaScreen title={arenaText(lang, 'searching')} variant="lobby" scroll={false} onBack={leaveSearchRunning}>
        <NoEnergyModal
          visible
          activity="arena_match"
          onClose={() => { setNoEnergy(false); router.replace('/arena' as never); }}
        />
      </ArenaScreen>
    );
  }

  return (
    <ArenaScreen
      title={arenaText(lang, 'searching')}
      variant="lobby"
      scroll={false}
      allowShortViewportScroll
      onBack={leaveSearchRunning}
    >
      <View style={styles.center}>
        <V2Card style={styles.card}>
          {/* зачем: системный спиннер одинаков во всех приложениях мира и на
              длинном ожидании раздражает — у вращения нет ни начала, ни конца.
              Волна по сетке живёт циклами, глаз отдыхает на паузе (владелец
              выбрал этот вариант из пяти, 2026-08-16). */}
          {mode === 'ranked' ? (
            <ArenaRankMatchmakingScene
              viewerStars={viewerStars}
              active={active}
              reduceMotion={reduceMotion}
            />
          ) : (
            <ArenaSearchPulse />
          )}
          <Text
            testID="arena-search-elapsed"
            style={[styles.elapsed, { color: P.text }]}
          >
            {elapsedLabel}</Text>
          {/* зачем: обещание «можно уйти» должно быть НАПИСАНО. Иначе человек
              не знает, что поиск переживёт уход, и продолжает сторожить экран. */}
          <Text style={[styles.hint, { color: P.muted }]}>{arenaText(lang, 'keepOpen')}</Text>
        </V2Card>
      </View>
      <V2Cta tone="ghost" onPress={cancel}>{arenaText(lang, 'cancel')}</V2Cta>
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  card: { minHeight: 230, justifyContent: 'center', alignItems: 'center', gap: 14 },
  elapsed: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  hint: { fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 12 },
});
