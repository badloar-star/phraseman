import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function listSourceFiles(relativeDirs: string[]): string[] {
  const out: string[] = [];
  const visit = (absoluteDir: string) => {
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      const absolutePath = path.join(absoluteDir, entry.name);
      const relativePath = path.relative(ROOT, absolutePath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        if (relativePath.includes('/admin_panel/')) continue;
        visit(absolutePath);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (relativePath.includes('/_admin') || relativePath.includes('/admin_')) continue;
      out.push(relativePath);
    }
  };
  relativeDirs.forEach((dir) => visit(path.join(ROOT, dir)));
  return out.sort();
}

describe('owner runtime direction contract', () => {
  it('keeps startup fast: first UI is not blocked by cloud/network warmups', () => {
    const source = read('app/_layout.tsx');

    // safetyTimer объявляется через let в области эффекта и взводится внутри bootstrap.
    expect(source).toContain('safetyTimer = setTimeout(() => setReady(true), 1200)');
    expect(source).toContain('const appCheckWarmup = Promise.race');
    expect(source).toContain('new Promise<void>((resolve) => setTimeout(resolve, 1200))');
    expect(source).toContain('const startupLocalHydration = Promise.all');
    expect(source).toContain('new Promise<void>((resolve) => setTimeout(resolve, 350))');
    expect(source).toContain('InteractionManager.runAfterInteractions');
    expect(source).toContain('runHeavyInitRef.current?.()');

    // Boot-гидратация (restore через bootCoordinator) строго предшествует boot-syncToCloud:
    // sync пушится только внутри hydrate.then и только при shouldSync.
    expect(source).toContain('const hydrate = cloudHydratePromise ?? bootCoordinator.run();');
    expect(source).toContain('if (bootRestoreOutcome.shouldSync) {');
    expect(source.indexOf('const hydrate = cloudHydratePromise ?? bootCoordinator.run();')).toBeLessThan(
      source.indexOf('await syncToCloud().catch'),
    );
  });

  it('keeps root startup identity and onboarding storage reads batched', () => {
    const source = read('app/_layout.tsx');
    const start = source.indexOf('const bootstrap = async () => {');
    const end = source.indexOf('let handledByReferrer = false;', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const startupLocalBlock = source.slice(start, end);

    expect(startupLocalBlock).toContain('const startupIdentityKeys = forceOnboardingForQA');
    expect(startupLocalBlock).toContain("['user_prev_xp', 'user_total_xp', 'onboarding_done']");
    expect(startupLocalBlock).toContain('const startupIdentityPairs = await AsyncStorage.multiGet(startupIdentityKeys)');
    expect(startupLocalBlock).toContain("const prevXPRaw = startupIdentity.get('user_prev_xp') ?? null");
    expect(startupLocalBlock).toContain("const totalXPRaw = startupIdentity.get('user_total_xp') ?? null");
    expect(startupLocalBlock).toContain("const val = forceOnboardingForQA ? null : (startupIdentity.get('onboarding_done') ?? null)");
    expect(startupLocalBlock).not.toContain("AsyncStorage.getItem('user_prev_xp')");
    expect(startupLocalBlock).not.toContain("AsyncStorage.getItem('user_total_xp')");
    expect(startupLocalBlock).not.toContain("AsyncStorage.getItem('onboarding_done')");
  });

  it('keeps runtime UI free of unapproved expo-blur surfaces after owner removal request', () => {
    const offenders: string[] = [];

    for (const file of listSourceFiles(['app', 'components', 'hooks', 'contexts'])) {
      const source = read(file);
      const hasRuntimeBlur =
        source.includes("from 'expo-blur'") ||
        source.includes('from "expo-blur"') ||
        source.includes('<BlurView') ||
        source.includes('dimezisBlurView');
      if (hasRuntimeBlur) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps broad cloud sync debounced unless a caller explicitly opts into forceNow', () => {
    const source = read('app/cloud_sync.ts');

    expect(source).toContain('const SYNC_DEBOUNCE_MS = 5 * 60_000');
    expect(source).toContain('let syncTimer: ReturnType<typeof setTimeout> | null = null');
    expect(source).toContain('let syncInFlight: Promise<void> | null = null');
    expect(source).toContain('let pendingSync = false');
    expect(source).toContain('if (syncInFlight) return');
    expect(source).toContain('if (options?.forceNow)');
    expect(source).toContain('if (options?.deferMs !== undefined)');
    expect(source).toContain('if (syncTimer) return');
    expect(source).toContain('const elapsed = now - lastSuccessfulSyncAt');
    expect(source).toContain('const waitMs = Math.max(500, SYNC_DEBOUNCE_MS - elapsed)');
  });

  it('keeps immediate forceNow cloud sync call sites owner-reviewed', () => {
    const allowlist: Record<string, number> = {
      // Two account-boundary syncs are deliberate: pre-swap preservation and
      // post-link recovery after RevenueCat/auth restoration.
      'app/auth_provider.ts': 2,
      'app/avatar_select.tsx': 1,
      'app/lesson1.tsx': 2,
      'app/lesson_complete.tsx': 1,
      'app/premium_revenuecat_state.ts': 1,
      // Покупка уровня карточки прямо из модала профиля (превью-на-месте, 2026-07-05):
      // смена вида публичная — бейдж в списках должен обновиться немедленно.
      'components/PlayerProfileModal.tsx': 1,
      // xp_manager потерял свой forceNow-вызов в b687f4b80 (MVP «Разговорного клуба») —
      // аллоулист приведён к факту 2026-07-05.
    };
    const pattern = /(?:\b\w+\.)?syncToCloud\s*\(\s*\{\s*forceNow\s*:\s*true\s*\}/g;
    const found: Record<string, number> = {};

    for (const file of listSourceFiles(['app', 'components', 'hooks'])) {
      const lines = read(file).split(/\r?\n/);
      for (const line of lines) {
        if (line.trim().startsWith('//')) continue;
        const matches = line.match(pattern);
        if (matches) found[file] = (found[file] ?? 0) + matches.length;
      }
    }

    expect(found).toEqual(allowlist);
  });

  it('keeps non-critical avatar cosmetic sync deferred and profile-card purchase sync immediate', () => {
    const avatarSource = read('app/avatar_select.tsx');
    const customizationService = read('app/customization_service.ts');
    const profileCardSource = read('components/PlayerProfileModal.tsx');

    expect(avatarSource).toContain('const AVATAR_DISPLAY_CLOUD_SYNC_DEFER_MS = 30_000');
    expect(avatarSource).toContain('syncToCloud({ deferMs: AVATAR_DISPLAY_CLOUD_SYNC_DEFER_MS })');
    expect(avatarSource).toContain("if (mode === 'immediate') void syncToCloud({ forceNow: true })");
    expect(avatarSource).toContain('syncCloud: syncAvatarDisplayToCloud');
    // Явное действие пользователя (применить/купить) — немедленный sync.
    expect(avatarSource).toContain("cloudSyncMode: 'immediate'");
    // Режим по умолчанию и сброс к уровневому аватару остаются отложенными (deferred).
    expect(customizationService).toContain("await deps.syncCloud(input.cloudSyncMode ?? 'deferred')");
    expect(customizationService).toContain("cloudSyncMode: 'deferred'");

    expect(profileCardSource).not.toContain('PROFILE_CARD_DISPLAY_CLOUD_SYNC_DEFER_MS');
    expect(profileCardSource).toContain('syncToCloud({ forceNow: true })');
    expect((profileCardSource.match(/syncToCloud\(\{ forceNow: true \}\)/g) ?? []).length).toBe(1);
    expect(profileCardSource).not.toContain('syncToCloud({ deferMs:');
  });

  it('keeps setInterval call sites owner-reviewed so new polling cannot appear silently', () => {
    const allowlist: Record<string, number> = {
      // Arena-файлы и matchmaking удалены вместе с фичей — их тики ушли из кода.
      'app/club_screen.tsx': 1,
      // Конечный 40мс count-up результатов: сам останавливается примерно за 600мс
      // и дополнительно очищается при unmount.
      'app/exam.tsx': 1,
      'app/foreground_usage_ms.ts': 1,
      'app/shards_shop.tsx': 1,
      // Shared visible wall-clock factory/type/wiring contain three textual call
      // sites but create at most one live interval for all current subscribers.
      'app/visible_wall_clock.ts': 3,
      'components/ActiveBoostBar.tsx': 1,
      // Конечный 16мс XP count-up (1200мс), очищается при завершении и unmount.
      'components/DialogVictoryCelebration.tsx': 1,
      // Три внутренних scheduler-тика одного shared countdown store; подписчики
      // не создают свои интервалы, а последний unsubscribe останавливает clock.
      'components/energy_countdown_clock.ts': 3,
      // Конечный 16мс XP count-up результата, очищается по достижении цели/unmount.
      'components/HomeTheoAdvisorCard.tsx': 1,
      'components/StreakReviveModal.tsx': 1,
    };
    const found: Record<string, number> = {};

    for (const file of listSourceFiles(['app', 'components', 'hooks', 'contexts'])) {
      const lines = read(file).split(/\r?\n/);
      for (const line of lines) {
        if (line.trim().startsWith('//')) continue;
        const matches = line.match(/setInterval\s*\(/g);
        if (matches) found[file] = (found[file] ?? 0) + matches.length;
      }
    }

    expect(found).toEqual(allowlist);
  });

  it('keeps Home stats pulse hint off polling while waiting for 3 hours usage', () => {
    const source = read('app/(tabs)/home.tsx');

    expect(source).toContain('const STATS_PULSE_RECHECK_MIN_MS = 30_000');
    expect(source).toContain('let recheckTimer: ReturnType<typeof setTimeout> | null = null');
    expect(source).toContain('const scheduleRecheck = (total: number, retryDelayMs?: number) => {');
    expect(source).toContain('const remaining = Math.max(0, STATS_PULSE_MIN_USAGE_MS - total)');
    expect(source).toContain('const delay = retryDelayMs ?? Math.max(STATS_PULSE_RECHECK_MIN_MS, remaining)');
    expect(source).toContain('recheckTimer = setTimeout(() => {');
    expect(source).toContain('clearTimeout(recheckTimer)');
    expect(source).not.toContain('pollId = setInterval');
    expect(source).not.toContain('setInterval(() => { void check(); }, 30000)');
  });

  it('keeps Home avatar/frame storage hydration to one read in loadData', () => {
    const source = read('app/(tabs)/home.tsx');
    const avatarFrameReads = source.match(/AsyncStorage\.multiGet\(\['user_avatar', 'user_frame'(?:, USER_AVATAR_AURA_KEY)?\]\)/g) ?? [];

    expect(avatarFrameReads).toEqual([
      "AsyncStorage.multiGet(['user_avatar', 'user_frame', USER_AVATAR_AURA_KEY])",
    ]);
    expect(source).toContain('const [[, savedAvSnap], [, savedFrSnap], [, savedAuraSnap]] = await AsyncStorage.multiGet');
    expect(source).toContain('setUserAvatar(avatarSnap)');
    expect(source).toContain('setUserAvatarAura(normalizeAvatarAuraId(savedAuraSnap) ?? null)');
    expect(source).toContain('setUserFrame(frameSnap)');
    expect(source).not.toContain("AsyncStorage.multiGet(['user_avatar', 'user_frame'])");
  });

  it('keeps Home loadData local storage reads batched on hot path', () => {
    const source = read('app/(tabs)/home.tsx');

    expect(source).toContain('const [homeStoragePairs, currentWeekMarkers, weekPts, shardsBal, activePlanState, planSnapshot, premiumSignalPairs] = await Promise.all([');
    expect(source).toContain("const homeStorage = new Map(homeStoragePairs)");
    expect(source).toContain("const name = homeStorage.get('user_name') ?? null");
    expect(source).toContain("const lastStreakShownRaw = homeStorage.get('streak_last_shown') ?? null");
    expect(source).not.toContain("AsyncStorage.getItem('user_name')");
    expect(source).not.toContain("AsyncStorage.getItem('streak_count')");
    expect(source).not.toContain("AsyncStorage.getItem('week_days_done')");
    expect(source).not.toContain("AsyncStorage.getItem('user_total_xp')");
    expect(source).not.toContain('AsyncStorage.getItem(HOME_SELECTED_TITLE_KEY)');
    expect(source).not.toContain("AsyncStorage.getItem('streak_last_shown')");

    expect(source).toContain('const [specialTitleStoragePairs, achievementStates] = await Promise.all([');
    expect(source).toContain('AsyncStorage.multiGet([HELPFUL_REPORTS_CONFIRMED_KEY, dailyAllDoneKey])');
    expect(source).not.toContain('AsyncStorage.getItem(HELPFUL_REPORTS_CONFIRMED_KEY)');
    expect(source).not.toContain('AsyncStorage.getItem(dailyTasksAchievementAllDoneStreakKey(studyTarget))');

    expect(source).toContain('const lessonEntriesWithLastOpened = await AsyncStorage.multiGet([...lessonKeys, lastOpenedKey])');
    expect(source).toContain('const saved = lessonEntries[lastId - 1]?.[1] ?? null');
    expect(source).not.toContain('AsyncStorage.getItem(lastOpenedLessonKey(studyTarget))');
    expect(source).not.toContain('AsyncStorage.getItem(lessonProgressKey(lastId, studyTarget))');

    expect(source).toContain("AsyncStorage.multiGet(['streak_freeze', 'premium_free_freeze_used'])");
    expect(source).toContain("AsyncStorage.multiGet(['login_bonus_pending', 'comeback_pending', 'weekly_pb_v1'])");
    expect(source).not.toContain("AsyncStorage.getItem('login_bonus_pending')");
    expect(source).not.toContain("AsyncStorage.getItem('comeback_pending')");
    expect(source).not.toContain("AsyncStorage.getItem('weekly_pb_v1')");
  });

  it('keeps Firestore onSnapshot call sites owner-reviewed so live listeners stay intentional', () => {
    const allowlist: Record<string, number> = {
      // Arena listeners удалены вместе с фичей; монитор удаления аккаунта —
      // новый intentional live-listener.
      'app/app_messages.ts': 3,
      'app/daily_phrase_system.ts': 1,
      'app/firestore_friend_requests.ts': 2,
      'app/firestore_leagues.ts': 2,
      'app/league_group_boosts.ts': 2,
      'app/remote_account_deletion_monitor.ts': 1,
      'app/remote_config_client.ts': 1,
      'app/services/league_chest_rewards.ts': 3,
      'app/user_notifications.ts': 1,
      'components/PremiumContext.tsx': 1,
    };
    const found: Record<string, number> = {};

    for (const file of listSourceFiles(['app', 'components', 'hooks', 'contexts'])) {
      const lines = read(file).split(/\r?\n/);
      for (const line of lines) {
        if (line.trim().startsWith('//')) continue;
        const matches = line.match(/\.onSnapshot\s*\(/g);
        if (matches) found[file] = (found[file] ?? 0) + matches.length;
      }
    }

    expect(found).toEqual(allowlist);
  });

  it('keeps boost countdown timer idle when there are no active boosts', () => {
    const source = read('components/ActiveBoostBar.tsx');

    expect(source).toContain('if (boosts.length === 0)');
    expect(source).toContain('Object.keys(prev).length === 0 ? prev : {}');
    expect(source).toContain('if (activeBoosts.length === 0) return;');
    expect(source).toContain('const interval = setInterval(() => {');
    expect(source).toContain('return () => clearInterval(interval);');
  });

  it('keeps energy recovery polling idle when full, unlimited, or backgrounded', () => {
    const source = read('components/EnergyContext.tsx');

    expect(source).toContain("const [appActive, setAppActive] = useState(() => AppState.currentState === 'active')");
    expect(source).toContain('setAppActive(true)');
    expect(source).toContain('setAppActive(false)');
    expect(source).toContain('if (!appActive || isUnlimited || energy >= maxEnergy) return;');
    expect(source).toContain('const remaining = timeUntilNextMs > 0 ? timeUntilNextMs : recoveryIntervalMs;');
    expect(source).toContain('const delay = Math.max(1000, remaining + 250);');
    expect(source).toContain('const timeoutId = setTimeout(load, delay);');
    expect(source).toContain('return () => clearTimeout(timeoutId);');
    expect(source).toContain('}, [appActive, energy, maxEnergy, isUnlimited, load, recoveryIntervalMs, timeUntilNextMs]);');
    expect(source).not.toContain('const intervalId = setInterval(load, 30_000);');
    expect(source).not.toContain('startInterval();');
  });

  it('shares energy countdown ticking and gates consumers by visibility', () => {
    const context = read('components/EnergyContext.tsx');
    const bar = read('components/EnergyBar.tsx');
    const lightning = read('components/LessonEnergyLightning.tsx');
    const modal = read('components/NoEnergyModal.tsx');
    expect(context).toContain('energyCountdownClock.subscribe(setNow)');
    expect(context).not.toContain('const id = setInterval(() => setNow(Date.now()), 1000)');
    expect(bar).toContain('useEnergyCountdown({ visible: screenFocused })');
    expect(lightning).toContain('useEnergyCountdown({ visible: screenFocused })');
    expect(modal).toContain('useEnergyCountdown({ visible: modalVisible })');
  });

  it('keeps online presence heartbeat active-only and cost-capped', () => {
    const layout = read('app/_layout.tsx');
    const onlinePresencePath = path.join(ROOT, 'app/online_presence.ts');
    if (!fs.existsSync(onlinePresencePath)) {
      expect(layout).not.toContain('installOnlinePresenceHeartbeat');
      return;
    }

    const source = read('app/online_presence.ts');

    expect(source).toContain('const HEARTBEAT_MS = 5 * 60_000');
    expect(source).toContain('function stopHeartbeatTimer()');
    expect(source).toContain('function startHeartbeatTimer()');
    expect(source).toContain("if (timer || AppState.currentState !== 'active') return;");
    expect(source).toContain("if (state === 'active') {");
    expect(source).toContain('startHeartbeatTimer();');
    expect(source).toContain('stopHeartbeatTimer();');
    expect(source).not.toContain('const HEARTBEAT_MS = 60_000');
  });

  it('keeps Home Theo typewriter on a frame-friendly cadence', () => {
    const source = read('components/HomeTheoAdvisorCard.tsx');

    expect(source).toContain('const TYPE_FRAME_MS = 33');
    expect(source).toContain('const targetDurationMs = Math.max(TYPE_FRAME_MS, Math.min(MAX_TYPE_MS, text.length * TYPE_MS))');
    expect(source).toContain('const charsPerFrame = Math.max(1, Math.ceil(text.length / totalFrames))');
    expect(source).toContain('index = Math.min(text.length, index + charsPerFrame)');
    expect(source).toContain('}, TYPE_FRAME_MS);');
    expect(source).not.toContain('Math.max(10, Math.min(TYPE_MS');
  });

  it('keeps paywall urgency countdown static, without per-second ticking or storage polling', () => {
    const source = read('components/paywall/PaywallPriceUrgency.tsx');

    // Статичная дата конца окна старой цены: вычисляется один раз из remainingMs,
    // без живого тикающего таймера и без перечитывания storage каждую секунду.
    expect(source).toContain('const raiseDate = formatRaiseDate(new Date(Date.now() + Math.max(0, urgency.remainingMs)), lang)');
    expect(source).not.toContain('setInterval(');
    expect(source).not.toContain('getUrgencyState().then');
  });

  it('keeps streak stats boost countdowns on one shared visible wall clock', () => {
    const source = read('app/streak_stats.tsx');

    expect(source).toContain('function formatStatsBoostTimeLeft(ms: number, lang: Lang): string');
    expect(source).toContain('const boostCountdownActive = statsRuntimeActive && soonestCountdownMs > 0');
    expect(source).toContain('const boostNow = useVisibleWallClock(');
    expect(source).toContain('soonestCountdownMs < 3_600_000 ? 1_000 : 30_000');
    expect(source).toContain('// One shared visible wall clock for all active boost rows on this screen.');
    expect(source).not.toContain('const timer = setInterval(fmt, 1000)');
  });

  it('keeps progress server writes queued, idempotent, and serialized', () => {
    const client = read('app/progress_events_client.ts');
    const xpManager = read('app/xp_manager.ts');
    const server = read('functions/src/progress_events.ts');

    expect(client).toContain("const PROGRESS_EVENT_QUEUE_KEY = 'progress_server_event_queue_v1'");
    expect(client).toContain('const PROGRESS_EVENT_DEAD_LETTER_MAX = 100');
    expect(client).toContain('progressOwnerKey(PROGRESS_EVENT_QUEUE_KEY, stableId)');
    expect(client).toContain('await enqueue(event);');
    expect(client).not.toContain('JSON.stringify(queue.slice(0, 100))');
    expect(client).toContain('let flushInFlight: Promise<number> | null = null');
    expect(client).toContain('if (flushInFlight) return flushInFlight');
    expect(client).toContain('await enqueue(event).catch(() => {})');
    expect(client).toContain('await mirrorProgressResultToLocal(res.data)');
    expect(client).toContain("const PROGRESS_MIGRATION_BASELINE_KEY = 'progress_server_snapshot_baseline_v1'");
    expect(client).toContain('export async function prepareProgressMigrationSnapshot()');

    expect(xpManager).toContain('let _xpLock: Promise<unknown> = Promise.resolve()');
    expect(xpManager).toContain('submitProgressEventOptimistically(progressEventRequest, progressEventMigrationSnapshot, progressEventLogLabel)');
    expect(xpManager).toContain('await reserveLocalProgressEvent(progressEventRequest?.eventId)');
    expect(xpManager).toContain('markCloudSyncPending();');
    expect(xpManager).not.toContain('syncToCloud(');
    expect(xpManager).toContain("await storageSetString('user_total_xp', String(newTotal))");
    expect(xpManager).toContain('Math.max(0, currentTotal + finalDelta)');
    expect(xpManager).toContain("emitAppEvent('xp_changed')");

    expect(server).toContain("userRef.collection('progress_events').doc(safeDocId(event.eventId))");
    expect(server).toContain('if (ledgerSnap.exists)');
    expect(server).toContain('const DAILY_EVENT_LIMIT = 500');
    expect(server).toContain('progress_daily_counters');
  });

  it('keeps analytics and activity writes capped instead of writing every tap to Firestore', () => {
    const analytics = read('app/analytics.ts');
    const activity = read('app/app_activity.ts');

    expect(analytics).toContain("const STORAGE_KEY = 'analytics_queue'");
    expect(analytics).toContain('const MAX_QUEUE = 200');
    expect(analytics).toContain('const DUPLICATE_EVENT_WINDOW_MS = 750');
    expect(analytics).toContain('const LOCAL_ANALYTICS_QUEUE_ENABLED = false');
    expect(analytics).toContain('let lastEventKey =');
    expect(analytics).toContain('if (eventKey === lastEventKey && now - lastEventAt < DUPLICATE_EVENT_WINDOW_MS) return;');
    expect(analytics).toContain('let eventQueueCache: EventRecord[] | null = null');
    expect(analytics).toContain('function parseEventQueue(raw: string | null): EventRecord[]');
    expect(analytics).toContain('async function readEventQueueFromStorage(): Promise<EventRecord[]>');
    expect(analytics).toContain('if (eventQueueCache === null)');
    expect(analytics).toContain('if (!LOCAL_ANALYTICS_QUEUE_ENABLED) return');
    expect(analytics).toContain('eventQueueCache.push({ event, props, ts: now })');
    expect(analytics).toContain('AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(eventQueueCache))');
    expect(analytics).toContain('if (eventQueueCache !== null) return eventQueueCache.slice()');
    expect(analytics).toContain('eventQueueCache.splice(0, eventQueueCache.length - MAX_QUEUE)');
    expect(analytics).toContain('eventQueueCache = []');

    expect(activity).toContain("const QUEUE_KEY = 'app_activity_queue_v1'");
    expect(activity).toContain('const MAX_QUEUE = 200');
    expect(activity).toContain('const FIRESTORE_SAMPLE_RATE = 0.01');
    expect(activity).toContain('const LOCAL_ACTIVITY_QUEUE_ENABLED = false');
    expect(activity).toContain('let activityQueueCache: Array<Record<string, unknown>> | null = null');
    expect(activity).toContain('async function readActivityQueueFromStorage(): Promise<Array<Record<string, unknown>>>');
    expect(activity).toContain('if (activityQueueCache === null)');
    expect(activity).toContain('if (LOCAL_ACTIVITY_QUEUE_ENABLED)');
    expect(activity).toContain('activityQueueCache.push(record)');
    expect(activity).toContain('AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(activityQueueCache))');
    expect(activity).toContain('if (activityQueueCache !== null) return activityQueueCache.slice()');
    expect(activity).toContain('meta.writeToFirestore === true');
    expect(activity).toContain('Math.random() < FIRESTORE_SAMPLE_RATE');
    expect(activity).toContain('activityQueueCache.splice(0, activityQueueCache.length - MAX_QUEUE)');
  });

  it('keeps app health server diagnostics throttled before repeated storage reads', () => {
    const source = read('app/app_health.ts');

    expect(source).toContain('const DEFAULT_THROTTLE_MS = 30 * 60 * 1000');
    expect(source).toContain('const THROTTLE_CACHE_LIMIT = 128');
    expect(source).toContain('const healthThrottleCache = new Map<string, number>()');
    expect(source).toContain('function rememberThrottle(key: string, lastAt: number)');
    expect(source).toContain('if (healthThrottleCache.size <= THROTTLE_CACHE_LIMIT) return;');
    expect(source).toContain('const cachedLast = healthThrottleCache.get(key) ?? 0');
    expect(source).toContain('if (now - cachedLast < throttleMs) return false;');
    expect(source).toContain('rememberThrottle(key, last)');
    expect(source).toContain('rememberThrottle(key, now)');
    expect(source).toContain('await AsyncStorage.setItem(key, String(now)).catch(() => {})');
  });

  it('keeps client report delivery cached without changing report policy', () => {
    const source = read('app/client_reports.ts');

    expect(source).toContain('type SubmitClientReportCallable = (');
    expect(source).toContain('let submitClientReportCallable: SubmitClientReportCallable | null = null');
    expect(source).toContain('let appCheckWarmupInFlight: Promise<void> | null = null');
    expect(source).toContain('function getSubmitClientReportCallable(): SubmitClientReportCallable');
    expect(source).toContain('if (!submitClientReportCallable)');
    expect(source).toContain("callable<SubmitClientReportRequest, SubmitClientReportResult>(");
    expect(source).toContain("'submitClientReport'");
    expect(source).toContain('function warmClientReportAppCheck(): Promise<void>');
    expect(source).toContain('if (!appCheckWarmupInFlight)');
    expect(source).toContain('appCheckWarmupInFlight = initFirebaseAppCheckIfAvailable()');
    expect(source).toContain('.finally(() => {');
    expect(source).toContain('appCheckWarmupInFlight = null;');
    expect(source).toContain('await warmClientReportAppCheck();');
    expect(source).toContain('const fn = getSubmitClientReportCallable();');
    expect(source).toContain("const res = await withCallableTimeout(fn({ kind, payload }), 'submitClientReport');");
    expect(source).not.toContain("const fn = callable<{ kind: ClientReportKind; payload: Record<string, unknown> }, SubmitClientReportResult>(");
  });

  it('keeps user report throttle cached while preserving awaited delivery', () => {
    const source = read('app/user_report.ts');

    expect(source).toContain('let reportThrottleCacheTs = 0');
    expect(source).toContain('async function isReportThrottled(now: number): Promise<boolean>');
    expect(source).toContain('if (reportThrottleCacheTs > 0 && now - reportThrottleCacheTs < THROTTLE_MS)');
    expect(source).toContain('const lastRaw = await AsyncStorage.getItem(THROTTLE_KEY)');
    expect(source).toContain('reportThrottleCacheTs = last');
    expect(source).toContain('async function markReportSent(now: number): Promise<void>');
    expect(source).toContain('await AsyncStorage.setItem(THROTTLE_KEY, String(now))');
    expect(source).toContain('reportThrottleCacheTs = now');
    expect(source).toContain("await submitClientReportCallable('user_report'");
    expect(source).toContain("await submitClientReportCallable('community_pack_report'");
  });

  it('keeps lesson bug report throttle cached without moving XP before delivery', () => {
    const source = read('app/error_report.ts');

    expect(source).toContain('let errorReportThrottleCacheTs = 0');
    expect(source).toContain('async function isErrorReportThrottled(now: number): Promise<boolean>');
    expect(source).toContain('if (errorReportThrottleCacheTs > 0 && now - errorReportThrottleCacheTs < THROTTLE_MS)');
    expect(source).toContain('const lastRaw = await AsyncStorage.getItem(THROTTLE_KEY)');
    expect(source).toContain('errorReportThrottleCacheTs = last');
    expect(source).toContain("await submitClientReport('error_report'");
    expect(source).toContain('await AsyncStorage.setItem(THROTTLE_KEY, String(now))');
    expect(source).toContain('errorReportThrottleCacheTs = now');
    expect(source).toContain("void registerXP(10, 'achievement_reward'");
    expect(source.indexOf("await submitClientReport('error_report'")).toBeLessThan(
      source.indexOf('await AsyncStorage.setItem(THROTTLE_KEY, String(now))'),
    );
    expect(source.indexOf('await AsyncStorage.setItem(THROTTLE_KEY, String(now))')).toBeLessThan(
      source.indexOf("void registerXP(10, 'achievement_reward'"),
    );
  });

  it('keeps admin user-warning checks locally cooled down before Firestore', () => {
    const source = read('app/user_warning_check.ts');

    expect(source).toContain('const WARN_FETCH_COOLDOWN_MS = 25 * 60 * 1000');
    expect(source).toContain('let warningFetchCacheAt = 0');
    expect(source).toContain('if (warningFetchCacheAt > 0 && now - warningFetchCacheAt < WARN_FETCH_COOLDOWN_MS)');
    expect(source).toContain('const lastFetchRaw = await AsyncStorage.getItem(WARN_FETCH_AT_KEY)');
    expect(source).toContain('warningFetchCacheAt = lastFetch');
    expect(source).toContain("db.collection('user_warnings').where('uid', '==', uid).get()");
    expect(source).toContain('const fetchedAt = Date.now()');
    expect(source).toContain('warningFetchCacheAt = fetchedAt');
    expect(source.indexOf('if (warningFetchCacheAt > 0')).toBeLessThan(
      source.indexOf("db.collection('user_warnings')"),
    );
  });

  it('keeps lightweight prompt gates grouped into single AsyncStorage bridge reads', () => {
    const afterWin = read('app/after_win_upsell_gate.ts');
    const winback = read('app/winback_offer.ts');
    const review = read('app/review_utils.ts');

    expect(afterWin).toContain('const [[, lastRaw], [, streakShown]] = await AsyncStorage.multiGet([');
    expect(afterWin).toContain('LAST_SHOWN_KEY');
    expect(afterWin).toContain("'streak_paywall_shown'");
    expect(afterWin).not.toContain('AsyncStorage.getItem(LAST_SHOWN_KEY)');
    expect(afterWin).not.toContain("AsyncStorage.getItem('streak_paywall_shown')");

    expect(winback).toContain('const [[, lastRaw], [, shownRaw]] = await AsyncStorage.multiGet([');
    expect(winback).toContain('LAST_ACTIVE_KEY');
    expect(winback).toContain('WINBACK_SHOWN_AT_KEY');
    expect(winback).not.toContain('AsyncStorage.getItem(LAST_ACTIVE_KEY)');
    expect(winback).not.toContain('AsyncStorage.getItem(WINBACK_SHOWN_AT_KEY)');

    expect(review).toContain('const [[, sessRaw], [, lastRaw], [, ratedRaw], [, showCountRaw]] = await AsyncStorage.multiGet([');
    expect(review).toContain('KEY_SESSIONS');
    expect(review).toContain('KEY_LAST_PROMPTED');
    expect(review).toContain('KEY_RATED');
    expect(review).toContain('KEY_SHOW_COUNT');
  });

  it('keeps non-T0 ideas callable setup cached without changing submit payloads', () => {
    const source = read('app/ideas_client.ts');

    expect(source).toContain('type SubmitUserIdeaCallable = (');
    expect(source).toContain('let submitUserIdeaCallable: SubmitUserIdeaCallable | null = null');
    expect(source).toContain('let ideaAppCheckWarmupInFlight: Promise<void> | null = null');
    expect(source).toContain('function getSubmitUserIdeaCallable(): SubmitUserIdeaCallable');
    expect(source).toContain('if (!submitUserIdeaCallable)');
    expect(source).toContain("callable<SubmitUserIdeaRequest, SubmitUserIdeaResult>('submitUserIdea')");
    expect(source).toContain('function warmIdeasAppCheck(): Promise<void>');
    expect(source).toContain('if (!ideaAppCheckWarmupInFlight)');
    expect(source).toContain('ideaAppCheckWarmupInFlight = initFirebaseAppCheckIfAvailable()');
    expect(source).toContain('.finally(() => {');
    expect(source).toContain('ideaAppCheckWarmupInFlight = null;');
    expect(source).toContain('await warmIdeasAppCheck();');
    expect(source).toContain('const fn = getSubmitUserIdeaCallable();');
    expect(source).toContain('const res = await withCallableTimeout(');
    expect(source).toContain('fn({');
    expect(source).toContain('title: input.title');
    expect(source).toContain('description: input.description');
    expect(source).toContain('benefit: input.benefit');
    expect(source).not.toContain("const fn = callable<{ payload: Record<string, unknown> }, SubmitUserIdeaResult>('submitUserIdea')");
  });

  it('keeps explicit Firestore telemetry writes owner-reviewed', () => {
    const allowlist: Record<string, number> = {
      'app/(tabs)/friends.tsx': 2,
      'app/app_activity.ts': 1,
      'app/app_health.ts': 1,
      'app/firebase.ts': 1,
      'app/firestore_friend_requests.ts': 1,
      'app/friends_screen.tsx': 1,
      'app/shards_shop.tsx': 3,
      'app/streak_wager.ts': 1,
    };
    const found: Record<string, number> = {};

    for (const file of listSourceFiles(['app', 'components', 'hooks', 'contexts'])) {
      const lines = read(file).split(/\r?\n/);
      for (const line of lines) {
        if (line.trim().startsWith('//')) continue;
        const matches = line.match(/writeToFirestore\s*:\s*true/g);
        if (matches) found[file] = (found[file] ?? 0) + matches.length;
      }
    }

    expect(found).toEqual(allowlist);
  });

  it('keeps paywall funnel writes short-term deduped and TTL-bound', () => {
    const source = read('app/paywall_funnel.ts');

    expect(source).toContain("const COLLECTION = 'paywall_funnel'");
    expect(source).toContain('const TTL_MS = 90 * 24 * 60 * 60 * 1000');
    expect(source).toContain('const FUNNEL_DUPLICATE_WINDOW_MS = 750');
    expect(source).toContain('const FUNNEL_DEDUPE_CACHE_LIMIT = 64');
    expect(source).toContain('const _recentFunnelEvents = new Map<string, number>()');
    expect(source).toContain('function paywallFunnelEventKey(step: PaywallFunnelStep, payload: PaywallFunnelPayload): string');
    expect(source).toContain('function shouldDropDuplicateFunnelEvent(step: PaywallFunnelStep, payload: PaywallFunnelPayload, nowMs: number): boolean');
    expect(source).toContain('if (nowMs - lastAt < FUNNEL_DUPLICATE_WINDOW_MS) return true;');
    expect(source).toContain('if (_recentFunnelEvents.size > FUNNEL_DEDUPE_CACHE_LIMIT)');
    expect(source).toContain('if (shouldDropDuplicateFunnelEvent(step, payload, Date.now())) return;');
    expect(source).toContain('_recentFunnelEvents.clear();');
  });

  it('keeps shards shop open telemetry from writing Firestore on every focus', () => {
    const source = read('app/shards_shop.tsx');
    const openStart = source.indexOf("trackActivity('shards_shop:open'");
    const openEnd = source.indexOf('void refreshPackTrial();', openStart);
    const openBlock = source.slice(openStart, openEnd);

    expect(source).toContain('const firestoreOpenTabsRef = useRef<Set<ShopTab>>(new Set())');
    expect(source).toContain('const shouldWriteOpenToFirestore = !firestoreOpenTabsRef.current.has(shopTab)');
    expect(source).toContain('if (shouldWriteOpenToFirestore) firestoreOpenTabsRef.current.add(shopTab)');
    expect(openBlock).toContain('writeToFirestore: shouldWriteOpenToFirestore');
    expect(openBlock).not.toContain('writeToFirestore: true');
  });

  it('keeps progress restore/migration monotonic so late sync cannot roll values back', () => {
    const progressClient = read('app/progress_events_client.ts');
    const cloudSync = read('app/cloud_sync.ts');
    const progressServer = read('functions/src/progress_events.ts');

    expect(progressClient).toContain('mergeStreakByActivityDate');
    expect(progressClient).toContain('function parseNonNegativeNumber(raw: unknown): number');
    expect(progressClient).toContain('function sameWeekPoints(raw: unknown, weekKey: string): number | null');
    expect(progressClient).toContain('const mergedTotalXp = Math.max(');
    expect(progressClient).toContain('const mergedWeekXp = Math.max(...currentWeekCandidates)');
    expect(progressClient).toContain("['user_total_xp', String(mergedTotalXp)]");
    expect(progressClient).toContain("['user_level', String(getLevelFromXP(mergedTotalXp))]");
    expect(progressClient).toContain("['week_points_v2', JSON.stringify({ weekKey: result.weekKey, points: mergedWeekXp })]");
    expect(cloudSync).toContain('mergeStreakByActivityDate');
    expect(cloudSync).toContain("'unlocked_lessons'");
    expect(cloudSync).toContain("unlockedLessonsKey('fr')");
    expect(cloudSync).toContain("if (restoreId === 'unlocked_lessons') {");
    expect(cloudSync).toContain('return mergeNumberSetRestoreValue(cloudValue, localValue);');
    expect(cloudSync).toContain('const LEVEL_EXAM_RESTORE_MERGE_KEYS = LEVEL_EXAM_RESTORE_LEVELS.flatMap');
    expect(cloudSync).toContain('function mergeLevelExamRestoreValue(');
    expect(cloudSync).toContain("parseProgressBool(cloudValue) || parseProgressBool(localValue) ? 'true' : 'false'");
    expect(cloudSync).toContain('return String(Math.max(parseProgressInt(cloudValue), parseProgressInt(localValue)))');
    expect(cloudSync).toContain("if (/^level_exam_[A-Za-z0-9_-]+_/.test(restoreId)) {");

    const friendQuests = read('app/friend_quests.ts');
    expect(friendQuests).toContain('async function mirrorCallerXpWithoutRollback(');
    expect(friendQuests).toContain('callerXp: number,');
    expect(friendQuests).toContain("const localRaw = await AsyncStorage.getItem('user_total_xp').catch(() => null)");
    expect(friendQuests).toContain('const nextXp = Math.max(localXp, serverXp)');
    expect(friendQuests).toContain("AsyncStorage.setItem('user_total_xp', String(nextXp))");
    expect(friendQuests).toContain('await withAccountTransitionLock(async () => {');
    expect(friendQuests).not.toContain("AsyncStorage.setItem('user_total_xp', String(res.data.callerXp))");

    expect(progressServer).toContain('if (incoming > current) patch[key] = String(incoming);');
    expect(progressServer).toContain('if (incomingScore > currentScore && typeof snapshot[key] ===');
    expect(progressServer).toContain('function isSafeMigratableStructuralKey(key: string): boolean');
    expect(progressServer).toContain('export function getMigrationQuarantinedSensitiveKeys(snapshot: ProgressMap): string[]');
    expect(progressServer).toContain('.filter((key) => isServerOwnedProgressKey(key) && !isSafeMigratableStructuralKey(key))');
    const xpManager = read('app/xp_manager.ts');
    expect(xpManager).toContain("const currentXP = await storageGetNumber('user_total_xp', 0)");
    expect(xpManager).toContain("['user_total_xp', String(currentXP)]");
    expect(xpManager).not.toContain('const newXP =');
  });

  it('keeps server shard balance mirrors timestamp-guarded instead of blind client replaces', () => {
    const shardsSystem = read('app/shards_system.ts');
    const friendQuests = read('app/friend_quests.ts');
    const friendGifts = read('app/friend_gifts.ts');
    const communityPurchase = read('app/community_packs/purchaseCommunityPack.ts');
    const communityClient = read('app/community_packs/functionsClient.ts');
    const leagueBoosts = read('app/league_group_boosts.ts');
    const leagueChestClient = read('app/services/league_chest_rewards.ts');
    const collectiblesClient = read('app/collectibles/storage.ts');

    expect(shardsSystem).toContain('type ReplaceShardBalanceOptions = {');
    expect(shardsSystem).toContain('const serverUpdatedAtMs = parseUpdatedAtMs(options?.updatedAtMs)');
    expect(shardsSystem).toContain('if (currentMeta && currentMeta.updatedAtMs > serverUpdatedAtMs) return;');
    expect(shardsSystem).toContain('await persistLocalBalance(n, meta)');
    expect(shardsSystem).toContain('const mirrorServerShardBalanceLocal = async (');
    expect(shardsSystem).toContain('const mirrorOutcome = await mirrorServerShardBalanceLocal(');
    expect(shardsSystem).not.toContain('await persistLocalBalance(cloudApplied.balance, meta)');
    expect(shardsSystem).not.toContain('setShardsBalanceMemory(cloudApplied.balance)');

    for (const source of [
      friendQuests,
      friendGifts,
      communityPurchase,
      leagueBoosts,
      leagueChestClient,
      collectiblesClient,
    ]) {
      expect(source).toContain('updatedAtMs:');
    }

    expect(communityClient).toContain('shardsUpdatedAtMs?: number');
    expect(friendQuests).toContain('shardsUpdatedAtMs?: number');
    expect(friendGifts).toContain('shardsUpdatedAtMs?: number');
    expect(leagueBoosts).toContain('shardsUpdatedAtMs?: number');
    expect(leagueChestClient).toContain('shardsUpdatedAtMs?: number');
    expect(collectiblesClient).toContain('shardsUpdatedAtMs?: number | null');

    expect(read('functions/src/friend_gifts.ts')).toContain('shardsUpdatedAtMs');
    expect(read('functions/src/community_packs.ts')).toContain('shardsUpdatedAtMs: now');
    expect(read('functions/src/league_groups.ts')).toContain('shardsUpdatedAtMs: now');
    expect(read('functions/src/league_chest.ts')).toContain('shardsUpdatedAtMs: shardReward > 0 ? now');
    expect(read('functions/src/collectibles.ts')).toContain('shardsUpdatedAtMs: decision.bonusShards > 0 ? now : null');
  });

  it('keeps selected server-first economy callables idempotent against duplicate retries', () => {
    const friendClient = read('app/friend_gifts.ts');
    const friendQuestClient = read('app/friend_quests.ts');
    const promoClient = read('app/promo_code_client.ts');
    const communityClient = read('app/community_packs/functionsClient.ts');
    const leagueChestClient = read('app/services/league_chest_rewards.ts');
    const friendServer = read('functions/src/friend_gifts.ts');
    const communityServer = read('functions/src/community_packs.ts');
    const leagueGroupsServer = read('functions/src/league_groups.ts');
    const activityLikeServer = read('functions/src/friend_activity_likes.ts');
    const leagueBoostsClient = read('app/league_group_boosts.ts');
    const weeklyReviewServer = read('functions/src/weekly_review.ts');
    const statsInsightsServer = read('functions/src/stats_insights.ts');

    expect(friendClient).toContain("function makeFriendGiftIdempotencyKey(prefix = 'fg')");
    expect(friendClient).toContain('idempotencyKey,');
    expect(friendServer).toContain("senderRef.collection('friend_gift_idempotency').doc(idempotencyKey)");
    expect(friendServer).toContain('return replayFriendGiftResult(idempotencySnap.data(), idempotencyKey, friendStableId, gift);');
    expect(friendServer).toContain('if (!result.idempotentReplay && result._recipientPushToken)');
    expect(friendClient).toContain("makeFriendGiftIdempotencyKey('fgt')");
    expect(friendServer).toContain("senderRef.collection('friend_gift_thanks_idempotency').doc(idempotencyKey)");
    expect(friendServer).toContain('if (!result.idempotentReplay && result._friendPushToken)');
    expect(friendClient).toContain('const friendGiftSendInFlight = new Map');
    expect(friendClient).toContain('const friendGiftThanksInFlight = new Map');
    expect(friendClient).toContain('function friendGiftSendRequestKey');
    expect(friendClient).toContain('function friendGiftThanksRequestKey');
    expect(friendClient).toContain('friendGiftSendInFlight.delete(key)');
    expect(friendClient).toContain('friendGiftThanksInFlight.delete(key)');

    expect(friendQuestClient).toContain('const friendQuestClaimInFlight = new Map');
    expect(friendQuestClient).toContain('function friendQuestClaimRequestKey');
    expect(friendQuestClient).toContain('friendQuestClaimInFlight.delete(key)');

    expect(communityServer).toContain('const purchaseId = `${buyerStableId}__${packId}`;');
    expect(communityServer).toContain('if (purSnap.exists) {');
    expect(communityServer).toContain('return { alreadyOwned: true as const, priceShards: price, studyTarget };');
    expect(communityClient).toContain('const communityPurchaseInFlight = new Map');
    expect(communityClient).toContain('function communityPurchaseRequestKey');
    expect(communityClient).toContain('communityPurchaseInFlight.delete(key)');

    expect(leagueGroupsServer).toContain("if (String(active.buyerUid || '') === stableUid) {");
    expect(leagueGroupsServer).toContain('createdBoost = active;');
    expect(leagueGroupsServer).toContain("throw new HttpsError('failed-precondition', 'already-active');");
    expect(leagueBoostsClient).toContain('const leagueGroupBoostBuyInFlight = new Map');
    expect(leagueBoostsClient).toContain('leagueGroupBoostBuyInFlight.delete(stableId)');

    expect(leagueChestClient).toContain('const leagueChestClaimInFlight = new Map');
    expect(leagueChestClient).toContain('function leagueChestClaimRequestKey');
    expect(leagueChestClient).toContain('leagueChestClaimInFlight.delete(key)');
    expect(promoClient).toContain('const promoRedeemInFlight = new Map');
    expect(promoClient).toContain('promoRedeemInFlight.delete(code)');

    expect(activityLikeServer).toContain('const alreadyLikedSameEvent =');
    expect(activityLikeServer).toContain('idempotentReplay: true');
    expect(activityLikeServer).toContain("throw new HttpsError('resource-exhausted', 'Daily activity like limit reached');");
    expect(leagueBoostsClient).toContain('const next = res.idempotentReplay');

    expect(weeklyReviewServer).toContain('lastBriefingHash: params.briefingHash');
    expect(weeklyReviewServer).toContain('lastReview: params.review');
    expect(weeklyReviewServer).toContain('const replay = await readReplayOrAssertWindowOpen(stableUid, briefingHash, briefing.lang);');
    expect(weeklyReviewServer).toContain('idempotentReplay: true');
    expect(weeklyReviewServer.indexOf('const replay = await readReplayOrAssertWindowOpen(stableUid, briefingHash, briefing.lang);')).toBeLessThan(
      weeklyReviewServer.indexOf('await enforceRateLimit(authUid, stableUid);'),
    );

    expect(statsInsightsServer).toContain('lastBriefingHash: briefingHash');
    expect(statsInsightsServer).toContain('lastNotes: notes');
    expect(statsInsightsServer).toContain('const replay = await readReplayOrAssertWindowOpen(authUid, stableUid, briefingHash, briefing.lang);');
    expect(statsInsightsServer).toContain('idempotentReplay: true');
    expect(statsInsightsServer.indexOf('const replay = await readReplayOrAssertWindowOpen(authUid, stableUid, briefingHash, briefing.lang);')).toBeLessThan(
      statsInsightsServer.indexOf('await enforceRateLimit(authUid, stableUid);'),
    );
    expect(statsInsightsServer.indexOf('const replay = await readReplayOrAssertWindowOpen(authUid, stableUid, briefingHash, briefing.lang);')).toBeLessThan(
      statsInsightsServer.indexOf('await enforceGlobalBudget(jobCfg.globalDailyCap);'),
    );
  });

  it('keeps OpenAI miss budgets refundable when no generation happens', () => {
    const explainBudget = read('functions/src/explain/explain_budget.ts');
    const explainPhrase = read('functions/src/explain_phrase.ts');
    const explainChoice = read('functions/src/explain_choice.ts');
    const statsInsights = read('functions/src/stats_insights.ts');

    expect(explainBudget).toContain('export async function reserveExplainBudget');
    expect(explainBudget).toContain('export async function refundExplainBudgetReservation');
    expect(explainBudget).toContain('async function refundUserGenLimit');
    expect(explainBudget).toContain('async function refundGlobalBudget');
    expect(explainBudget).toContain('if (reservation.userReserved && !reservation.globalReserved)');

    for (const source of [explainPhrase, explainChoice]) {
      expect(source).toContain('let budgetReservation: ExplainBudgetReservation | null = null');
      expect(source).toContain('budgetReservation = await reserveExplainBudget(');
      expect(source).toContain("await refundExplainBudgetReservation(budgetReservation, 'lock_not_claimed');");
      expect(source).toContain("await refundExplainBudgetReservation(budgetReservation, 'provider_failed');");
    }

    expect(statsInsights).toContain('const budgetReservedAtMs = Date.now();');
    expect(statsInsights).toContain('await enforceGlobalBudget(jobCfg.globalDailyCap);');
    expect(statsInsights).toContain('await refundGlobalBudget(jobCfg.globalDailyCap, budgetReservedAtMs)');
    expect(statsInsights.indexOf('const budgetReservedAtMs = Date.now();')).toBeLessThan(
      statsInsights.indexOf('await enforceGlobalBudget(jobCfg.globalDailyCap);'),
    );
  });

  it('keeps reward claim callables protected by deterministic claim markers', () => {
    const dailyTasks = read('functions/src/daily_tasks_shards.ts');
    const leagueChest = read('functions/src/league_chest.ts');
    const collectibles = read('functions/src/collectibles.ts');
    const profileCard = read('functions/src/profile_card_upgrade.ts');
    const promoCodes = read('functions/src/promo_codes.ts');
    const revenueCat = read('functions/src/revenuecat_shards.ts');

    expect(dailyTasks).toContain("userRef.collection(REWARD_CLAIMS_COLLECTION).doc(`daily_tasks_all_${dayKey}`)");
    expect(dailyTasks).toContain('if (claimSnap.exists) {');
    expect(dailyTasks).toContain('return { alreadyClaimed: true, newBalance: existingBalance, shardsUpdatedAtMs };');
    expect(dailyTasks).toContain('return { alreadyClaimed: false, newBalance, shardsUpdatedAtMs };');

    expect(leagueChest).toContain('const claimRef = db.collection(\'league_chest_claims\').doc(claimDocId(stableUid, weekId, groupId));');
    expect(leagueChest).toContain('function buildClaimedRewardResponse');
    expect(leagueChest.indexOf('if (claimSnap.exists) {')).toBeLessThan(leagueChest.indexOf("throw new HttpsError('failed-precondition', 'stale_week')"));
    expect(leagueChest).toContain('return { ok: true, claimed: true, alreadyClaimed: true, crown: replayCrown, ...existing };');

    expect(collectibles).toContain("userRef.collection('collectible_claims').doc(safeId(eventIdRaw))");
    expect(collectibles).toContain('alreadyClaimed: true');
    expect(collectibles).toContain('seedBase: `collect:${stableUid}:${eventIdRaw}`');

    expect(profileCard).toContain('if (expectedLevel !== null && currentLevel > expectedLevel) {');
    expect(profileCard).toContain('return { ok: true, alreadyApplied: true, level: currentLevel, balance, spent: 0 };');

    expect(promoCodes).toContain('const redemptionRef = userRef.collection(PROMO_REDEMPTIONS).doc(code);');
    expect(promoCodes).toContain('alreadyRedeemed: redemptionSnap.exists');

    expect(revenueCat).toContain("db.collection('revenuecat_premium_events').doc(eventId)");
    expect(revenueCat).toContain("db.collection('revenuecat_shard_transactions').doc(transactionId)");
    expect(revenueCat).toContain('if (processedSnap.exists)');
  });

  it('keeps league bonus retry and UI refresh bounded and idempotent', () => {
    const layout = read('app/_layout.tsx');
    const clubScreen = read('app/club_screen.tsx');
    const leagueClient = read('app/services/league_chest_rewards.ts');
    const packTrial = read('app/flashcards/pack_trial_gift.ts');

    expect(clubScreen).toContain('const CLUB_REMOTE_REFRESH_MS = 45_000;');
    expect(layout).toContain('const LEAGUE_BONUS_AVAILABLE_SESSION_MAX_KEYS = 64;');
    expect(layout).toContain('while (leagueBonusAvailableReservedThisSession.size > LEAGUE_BONUS_AVAILABLE_SESSION_MAX_KEYS)');
    expect(leagueClient).toContain('LOCAL_REWARD_EFFECT_KEY_PREFIX');
    expect(leagueClient).toContain('_xp_boost');
    expect(leagueClient).toContain('setPackGiftTrial48hOnce');
    expect(leagueClient).not.toContain("return { claimed: true };\n  }\n  await AsyncStorage.setItem(pendingClaimKey, '1')");
    expect(clubScreen).toContain('hasLeagueChestClaimOrPending');
    expect(clubScreen).toContain('leagueChestReplayModalKeyRef');
    expect(packTrial).toContain('expiresAtOverride');
  });

  it('keeps release-wave shard grants stamped with shard wallet freshness meta', () => {
    const source = read('app/release_wave_bonus.ts');

    expect(source).toContain('const updatedAtMs = Date.now()');
    expect(source).toContain("shards_updated_at_ms: updatedAtMs");
    expect(source).toContain("shards_updated_op: 'earn'");
    expect(source).toContain("shards_updated_reason: 'release_wave_bonus'");
    expect(source).toContain('await replaceShardsBalanceLocal(newBalance, {');
    expect(source).toContain("reason: 'release_wave_bonus'");
    expect(source).toContain("await AsyncStorage.setItem(claimKey(wave), '1')");
    expect(source).not.toContain("['shards_balance', String(newBalance)]");
  });

  it('keeps account merge shard writes stamped so stale local wallets cannot overwrite them', () => {
    const source = read('functions/src/auth_merge.ts');

    expect(source).toContain('const mergedShards = mergeShards(winnerData.shards, loserData.shards);');
    expect(source).toContain('update.shards = mergedShards;');
    expect(source).toContain('update.shards_updated_at_ms = now;');
    expect(source).toContain("update.shards_updated_op = 'replace';");
    expect(source).toContain("update.shards_updated_reason = 'account_merge';");
  });

  it('keeps level gift shard fallback on the shared shard mirror instead of raw balance writes', () => {
    const source = read('app/level_gift_system.ts');

    expect(source).toContain("const options = { op: 'earn' as const, reason: 'level_gift_fallback' }");
    expect(source).toContain('replaceShardsBalanceLocalWhileAccountTransitionLocked(before + safe, accountToken, options)');
    expect(source).toContain('replaceShardsBalanceLocal(before + safe, options)');
    expect(source).not.toContain("AsyncStorage.setItem('shards_balance'");
    expect(source).not.toContain('AsyncStorage.setItem("shards_balance"');
  });

  it('keeps card pack shard purchase CTAs visibly pending while server-first purchase is in flight', () => {
    const source = read('app/flashcards/CardPackShardPaywallModal.tsx');

    expect(source).toContain('ActivityIndicator');
    expect(source).toContain('disabled={purchasing}');
    expect(source).not.toContain('false && purchasing');
  });

  it('keeps friend gift sends optimistic without exposing auth-link internals', () => {
    const friendsTab = read('app/(tabs)/friends.tsx');
    const legacyFriends = read('app/friends_screen.tsx');

    for (const source of [friendsTab, legacyFriends]) {
      expect(source).toContain('sendFriendGiftWithShards');
      expect(source).toContain('setGiftBusyId(giftId)');
      expect(source).toContain("reason: 'friend_gift_optimistic'");
      expect(source).toContain("reason: 'friend_gift_rollback'");
      expect(source).toContain('const guardedBalance = await getShardsBalance().catch(() => res.senderBalanceAfter);');
      expect(source).toContain('setGiftBalance(guardedBalance)');
      expect(source).not.toContain('setGiftBalance(res.senderBalanceAfter)');
      expect(source).not.toContain(['Аккаунт ещё', 'связывается', 'с облаком'].join(' '));
      expect(source).not.toContain(['Подожди пару секунд', 'и попробуй снова'].join(' '));
    }

    expect(friendsTab).toContain('setSentGiftReceipt({');
    expect(friendsTab).toContain('balanceAfter: guardedBalance');
    expect(legacyFriends).toContain('setGiftTarget(null);');
  });

  it('keeps server-first profile upgrades and daily rerolls visibly pending', () => {
    const profileUpgrade = read('components/PlayerProfileModal.tsx');
    const dailyTasks = read('app/daily_tasks_screen.tsx');

    expect(profileUpgrade).toContain('const result = await upgradeProfileCardLevel();');
    expect(profileUpgrade).toContain('disabled={upgradeBusy}');
    expect(profileUpgrade).toContain('<ActivityIndicator size="small" color="#1A1205" />');

    expect(dailyTasks).toContain('rerollDailyTask(target.id, studyTarget)');
    expect(dailyTasks).toContain('setRerollBusyId(target.id)');
    expect(dailyTasks).toContain('disabled={!!rerollBusyId}');
    expect(dailyTasks).toContain('<ActivityIndicator size="small" color={isGoldTheme ? t.textOnGold : t.correctText} />');
  });
});
