import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Arena V2 listener and callable source contract', () => {
  const client = fs.readFileSync(path.join(ROOT, 'app/arena_client.ts'), 'utf8');
  const matchmaking = fs.readFileSync(path.join(ROOT, 'app/arena_matchmaking.tsx'), 'utf8');

  test('listens only to an owner queue doc and one public match doc', () => {
    expect(client).toContain("useArenaDocument<ArenaTicket>('arena_v2_queue', stableUid, active)");
    expect(client).toContain("useArenaDocument<ArenaMatch>('arena_v2_matches', matchId, active)");
    expect(client).not.toMatch(/\.where\(|collectionGroup\(/);
  });

  test('stops listeners and timers outside runtime-active ownership', () => {
    expect(matchmaking).toContain('useRuntimeActive()');
    expect(matchmaking).toContain('active && !matchId');
    expect(matchmaking).toContain('clearTimeout(timer)');
    expect(matchmaking).toContain('clearInterval(heartbeat)');
  });

  test('waits for the server-assigned bot moment and refreshes ranked every fifteen seconds', () => {
    // Владелец (2026-08-12): момент входа бота назначает сервер (botDueAtMs),
    // фиксированных шести секунд на клиенте больше нет.
    expect(matchmaking).toContain('quickFallbackRequests.add(requestId)');
    expect(matchmaking).toContain('ARENA_QUICK_FALLBACK_MAX_MS');
    expect(matchmaking).toContain('adoptBotSchedule');
    expect(matchmaking).toContain('botDueAtMs');
    expect(matchmaking).not.toContain('ARENA_QUICK_FALLBACK_MS,');
    expect(matchmaking).toContain('ARENA_RANKED_HEARTBEAT_MS');
  });

  test('switches ranked to quick only after cancellation and with a new request id', () => {
    const cancelAt = matchmaking.indexOf('await arenaV2QueueCancel(requestId)');
    const newIdAt = matchmaking.indexOf("createArenaRequestId('queue')", cancelAt);
    const replaceAt = matchmaking.indexOf("mode: 'quick'", newIdAt);
    expect(cancelAt).toBeGreaterThan(0);
    expect(newIdAt).toBeGreaterThan(cancelAt);
    expect(replaceAt).toBeGreaterThan(newIdAt);
  });

  test('keeps one queue request id across a Strict Mode remount', () => {
    expect(matchmaking).toContain('implicitQueueRequestIds');
    expect(matchmaking).toContain('implicitQueueRequestId(mode)');
    expect(matchmaking).toContain('releaseImplicitQueueRequestId(mode, requestId)');
    expect(matchmaking).not.toContain("useRef(createArenaRequestId('queue'))");
  });

  test('pins the queue request id across renders and renews it for a changed route', () => {
    expect(matchmaking).toContain('const requestIdKey = explicitRequestId ? `explicit:${explicitRequestId}` : `implicit:${mode}`;');
    expect(matchmaking).toContain('const requestIdRef = useRef<{ key: string; value: string } | null>(null);');
    expect(matchmaking).toContain('if (requestIdRef.current?.key !== requestIdKey) {');
    expect(matchmaking).toContain('value: explicitRequestId ?? implicitQueueRequestId(mode),');
    expect(matchmaking).toContain('const requestId = requestIdRef.current.value;');
  });

  test('renews a long quick-search lease without changing its request id', () => {
    expect(matchmaking).toContain('const [leaseRefreshTick, setLeaseRefreshTick]');
    expect(matchmaking).toContain('Math.min(botDelayMs, 40_000)');
    /**
     * Проверяется НАЛИЧИЕ зависимостей, а не список целиком.
     *
     * Список целиком ломается от любой добавленной зависимости — то есть от
     * обычной, правильной правки эффекта. Смысл же здесь в другом: продление
     * аренды обязано перезапускать эффект, а идентификатор запроса обязан в
     * нём участвовать, чтобы не смениться молча.
     */
    for (const deps of matchmaking.match(/\}, \[[^\]]*\]\)/g) ?? []) {
      if (!deps.includes('leaseRefreshTick')) continue;
      expect(deps).toContain('requestId');
      expect(deps).toContain('mode');
    }
    expect(matchmaking).toContain('leaseRefreshTick');
    expect(matchmaking).toContain('botRetryTick');
  });

  test('does not show an awaiting-rival promise after sync confirms a terminal match', () => {
    const results = fs.readFileSync(path.join(ROOT, 'app/arena_results.tsx'), 'utf8');
    expect(results).toContain("setSyncState(String(response.state ?? ''))");
    expect(results).toContain("syncState !== 'settled' && syncState !== 'aborted'");
  });

  test('never follows a cached matched ticket from an older search', () => {
    expect(matchmaking).toContain("queue.value?.requestId === requestId && queue.value.status === 'matched'");
    expect(matchmaking).toContain('if (queue.value?.requestId === requestId) adoptBotSchedule(queue.value)');
  });

  test('uses presentation thresholds without a new listener or ranked polling loop', () => {
    expect(matchmaking).toContain("rankedPresentation === 'quick_offer'");
    expect(matchmaking).toContain("rankedPresentation === 'calm'");
    // Экран ПОИСКА соперника часы сохраняет: там секундный тик уместен, он
    // рисует ожидание, а не отбирает время у ответа.
    expect(matchmaking).toContain('useVisibleWallClock(active, 1_000)');
    expect(matchmaking.match(/useArenaQueue\(/g)).toHaveLength(1);
    expect(matchmaking.match(/setInterval\(/g)).toHaveLength(1);
  });

  test('never transports answer fingerprints to Arena screens', () => {
    expect(client).not.toContain('answerFingerprints');
    for (const file of ['arena.tsx', 'arena_matchmaking.tsx', 'arena_match.tsx', 'arena_results.tsx']) {
      expect(fs.readFileSync(path.join(ROOT, 'app', file), 'utf8')).not.toContain('answerFingerprints');
    }
  });

  test('stops all queue work and cancellation once a match is assigned', () => {
    expect(matchmaking).toContain('active && !matchId');
    expect(matchmaking).toContain('if (!active || matchId) return;');
    expect(matchmaking).toContain("if (!active || matchId || mode !== 'quick' || botDelayMs === null) return undefined;");
    expect(matchmaking).toContain('if (matchId || cancellingRef.current) return;');
    expect(matchmaking).toContain('backDisabled={Boolean(matchId)}');
    expect(matchmaking).toContain('disabled={Boolean(matchId)}');
  });

  test('prevents system back navigation and hides stale search failures after assignment', () => {
    expect(matchmaking).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(matchmaking).toContain('if (!active || !matchId) return undefined;');
    expect(matchmaking).toContain("BackHandler.addEventListener('hardwareBackPress', () => true)");
    expect(matchmaking).toContain('const searchFailure = !matchId && error ? arenaSearchFailureCopy(error) : null;');
    expect(matchmaking).toContain('setError(null);');
  });

  test('cancels assigned-match navigation and system-back interception when blurred', () => {
    const prefetchEffect = matchmaking.match(/useEffect\(\(\) => \{\s*if \(!active \|\| !matchId\) return;[\s\S]*?\}, \[active, entryRetryTick, matchId, mode, requestId, router\]\);/)?.[0];
    const backEffect = matchmaking.match(/useEffect\(\(\) => \{\s*if \(!active \|\| !matchId\) return undefined;[\s\S]*?\}, \[active, matchId\]\);/)?.[0];
    expect(prefetchEffect).toContain('let alive = true;');
    expect(prefetchEffect).toContain('return () => { alive = false; };');
    expect(backEffect).toContain("BackHandler.addEventListener('hardwareBackPress', () => true)");
    expect(backEffect).toContain('return () => subscription.remove();');
  });

  test('live rollout exposes only the approved display score, never identity, answers or economy', () => {
    const liveModel = fs.readFileSync(path.join(ROOT, 'modules/arena/live_channel.ts'), 'utf8');
    const publisher = client.match(
      /export async function arenaPublishLiveTicks[\s\S]*?(?=\/\*\*\s*\n \* Расписки матчей)/,
    )?.[0] ?? '';
    const serializer = liveModel.match(
      /export function arenaLiveWritePayload[\s\S]*?(?=\/\* ----------------------------- публикация)/,
    )?.[0] ?? '';
    expect(liveModel).toContain('matchStars?: number;');
    expect(publisher).toContain('arenaLiveWritePayload({');
    expect(serializer).toContain('schemaVersion: ARENA_LIVE_LEGACY_SCHEMA_VERSION');
    expect(serializer).toContain('{ matchStars: tick.matchStars }');
    expect(publisher).not.toContain('firstAttemptPairs');
    const publicWire = `${publisher}\n${serializer}`;
    for (const forbidden of ['answer', 'stableUid', 'authUid', 'balance', 'seasonStars', 'starsEarned', 'isBot']) {
      expect(publicWire).not.toMatch(new RegExp(`\\b${forbidden}\\s*:`));
    }
  });

  test('keeps solved speed-match pairs visibly locked from the server verdict', () => {
    const question = fs.readFileSync(path.join(ROOT, 'components/arena/ArenaQuestion.tsx'), 'utf8');
    expect(question).toContain('Promise<boolean>');
    expect(question).toContain('setMatchedLeft');
    expect(question).toContain('setMatchedRight');
    expect(question).toContain('void onSpeedAttempt(pairIndex, index).then');
  });

  test('sends the installed app version through the server release gate', () => {
    // Именно нормализованную версию, а не 'unknown' из аналитической: сервер
    // не разбирает 'unknown' и отвечает «обнови приложение» свежей сборке, а
    // хаб рисует на это «Арена не включена на сервере».
    expect(client).toContain('getVersionForServerGate');
    expect(client).not.toContain('getInstalledAppVersion(');
    expect(client).toContain('{ ...payload, clientVersion }');
  });

  test('keeps cumulative season and spin rewards in the personalized callable response', () => {
    const results = fs.readFileSync(path.join(ROOT, 'app/arena_results.tsx'), 'utf8');
    expect(client).toContain('viewerReward?: ArenaMatchReward');
    expect(results).toContain('response.viewerReward');
    expect(results).toContain('privateReward ??');
  });

  test('uses canonical stable identity and account-scoped immediate review cache', () => {
    const match = fs.readFileSync(path.join(ROOT, 'app/arena_match.tsx'), 'utf8');
    const review = fs.readFileSync(path.join(ROOT, 'app/arena_review.tsx'), 'utf8');
    const fetchReview = client.slice(
      client.indexOf('export async function arenaFetchMatchReview'),
      client.indexOf('/** Host-only friend-duel handoff', client.indexOf('export async function arenaFetchMatchReview')),
    );
    expect(fetchReview).toContain('scope: ArenaReviewAccountScope');
    expect(fetchReview).toContain(".collection('users').doc(scope.stableUid).collection('arena_v2_match_labs')");
    expect(fetchReview).not.toContain('getStableId()');
    expect(fetchReview).not.toContain('currentUser?.uid');
    expect(client).toContain('viewerReview?: readonly unknown[]');
    expect(match).toContain('response.viewerReview');
    expect(match.indexOf('const finishAccount = planAccountRef.current'))
      .toBeLessThan(match.indexOf('reserveDispatch: () => arenaV2MatchFinishDispatch({'));
    expect(match).toContain('isCurrentAccountGeneration(finishAccount, finishScope.stableUid)');
    expect(match).toContain('arenaRememberScopedReview({');
    expect(review).toContain('subscribeAccountGeneration');
    expect(review).toContain('arenaAwaitScopedReview({');
    expect(review).toContain('arenaPeekScopedReview(reviewScope, matchId');
    expect(review).toContain('arenaLoadScopedReview(warmStore, reviewScope, matchId');
    expect(review).toContain('setRaw(warmRows);');
    expect(review).toContain('setLoaded(warmRows !== null);');
    expect(review).toContain('setFailed(false);');
    expect(review).not.toContain("arenaPeekWarm('review'");
  });

  test('lets the owner consume an available Arena spin idempotently from the hub', () => {
    const hub = fs.readFileSync(path.join(ROOT, 'app/arena.tsx'), 'utf8');
    expect(hub).toContain('arenaV2SpinClaim(spinRequestIdRef.current)');
    expect(hub).toContain("createArenaRequestId('spin')");
    expect(hub).toContain("arenaText(lang, 'spinNow')");
  });

  /**
   * Договор перевёрнут владельцем (2026-08-12): «должны быть продуманные боты,
   * и юзер не должен догадываться, что это боты».
   *
   * Раньше тест ТРЕБОВАЛ строку «Тренировочный соперник» — то есть требовал
   * ровно того, что теперь запрещено. Теперь он требует обратного: раскрытия
   * нет нигде, а честное предупреждение про дружескую дуэль без наград —
   * остаётся, это про экономику, а не про соперника.
   */
  test('never discloses bots, still warns that friend duels pay nothing', () => {
    const copy = fs.readFileSync(path.join(ROOT, 'modules/arena/copy.ts'), 'utf8');
    expect(copy).not.toContain('Тренировочный соперник');
    expect(copy).toContain('Без рейтинга и наград');
    const matchSource = fs.readFileSync(path.join(ROOT, 'app/arena_match.tsx'), 'utf8');
    expect(matchSource).toContain('<ArenaPlayers compact={immersive} players={players} active={active} animateScore />');
    expect(matchSource).not.toContain('isBot');
    expect(matchSource).not.toContain("arenaText(lang, 'bot')");
    expect(fs.readFileSync(path.join(ROOT, 'app/arena_friend_duel.tsx'), 'utf8')).toContain("arenaText(lang, 'friendHint')");
  });

  /**
   * Договор переписан вместе с матчем (дуэль v3).
   *
   * Раньше экран держал общие часы с тиком раз в секунду и досинхронизировался
   * с сервером по дедлайну. Владелец потребовал убрать задержки целиком:
   * «даже 1 секунда недопустима». Тик раз в секунду промахивается мимо конца
   * окна на полтика, а синхронизация по дедлайну — это обращение к сети прямо
   * посреди матча.
   *
   * Теперь матч идёт на устройстве: точный таймер на границу фазы (в хуке) и
   * ни одного обращения к серверу между планом и отчётом. Проверяем именно
   * это, а не отсутствие старых строк.
   */
  test('runs the match locally with no per-second clock and no mid-match server calls', () => {
    const match = fs.readFileSync(path.join(ROOT, 'app/arena_match.tsx'), 'utf8');
    expect(match).toContain('useArenaLocalMatch');
    // Никаких часов с периодическим тиком на экране матча.
    expect(match).not.toContain('useVisibleWallClock');
    expect(match).not.toContain('setInterval(');
    // И никакой досинхронизации посреди матча.
    expect(match).not.toContain('arenaV2SyncMatch');
    expect(match).not.toContain("arenaText(lang, 'serverCheck')");
    // План приходит через общий entry-prefetch; экран не владеет вторым запросом.
    expect(match).toContain('arenaEntryPrefetchStart(matchId)');
    expect(match).not.toContain('arenaV2MatchPlan(matchId)');
    expect(match).not.toContain('arenaV2MatchAccept(matchId)');
    expect(match).toContain('arenaV2MatchFinishDispatch(');
    expect(match).toContain('arenaV2MatchSettle(matchId)');
    expect(match).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(match).toContain('onBack={confirmForfeit}');
  });

  test('uses the shared entry-prefetch coordinator across matchmaking remounts', () => {
    const match = fs.readFileSync(path.join(ROOT, 'app/arena_match.tsx'), 'utf8');
    const entryPrefetch = fs.readFileSync(path.join(ROOT, 'app/arena_entry_prefetch.ts'), 'utf8');
    expect(entryPrefetch).toContain('createArenaEntryPrefetch({');
    expect(entryPrefetch).toContain('export const arenaEntryPrefetchStart = arenaEntryPrefetch.start;');
    expect(entryPrefetch).toContain('export const arenaEntryPrefetchClaim = arenaEntryPrefetch.claim;');
    expect(match).toContain('arenaEntryPrefetchClaim(matchId)');
    expect(match).not.toContain('arenaMatchPlanRequests');
    expect(match).toContain('[active, matchId, plan, planError, planScope, restoreChecked, restored]');
  });

  /** Точный таймер живёт в хуке — единственном месте с эффектами. */
  test('schedules the phase boundary exactly, not on a fixed tick', () => {
    const hook = fs.readFileSync(path.join(ROOT, 'hooks/use_arena_local_match.ts'), 'utf8');
    expect(hook).toContain('arenaLocalNextBoundaryMs');
    expect(hook).toContain('setTimeout(');
    expect(hook).not.toContain('setInterval(');
  });

  test('keeps prominent motion finite and reduced-motion aware', () => {
    const match = fs.readFileSync(path.join(ROOT, 'app/arena_match.tsx'), 'utf8');
    const results = fs.readFileSync(path.join(ROOT, 'app/arena_results.tsx'), 'utf8');
    expect(match).toContain('FadeIn.duration(120)');
    expect(match).toContain('SlideInRight.duration(v2motion.taskSwapMs)');
    expect(results).toContain('reduceMotion');
    expect(results).toContain('fxRef.current?.confetti');
    expect(match).not.toContain('withRepeat(');
    expect(results).not.toContain('withRepeat(');
  });
});
