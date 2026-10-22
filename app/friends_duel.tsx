/**
 * «Дуэль на 5 фраз» (идея 3) — экран хода и его итог: пять «Собери фразу» с таймером, затем «Ход отправлен», «Ход готов»
 * (без сети) или итог.
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html, идея 3: «Фраза 2 из 5», «Верно», «Ход отправлен»,
 * «Ход без сети», «Победа», «Поражение»): полный экран, как занятие. Фразы — из курса на телефоне по id (duel_phrase_source),
 * ход — только локально (use_duel_play), сеть догоняет фоном (duel_client): после пятой фразы сразу «Ход отправлен» со своими
 * отметками; нет сети — «Ход готов · сохранён на телефоне»; ход друга вернул итог — экран итога.
 * Адрес — граница системы: всё проверяет duel_launch. За выключателем FRIENDS_TOGETHER_UI_ENABLED.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { FlowText } from '../components/text-integrity';
import { useFriendsGlass } from '../components/friends/FriendsGlassKit';
import { useIsPlus } from '../components/plus/use_is_plus';
import DuelPlayTopBar, { DuelCloseButton } from '../components/friends_together/DuelPlayTopBar';
import DuelPhraseBoard from '../components/friends_together/DuelPhraseBoard';
import FriendDuelResultView, { type DuelPhraseRow } from '../components/friends_together/FriendDuelResultView';
import FriendSheetButton from '../components/friends_together/FriendSheetButton';
import type { DuelSide } from '../components/friends_together/DuelVersus';
import { useMyCoinRank } from '../hooks/use_my_coin_rank';
import { useDuelPlay } from '../hooks/use_duel_play';
import { triLang } from '../constants/i18n';
import { maskUid } from './diagnostic_mask';
import { safeRouterBack } from './navigation_back';
import { FRIENDS_TOGETHER_UI_ENABLED } from './friends_together/together_config';
import { DUEL_PHRASES, duelCorrect, duelOutcome, type DuelMove, type DuelOutcome } from './friends_together/duel_core';
import { duelCopy, duelOutcomeLine } from './friends_together/duel_copy';
import { duelClock, duelPlayCopy, duelProgressLabel } from './friends_together/duel_play_copy';
import { parseDuelLaunch, type DuelLaunch } from './friends_together/duel_launch';
import { resolveDuelPhrasesOnPhone } from './friends_together/duel_phrase_source';
import { submitDuelChallenge, submitDuelMove, type DuelChallengeResult, type DuelMoveResult } from './friends_together/duel_client';
import { recordSentDuel } from './friends_together/duel_ledger';
import { markUserNotificationsRead } from './user_notifications';
import { requestDuelRematch } from './friends_together/duel_intents';
import type { Lang } from '../constants/i18n';

const LOG = '[FRIENDS-DUEL]';
// зачем (правило «сперва логи»): ранние выходы, ответы сети и закрытие экрана — по строке на шаг, один префикс для поиска.
function log(line: string): void { console.log(`${LOG} ${line}`); } // guard-ok: журнал дуэли — шаги экрана, не кадры
function warn(line: string): void { console.warn(`${LOG} ${line}`); } // guard-ok: журнал дуэли — отказы и сбои сети

type TheirMove = Readonly<{ correct: number; elapsedMs: number; results: readonly boolean[] }>;
/** Что рисует экран итога: после своего хода или из строки «Итог дуэли» (режим result). */
type DuelSummary = Readonly<{
  kind: 'waiting' | 'offline' | 'result';
  mineCorrect: number;
  mineMs: number;
  mineResults: readonly boolean[] | null;
  outcome: DuelOutcome | null;
  theirs: TheirMove | null;
}>;
type DuelFinish =
  | Readonly<{ kind: 'waiting' | 'offline'; move: DuelMove }>
  | Readonly<{ kind: 'result'; move: DuelMove; outcome: DuelOutcome; theirs: TheirMove }>
  | Readonly<{ kind: 'rejected'; move: DuelMove; title: string; body: string }>;

/** Что показать после ответа сервера на вызов. ok — остаёмся на «Ход отправлен». */
function finishAfterChallenge(res: DuelChallengeResult, move: DuelMove, lang: Lang): DuelFinish | null {
  if (res.ok) return null;
  if (res.reason === 'network' || res.reason === 'no_sender') return { kind: 'offline', move };
  const body = res.reason === 'limit' ? duelCopy(lang, 'limit') : res.reason === 'open_duel' ? duelCopy(lang, 'openDuel') : duelPlayCopy(lang, 'tryLater');
  return { kind: 'rejected', move, title: duelPlayCopy(lang, 'rejectedTitle'), body };
}

/** Что показать после ответа сервера на ход друга: итог, «Ход готов» без сети или почему не принят. */
function finishAfterMove(res: DuelMoveResult, move: DuelMove, lang: Lang): DuelFinish {
  if (res.ok) {
    const local = duelOutcome(move, { results: res.theirs.results, elapsedMs: res.theirs.elapsedMs });
    if (local !== res.outcome) warn(`outcome: сервер=${res.outcome} телефон=${local} — показываем серверный (решает сервер)`);
    return { kind: 'result', move, outcome: res.outcome, theirs: res.theirs };
  }
  if (res.reason === 'network' || res.reason === 'no_sender') return { kind: 'offline', move };
  if (res.reason === 'expired') return { kind: 'rejected', move, title: duelPlayCopy(lang, 'expiredTitle'), body: '' };
  if (res.reason === 'already_moved') return { kind: 'rejected', move, title: duelPlayCopy(lang, 'alreadyMoved'), body: '' };
  return { kind: 'rejected', move, title: duelPlayCopy(lang, 'errorTitle'), body: duelPlayCopy(lang, 'tryLater') };
}

/** Экран-сообщение: «Дуэль не открылась», «Время на ход вышло» и т. п. — крестик, заголовок, строка и «К друзьям». */
function DuelMessage({ title, body, lang, onClose }: Readonly<{ title: string; body: string; lang: Lang; onClose: () => void }>) {
  const { glass, textScale } = useFriendsGlass();
  return (
    <View style={styles.page}>
      <View style={styles.resultHeader}>
        <DuelCloseButton label={duelPlayCopy(lang, 'close')} onPress={onClose} />
      </View>
      <View style={styles.message}>
        <FlowText testID="friend-duel-message-title" provenance="authored" accessibilityRole="header" style={[styles.center, { color: glass.text, fontWeight: '700', fontSize: 22 * textScale, lineHeight: 28 * textScale }]}>
          {title}
        </FlowText>
        {body ? (
          <FlowText testID="friend-duel-message-body" provenance="authored" style={[styles.center, { marginTop: 10, color: glass.secondary, fontSize: 16 * textScale, lineHeight: 22 * textScale }]}>
            {body}
          </FlowText>
        ) : null}
        <FriendSheetButton glass={glass} textScale={textScale} tone="primary" pill="m" label={duelCopy(lang, 'toFriends')} testID="friend-duel-message-to-friends" onPress={onClose} style={styles.messageButton} />
      </View>
    </View>
  );
}

function FriendsDuelScreen() {
  const raw = useLocalSearchParams<{
    mode?: string; friend?: string; name?: string; rank?: string; plus?: string; ids?: string; duel?: string; me?: string; n?: string;
    out?: string; mc?: string; mt?: string; mr?: string; tc?: string; tt?: string; tr?: string;
  }>();
  const { lang } = useLang();
  const { glass, textScale } = useFriendsGlass();
  const router = useRouter();
  const myCoinRank = useMyCoinRank();
  const myIsPlus = useIsPlus();
  const meFallback = triLang(lang, { ru: 'Я', uk: 'Я', en: 'Me', es: 'Yo', 'pt-BR': 'Eu', vi: 'Tôi', id: 'Saya', tr: 'Ben', pl: 'Ja' });
  const { mode, friend, name, rank, plus, ids, duel, me, n, out, mc, mt, mr, tc, tt, tr } = raw;
  const check = useMemo(
    () => parseDuelLaunch({ mode, friend, name, rank, plus, ids, duel, me, n, out, mc, mt, mr, tc, tt, tr }, meFallback),
    [mode, friend, name, rank, plus, ids, duel, me, n, out, mc, mt, mr, tc, tt, tr, meFallback],
  );
  const launch: DuelLaunch | null = check.ok ? check.launch : null;
  const phrases = useMemo(() => {
    if (!check.ok) {
      warn(`route: адрес не принят (${check.reason}) → «Дуэль не открылась»`);
      return null;
    }
    const startedAt = Date.now();
    const isResult = check.launch.mode === 'result';
    // зачем: итог без фраз (старый сервер) или с фразами, которых нет в этой версии курса, — показываем без таблицы, а не ошибку
    const resolved = isResult && check.launch.phraseIds.length === 0 ? [] : resolveDuelPhrasesOnPhone(check.launch.phraseIds, lang);
    log(`route: режим=${check.launch.mode} друг=${maskUid(check.launch.friendUid)} дуэль=${check.launch.duelId ? maskUid(check.launch.duelId) : '—'} фраз=${resolved?.length ?? 0} ms=${Date.now() - startedAt}`);
    return resolved ?? (isResult ? [] : null);
  }, [check, lang]);

  const [finish, setFinish] = useState<DuelFinish | null>(null);
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  const applyServer = useCallback((next: DuelFinish | null, what: string) => {
    if (!aliveRef.current) {
      log(`${what}: экран уже закрыт — ответ только в журнал (${next ? next.kind : 'waiting'})`);
      return;
    }
    if (next) setFinish(next);
    log(`${what}: показываем ${next ? next.kind : 'waiting'}`);
  }, []);

  const onFinish = useCallback((move: DuelMove) => {
    if (!launch) return;
    // Optimistic UI: «Ход отправлен» и свои отметки — сразу; сеть догоняет фоном и поправит на «Ход готов» или итог.
    setFinish({ kind: 'waiting', move });
    if (launch.mode === 'challenge') {
      void submitDuelChallenge({ friendUid: launch.friendUid, phraseIds: launch.phraseIds, move })
        .then((res) => {
          // зачем (лимит «три в день», «дуэль уже идёт»): вызов ушёл или ждёт сети на телефоне — шторка вызова узнает об этом без сервера
          if (res.ok || res.reason === 'network' || res.reason === 'no_sender') void recordSentDuel(launch.friendUid);
          applyServer(finishAfterChallenge(res, move, lang), 'challenge');
        })
        .catch((error: unknown) => {
          warn(`challenge: сбой отправки (${error instanceof Error ? error.message : String(error)}) → «Ход готов»`);
          applyServer({ kind: 'offline', move }, 'challenge');
        });
      return;
    }
    if (!launch.duelId) {
      warn(`move: ответ без номера дуэли — не отправляем`);
      return;
    }
    // зачем: вызов сыгран (ход на телефоне или в сети) — строка вызова гаснет, маркер-щит уходит; вышел посреди хода — остаётся
    if (launch.notificationId) void markUserNotificationsRead([launch.notificationId]);
    void submitDuelMove({ duelId: launch.duelId, move })
      .then((res) => applyServer(finishAfterMove(res, move, lang), 'move'))
      .catch((error: unknown) => {
        warn(`move: сбой отправки (${error instanceof Error ? error.message : String(error)}) → «Ход готов»`);
        applyServer({ kind: 'offline', move }, 'move');
      });
  }, [applyServer, lang, launch]);

  const play = useDuelPlay(phrases, onFinish);

  const close = useCallback(() => {
    log(`close этап=${finish ? finish.kind : launch?.mode === 'result' ? 'итог' : `фраза ${play.state.index + 1} из ${DUEL_PHRASES}${play.state.verdict ? ' (проверена)' : ''}`}`);
    safeRouterBack(router);
  }, [finish, launch?.mode, play.state.index, play.state.verdict, router]);

  // зачем (решение координатора 22.10, макет «Реванш» в одно касание): новый вызов от нажавшего — назад во «Друзей»,
  // вкладка забирает просьбу при возврате фокуса и открывает шторку вызова этому другу
  const rematch = useCallback(() => {
    if (!launch) return;
    requestDuelRematch(launch.friendUid);
    safeRouterBack(router);
  }, [launch, router]);

  if (!launch || !phrases) {
    return <DuelMessage title={duelPlayCopy(lang, 'errorTitle')} body={duelPlayCopy(lang, 'errorBody')} lang={lang} onClose={close} />;
  }

  if (finish?.kind === 'rejected') {
    return <DuelMessage title={finish.title} body={finish.body} lang={lang} onClose={close} />;
  }

  // зачем (идея 3): итог у вызвавшего — только просмотр, всё из строки «Итог дуэли»; после своего хода — из ответа сервера
  const summary: DuelSummary | null = launch.mode === 'result' && launch.result
    ? {
      kind: 'result',
      mineCorrect: launch.result.mine.correct,
      mineMs: launch.result.mine.elapsedMs,
      mineResults: launch.result.mine.results,
      outcome: launch.result.outcome,
      theirs: launch.result.theirs,
    }
    : finish
      ? {
        kind: finish.kind,
        mineCorrect: duelCorrect(finish.move),
        mineMs: finish.move.elapsedMs,
        mineResults: finish.move.results,
        outcome: finish.kind === 'result' ? finish.outcome : null,
        theirs: finish.kind === 'result' ? finish.theirs : null,
      }
      : null;

  if (summary) {
    const meSide: DuelSide = { name: launch.myName, coinRank: myCoinRank, isPlus: myIsPlus, score: String(summary.mineCorrect), note: duelClock(summary.mineMs) };
    const friendSide: DuelSide = summary.theirs
      ? { name: launch.friendName, coinRank: launch.friendCoinRank, isPlus: launch.friendIsPlus, score: String(summary.theirs.correct), note: duelClock(summary.theirs.elapsedMs) }
      : { name: launch.friendName, coinRank: launch.friendCoinRank, isPlus: launch.friendIsPlus, score: '?', note: duelPlayCopy(lang, 'friendTurn') };
    // Своих отметок нет (старый сервер) или фраз нет в этой версии курса — таблицу не показываем, счёт и исход остаются.
    const mineResults = summary.mineResults;
    const rows: DuelPhraseRow[] = mineResults && phrases.length === DUEL_PHRASES
      ? phrases.map((p, i) => ({
        key: p.id,
        target: p.targetPhrase,
        meaning: p.goal,
        mine: mineResults[i] === true,
        theirs: summary.theirs ? summary.theirs.results[i] ?? null : null,
      }))
      : [];
    return (
      <View style={styles.page}>
        <View style={styles.resultHeader}>
          <DuelCloseButton label={duelPlayCopy(lang, 'close')} onPress={close} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
          <FriendDuelResultView
            mode={summary.kind}
            me={meSide}
            friend={friendSide}
            outcome={summary.outcome ?? undefined}
            outcomeLine={summary.outcome && summary.theirs ? duelOutcomeLine(lang, summary.outcome, summary.mineCorrect, summary.theirs.correct, summary.mineMs, summary.theirs.elapsedMs) : undefined}
            rows={rows}
            onRematch={summary.kind === 'result' ? rematch : undefined}
            onToFriends={close}
          />
        </ScrollView>
      </View>
    );
  }

  const { state } = play;
  return (
    <View style={styles.page}>
      <DuelPlayTopBar
        current={state.index + 1}
        total={DUEL_PHRASES}
        progressLabel={duelProgressLabel(lang, state.index + 1, DUEL_PHRASES)}
        closeLabel={duelPlayCopy(lang, 'close')}
        timeLabel={duelPlayCopy(lang, 'time')}
        startedAtMs={state.startedAtMs}
        frozenMs={state.verdict?.ms ?? null}
        textScale={textScale}
        onClose={close}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.playContent} showsVerticalScrollIndicator={false}>
        {play.phrase ? (
          <DuelPhraseBoard key={play.phrase.id} phrase={play.phrase} picked={state.picked} verdict={state.verdict} lang={lang} textScale={textScale} onAppend={play.append} onRemoveAt={play.removeAt} />
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        {state.verdict ? (
          <FriendSheetButton glass={glass} textScale={textScale} tone="primary" pill="l" label={duelPlayCopy(lang, 'next')} testID="friend-duel-next" onPress={play.next} />
        ) : (
          <FriendSheetButton glass={glass} textScale={textScale} tone={play.canCheck ? 'primary' : 'off'} pill="l" label={duelPlayCopy(lang, 'check')} testID="friend-duel-check" onPress={play.check} />
        )}
      </View>
    </View>
  );
}

export default function FriendsDuelRoute() {
  if (!FRIENDS_TOGETHER_UI_ENABLED) {
    log(`route: выключатель FRIENDS_TOGETHER_UI_ENABLED=false → вкладка «Друзья»`);
    return <Redirect href="/(tabs)/friends" />;
  }
  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ContentWrap>
          <FriendsDuelScreen />
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 20 },
  scroll: { flex: 1 },
  playContent: { paddingBottom: 24 },
  // `.foot`: поля 12/20 (низ — безопасная зона + 12).
  footer: { paddingTop: 12, paddingBottom: 12 },
  // `.ldh`: от 48, отступ 2.
  resultHeader: { minHeight: 48, marginTop: 2, flexDirection: 'row', alignItems: 'center' },
  resultContent: { paddingBottom: 24 },
  message: { flex: 1, justifyContent: 'center', paddingBottom: 48 },
  messageButton: { marginTop: 20 },
  center: { textAlign: 'center' },
});
