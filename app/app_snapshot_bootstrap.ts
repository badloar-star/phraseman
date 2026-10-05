import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  patchAppSnapshot,
  type AppSnapshot,
  type AppSnapshotProfile,
  type AppSnapshotProgress,
  type AppSnapshotSettings,
} from './app_snapshot_store';
import { startFriendsTabSwrPrime } from './friends_tab_swr_warm';
import { lastOpenedLessonKey, lessonProgressKey, storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { getUserSettingsSnapshot, hydrateUserSettingsFromStorage } from './user_settings_store';
import type { SettingsBootReadScope } from '../lib/startup_settings_read_scope';
import { buildCustomizationSnapshot } from './customization_snapshot';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { hydratePersonalProgress } from './personal_progress_store';
import { primeEnergyPeekFromBoot } from './energy_peek_cache';
import { noteSwallowedAs, noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — последние немые catch старта пишут причину
import {
  migrateLegacyVipSnapshotOnce,
  readVipSnapshotForGeneration,
  type VipStorageValues,
} from './premium_vip_storage';
import {
  REFERRAL_STATE_STORAGE_KEY,
  hydrateReferralStateFromRaw,
} from './referrals_cache';
// зачем: Q5 (координатор 01.10) — «Студия персонажа» (Avatar DNA) удалена: первый
// кадр больше не читает её состояние (минус один поход в хранилище и модуль каталога).

const BOOT_PROFILE_KEYS = [
  'user_name',
  'user_avatar',
  'user_frame',
  'premium_active',
  'premium_plan',
] as const;

const BOOT_PROGRESS_KEYS = [
  'streak_count',
] as const;

const BOOT_SETTINGS_KEYS = [
  'haptics_tap',
] as const;

// B3 (PERF_MASTER_PLAN): app_lang (LangContext) и study_target_v1
// (StudyTargetContext, см. app/study_target.ts STUDY_TARGET_STORAGE_KEY) читаются
// в этом же раннем multiGet, но НЕ могут напрямую разблокировать peek в этих двух
// контекстах в рамках ТЕКУЩЕГО запуска: LangProvider/StudyTargetProvider монтируются
// ВЫШЕ AppContent в дереве (app/_layout.tsx ~2784-2787), а primeAppSnapshotFromStorage
// вызывается уже ВНУТРИ AppContent (~1811) и даже получает studyTarget параметром ИЗ
// уже смонтированного StudyTargetProvider — то есть на первом холодном старте
// провайдеры успевают отрендерить первый кадр раньше, чем prime вообще стартует.
// Решение (см. PERF_MASTER_PLAN, задача B3, "второй вариант"): пишем оба значения
// в модульный peek синхронно ПОСЛЕ multiGet — сам процесс (JS-модуль) переживает
// множество маунтов/ремаунтов провайдеров в рамках сессии (навигация, Fast Refresh,
// возврат из фона), так что 2-й и последующие маунты этих провайдеров в РАМКАХ ОДНОЙ
// сессии уже читают peek без прыжка. С холодного перезапуска приложения (новый JS-
// процесс) peek пуст на первом кадре — это тот же выбор, что уже сделан для
// EnergyContext (B2): false-negative на первом кадре первой сессии допустим,
// false-positive (неверный язык/target) — нет.
const BOOT_LANG_KEY = 'app_lang';
const BOOT_STUDY_TARGET_KEY = 'study_target_v1';

let peekAppLangState: string | null = null;
let peekStudyTargetState: string | null = null;

/** Синхронный peek языка интерфейса из последнего прайма (см. комментарий выше). */
export function peekAppLang(): string | null {
  return peekAppLangState;
}

/** Синхронный peek study target из последнего прайма (см. комментарий выше). */
export function peekStudyTargetRaw(): string | null {
  return peekStudyTargetState;
}

/** Позволяет контексту обновить peek сразу после собственного чтения AsyncStorage,
 * не дожидаясь следующего прайма (например, после явного setLang/setStoredStudyTarget). */
export function writePeekAppLang(value: string | null): void {
  peekAppLangState = value;
}

export function writePeekStudyTargetRaw(value: string | null): void {
  peekStudyTargetState = value;
}

function mapPairs(pairs: readonly [string, string | null][]): Map<string, string | null> {
  return new Map(pairs);
}

function readInt(raw: string | null | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function readBool(raw: string | null | undefined): boolean {
  return raw === '1' || raw === 'true';
}

function buildProfileSnapshot(
  values: Map<string, string | null>,
  now: number,
  vipSnapshot: VipStorageValues | null,
): AppSnapshotProfile {
  const vipUntil = Number(vipSnapshot?.vip_until ?? '0') || 0;
  // зачем: пожизненный VIP-грант (сертификат «Pro — навсегда», промокод,
  // бессрочная выдача из админки) не имеет даты окончания — vip_until = 0.
  // Без этого признака он читался как «срок истёк» и на первом кадре терял и
  // доступ, и тир Pro. Зеркалит isLifetimeVipValues в premium_guard.ts.
  const vipPlanRaw = String(vipSnapshot?.vip_plan ?? '').trim().toLowerCase();
  const vipGranted = readBool(vipSnapshot?.vip_active) || !!vipPlanRaw;
  const vipLifetime = vipGranted && vipUntil <= 0;
  const name = values.get('user_name')?.trim() || '';
  const avatar = values.get('user_avatar')?.trim() || '1';
  const frame = values.get('user_frame')?.trim() || '';
  // зачем: D108 — ауры удалены: первый кадр больше не читает и не публикует ауру.

  return {
    source: 'storage',
    updatedAt: now,
    name,
    avatar,
    frame,
    premiumActive: readBool(values.get('premium_active')),
    premiumPlan: values.get('premium_plan')?.trim().toLowerCase() || undefined,
    vipActive: vipUntil > now || vipLifetime,
    vipLifetime,
  };
}

/**
 * зачем (аудит 2026-08-24, «цифра рун прыгает»): секция progress собирается
 * ЗАНОВО, а руны сюда не читаются вовсе — их писатель ровно один
 * (level_spin_star_grants.publishProjection). Без явного переноса стартовая
 * гидратация роняла stars в undefined -> peekRunes() -> 0, и первый кадр
 * Главной показывал ноль рун вместо настоящего баланса.
 *
 * зачем (владелец, 2026-08-24, «счёт рун ждёт подгрузки»): переноса из памяти
 * мало. На ХОЛОДНОМ старте память процесса пуста, переносить нечего — и первый
 * кадр всё равно рисовал ноль, пока асинхронное восстановление не догоняло.
 * Поэтому загрузчик теперь читает руны с диска (`bootRunes`, один getItem) и
 * кладёт их в снапшот вместе с остальными числами. `null` = прочитать не вышло:
 * тогда сохраняем прежнее значение из памяти, но никогда не пишем 0 поверх.
 *
 * Диск не побеждает память безусловно: пока шло чтение, спин мог начислить руны и
 * опубликовать их в снапшот (`publishProjection` пишет туда неподтверждённые
 * начисления). Такое значение свежее прочитанного, поэтому берём БОЛЬШЕЕ —
 * занизить баланс на глазах у игрока хуже, чем на миг отстать.
 *
 * `current` приходит снаружи: patchAppSnapshot зовётся в функциональной форме,
 * поэтому значение берётся на момент применения патча, а не раньше.
 */
function buildProgressSnapshot(
  values: Map<string, string | null>,
  studyTarget: RuntimeStudyTarget,
  now: number,
  current: Readonly<AppSnapshot>,
  bootRunes: Readonly<{ balance: number; earnedTotal: number }> | null,
): AppSnapshotProgress {
  return {
    source: 'storage',
    updatedAt: now,
    streak: readInt(values.get('streak_count')),
    studyTarget: storageStudyTarget(studyTarget),
    // зачем (эмулятор 01.10, лог [HOME-COINS]): неизвестные монеты — undefined, не 0; иначе Главная 22 с показывала «0».
    ...mergeBootRunesIntoProgress(current.progress, bootRunes),
  };
}

/**
 * Руны с диска поверх снимка: null — прочитать не вышло, прежнее значение не трогаем (никогда 0 поверх
 * неизвестного); иначе берём БОЛЬШЕЕ из диска и памяти (свежее начисление спина не занижается).
 * зачем (пакет 10:26): та же формула нужна и для отдельного патча рун после публикации снимка.
 */
export function mergeBootRunesIntoProgress(
  progress: Readonly<{ stars?: number; starsEarnedTotal?: number }> | undefined,
  bootRunes: Readonly<{ balance: number; earnedTotal: number }> | null,
): { stars: number | undefined; starsEarnedTotal: number | undefined } {
  return {
    stars: bootRunes === null && progress?.stars === undefined
      ? undefined
      : Math.max(bootRunes?.balance ?? 0, progress?.stars ?? 0),
    starsEarnedTotal: bootRunes === null && progress?.starsEarnedTotal === undefined
      ? undefined
      : Math.max(bootRunes?.earnedTotal ?? 0, progress?.starsEarnedTotal ?? 0),
  };
}

function buildSettingsSnapshot(values: Map<string, string | null>, now: number): AppSnapshotSettings {
  const settings = getUserSettingsSnapshot();
  const tapHapticsRaw = values.get('haptics_tap');
  return {
    source: 'storage',
    updatedAt: now,
    ...settings,
    tapHaptics: tapHapticsRaw == null ? true : tapHapticsRaw !== 'false',
  };
}

// зачем: PM-211 — прогрев списка друзей (два ключа диска + разбор до 240 профилей) раньше
// входил в то, что ЖДЁТ первый кадр (бюджет 350 мс в _layout), хотя Главная друзей не
// показывает. Теперь вызывается ПОСЛЕ публикации снапшота и не ожидается: сам прогрев
// кладёт результат в общий снапшот (publishFriendsSnapshot), вкладка «Друзья» и Шпиль
// ждут тот же once-промис. Промис прогрева не отклоняется (внутри catch с логом).
async function primeFriendsSnapshot(): Promise<void> {
  await startFriendsTabSwrPrime();
}

const BOOT_LESSON_COUNT = 32;

/**
 * Число верных ответов последнего открытого урока — тот же счёт, что у Главной в loadData ('correct' | 'replay_correct').
 * null — урока нет или запись прогресса битая (Главная тогда ждёт свой loadData, как раньше).
 */
function lastOpenedLessonCorrectFromBoot(
  lastOpenedRaw: string | null,
  values: ReadonlyMap<string, string | null>,
  studyTarget?: RuntimeStudyTarget,
): number | null {
  const lessonId = lastOpenedRaw ? parseInt(lastOpenedRaw, 10) : NaN;
  if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > BOOT_LESSON_COUNT) return null;
  const raw = values.get(lessonProgressKey(lessonId, studyTarget)) ?? null;
  if (!raw) return 0;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    let correct = 0;
    for (const answer of parsed) if (answer === 'correct' || answer === 'replay_correct') correct += 1;
    return correct;
  } catch (error) {
    console.warn('[HOME-COLD] boot_lesson_progress:parse_failed', JSON.stringify({ lessonId, error: error instanceof Error ? error.message : String(error) })); // guard-ok: catch логируется
    return null;
  }
}

export async function primeAppSnapshotFromStorage(
  studyTarget?: RuntimeStudyTarget,
  settingsBootReadScope?: SettingsBootReadScope,
): Promise<void> {
  const now = Date.now();
  // зачем (координатор 05.10, пакет 08:26: на первом кадре Главной lessonCard=empty, hydrationInMemory=false): каждый
  // ранний выход публикации снимка обязан назвать причину и момент — иначе не видно, почему карточка не из снимка.
  const exit = (reason: string): void => {
    console.warn('[BOOT-SNAPSHOT] exit', JSON.stringify({ reason, ms: Date.now() - now })); // guard-ok: ранний выход логируется
  };
  const accountGeneration = captureAccountGeneration();
  const ownerStableId = accountGeneration.stableId;
  if (!ownerStableId) { exit('no_stable_id'); return; }
  const isAccountCurrent = () => isCurrentAccountGeneration(accountGeneration, ownerStableId);
  if (!isAccountCurrent()) { exit('account_changed:start'); return; }
  // PhoneState hydration is local-only and wins for the cutover cohort. Legacy
  // storage remains the compatibility source for everyone else.
  await hydratePersonalProgress().catch(noteSwallowedAs('app_snapshot_bootstrap:hydratePersonalProgress', null));
  if (!isAccountCurrent()) { exit('account_changed:personal_progress'); return; }
  await migrateLegacyVipSnapshotOnce(accountGeneration).catch(noteSwallowedAs('app_snapshot_bootstrap:migrateLegacyVipSnapshotOnce', false));
  if (!isAccountCurrent()) { exit('account_changed:vip_migrate'); return; }
  const vipSnapshot = await readVipSnapshotForGeneration(accountGeneration);
  if (!isAccountCurrent()) { exit('account_changed:vip_read'); return; }
  const preReadMs = Date.now() - now;
  const lastOpenedKey = lastOpenedLessonKey(studyTarget);
  // зачем (пакет 07:26 [HOME-COLD]: карточка урока на холодном старте — заглушки): прогресс уроков читаем в ТОМ ЖЕ
  // multiGet (номер последнего урока до чтения неизвестен) — без второго похода в хранилище и без нового ключа.
  const lessonProgressKeys = Array.from({ length: BOOT_LESSON_COUNT }, (_, index) => lessonProgressKey(index + 1, studyTarget));
  const keys = [
    ...BOOT_PROFILE_KEYS,
    ...BOOT_PROGRESS_KEYS,
    ...BOOT_SETTINGS_KEYS,
    ...lessonProgressKeys,
    lastOpenedKey,
    BOOT_LANG_KEY,
    BOOT_STUDY_TARGET_KEY,
    REFERRAL_STATE_STORAGE_KEY,
  ];
  // зачем (пакет 09:26, прогон 2: published 8246 мс при preRead 334): время каждой части пачки — какая держит публикацию.
  const partsStartedAt = Date.now();
  const parts: Record<string, number> = {};
  const mark = (name: string) => { parts[name] = Date.now() - partsStartedAt; };
  // зачем (пакет 10:26: runesImport 2,1–2,9 с держал публикацию при multiGet 60–200 мс): руны читаются параллельно,
  // но публикацию не держат — досылаются отдельным патчем ниже.
  const bootRunesPromise = import('./level_spin_star_grants')
    .then((module) => { mark('runesImportMs'); return module.peekStoredLevelSpinStarsForBoot(accountGeneration); })
    .catch(noteSwallowedAs('app_snapshot_bootstrap:peekStoredLevelSpinStarsForBoot', null))
    .finally(() => mark('runesPeekMs'));
  const [storageRead] = await Promise.all([
    AsyncStorage.multiGet(keys).then(
      (pairs) => { mark('multiGetMs'); return { ok: true as const, pairs }; },
      () => { mark('multiGetMs'); return { ok: false as const, pairs: [] as [string, string | null][] }; },
    ),
    hydrateUserSettingsFromStorage(settingsBootReadScope).catch(noteSwallowedHandler('app_snapshot_bootstrap:hydrateUserSettingsFromStorage')).finally(() => mark('settingsMs')),
    // зачем: руны в общий multiGet не входят — их ключ зависит от владельца
    // (level_spin_star_projection_v1:<uid>). Импорт ленивый: модуль грантов весит ~740 строк, и тянуть его в
    // стартовый бандл ради одного getItem противоречит Performance Bible. Читаются выше (bootRunesPromise).
  ]);
  const bootRunes = null;
  console.warn('[BOOT-SNAPSHOT] parts', JSON.stringify({ ...parts, keys: keys.length, sincePrimeStartMs: Date.now() - now })); // guard-ok: временная трассировка HOME-COLD

  if (!isAccountCurrent()) { exit('account_changed:multiget'); return; }
  // A failed storage read is not an empty account. Publishing defaults here
  // would render Level 1 / streak 0 and could be mistaken for real progress.
  if (!storageRead.ok) { exit('multiget_failed'); return; }
  const pairs = storageRead.pairs;
  const values = mapPairs(pairs);
  writePeekAppLang(values.get(BOOT_LANG_KEY) ?? null);
  writePeekStudyTargetRaw(values.get(BOOT_STUDY_TARGET_KEY) ?? null);
  hydrateReferralStateFromRaw(
    values.get(REFERRAL_STATE_STORAGE_KEY),
    captureAccountGeneration(),
    now,
  );
  if (!isAccountCurrent()) { exit('account_changed:referral'); return; }
  const profile = buildProfileSnapshot(values, now, vipSnapshot);
  if (!isAccountCurrent()) { exit('account_changed:profile'); return; }
  // зачем: страховка. Обычно прогрев энергии уже отработал — он запускается сам
  // при импорте своего модуля (EnergyProvider монтируется выше AppContent, и
  // вызова отсюда не хватило бы к первому кадру). Повторный вызов дешёв: внутри
  // стоит ранний выход, если кэш уже заполнен, — но он спасает случай, когда
  // хранилище на старте было недоступно.
  void primeEnergyPeekFromBoot().catch(noteSwallowedHandler('app_snapshot_bootstrap:primeEnergyPeekFromBoot'));
  patchAppSnapshot((current) => ({
    profile,
    progress: buildProgressSnapshot(values, studyTarget, now, current, bootRunes),
    customization: buildCustomizationSnapshot(values, now, 0),
    lessons: {
      source: 'storage',
      updatedAt: now,
      primedCount: 0,
      lastOpenedLesson: values.get(lastOpenedKey) ?? null,
      lastOpenedLessonCorrect: lastOpenedLessonCorrectFromBoot(values.get(lastOpenedKey) ?? null, values, studyTarget),
      studyTarget: storageStudyTarget(studyTarget),
    },
    settings: buildSettingsSnapshot(values, now),
    primedAt: now,
  }));
  {
    const lastOpenedRaw = values.get(lastOpenedKey) ?? null;
    console.warn('[BOOT-SNAPSHOT] published', JSON.stringify({
      ms: Date.now() - now, preReadMs, publishedAtEpochMs: Date.now(),
      lastOpenedKey, lastOpenedLesson: lastOpenedRaw,
      lastOpenedLessonCorrect: lastOpenedLessonCorrectFromBoot(lastOpenedRaw, values, studyTarget),
      studyTarget: storageStudyTarget(studyTarget),
      lessonProgressKeysFound: lessonProgressKeys.filter((key) => values.get(key) != null).length,
    })); // guard-ok: временная трассировка HOME-COLD, одна строка за запуск
  }
  // зачем (пакет 10:26): руны досылаются отдельным патчем, когда доедет модуль монет; правила слияния те же.
  void bootRunesPromise.then((runes) => {
    if (!isAccountCurrent()) { exit('account_changed:runes_patch'); return; }
    if (runes === null) {
      console.warn('[BOOT-SNAPSHOT] runes_patch:skip', JSON.stringify({ reason: 'runes_unreadable', ms: Date.now() - now })); // guard-ok: ранний выход логируется
      return;
    }
    patchAppSnapshot((current) => (current.progress
      ? { progress: { ...current.progress, ...mergeBootRunesIntoProgress(current.progress, runes) } }
      : {}));
    console.warn('[BOOT-SNAPSHOT] runes_patched', JSON.stringify({ ms: Date.now() - now })); // guard-ok: временная трассировка HOME-COLD
  });
  // зачем: PM-211 — после публикации, не в критическом пути первого кадра (см. primeFriendsSnapshot).
  void primeFriendsSnapshot();
}

export default function __RouteShim() { return null; }
