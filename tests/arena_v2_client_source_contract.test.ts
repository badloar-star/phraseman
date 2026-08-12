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
    expect(matchmaking).toContain('clearTimeout(fallback)');
    expect(matchmaking).toContain('clearInterval(heartbeat)');
  });

  test('uses one six-second quick fallback and a fifteen-second ranked refresh', () => {
    expect(matchmaking).toContain('quickFallbackRequests.add(requestId)');
    expect(matchmaking).toContain('ARENA_QUICK_FALLBACK_MS');
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

  test('uses presentation thresholds without a new listener or ranked polling loop', () => {
    expect(matchmaking).toContain("rankedPresentation === 'quick_offer'");
    expect(matchmaking).toContain("rankedPresentation === 'calm'");
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

  test('keeps solved speed-match pairs visibly locked from the server verdict', () => {
    const question = fs.readFileSync(path.join(ROOT, 'components/arena/ArenaQuestion.tsx'), 'utf8');
    expect(question).toContain('Promise<boolean>');
    expect(question).toContain('setMatchedLeft');
    expect(question).toContain('setMatchedRight');
    expect(question).toContain('void onSpeedAttempt(pairIndex, index).then');
  });

  test('sends the installed app version through the server release gate', () => {
    expect(client).toContain('getInstalledAppVersion');
    expect(client).toContain('{ ...payload, clientVersion }');
  });

  test('keeps cumulative season and spin rewards in the personalized callable response', () => {
    const results = fs.readFileSync(path.join(ROOT, 'app/arena_results.tsx'), 'utf8');
    expect(client).toContain('viewerReward?: ArenaMatchReward');
    expect(results).toContain('response.viewerReward');
    expect(results).toContain('privateReward ??');
  });

  test('lets the owner consume an available Arena spin idempotently from the hub', () => {
    const hub = fs.readFileSync(path.join(ROOT, 'app/arena.tsx'), 'utf8');
    expect(hub).toContain('arenaV2SpinClaim(spinRequestIdRef.current)');
    expect(hub).toContain("createArenaRequestId('spin')");
    expect(hub).toContain("arenaText(lang, 'spinNow')");
  });

  test('discloses bots and non-reward friend duels with localized copy', () => {
    const copy = fs.readFileSync(path.join(ROOT, 'modules/arena/copy.ts'), 'utf8');
    expect(copy).toContain('Тренировочный соперник');
    expect(copy).toContain('Без рейтинга и наград');
    expect(fs.readFileSync(path.join(ROOT, 'app/arena_match.tsx'), 'utf8')).toContain("botLabel={arenaText(lang, 'bot')}");
    expect(fs.readFileSync(path.join(ROOT, 'app/arena_friend_duel.tsx'), 'utf8')).toContain("arenaText(lang, 'friendHint')");
  });

  test('uses the shared foreground clock and one deadline sync per match version', () => {
    const match = fs.readFileSync(path.join(ROOT, 'app/arena_match.tsx'), 'utf8');
    expect(match).toContain('useVisibleWallClock(active, 1_000)');
    expect(match).toContain('deadlineSyncAttemptsRef.current.has(key)');
    expect(match).toContain('arenaV2SyncMatch(matchId, match.version)');
    expect(match).not.toContain('setInterval(');
    expect(match).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(match).toContain('onBack={confirmForfeit}');
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
