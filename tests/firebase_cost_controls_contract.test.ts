import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

describe("Firebase cost controls", () => {
  it("does not export removed stale production handlers from current source or deploy script", () => {
    const indexSource = read("functions/src/index.ts");
    const packageJson = read("functions/package.json");

    for (const name of [
      "communityGetPackRatingSummary",
      "communitySubmitPackRating",
    ]) {
      expect(indexSource).not.toContain(name);
      expect(packageJson).not.toContain(`functions:${name}`);
    }
  });

  // Реферальная система (Фаза 2, односторонний VIP) — теперь штатная: контракт
  // защищает конвейер от случайного выпиливания при cleanup (как было с VIP-кнопкой).
  // зачем: поимённый whitelist деплоя убран снимком 2.0 (efe19ae9d) — functions
  // деплоятся целиком (`firebase deploy --only functions`), поэтому «не выпилить
  // при cleanup» значит «остаться в экспортах index.ts», которые и уезжают.
  it("keeps the referral callables wired into the deployed functions exports", () => {
    const indexSource = read("functions/src/index.ts");
    const packageJson = read("functions/package.json");

    for (const name of [
      "referralEnsureMyCode",
      "referralApply",
      "referralClaimVipReward",
      "referralListMyInvites",
    ]) {
      expect(indexSource).toContain(name);
    }
    expect(packageJson).toMatch(/"deploy": "[^"]*firebase deploy --only functions"/);
  });

  it("keeps referral cost guardrails: no code generation on sign-in, lazy invite link on share, no referral reads in friends sync", () => {
    const authProviderSource = read("app/auth_provider.ts");
    // зачем: экран settings_invite_friend удалён (2026-07-25) — cloud invite
    // теперь строится только по явному нажатию «Пригласить» на /referrals.
    const referralsSource = read("app/referrals.tsx");
    const friendsSource = read("app/firestore_friends.ts");

    // Код выдаётся лениво (по «Пригласить»), а не на каждый вход.
    expect(authProviderSource).not.toContain("import('./referral_system')");
    expect(authProviderSource).not.toContain("generateReferralCode");
    // Экран рефералов делает cloud invite только по явному нажатию Share, не при render/load.
    expect(referralsSource).toContain(
      "const handleInvite = useCallback(async () => {",
    );
    expect(referralsSource).toContain("await buildCloudReferralInviteShare");
    // Синк друзей не читает реферальные коллекции. ЕДИНСТВЕННОЕ разрешённое чтение
    // referral_codes — явный поиск по введённому коду (lookupInviteCode, dd94792b0:
    // друг вводит РЕФЕРАЛЬНЫЙ код вместо friend-кода — иначе «код не найден»).
    // Это одно чтение по прямому действию пользователя, не фоновый синк.
    expect(friendsSource).toContain(
      "REFERRAL_CODE_INDEX_COLLECTION = 'referral_codes'",
    );
    expect(friendsSource).not.toContain("collection('referral_codes')");
  });

  it("keeps Friends referral cloud reads cached, single-flight, and TTL-gated", () => {
    const friendsScreenSource = read("app/(tabs)/friends.tsx");
    const referralVipSource = read("app/referral_vip.ts");
    const referralCloudSource = read("app/referral_cloud.ts");
    const serverReferralSource = read("functions/src/referral.ts");

    expect(friendsScreenSource).toContain(
      "FRIENDS_REFERRAL_REFRESH_TTL_MS = 15 * 60 * 1000",
    );
    expect(friendsScreenSource).toContain("referralRefreshInFlightRef");
    expect(friendsScreenSource).toContain(
      "getClaimableReferralState({ force: options.force })",
    );
    expect(friendsScreenSource).toContain(
      "referralInvitesKey(prev) === referralInvitesKey(state.invites)",
    );

    expect(referralVipSource).toContain(
      "REFERRAL_INVITES_CACHE_TTL_MS = 15 * 60 * 1000",
    );
    expect(referralVipSource).toContain("referralInvitesInFlight");
    expect(referralVipSource).toContain(
      "invalidateClaimableReferralStateCache",
    );
    expect(referralCloudSource).toContain("force: options.force === true");

    expect(serverReferralSource).toContain(
      "LIST_MY_INVITES_SERVER_CACHE_TTL_MS = 60_000",
    );
    expect(serverReferralSource).toContain("listMyInvitesServerCache");
    expect(serverReferralSource).toContain(
      "const force = request.data?.force === true",
    );

  });

  it("keeps new web and admin/background cost controls cheap by default", () => {
    // зачем: functions/src/retired_community_features.ts удалён вместе с
    // community-фичами Арены — его 2 проверки ниже убраны, остальные живые остаются.
    const adminPushSource = read("functions/src/admin_push_jobs.ts");
    const siteStatsSource = read("functions/src/site_stats.ts");
    const webStatsSource = read("knowly-www/assets/stats.js");
    // зачем: knowly-www/assets/start.js удалён с новой воронкой (1d70c8fc5,
    // 2026-09-19). Общий кэш цен теперь греет главная и читает /gift/ — один
    // запрос цен на визит вместо запроса на каждой странице.
    const homeSource = read("knowly-www/assets/home.js");
    const giftSource = read("knowly-www/gift/index.html");
    const thanksSource = read("knowly-www/start/thanks/index.html");

    expect(adminPushSource).toContain("schedule: 'every 6 hours'");
    expect(adminPushSource).not.toContain("schedule: '*/30 * * * *'");
    expect(siteStatsSource).toContain(
      "const rawEvents = Array.isArray(body.events)",
    );
    expect(webStatsSource).toContain("{ events: initialEvents }");
    expect(homeSource).toContain("PRICE_CACHE_KEY = 'pm_web_prices_cache_v1'");
    expect(giftSource).toContain("PRICE_CACHE_KEY = 'pm_web_prices_cache_v1'");
    expect(giftSource).toContain("localStorage.setItem('pm_web_prices_cache_v1'");
    expect(thanksSource).toContain("var MAX_ATTEMPTS = 12");
    expect(thanksSource).toContain("function nextPollDelayMs()");
  });

  it("keeps duplicate identity cleanup callable-driven but not scheduled", () => {
    const indexSource = read("functions/src/index.ts");
    const packageJson = read("functions/package.json");

    expect(indexSource).toContain("authEnsureStableLink");
    expect(indexSource).not.toContain("cleanupLegacyIdentityDuplicatesCron");
    expect(packageJson).not.toContain(
      "functions:cleanupLegacyIdentityDuplicatesCron",
    );
  });

  it("does not run the removed hall-of-fame/global leaderboard sync on a schedule", () => {
    const indexSource = read("functions/src/index.ts");
    const packageJson = read("functions/package.json");

    expect(indexSource).not.toContain("syncLeaderboardCron");
    expect(indexSource).not.toContain("syncLeaderboardFromUsers");
    expect(packageJson).not.toContain("functions:syncLeaderboardCron");
  });

  it("does not push XP or premium changes through the removed global leaderboard callables", () => {
    const indexSource = read("functions/src/index.ts");
    const packageJson = read("functions/package.json");
    const layoutSource = read("app/_layout.tsx");
    const surveySource = read("app/vip_survey.ts");
    const publicProfileSource = read("app/public_profile_snapshot.ts");

    for (const name of ["leaderboardPushMyScore", "leaderboardUpdatePremium"]) {
      expect(indexSource).not.toContain(name);
      expect(packageJson).not.toContain(`functions:${name}`);
    }

    expect(layoutSource).not.toContain("updateMyPremiumInLeaderboard");
    expect(layoutSource).not.toContain("updateMyVipInLeaderboard");
    expect(surveySource).not.toContain("updateMyVipInLeaderboard");
    expect(publicProfileSource).not.toContain("leaderboardPushMyScore");
    expect(publicProfileSource).not.toContain("leaderboardUpdatePremium");
  });

  it("uses a throttled public profile snapshot instead of the old leaderboard write path", () => {
    const layoutSource = read("app/_layout.tsx");
    const rulesSource = read("firestore.rules");
    const publicProfileSource = read("app/public_profile_snapshot.ts");

    expect(publicProfileSource).toContain(
      "PUBLIC_PROFILE_SNAPSHOT_CACHE_KEY = 'public_profile_snapshot_v1'",
    );
    // зачем: с a0b9b88fc (2026-08-15) профиль проецирует сервер
    // (publicProfileProjectMine); клиент больше не пишет public_profiles сам.
    expect(publicProfileSource).toContain("'publicProfileProjectMine'");
    expect(publicProfileSource).not.toContain("collection('public_profiles').doc(stableId).set");
    expect(publicProfileSource).not.toContain("collection('arena_profiles')");
    expect(publicProfileSource).toContain("displayHash");
    expect(publicProfileSource).not.toContain("daily_xp");
    // зачем (D57/PM-063): app/avatar_select.tsx удалён целиком — с ним ушёл
    // единственный вызывающий с reason: 'display_change' (смена аватара/ауры
    // больше нигде не происходит), проверка этой конкретной причины снята.
    expect(layoutSource).toMatch(
      /syncPublicProfileSnapshot\(\{[\s\S]*?reason: 'entitlement_change'/,
    );
    expect(rulesSource).toContain("match /public_profiles/{userId}");
    expect(rulesSource).toContain("allow read: if request.auth != null;");
    expect(rulesSource).toMatch(
      /match \/public_profiles\/\{userId\} \{[\s\S]*?allow update: if false;[\s\S]*?allow create, delete: if false;/,
    );
  });

  // зачем (D57/PM-063): "defers non-critical avatar cosmetics..." проверял
  // AVATAR_DISPLAY_CLOUD_SYNC_DEFER_MS/deferMs-троттлинг внутри
  // app/avatar_select.tsx — экран удалён целиком, троттлинг для отменённого
  // экрана больше не существует и не нужен.

  // зачем: перцентильный крон лидерборда (полный скан users в 03:00) удалён
  // вместе с лидербордом/XP в 2.0 (efe19ae9d); полный скан премиум-крона
  // снижен до раза в сутки (аудит 2026-08-26). Оба — только дешевле.
  it("keeps the retired percentile full-scan off and the premium full-scan daily at most", () => {
    const indexSource = read("functions/src/index.ts");
    const premiumExpirySource = read("functions/src/premium_expiry_cron.ts");

    expect(indexSource).not.toContain("computeLeaderboardStatsCron");
    expect(indexSource).not.toMatch(/schedule: ["']0 3 \* \* \*["']/);
    expect(premiumExpirySource).toContain("schedule: 'every 24 hours'");
    expect(premiumExpirySource).not.toContain("schedule: 'every 12 hours'");
  });

  it("keeps the friends activity feed pipeline retired (no full-scan mirror cron, no fan-out)", () => {
    // зачем (владелец, 2026-08-16): лента активности друзей удалена. Её крон-зеркало
    // читало ВСЕХ пользователей каждые 12ч (≈9k чтений/сутки) ради 0–2 событий на всю
    // базу, а fan-out множил записи на число друзей. Сторож не даёт конвейеру вернуться
    // незаметно: ни экспорта крона, ни fan-out-триггера, ни клиентской ленты.
    const indexSource = read("functions/src/index.ts");
    const friendsScreenSource = read("app/(tabs)/friends.tsx");
    expect(indexSource).not.toContain("syncFriendActivityMirrorCron");
    expect(indexSource).not.toContain("feedFanoutOnMyEvent");
    expect(indexSource).not.toContain("feed_fanout");
    expect(friendsScreenSource).not.toContain("fetchFriendsActivityFeed");
    expect(friendsScreenSource).not.toContain("collection('my_events')");
    // «Дай пять» в строке друга читает мои лайки ОДНИМ запросом, не по другу на каждого.
    // 18.10 (координатор, Firebase-экономия): тот же один запрос — через кэш на 30 мин и только при открытой вкладке.
    expect(friendsScreenSource).toContain("fetchActivityLikeStatesCached()");
    expect(friendsScreenSource).not.toContain("friendUids.map(async uid =>");
  });

  // зачем: App Check снят с клиента навсегда (пломба владельца 2026-08-17,
  // аудит E24 2026-10-01). Прежний тест сторожил прогрев App Check на старте —
  // отменённое правило. Полный сторож клиента: tests/app_check_client_removed.test.ts.
  it("keeps App Check out of the boot path and sealed off on the server", () => {
    const firebaseJson = JSON.parse(read("firebase.json")) as {
      "react-native"?: Record<string, unknown>;
    };
    const layoutSource = read("app/_layout.tsx");
    const callableOptionsSource = read("functions/src/callable_options.ts");
    const indexSource = read("functions/src/index.ts");

    expect(firebaseJson["react-native"] ?? {}).not.toHaveProperty("app_check_token_auto_refresh");
    expect(layoutSource).not.toContain("appCheckWarmup");
    expect(layoutSource).not.toContain("initFirebaseAppCheckIfAvailable");

    expect(callableOptionsSource).toContain("export const ENFORCE_APP_CHECK = false;");
    expect(callableOptionsSource).toContain("export const ENFORCE_APP_CHECK_SENSITIVE = false;");
    expect(callableOptionsSource).toContain("export const ENFORCE_APP_CHECK_OPENAI = false;");

    // The only manually verified HTTP endpoint was Arena's question timeout;
    // the endpoint was deleted with Arena, so it must not be reintroduced.
    expect(indexSource).not.toContain(
      "export const questionTimeout = functions.https.onRequest",
    );
  });

  it("keeps second-layer cost guards for low-value reads and callables", () => {
    // зачем: app/services/arena_hill.ts удалён вместе с Ареной — его 4 проверки
    // ниже убраны, живая проверка daily_phrase_system/indexes остаётся.
    const dailyPhraseSource = read("app/daily_phrase_system.ts");
    const indexes = read("firestore.indexes.json");

    expect(dailyPhraseSource).toContain("where('scheduledDate', '==', date)");
    expect(
      dailyPhraseSource.match(/where\('scheduledDate', '==', date\)/g),
    ).toHaveLength(1);
    expect(dailyPhraseSource).toContain("REMOTE_DAILY_PHRASE_QUERY_LIMIT = 10");
    expect(dailyPhraseSource).not.toContain(".limit(500)");
    expect(indexes).toContain('"collectionGroup": "daily_phrases"');
    expect(indexes).toContain('"fieldPath": "scheduledDate"');
  });

  it("keeps hot progress from repairing identity links on every call", () => {
    const identitySource = read("functions/src/auth_identity.ts");
    const progressSource = read("functions/src/progress_events.ts");

    expect(identitySource).toContain("repairLinks?: boolean");
    expect(identitySource).toContain("options?.repairLinks !== false");
    expect(progressSource).toContain("repairLinks: false");
  });

  it("keeps referral qualification tied to verified premium purchase instead of lesson progress", () => {
    const referralSource = read("functions/src/referral.ts");
    const progressSource = read("functions/src/progress_events.ts");
    const revenueCatSource = read("functions/src/revenuecat_shards.ts");
    const adminReferralsSource = read("functions/src/admin_referrals.ts");

    expect(referralSource).toContain(
      "export async function markRefereeQualified",
    );
    expect(referralSource).toContain("qualifiedBy: 'premium_purchase'");
    expect(referralSource).not.toContain(
      "export const referralOnUserProgressUpdated",
    );
    expect(revenueCatSource).toContain(
      "await qualifyReferralFromVerifiedPremiumOutcome(db, out)",
    );
    // зачем: автосверка отложенных покупок при открытии дашборда заменена явным
    // ремонтом из админки (admin_referral_purchase_repair) — без записей на чтении.
    expect(adminReferralsSource).not.toContain("reconcilePendingReferralPurchases(db, nowMs)");
    expect(adminReferralsSource).toContain("listPendingReferralPurchaseRepairOperations");
    expect(read("functions/src/index.ts")).toContain("adminRepairPendingReferralPurchase");
    expect(progressSource).not.toContain(
      "import { markRefereeQualified } from './referral'",
    );
    expect(progressSource).not.toContain(
      "shouldQualifyReferralFromProgressEvent(event)",
    );
    expect(progressSource).not.toContain(
      "await markRefereeQualified(db, stableUid)",
    );
  });

  it("retires broad users document triggers from source exports and safe deploys", () => {
    const indexSource = read("functions/src/index.ts");
    const packageJson = read("functions/package.json");

    expect(indexSource).not.toContain("exports.referralOnUserProgressUpdated");
    expect(indexSource).not.toContain("export { vipReconcileOrphanGrant }");
    expect(packageJson).not.toContain(
      "functions:referralOnUserProgressUpdated",
    );
    expect(packageJson).not.toContain("functions:vipReconcileOrphanGrant");
  });

  it("keeps admin VIP writes canonical so the orphan reconcile trigger can be retired", () => {
    // зачем: admin/index.html сейчас — это редирект-заглушка на /legacy.html,
    // который hosting раздаёт из admin/v2/legacy.html (единственная рабочая
    // админка, см. CLAUDE.md). Проверяем канонические VIP-записи в живом файле.
    const adminSource = read("admin/v2/legacy.html");
    const accessSource = read("functions/src/admin_access_controls.ts");

    expect(adminSource).toContain("getAdminGrantAccessCallable");
    expect(adminSource).toMatch(/uid,\s*kind:\s*'vip',\s*active:\s*true/);
    expect(adminSource).toMatch(/uid,\s*kind:\s*'vip',\s*active:\s*false/);
    expect(accessSource).toContain(
      "resolveCanonicalAdminAccessTarget(tx, db, input.uid)",
    );
    expect(accessSource).toContain("tx.update(target.ref");
    expect(accessSource).toContain("requestedUid: input.uid");
  });
});
