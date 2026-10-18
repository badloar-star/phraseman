// nickname_rename_pending.ts — тихая досылка нового ника, если при вводе не было входа или сети.
//
// зачем (владелец 18.10 «ввёл имя — НЕ СОХРАНИЛОСЬ»; координатор 09:25, решение (в)): окно имени применяет ник сразу при вводе
// через nameReserve. Если вызов не прошёл (нет входа / сети / таймаут), имя уже стоит на телефоне — откатывать его нельзя, но и
// терять серверную запись тоже. Здесь имя хранится как «ожидает», и при возврате в приложение или смене входа уходит ОДИН вызов
// nameReserve. Свободно → запись снята; занято → прежнее имя возвращается на телефон, а окно имени при следующем открытии
// покажет «Имя уже занято». Журнал [NICK-PENDING]: каждая ветка с причиной. Имя в журнал не пишем — только длину.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { DebugLogger } from './debug-logger';
import { emitAppEvent } from './events';
import { peekStableId } from './stable_id';
import { noteSwallowedAs } from './swallow_log'; // зачем: немой catch запрещён — причина уходит в журнал

export const NICKNAME_RENAME_PENDING_KEY = 'nickname_rename_pending_v1';
/** Имя, которое досылка нашла занятым: окно имени показывает «занято» при следующем открытии и стирает метку. */
export const NICKNAME_RENAME_TAKEN_KEY = 'nickname_rename_taken_v1';

type PendingRename = { name: string; previous: string; owner: string | null; at: number; attempts: number; retryAfter: number };

// зачем (Ревизор f6d8aa518 🟡1): при постоянной ошибке запись не должна жить вечно — 7 суток или 10 неудачных попыток.
const PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PENDING_MAX_ATTEMPTS = 10;

let flight: Promise<void> | null = null;
/** Слушатели живут только пока есть ожидающее имя: без записи — ни слушателя, ни сети (как у досылки сгенерированного ника). */
let appStateSub: { remove: () => void } | null = null;
let authUnsub: (() => void) | null = null;
/** зачем (Ревизор f6d8aa518 🟡3): поколение подписки — поздний ответ import после снятия/повторной установки не даёт вторую подписку auth. */
let authGen = 0;

function ensureListeners(): void {
  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushNicknameRenamePending('app_active');
    });
  }
  if (!authUnsub) {
    authUnsub = () => undefined; // место занято до ответа import — без двойной подписки
    const gen = ++authGen;
    void import('./auth_provider').then(({ subscribeFirebaseAuthUid }) => {
      if (gen !== authGen || !appStateSub) {
        log('listeners:auth_subscribe_skipped', { reason: gen !== authGen ? 'stale_generation' : 'no_pending' });
        if (gen === authGen) authUnsub = null;
        return;
      }
      authUnsub = subscribeFirebaseAuthUid((authUid) => {
        if (authUid) void flushNicknameRenamePending('auth_ready');
      });
    }).catch((error: unknown) => {
      if (gen === authGen) authUnsub = null;
      log('listeners:auth_subscribe_failed', { message: error instanceof Error ? error.message : String(error) }, true);
    });
  }
}

function removeListeners(reason: string): void {
  if (!appStateSub && !authUnsub) return;
  appStateSub?.remove();
  appStateSub = null;
  authUnsub?.();
  authUnsub = null;
  authGen += 1;
  log('listeners:removed', { reason });
}

function log(step: string, fields: Record<string, unknown> = {}, failure = false): void {
  const line = `[NICK-PENDING] ${step} ${JSON.stringify(fields)}`;
  if (failure) DebugLogger.warn('nickname_rename_pending', line);
  else console.log(line); // guard-ok: одна строка на шаг досылки ника
}

function parsePending(raw: string | null): PendingRename | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingRename>;
    const name = String(value?.name ?? '').trim();
    if (name.length < 2) return null;
    return {
      name,
      previous: String(value?.previous ?? '').trim(),
      owner: value?.owner ? String(value.owner) : null,
      at: Number(value?.at) || 0,
      attempts: Number(value?.attempts) || 0,
      retryAfter: Number(value?.retryAfter) || 0,
    };
  } catch (error) {
    log('parse:failed — запись отброшена', { message: error instanceof Error ? error.message : String(error) }, true);
    return null;
  }
}

/** Окно имени: вызов брони не прошёл — имя остаётся на телефоне и ждёт досылки. */
export async function markNicknameRenamePending(name: string, previous: string): Promise<void> {
  const record: PendingRename = { name: name.trim(), previous: previous.trim(), owner: peekStableId(), at: Date.now(), attempts: 0, retryAfter: 0 };
  log('mark', { len: record.name.length, prevLen: record.previous.length, owner: record.owner ? 'есть' : 'нет' });
  try {
    await AsyncStorage.setItem(NICKNAME_RENAME_PENDING_KEY, JSON.stringify(record));
  } catch (error) {
    log('mark:storage_failed', { message: error instanceof Error ? error.message : String(error) }, true);
  }
  ensureListeners();
}

/** Окно имени: бронь ответила (ok / занято) — ожидающая запись больше не нужна. */
export async function clearNicknameRenamePending(reason: string): Promise<void> {
  try {
    const had = await AsyncStorage.getItem(NICKNAME_RENAME_PENDING_KEY);
    if (!had) return;
    await AsyncStorage.removeItem(NICKNAME_RENAME_PENDING_KEY);
    removeListeners(`clear_${reason}`);
    log('clear', { reason });
  } catch (error) {
    log('clear:storage_failed', { reason, message: error instanceof Error ? error.message : String(error) }, true);
  }
}

/** Окно имени при открытии: имя, которое досылка нашла занятым (одноразово). */
export async function takeNicknameRenameTakenNotice(): Promise<string | null> {
  try {
    const name = (await AsyncStorage.getItem(NICKNAME_RENAME_TAKEN_KEY))?.trim() || null;
    if (name) await AsyncStorage.removeItem(NICKNAME_RENAME_TAKEN_KEY);
    return name;
  } catch (error) {
    log('taken_notice:storage_failed', { message: error instanceof Error ? error.message : String(error) }, true);
    return null;
  }
}

async function revertLocalName(pending: PendingRename): Promise<void> {
  const { patchAppSnapshot } = await import('./app_snapshot_store');
  const { updateLocalNameReferences } = await import('./nickname_change_helpers');
  const rawProfile = await AsyncStorage.getItem('user_profile').catch(noteSwallowedAs('nickname_rename_pending:profile', null));
  let profile: Record<string, unknown> = {};
  try { profile = rawProfile ? JSON.parse(rawProfile) as Record<string, unknown> : {}; } catch (error) {
    log('revert:profile_parse_failed', { message: error instanceof Error ? error.message : String(error) }, true);
  }
  await AsyncStorage.multiSet([
    ['user_name', pending.previous],
    ['user_profile', JSON.stringify({ ...profile, name: pending.previous })],
    [NICKNAME_RENAME_TAKEN_KEY, pending.name],
  ]);
  patchAppSnapshot((current) => current.profile ? {
    profile: { ...current.profile, source: 'local', updatedAt: Date.now(), name: pending.previous },
  } : {});
  await updateLocalNameReferences(pending.name, pending.previous).catch((error: unknown) => {
    log('revert:references_failed', { message: error instanceof Error ? error.message : String(error) }, true);
  });
  emitAppEvent('cloud_profile_hydrated');
}

/** Один вызов nameReserve для ожидающего имени (без параллельных — повтор ждёт текущий). */
export function flushNicknameRenamePending(trigger: string): Promise<void> {
  if (flight) return flight;
  flight = (async () => {
    const pending = parsePending(await AsyncStorage.getItem(NICKNAME_RENAME_PENDING_KEY).catch(noteSwallowedAs('nickname_rename_pending:read', null)));
    if (!pending) {
      log('flush:skip reason=no_pending', { trigger });
      removeListeners('no_pending');
      return;
    }
    const now = Date.now();
    if (now - pending.at > PENDING_MAX_AGE_MS || pending.attempts >= PENDING_MAX_ATTEMPTS) {
      log('flush:drop reason=expired', { trigger, ageMs: now - pending.at, attempts: pending.attempts });
      await AsyncStorage.removeItem(NICKNAME_RENAME_PENDING_KEY).catch(noteSwallowedAs('nickname_rename_pending:remove', undefined));
      removeListeners('expired');
      return;
    }
    if (pending.retryAfter > now) {
      // зачем (Ревизор 127fc785a 🟡): после rate_limited не стучимся на каждом возврате — ждём nextChangeAt.
      log('flush:wait reason=rate_limited_until', { trigger, waitMs: pending.retryAfter - now });
      ensureListeners();
      return;
    }
    const owner = peekStableId();
    if (!owner) {
      // зачем (Ревизор f6d8aa518 🟡2): без текущей личности нельзя убедиться, что имя этого аккаунта, — не шлём, ждём входа.
      log('flush:wait reason=no_current_owner', { trigger, pendingOwner: pending.owner ? 'есть' : 'нет' });
      ensureListeners();
      return;
    }
    if (pending.owner && pending.owner !== owner) {
      // Другой аккаунт: имя относится к прежнему — не применяем его к новому.
      log('flush:drop reason=owner_changed', { trigger });
      await AsyncStorage.removeItem(NICKNAME_RENAME_PENDING_KEY).catch(noteSwallowedAs('nickname_rename_pending:remove', undefined));
      removeListeners('owner_changed');
      return;
    }
    const localName = (await AsyncStorage.getItem('user_name').catch(noteSwallowedAs('nickname_rename_pending:user_name', null)))?.trim() ?? '';
    if (localName && localName !== pending.name) {
      // Человек успел сменить имя ещё раз — более свежее действие решает само.
      log('flush:drop reason=superseded_by_newer_local_name', { trigger });
      await AsyncStorage.removeItem(NICKNAME_RENAME_PENDING_KEY).catch(noteSwallowedAs('nickname_rename_pending:remove', undefined));
      removeListeners('superseded');
      return;
    }
    const startedAt = Date.now();
    const { reserveNameDetailed } = await import('./firestore_leaderboard');
    const result = await reserveNameDetailed(pending.name, pending.previous, { source: 'settings' })
      .catch((error: unknown) => {
        log('flush:reserve_threw', { trigger, message: error instanceof Error ? error.message : String(error) }, true);
        return { status: 'error' as const };
      });
    log(`flush:result status=${result.status}`, { trigger, len: pending.name.length, ms: Date.now() - startedAt, ageMs: Date.now() - pending.at });
    if (result.status === 'ok') {
      await AsyncStorage.removeItem(NICKNAME_RENAME_PENDING_KEY).catch(noteSwallowedAs('nickname_rename_pending:remove', undefined));
      removeListeners('sent_ok');
      return;
    }
    if (result.status === 'taken' || result.status === 'cooldown') {
      await AsyncStorage.removeItem(NICKNAME_RENAME_PENDING_KEY).catch(noteSwallowedAs('nickname_rename_pending:remove', undefined));
      removeListeners(`server_${result.status}`);
      // зачем (Ревизор f6d8aa518 🟡4): пока шёл запрос, человек мог сменить имя — свежее не затираем.
      const nameNow = (await AsyncStorage.getItem('user_name').catch(noteSwallowedAs('nickname_rename_pending:user_name_after', null)))?.trim() ?? '';
      if (nameNow && nameNow !== pending.name) {
        log('flush:skip_revert reason=name_changed_during_request', { trigger, reason: result.status });
        return;
      }
      await revertLocalName(pending);
      log('flush:reverted_to_previous', { trigger, reason: result.status });
      return;
    }
    // 'error' и 'rate_limited' (лимит 300 смен в час, координатор 18.10) — запись держим, ждём следующего возврата в приложение / смены входа.
    const next: PendingRename = {
      ...pending,
      attempts: pending.attempts + 1,
      retryAfter: result.status === 'rate_limited' ? Number(result.nextChangeAt) || 0 : 0,
    };
    await AsyncStorage.setItem(NICKNAME_RENAME_PENDING_KEY, JSON.stringify(next)).catch(noteSwallowedAs('nickname_rename_pending:bump', undefined));
    log(`flush:kept reason=${result.status === 'rate_limited' ? 'rate_limited' : 'reserve_error'}`, { trigger, attempts: next.attempts, retryAfterMs: next.retryAfter ? next.retryAfter - Date.now() : 0 });
    ensureListeners();
  })().catch((error: unknown) => {
    log('flush:failed', { trigger, message: error instanceof Error ? error.message : String(error) }, true);
  }).finally(() => {
    flight = null;
  });
  return flight;
}

/**
 * Старт при запуске: одна проверка ожидающей записи. Слушатели (возврат в приложение, смена входа) вешаются только если
 * запись есть и не ушла — без записи ни вечного слушателя, ни сети.
 */
export function startNicknameRenamePendingSync(): void {
  void flushNicknameRenamePending('start');
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
