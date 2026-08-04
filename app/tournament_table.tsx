// ═══════════════════════════════════════════════════════════════════════════
// tournament_table.tsx — таблица между раундами (макеты 14-16).
//
// зачем: главный драматический момент режима. 16 горизонтальных плашек,
// строки ПЕРЕЕЗЖАЮТ на новые позиции пружиной (FLIP), обогнавшие получают
// чип «обгон! ⚡». Своя строка подсвечена. Через 11 секунд авто-переход.
//
// Layout stability: плашки абсолютно спозиционированы по индексу — высота
// списка known заранее, поэтому перестановка не двигает соседние блоки.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
// зачем: allowFontScaling={false} отключал системный размер шрифта — текст
// обрезался при крупном шрифте. FlowText переносит вместо обрезки.
import { FlowText } from '../components/text-integrity';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { LinearGradient } from 'expo-linear-gradient';
import AvatarView from '../components/AvatarView';
import {
  formatTimeLeft,
  METAL,
  motion,
  placeColor,
  radius,
  type,
  useTournamentPalette,
  type TournamentV2,
} from '../components/tournament/tournament_theme';
import { StarGlyph } from '../components/tournament/TournamentFx';
import { V2Counter } from '../components/tournament/tournament_v2_ui';
import { isTournamentBotPlayer, tournamentAvatarLevel, tournamentAvatarValue } from '../components/tournament/tournament_avatars';
import { TournamentEdgeState } from '../components/tournament/TournamentEdgeState';
import { TournamentBackdrop } from '../components/tournament/TournamentBackdrop';
import {
  hasTournamentTableSettledScores, isRoundState, orderTournamentPlayersForDisplay, resolveTournamentDisplayRoundNo, resolveTournamentRoomIdParam, shouldTableEnterRound, tournamentSharedPlacement, useTournamentRoom, type RoomPlayer } from './tournament_client';
import { getStableId } from './stable_id';
import { useLocalSearchParams } from 'expo-router';
import { closeTournamentFlow } from './tournament_navigation';
import { triLang, type Lang } from '../constants/i18n';
import { useLang } from '../components/LangContext';

/** Ступень оттенка акцента для полосы-рейтинга (прозрачность = насыщенность). */
function barTint(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${Math.max(0.05, Math.min(0.55, alpha))})`;
}

const ROW_HEIGHT = 56;
const ROW_GAP = 8;
const TOTAL_ROUNDS = 4;

type Row = {
  id: string;
  name: string;
  /** Значение для AvatarView: индекс или custom:... — НЕ эмодзи. */
  avatar: string;
  aura?: string;
  isBot: boolean;
  color: string;
  score: number;
  streak: number;
  isYou?: boolean;
  /** Shared competition place: equal scores produce 1, 1, 3. */
  place: number;
  /** Позиция в предыдущем раунде — для расчёта обгона. */
  prevPlace: number;
};

/**
 * Игроки комнаты → строки таблицы, отсортированные по очкам.
 *
 * зачем: сервер хранит игроков в порядке входа и НЕ считает места — это
 * витрина. Позицию прошлого раунда берём из предыдущего снимка, чтобы
 * показать обгоны; без неё строки просто встанут на места без анимации.
 */
function mapPlayersToRows(
  players: readonly RoomPlayer[],
  myId: string | null,
  previousPlaces: Map<string, number>,
  lang: Lang,
): Row[] {
  const ordered = orderTournamentPlayersForDisplay(players);
  const fallbackName = triLang(lang, { ru: 'Игрок', uk: 'Гравець', es: 'Jugador', 'pt-BR': 'Jogador', vi: 'Người chơi', id: 'Pemain', tr: 'Oyuncu', pl: 'Gracz' });
  return ordered.map((player, index) => {
    const place = tournamentSharedPlacement(ordered, index);
    return ({
    id: player.id,
    name: player.name || fallbackName,
    // зачем 2026-07-27: было эмодзи-«лицо» — правило владельца требует
    // НАСТОЯЩИЕ аватары приложения. Ботам они выдаются детерминированно.
    avatar: tournamentAvatarValue({ id: player.id, isBot: player.isBot, avatar: player.avatar }),
    aura: player.aura,
    // зачем (2026-08-04): сервер вырезает isBot из публичного документа —
    // прямое чтение поля всегда давало false (см. isTournamentBotPlayer).
    isBot: isTournamentBotPlayer(player),
    color: player.color || '#8AB49A',
    score: Number(player.score ?? 0),
    streak: Number(player.streak ?? 0),
    isYou: Boolean(myId) && player.id === myId,
    place,
    // Нет прошлой позиции (первый раунд) — стартуем с текущей, без «переезда».
    prevPlace: previousPlaces.get(player.id) ?? place,
  });
  });
}

export default function TournamentTableScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string | string[]; spectate?: string; completedRound?: string }>();
  const roomId = resolveTournamentRoomIdParam(params.roomId);
  const completedRound = typeof params.completedRound === 'string' ? Number(params.completedRound) : null;
  const runtimeActive = useRuntimeActive();
  /**
   * зачем: зрителю (решение владельца 2026-07-26) показываем ТУ ЖЕ таблицу,
   * что игроки видят между раундами, но постоянно — она не уводит в раунд и
   * живёт весь турнир. Один экран вместо второго такого же: перестановки,
   * полосы отрыва и чипы обгона уже здесь, дублировать их было бы ошибкой.
   */
  const spectating = params.spectate === '1';

  const { room, status, freshSnapshot, secondsLeft, retry } = useTournamentRoom(roomId, runtimeActive);
  const [myId, setMyId] = useState<string | null>(null);

  /**
   * Места предыдущего показа таблицы — источник анимации обгонов.
   * Держим в ref: обновление этой карты НЕ должно вызывать ре-рендер, иначе
   * строки переедут второй раз уже после приземления.
   */
  const previousPlacesRef = useRef<Map<string, number>>(new Map());
  const previousVisibleIndexesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void getStableId().then((id) => { if (!cancelled) setMyId(id); });
    return () => { cancelled = true; };
  }, []);

  const roundNo = resolveTournamentDisplayRoundNo(room?.state, completedRound);

  const rows = useMemo(
    () => mapPlayersToRows(room?.players ?? [], myId, previousPlacesRef.current, lang),
    [room?.players, myId, lang],
  );

  // Запоминаем позиции ПОСЛЕ отрисовки — для следующего показа таблицы.
  useEffect(() => {
    if (rows.length === 0) return;
    const next = new Map<string, number>();
    rows.forEach((row) => next.set(row.id, row.place));
    previousPlacesRef.current = next;
  }, [rows]);

  useEffect(() => {
    if (rows.length === 0) return;
    const next = new Map<string, number>();
    rows.forEach((row, index) => next.set(row.id, index));
    previousVisibleIndexesRef.current = next;
  }, [rows]);

  // Переход дальше по СЕРВЕРНОМУ состоянию: локальный таймер только рисует
  // обратный отсчёт, решение о смене этапа принимает сервер.
  useEffect(() => {
    if (!runtimeActive || !freshSnapshot || !room || !roomId) return;
    // Зритель не играет: в раунд его не уводим, он остаётся на табло.
    if (spectating) return;
    if (shouldTableEnterRound(room.state, completedRound)) {
      router.replace({ pathname: '/tournament_round', params: { roomId } });
    }
    if (room.state === 'results' || room.state === 'rewards' || room.state === 'closed') {
      router.replace({ pathname: '/tournament_results', params: { roomId } });
    }
  }, [completedRound, freshSnapshot, room?.state, roomId, router, room, runtimeActive, spectating]);

  // зачем: зритель должен уметь выйти с таблицы в любой момент — сервер его
  // отсюда не уводит. Возврат в хаб турниров, а не router.back(): на этот
  // экран попадают и по прямой ссылке, где истории навигации нет.
  const leaveTable = useCallback(() => closeTournamentFlow(router), [router]);

  const myScore = useMemo(() => rows.find((row) => row.isYou)?.score ?? 0, [rows]);
  const scoresSettled = hasTournamentTableSettledScores(room?.state, completedRound);
  const listHeight = Math.max(1, rows.length) * (ROW_HEIGHT + ROW_GAP);
  const maxScore = rows[0]?.score || 1;
  const isFinal = roundNo >= TOTAL_ROUNDS;
  // Зрителю показываем, что происходит прямо сейчас: идёт раунд или пауза.
  const liveLabel = isRoundState(room?.state)
    ? triLang(lang, { ru: `Раунд ${roundNo} идёт`, uk: `Раунд ${roundNo} триває`, es: `Ronda ${roundNo} en curso`, 'pt-BR': `Rodada ${roundNo} em andamento`, vi: `Vòng ${roundNo} đang diễn ra`, id: `Ronde ${roundNo} berlangsung`, tr: `Tur ${roundNo} sürüyor`, pl: `Runda ${roundNo} trwa` })
    : triLang(lang, { ru: 'Перерыв', uk: 'Перерва', es: 'Descanso', 'pt-BR': 'Intervalo', vi: 'Giải lao', id: 'Jeda', tr: 'Ara', pl: 'Przerwa' });

  if (status === 'offline') {
    return (
      <View style={styles.root}>
        <TournamentEdgeState kind="offline" onRetry={retry} />
      </View>
    );
  }
  if (room?.state === 'cancelled') {
    return (
      <View style={styles.root}>
        <TournamentEdgeState kind="cancelled" onRetry={() => closeTournamentFlow(router)} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TournamentBackdrop variant="table" />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {spectating
                ? triLang(lang, { ru: 'Смотрим турнир', uk: 'Дивимось турнір', es: 'Viendo el torneo', 'pt-BR': 'Assistindo ao torneio', vi: 'Đang xem giải đấu', id: 'Menonton turnamen', tr: 'Turnuvayı izliyoruz', pl: 'Oglądamy turniej' })
                : triLang(lang, { ru: 'Таблица', uk: 'Таблиця', es: 'Tabla', 'pt-BR': 'Tabela', vi: 'Bảng xếp hạng', id: 'Papan peringkat', tr: 'Tablo', pl: 'Tabela' })}
          </Text>
          <Text style={styles.subtitle}>{triLang(lang, { ru: `Раунд ${roundNo} из ${TOTAL_ROUNDS}`, uk: `Раунд ${roundNo} з ${TOTAL_ROUNDS}`, es: `Ronda ${roundNo} de ${TOTAL_ROUNDS}`, 'pt-BR': `Rodada ${roundNo} de ${TOTAL_ROUNDS}`, vi: `Vòng ${roundNo}/${TOTAL_ROUNDS}`, id: `Ronde ${roundNo} dari ${TOTAL_ROUNDS}`, tr: `Tur ${roundNo}/${TOTAL_ROUNDS}`, pl: `Runda ${roundNo} z ${TOTAL_ROUNDS}` })}</Text>
        </View>
        {/* Зритель не играет — своих очков у него нет, показываем лидера.
            Счётчик в языке V2: пилюля со звездой и bump при изменении. */}
        <V2Counter value={spectating ? (rows[0]?.score ?? 0) : myScore} tone="stars" />
        {/* зачем 2026-07-27 (владелец: «экран таблицы невозможно закрыть, нет
            крестика»): у ЗРИТЕЛЯ таблица — тупик, сервер его никуда не уводит
            (см. `if (spectating) return` выше), и выйти было нечем. Игроку
            крестик не даём: он в турнире, экран сменит сервер сам. */}
        {spectating ? (
          <TapScale onPress={leaveTable} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={P.text} />
          </TapScale>
        ) : null}
      </View>

      {/* Все 16 участников доступны всегда; фиксированная высота контента
          сохраняет FLIP-перестановку строк без layout shift. */}
      <ScrollView
        style={styles.tableScroll}
        contentContainerStyle={[styles.listContent, { height: listHeight }]}
        showsVerticalScrollIndicator
        nestedScrollEnabled
        accessibilityLabel={triLang(lang, { ru: 'Все участники турнира', uk: 'Всі учасники турніру', es: 'Todos los participantes del torneo', 'pt-BR': 'Todos os participantes do torneio', vi: 'Tất cả người tham gia giải đấu', id: 'Semua peserta turnamen', tr: 'Turnuvadaki tüm katılımcılar', pl: 'Wszyscy uczestnicy turnieju' })}
      >
        {rows.map((row, index) => (
          <TableRow
            key={row.id}
            row={row}
            place={row.place}
            layoutIndex={index}
            previousLayoutIndex={previousVisibleIndexesRef.current.get(row.id) ?? index}
            maxScore={maxScore}
            scoresSettled={scoresSettled}
            lang={lang}
          />
        ))}
      </ScrollView>

      {/* зачем 2026-08-03 (владелец: «на турнирной таблице надо точно показать
          таймер сколько ещё ждать»): секунды уже считались верно — сервер сам
          сокращает stateDeadlineAtMs, как только все живые игроки ответили
          (см. allRealSubmitted/TOURNAMENT_EARLY_ADVANCE_DELAY_MS в
          tournament_core.ts), поэтому secondsLeft не отстаёт и не забегает
          вперёд. Проблема была в подаче: число слитно с текстом одной мелкой
          строкой у самого низа экрана — легко не заметить. Таймер вынесен
          крупной отдельной строкой, тем же языком, что statusTimer в лобби и
          TimerRing в раунде задания. */}
      <View style={[styles.hintRow, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.hint}>
          {!scoresSettled
            ? triLang(lang, { ru: 'Ждём остальных', uk: 'Чекаємо на інших', es: 'Esperando a los demás', 'pt-BR': 'Esperando os outros', vi: 'Đang chờ những người khác', id: 'Menunggu yang lain', tr: 'Diğerleri bekleniyor', pl: 'Czekamy na resztę' })
            : spectating
            ? (isFinal ? triLang(lang, { ru: 'Финал — считаем итоги…', uk: 'Фінал — рахуємо підсумки…', es: 'Final: calculando resultados…', 'pt-BR': 'Final: calculando resultados…', vi: 'Chung kết — đang tính kết quả…', id: 'Final — menghitung hasil…', tr: 'Final — sonuçlar hesaplanıyor…', pl: 'Finał — liczymy wyniki…' }) : liveLabel)
            : (isFinal
                ? triLang(lang, { ru: 'Считаем итоги…', uk: 'Рахуємо підсумки…', es: 'Calculando resultados…', 'pt-BR': 'Calculando resultados…', vi: 'Đang tính kết quả…', id: 'Menghitung hasil…', tr: 'Sonuçlar hesaplanıyor…', pl: 'Liczymy wyniki…' })
                : triLang(lang, { ru: 'Следующий раунд через', uk: 'Наступний раунд через', es: 'Próxima ronda en', 'pt-BR': 'Próxima rodada em', vi: 'Vòng tiếp theo sau', id: 'Ronde berikutnya dalam', tr: 'Sonraki tur', pl: 'Następna runda za' }))}
        </Text>
        {(!scoresSettled || !isFinal) ? (
          <Text style={styles.hintTimer}>{formatTimeLeft(secondsLeft)}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Строка таблицы ──────────────────────────────────────────────────────────

const TableRow = memo(function TableRow({
  row, place, layoutIndex, previousLayoutIndex, maxScore, scoresSettled, lang,
}: {
  row: Row;
  lang: Lang;
  /**
   * Досчитан ли раунд сервером.
   *
   * зачем 2026-08-03 (владелец: «когда мы на турнирной таблице, мы видим
   * сначала нули, а я сказал показывать актуальную инфу вместо нулей»): пока
   * комната не вышла из round{N}, чужие результаты ещё не применены и score у
   * них РЕАЛЬНО равен нулю. Рисовать этот ноль — врать: у игрока не «ноль
   * звёзд», его результат просто ещё не пришёл. Показываем тире вместо цифры,
   * а как только сервер досчитал — настоящее число без всякой перезагрузки.
   */
  scoresSettled: boolean;
  place: number;
  layoutIndex: number;
  previousLayoutIndex: number;
  maxScore: number;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  // FLIP: строка стартует на СТАРОЙ позиции и пружиной переезжает на новую —
  // видно, кто кого обогнал, а не просто финальный порядок.
  const fromY = previousLayoutIndex * (ROW_HEIGHT + ROW_GAP);
  const toY = layoutIndex * (ROW_HEIGHT + ROW_GAP);
  const translateY = useSharedValue(fromY);
  // Rows are fully visible on the first frame. Only later rank changes use
  // FLIP motion; results must never look like another loading state.
  const revealOpacity = useSharedValue(1);
  const revealScale = useSharedValue(1);

  const overtook = row.prevPlace > place;
  // Пока чужие результаты не досчитаны, полоса не изображает «нулевой» рейтинг:
  // держим её на минимуме, чтобы длина не врала вместе с цифрой.
  const fillRatio = scoresSettled || row.isYou
    ? Math.max(0.12, row.score / maxScore)
    : 0.12;

  // зачем 2026-08-01 (аудит турнира): было 420 + index*30 — последняя из 16
  // строк начинала переезд только через 870 мс, и почти секунду таблица
  // выглядела замороженной вместо того, чтобы показывать обгоны. Каскад сверху
  // вниз сохранён (он и делает обгон читаемым), но сжат втрое.
  useEffect(() => {
    translateY.value = withDelay(
      90 + layoutIndex * 16,
      withSpring(toY, motion.reorder),
    );
  }, [layoutIndex, toY, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: revealOpacity.value,
    transform: [{ translateY: translateY.value }, { scale: revealScale.value }],
  }));

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      {/* Полоса-рейтинг: длина по очкам, оттенок — своя ступень акцента
          активной темы (требование владельца: «не только очки справа»). */}
      <View style={[styles.rowFill, { width: `${Math.max(12, fillRatio * 100)}%` }]} pointerEvents="none">
        <LinearGradient
          colors={[
            barTint(P.accent, row.isYou ? 0.42 : 0.34 - Math.min(0.2, place * 0.02)),
            barTint(P.accent, row.isYou ? 0.3 : 0.2 - Math.min(0.14, place * 0.015)),
          ]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.rowTopHi} pointerEvents="none" />

      {/* Призовое место — металл с тёплым бликом, остальные просто цифрой. */}
      {place <= 3 ? (
        <LinearGradient
          colors={place === 1 ? METAL.gold : place === 2 ? METAL.silver : METAL.bronze}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.medal}
        >
          {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- цифра внутри медали-круга 26×26: масштабирование разорвало бы кружок */}
          <Text style={styles.medalText} allowFontScaling={false}>{place}</Text>
        </LinearGradient>
      ) : (
        <FlowText testID="table-row-place" provenance="authored" style={[styles.place, { color: placeColor(place, P) }]}>
          {place}
        </FlowText>
      )}

      <AvatarView avatar={row.avatar} level={tournamentAvatarLevel(row.avatar)} auraId={row.aura} size={36} animateAura={false} />

      {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- ник в строке таблицы: перенос сломал бы фиксированную высоту ряда */}
      <Text
        style={[styles.name, row.isYou && { color: P.accent }]}
        numberOfLines={1}
      >
        {row.name}
      </Text>

      {/* зачем 2026-08-01: чип «обгон» ждал 700 мс и приезжал уже ПОСЛЕ того,
          как строки закончили переезд — подпись отставала от события, которое
          объясняет. Теперь появляется на подлёте строки к новому месту. */}
      {overtook ? (
        <Animated.View entering={FadeIn.delay(320).duration(200)} style={styles.overtakeChip}>
          <Text style={styles.overtakeText}>{triLang(lang, { ru: 'обгон', uk: 'обгін', es: 'adelanto', 'pt-BR': 'ultrapassou', vi: 'vượt lên', id: 'menyalip', tr: 'geçti', pl: 'wyprzedzenie' })}</Text>
        </Animated.View>
      ) : null}

      <View style={styles.scoreRow}>
        <StarGlyph size={13} color={P.gold} />
        {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- Animated.Text: счёт анимируется при обгоне, FlowText не оборачивает анимируемый текст */}
        <Animated.Text
          style={[styles.score, !scoresSettled && !row.isYou && styles.scorePending]}
          allowFontScaling={false}
        >
          {/* Свой результат известен всегда — он посчитан локально в раунде.
              Чужие до финализации показываем тире, а не лживым нулём. */}
          {scoresSettled || row.isYou ? row.score : '—'}
        </Animated.Text>
      </View>
    </Animated.View>
  );
});

const makeStyles = (P: TournamentV2) => StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg, paddingHorizontal: 16 },

  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16 },
  headerText: { flex: 1 },
  title: { ...type.title, color: P.text },
  subtitle: { ...type.body, color: P.muted, marginTop: 2 },
  myScoreBadge: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: P.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myScoreValue: {
    fontSize: 22,
    fontWeight: '900',
    color: P.accent,
    fontVariant: ['tabular-nums'],
  },

  tableScroll: { flex: 1 },
  // height приходит из listHeight: плашки позиционированы абсолютно.
  listContent: { position: 'relative' },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.card,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: P.card,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    overflow: 'hidden',
  },
  rowFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.md, overflow: 'hidden' },
  place: {
    width: 22,
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  medal: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  medalText: { fontSize: 12.5, fontWeight: '900', color: METAL.ink },
  rowTopHi: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: StyleSheet.hairlineWidth, backgroundColor: P.chipHi,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: P.text },
  streak: { fontSize: 13 },
  overtakeChip: {
    backgroundColor: P.accent,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  overtakeText: { fontSize: 11, fontWeight: '900', color: P.accentText },
  score: {
    width: 40,
    textAlign: 'right',
    fontSize: 17,
    fontWeight: '900',
    color: P.text,
    fontVariant: ['tabular-nums'],
  },
  // Тире вместо ещё не досчитанного результата — тише обычной цифры, чтобы
  // читалось как «ждём», а не как настоящий счёт.
  scorePending: { color: P.ghost },

  hint: { textAlign: 'center', ...type.body, color: P.ghost },
  hintRow: { alignItems: 'center', marginTop: 18, gap: 4 },
  hintTimer: {
    fontSize: 30,
    fontWeight: '900',
    color: P.text,
    fontVariant: ['tabular-nums'],
  },
});
