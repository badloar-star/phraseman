// stable_id.ts — Постоянный ID пользователя, переживающий переустановку приложения
//
// iOS:     expo-secure-store → Keychain → сохраняется после удаления приложения
//          (kSecAttrAccessibleAfterFirstUnlock — попадает в iCloud Keychain Backup,
//          доступен после первого unlock устройства; переезжает между устройствами
//          одного Apple ID, если у юзера включён iCloud Keychain).
// Android: expo-secure-store → EncryptedSharedPreferences (AES-256 + Android Keystore).
//          Auto Backup от Android НЕ копирует EncryptedSharedPreferences (ключ
//          Keystore device-bound). Поэтому для надёжности на Android stable_id
//          ДУБЛИРУЕТСЯ в plain AsyncStorage (RKStorage SQLite), который попадает
//          в Auto Backup согласно android/backup_rules.xml — это позволяет
//          восстановить ID при переустановке если у юзера включён Google Drive Backup.
//          stable_id — это просто UUID, не секрет: его утечка ничего не даёт без
//          линка через auth_links + Firebase Rules.
//
// В Expo Go нативного модуля SecureStore нет — не импортируем пакет на верхнем уровне,
// только ленивый require в dev build / production; иначе AsyncStorage.

import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_EXPO_GO } from './config';
import { beginInitialAccountGeneration, invalidateAccountGeneration } from './account_generation';
import {
  assertAccountDeleteStableIdentityAvailable,
} from './account_delete_quarantine';
import { DebugLogger } from './debug-logger';
import { identityErrorCode, identityTag, identityTrace, identityTraceClockMs } from './identity_trace';
import { noteSwallowed, noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const SECURE_KEY = 'phraseman_stable_uid';
const ASYNC_KEY = 'phraseman_stable_uid_cache';
/**
 * Метка «SecureStore отстал»: значение = stable_id, который приняла последняя
 * намеренная запись (setStableId), но НЕ принял SecureStore.
 *
 * зачем (AA S2d 🔴3, §127, случай «уровень 13↔12, дни 155↔52»): какой слой
 * правдивее при расхождении? Ни у одного слоя нет времени записи, а Date.now()
 * в этом модуле подменяют тесты входа. Правдиво то, что записала ПОСЛЕДНЯЯ
 * намеренная смена профиля (её делает только auth_provider/cloud_sync после
 * подтверждения сервером). Если SecureStore её не принял, единственный способ
 * донести это до следующего старта — метка в слое, который запись ПРИНЯЛ.
 * Метка живёт в AsyncStorage, потому что сбой именно SecureStore (Keystore /
 * Keychain) и есть найденная причина; без метки при расхождении остаётся
 * прежнее правило «SecureStore первым» (оно верно для переустановки на iOS, где
 * AsyncStorage приезжает из старого бэкапа, а Keychain — актуальный).
 * Метка действует, только если совпадает со значением AsyncStorage: чужая или
 * старая метка не может перевесить SecureStore.
 */
const SECURE_STALE_MARKER_KEY = 'phraseman_stable_uid_secure_stale_v1';
/** Одна запись + один повтор на слой: сбой Keystore часто разовый (занят/не разблокирован). */
const LAYER_WRITE_ATTEMPTS = 2;

/**
 * iOS Keychain Service (group/namespace для Keychain item).
 * Явно фиксируем имя, чтобы:
 *   1. При апгрейдах bundle id или Keychain access groups item не «перепрятался».
 *   2. Можно было управлять/мигрировать через скрипты восстановления.
 * НЕ передаваемое имя приводит к дефолтному expo.modules.securestore — оно тоже
 * стабильное, но зависит от версии expo-secure-store. Лучше пинить.
 */
const KEYCHAIN_SERVICE = 'phraseman.identity.stable_id';

type SecureStoreModule = typeof import('expo-secure-store');
let secureStoreCache: SecureStoreModule | null | false = false;
let cachedId: string | null = null;
let stableIdOperationEpoch = 0;

class StableIdReadSupersededError extends Error {
  constructor() { super('stable_id_read_superseded'); }
}

function assertCurrentStableIdRead(epoch: number): void {
  if (epoch !== stableIdOperationEpoch) throw new StableIdReadSupersededError();
}

function getSecureStore(): SecureStoreModule | null {
  if (IS_EXPO_GO) return null;
  if (secureStoreCache === false) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      secureStoreCache = require('expo-secure-store') as SecureStoreModule;
    } catch {
      secureStoreCache = null;
    }
  }
  return secureStoreCache || null;
}

/**
 * Старт продолжается ВСЕГДА: локальный след удаления больше не запирает вход
 * (правило отменено 2026-09-01, коммит 97fdf2083). Любая причина — след не
 * виден, повреждён или в незавершённой фазе — уходит в журнал уровнем
 * warning, а приложение открывается. Правду об удалении держит сервер:
 * tombstone + permanent denial + accountDeleteStatusMine.
 */
async function assertStableIdentityAvailableAtStartup(candidateStableId?: string | null): Promise<void> {
  try {
    await assertAccountDeleteStableIdentityAvailable(candidateStableId);
  } catch (error) {
    // зачем НИКОГДА не бросать наружу (владелец, 2026-09-01): эта функция
    // живёт внутри getStableId(), а он зовётся десятки раз за запуск — любой
    // бросок отсюда означал мёртвый старт и лавину алертов. Единственный
    // оставшийся класс (`deleted_stable_id_denied`) говорит «этот локальный
    // id принадлежит удаляемому аккаунту» — правильная реакция на него не
    // «сломать приложение», а ВЗЯТЬ НОВЫЙ id: удаление уже стёрло данные,
    // человеку нужен чистый профиль. Ротацию делает вызывающий код по
    // отсутствию идентичности; здесь просто не мешаем ему работать.
    DebugLogger.error(
      'stable_id:delete_guard_ignored',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
  }
}

/**
 * Опции SecureStore для stable_id:
 *   • keychainService — фиксированный namespace на iOS.
 *   • keychainAccessible: AFTER_FIRST_UNLOCK — стандарт для не-критичных long-lived
 *     identifiers. Item доступен после первого unlock устройства и:
 *       - НЕ привязан к конкретному устройству (без _THIS_DEVICE_ONLY) → попадает
 *         в iCloud Keychain backup, переезжает между iPhone/iPad одного Apple ID;
 *       - переживает удаление приложения (что нам и нужно).
 *
 * ВАЖНО: те же опции должны использоваться при getItemAsync / deleteItemAsync,
 * иначе iOS трактует item как «другой» (по keychainService) и вернёт null.
 */
function getSecureStoreOpts(SS: SecureStoreModule): import('expo-secure-store').SecureStoreOptions {
  return {
    keychainService: KEYCHAIN_SERVICE,
    keychainAccessible: SS.AFTER_FIRST_UNLOCK,
  };
}

/**
 * Синхронный доступ к уже загруженному stable_id (без await). Возвращает null, если ID
 * ещё не закэширован в памяти (обычно он загружается на старте приложения, поэтому к моменту
 * открытия пейвола уже есть). Нужен для мгновенного решения A/B-варианта пейвола без спиннера.
 */
export function peekStableId(): string | null {
  return cachedId;
}

export type StableIdChange = Readonly<{
  previous: string | null;
  next: string | null;
  kind: 'set' | 'cleared';
}>;

const stableIdChangeListeners = new Set<(change: StableIdChange) => void>();

/**
 * Подписка на ЛЮБУЮ смену аккаунта на устройстве (setStableId на другой id или
 * clearStableId). Слушатель зовётся синхронно, сразу после успешной записи.
 *
 * зачем (AA S2d 🔴1): перенос Plus обязан срабатывать после ЛЮБОГО переключения
 * (вход со свапом, adopt по серверу, «Сменить аккаунт», восстановление после
 * переустановки) — единственная общая точка всех путей здесь. Модуль личности
 * ничего не знает о Plus: он только сообщает факт смены.
 */
export function onStableIdChanged(listener: (change: StableIdChange) => void): () => void {
  stableIdChangeListeners.add(listener);
  return () => { stableIdChangeListeners.delete(listener); };
}

function emitStableIdChange(change: StableIdChange): void {
  for (const listener of stableIdChangeListeners) {
    try {
      listener(change);
    } catch (error) {
      // Слушатель не имеет права сорвать смену аккаунта; причина — в журнал.
      identityTrace('[PROFILE-FLIP]', 'change listener_failed', { kind: change.kind, code: identityErrorCode(error) });
    }
  }
}

type StableLayerChoiceReason = 'secure_marked_stale' | 'no_marker' | 'marker_mismatch';

type StableLayerChoice = Readonly<{
  value: string;
  chosen: 'secure' | 'async';
  reason: StableLayerChoiceReason;
}>;

/**
 * Правило выбора при расхождении слоёв (AA S2d 🔴3). Вызывается ТОЛЬКО когда
 * оба слоя непусты и различаются. AsyncStorage побеждает лишь при метке,
 * совпадающей с его значением; иначе — прежний порядок «SecureStore первым».
 */
function chooseDivergentStableLayer(
  secureValue: string,
  asyncValue: string,
  marker: string | null,
): StableLayerChoice {
  if (marker && marker === asyncValue) {
    return { value: asyncValue, chosen: 'async', reason: 'secure_marked_stale' };
  }
  return { value: secureValue, chosen: 'secure', reason: marker ? 'marker_mismatch' : 'no_marker' };
}

async function readSecureStaleMarker(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(SECURE_STALE_MARKER_KEY);
    const marker = typeof raw === 'string' ? raw.trim() : '';
    return marker || null;
  } catch (error) {
    // зачем: немой catch запрещён; без метки остаётся прежнее правило «SecureStore первым».
    identityTrace('[PROFILE-FLIP]', 'marker read_failed', { code: identityErrorCode(error) });
    return null;
  }
}

async function removeSecureStaleMarker(context: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(SECURE_STALE_MARKER_KEY);
    return true;
  } catch (error) {
    identityTrace('[PROFILE-FLIP]', 'marker remove_failed', { context, code: identityErrorCode(error) }, { persist: true });
    return false;
  }
}

/**
 * Старт нашёл в SecureStore и AsyncStorage РАЗНЫЕ профили: выбрать по правилу,
 * починить отставший слой, записать `layersDiverge` в журнал (переживает
 * перезапуск — по нему видно, что «прыжки» прекратились).
 */
async function resolveStartupLayerDivergence(
  SecureStore: SecureStoreModule,
  opts: import('expo-secure-store').SecureStoreOptions,
  secureValue: string,
  asyncValue: string,
): Promise<string> {
  const marker = await readSecureStaleMarker();
  const choice = chooseDivergentStableLayer(secureValue, asyncValue, marker);
  let repair: 'ok' | 'failed' = 'ok';
  let repairCode: string | null = null;
  try {
    if (choice.chosen === 'async') {
      await SecureStore.setItemAsync(SECURE_KEY, choice.value, opts);
    } else {
      await AsyncStorage.setItem(ASYNC_KEY, choice.value);
    }
  } catch (error) {
    repair = 'failed';
    repairCode = identityErrorCode(error);
  }
  // Метка больше не нужна, когда SecureStore догнал, или когда она не совпала
  // (устаревшая). Держим её только пока SecureStore по-прежнему отстаёт.
  if (marker && (repair === 'ok' || choice.chosen === 'secure')) {
    await removeSecureStaleMarker('startup');
  }
  identityTrace('[PROFILE-FLIP]', 'startup layersDiverge', {
    chosen: choice.chosen,
    reason: choice.reason,
    secure: identityTag(secureValue),
    async: identityTag(asyncValue),
    marker: marker ? identityTag(marker) : 'none',
    repair,
    repairCode,
  }, { persist: true });
  return choice.value;
}

async function readOrCreateStableId(epoch: number): Promise<string> {
  await assertStableIdentityAvailableAtStartup();
  assertCurrentStableIdRead(epoch);
  if (cachedId) {
    await assertStableIdentityAvailableAtStartup(cachedId);
    assertCurrentStableIdRead(epoch);
    beginInitialAccountGeneration(cachedId);
    return cachedId;
  }

  const SecureStore = getSecureStore();
  const opts = SecureStore ? getSecureStoreOpts(SecureStore) : undefined;

  if (SecureStore && opts) {
    try {
      // Сначала пробуем с фиксированным keychainService.
      let usedLegacySecureItem = false;
      let stored = await SecureStore.getItemAsync(SECURE_KEY, opts);
      assertCurrentStableIdRead(epoch);
      // Миграция со старого Keychain item (без keychainService): если новый ключ
      // пуст — попробуем старый, скопируем в новый и удалим старый.
      if (!stored) {
        try {
          const legacy = await SecureStore.getItemAsync(SECURE_KEY);
          assertCurrentStableIdRead(epoch);
          if (legacy) {
            await SecureStore.setItemAsync(SECURE_KEY, legacy, opts).catch(noteSwallowedHandler('stable_id:promise_1'));
            await SecureStore.deleteItemAsync(SECURE_KEY).catch(noteSwallowedHandler('stable_id:promise_2'));
            stored = legacy;
            usedLegacySecureItem = true;
          }
        } catch (e) {
      // ignore legacy migration errors
      DebugLogger.error('stable_id:legacy', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      }
      if (stored) {
        await assertStableIdentityAvailableAtStartup(stored);
        assertCurrentStableIdRead(epoch);
        // зачем (AA S2c, случай §126 «после перезапуска уровень 13↔12, дни
        // 155↔52»): гипотеза — два слоя хранения разошлись (SecureStore держит
        // старый профиль, AsyncStorage — новый), и SecureStore при старте
        // побеждает. СПЕРВА ЛОГИ: сравниваем оба слоя ДО перезаписи AsyncStorage.
        // Одно лишнее чтение AsyncStorage за холодный старт.
        let asyncBefore: string | null = null;
        let asyncReadFailed = false;
        try {
          asyncBefore = await AsyncStorage.getItem(ASYNC_KEY);
        } catch (asyncError) {
          asyncReadFailed = true;
          identityTrace('[PROFILE-FLIP]', 'startup async_read_failed', { code: identityErrorCode(asyncError) });
        }
        const layersAgree = !asyncReadFailed && asyncBefore === stored;
        // В журнал (переживает перезапуск) — только расхождение слоёв: обычный
        // старт не платит записью в AsyncStorage (холодный старт не тяжелеет).
        identityTrace('[PROFILE-FLIP]', 'startup source', {
          source: usedLegacySecureItem ? 'secure_store_legacy' : 'secure_store',
          stable: identityTag(stored),
          asyncStable: asyncReadFailed ? 'unreadable' : identityTag(asyncBefore),
          layersAgree,
        }, { persist: !layersAgree });
        // зачем (AA S2d 🔴3): раньше при расхождении SecureStore молча побеждал и
        // AsyncStorage перезаписывался — новый профиль, принятый только
        // AsyncStorage, терялся на каждом старте («прыжок»). Теперь выбор по
        // метке последней намеренной записи и починка отставшего слоя.
        if (!asyncReadFailed && asyncBefore && asyncBefore !== stored) {
          const resolved = await resolveStartupLayerDivergence(SecureStore, opts, stored, asyncBefore);
          assertCurrentStableIdRead(epoch);
          await assertStableIdentityAvailableAtStartup(resolved);
          assertCurrentStableIdRead(epoch);
          cachedId = resolved;
          beginInitialAccountGeneration(resolved);
          return resolved;
        }
        cachedId = stored;
        await AsyncStorage.setItem(ASYNC_KEY, stored);
        assertCurrentStableIdRead(epoch);
        beginInitialAccountGeneration(stored);
        return stored;
      }
    } catch (e) {
      // native / keystore issues → fall through
      DebugLogger.error('stable_id:legacy', e instanceof Error ? e : new Error(String(e)), 'warning');
      identityTrace('[PROFILE-FLIP]', 'startup secure_read_failed', { code: identityErrorCode(e) }, { persist: true });
    }
  }

  // Fallback: проверяем AsyncStorage (помогает при первом запуске после обновления / Expo Go;
  // на Android также критично — RKStorage переживает Auto Backup, а EncryptedSharedPreferences нет).
  try {
    const cached = await AsyncStorage.getItem(ASYNC_KEY);
    assertCurrentStableIdRead(epoch);
    if (cached) {
      await assertStableIdentityAvailableAtStartup(cached);
      assertCurrentStableIdRead(epoch);
      identityTrace('[PROFILE-FLIP]', 'startup source', {
        source: 'async_storage',
        stable: identityTag(cached),
        secureAvailable: Boolean(SecureStore && opts),
      }, { persist: true });
      cachedId = cached;
      if (SecureStore && opts) {
        // зачем (AA S2d 🔴3): SecureStore пуст/нечитаем — догоняем его; метку
        // «SecureStore отстал» снимаем только когда он реально принял значение.
        let secureRepaired = false;
        await SecureStore.setItemAsync(SECURE_KEY, cached, opts)
          .then(() => { secureRepaired = true; })
          .catch(noteSwallowedHandler('stable_id:promise_3'));
        if (secureRepaired) await removeSecureStaleMarker('startup_async_fallback');
      }
      beginInitialAccountGeneration(cached);
      return cached;
    }
  } catch (e) {
      DebugLogger.error('stable_id:cached', e instanceof Error ? e : new Error(String(e)), 'warning');
    }

  // Создаём новый ID
  const newId = Crypto.randomUUID();
  assertCurrentStableIdRead(epoch);
  await assertStableIdentityAvailableAtStartup(newId);
  assertCurrentStableIdRead(epoch);

  if (SecureStore && opts) {
    try {
      await SecureStore.setItemAsync(SECURE_KEY, newId, opts);
      assertCurrentStableIdRead(epoch);
    } catch (e) {
      // only AsyncStorage below
      DebugLogger.error('stable_id:newId', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  await AsyncStorage.setItem(ASYNC_KEY, newId).catch(noteSwallowedHandler('stable_id:promise_4'));
  assertCurrentStableIdRead(epoch);

  cachedId = newId;
  beginInitialAccountGeneration(newId);
  identityTrace('[PROFILE-FLIP]', 'startup source', { source: 'generated', stable: identityTag(newId) });

  return newId;
}

/** Только чтение (без починки слоёв): значение AsyncStorage, если метка подтверждает его. */
async function readMarkedAsyncOverride(secureValue: string): Promise<string> {
  try {
    const asyncValue = await AsyncStorage.getItem(ASYNC_KEY);
    if (!asyncValue || asyncValue === secureValue) return secureValue;
    const marker = await readSecureStaleMarker();
    const choice = chooseDivergentStableLayer(secureValue, asyncValue, marker);
    identityTrace('[PROFILE-FLIP]', 'ownership_read layersDiverge', {
      chosen: choice.chosen,
      reason: choice.reason,
      secure: identityTag(secureValue),
      async: identityTag(asyncValue),
    });
    return choice.value;
  } catch (error) {
    identityTrace('[PROFILE-FLIP]', 'ownership_read async_failed', { code: identityErrorCode(error) });
    return secureValue;
  }
}

let stableIdLoadInFlight: Promise<string> | null = null;
let stableIdMutationInFlight: Promise<void> | null = null;

/**
 * Reads the identity already owned by this installation without creating one
 * and without activating an account generation. Recovery/quarantine code uses
 * this to prove marker ownership before any destructive operation.
 */
export async function readExistingStableId(): Promise<string | null> {
  await stableIdMutationInFlight?.catch(noteSwallowedHandler('stable_id:promise_5'));
  if (cachedId) return cachedId;
  const epoch = stableIdOperationEpoch;
  const normalize = (value: unknown): string | null => {
    const candidate = typeof value === 'string' ? value.trim() : '';
    return candidate || null;
  };
  const SecureStore = getSecureStore();
  if (SecureStore) {
    const opts = getSecureStoreOpts(SecureStore);
    try {
      const current = normalize(await SecureStore.getItemAsync(SECURE_KEY, opts));
      if (epoch !== stableIdOperationEpoch) return readExistingStableId();
      if (current) {
        // зачем (AA S2d 🔴3): восстановление/карантин доказывают владение тем же
        // правилом, что и старт; иначе они видели бы «старый» профиль из
        // отставшего SecureStore, а приложение — новый.
        const resolved = await readMarkedAsyncOverride(current);
        if (epoch !== stableIdOperationEpoch) return readExistingStableId();
        cachedId = resolved;
        return resolved;
      }
    } catch (swallowedError) { /* fall through to legacy/AsyncStorage read */ noteSwallowed('stable_id:catch_1', swallowedError); }
    try {
      const legacy = normalize(await SecureStore.getItemAsync(SECURE_KEY));
      if (epoch !== stableIdOperationEpoch) return readExistingStableId();
      if (legacy) {
        cachedId = legacy;
        return legacy;
      }
    } catch (swallowedError) { /* fall through to AsyncStorage read */ noteSwallowed('stable_id:catch_2', swallowedError); }
  }
  try {
    const asyncValue = normalize(await AsyncStorage.getItem(ASYNC_KEY));
    if (epoch !== stableIdOperationEpoch) return readExistingStableId();
    if (asyncValue) cachedId = asyncValue;
    return asyncValue;
  } catch {
    return null;
  }
}

export function getStableId(): Promise<string> {
  if (stableIdMutationInFlight) {
    const barrier = stableIdMutationInFlight;
    return barrier.then(() => getStableId());
  }
  if (stableIdLoadInFlight) return stableIdLoadInFlight;
  const pending = readOrCreateStableId(stableIdOperationEpoch);
  stableIdLoadInFlight = pending;
  void pending.finally(() => {
    if (stableIdLoadInFlight === pending) stableIdLoadInFlight = null;
  }).catch(noteSwallowedHandler('stable_id:promise_6'));
  return pending;
}

/**
 * Принудительно установить stable_id (используется при device-switch / "сменить аккаунт"
 * через провайдер auth: пользователь логинится Google → находим его stable_id в auth_links →
 * подменяем локальный, чтобы syncToCloud / restoreFromCloud работали с правильным docId).
 *
 * ВАЖНО: вызов **только** из auth_provider.ts. Прочий код должен считать stable_id immutable.
 * После вызова обязательно очистить локальный AsyncStorage с прогрессом и сделать restoreFromCloud,
 * иначе данные старого аккаунта останутся в кеше.
 */
type LayerWriteResult = Readonly<{ ok: boolean; attempts: number; code: string | null }>;

async function writeLayerWithRetry(context: string, write: () => Promise<void>): Promise<LayerWriteResult> {
  let code: string | null = null;
  for (let attempt = 1; attempt <= LAYER_WRITE_ATTEMPTS; attempt += 1) {
    try {
      await write();
      return { ok: true, attempts: attempt, code };
    } catch (e) {
      code = identityErrorCode(e);
      DebugLogger.error(context, e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  return { ok: false, attempts: LAYER_WRITE_ATTEMPTS, code };
}

/**
 * SecureStore не принял новый профиль: убрать из него старый (тогда старт
 * провалится в AsyncStorage) и поставить метку «SecureStore отстал».
 * Достаточно ЛЮБОГО из двух — старт не вернёт прежний профиль.
 */
async function neutralizeStaleSecureLayer(
  SecureStore: SecureStoreModule,
  newId: string,
): Promise<{ deleted: boolean; marked: boolean }> {
  let deleted = false;
  try {
    await SecureStore.deleteItemAsync(SECURE_KEY, getSecureStoreOpts(SecureStore));
    await SecureStore.deleteItemAsync(SECURE_KEY);
    deleted = true;
  } catch (error) {
    identityTrace('[PROFILE-FLIP]', 'persist secure_delete_failed', { code: identityErrorCode(error) });
  }
  let marked = false;
  try {
    await AsyncStorage.setItem(SECURE_STALE_MARKER_KEY, newId);
    marked = true;
  } catch (error) {
    identityTrace('[PROFILE-FLIP]', 'persist marker_write_failed', { code: identityErrorCode(error) });
  }
  return { deleted, marked };
}

type PersistOutcome = 'complete' | 'async_authoritative' | 'secure_authoritative' | 'failed';

/**
 * зачем (AA S2d 🔴3, §127): раньше запись считалась успешной, если удался ХОТЯ
 * БЫ ОДИН слой. SecureStore не записался → новый профиль жил только в
 * AsyncStorage → холодный старт читал SecureStore первым и поднимал СТАРЫЙ
 * профиль → облако снова переключало (adopt): «уровень 13↔12, дни 155↔52» на
 * каждом перезапуске. Теперь:
 *   - успех = записаны ВСЕ доступные слои (каждый с одним повтором);
 *   - слой не принял запись → он обезврежен (SecureStore: удалён + метка;
 *     AsyncStorage: снята метка, старт и так читает SecureStore первым), и
 *     следующий старт гарантированно вернёт новый профиль;
 *   - обезвредить не удалось / не записан ни один слой → явный провал
 *     `stable_id_persist_failed`: вызывающий (свап/adopt) видит ошибку, а не
 *     «успех», после которого старт молча вернёт старый профиль.
 */
async function persistStableId(newId: string, epoch: number): Promise<void> {
  if (epoch !== stableIdOperationEpoch) {
    identityTrace('[PROFILE-FLIP]', 'persist skipped', { reason: 'stale_epoch', target: identityTag(newId) });
    return;
  }
  const SecureStore = getSecureStore();
  const secure: LayerWriteResult | null = SecureStore
    ? await writeLayerWithRetry('stable_id:SecureStore', () => SecureStore.setItemAsync(SECURE_KEY, newId, getSecureStoreOpts(SecureStore)))
    : null;
  const asyncWrite = await writeLayerWithRetry('stable_id:AsyncStorage', () => AsyncStorage.setItem(ASYNC_KEY, newId));
  const secureOk = secure === null || secure.ok;

  let outcome: PersistOutcome;
  let neutralized: { deleted: boolean; marked: boolean } | null = null;
  if (secureOk && asyncWrite.ok) {
    // Прежняя метка (от давнего сбоя) больше не правда — снимаем. Не снялась —
    // не страшно: метка ≠ значению AsyncStorage и будет проигнорирована.
    await removeSecureStaleMarker('persist_complete');
    outcome = 'complete';
  } else if (SecureStore && !secureOk && asyncWrite.ok) {
    neutralized = await neutralizeStaleSecureLayer(SecureStore, newId);
    outcome = neutralized.deleted || neutralized.marked ? 'async_authoritative' : 'failed';
  } else if (secure?.ok && !asyncWrite.ok) {
    // Старт читает SecureStore первым и сам починит AsyncStorage. Опасна лишь
    // старая метка, совпадающая со старым значением AsyncStorage, — её снимаем.
    outcome = (await removeSecureStaleMarker('persist_secure_only')) ? 'secure_authoritative' : 'failed';
  } else {
    outcome = 'failed';
  }

  identityTrace('[PROFILE-FLIP]', 'persist result', {
    target: identityTag(newId),
    previous: identityTag(cachedId),
    outcome,
    secure: secure === null ? 'unavailable' : secure.ok ? 'ok' : 'failed',
    secureAttempts: secure?.attempts ?? 0,
    secureCode: secure?.code ?? null,
    async: asyncWrite.ok ? 'ok' : 'failed',
    asyncAttempts: asyncWrite.attempts,
    asyncCode: asyncWrite.code,
    secureDeleted: neutralized?.deleted ?? null,
    secureMarkedStale: neutralized?.marked ?? null,
    layersDiverge: secure !== null && secure.ok !== asyncWrite.ok,
    epochCurrent: epoch === stableIdOperationEpoch,
  }, { persist: outcome !== 'complete' || (secure?.attempts ?? 1) > 1 || asyncWrite.attempts > 1 });
  if (epoch !== stableIdOperationEpoch) return;
  if (outcome !== 'failed') {
    const previousId = cachedId;
    cachedId = newId;
    if (previousId !== newId) emitStableIdChange({ previous: previousId, next: newId, kind: 'set' });
    return;
  }
  cachedId = null;
  invalidateAccountGeneration();
  throw new Error('stable_id_persist_failed');
}

export function setStableId(newId: string): Promise<void> {
  if (!newId || typeof newId !== 'string') {
    return Promise.reject(new Error('setStableId: newId must be non-empty string'));
  }
  const loadToDrain = stableIdLoadInFlight;
  stableIdOperationEpoch += 1;
  const epoch = stableIdOperationEpoch;
  stableIdLoadInFlight = null;
  if (cachedId !== newId) invalidateAccountGeneration();
  const previous = stableIdMutationInFlight ?? Promise.resolve();
  const mutation = previous
    .catch(noteSwallowedHandler('stable_id:promise_7'))
    .then(() => loadToDrain?.catch(noteSwallowedHandler('stable_id:promise_8')))
    .then(() => assertAccountDeleteStableIdentityAvailable(newId))
    .then(() => persistStableId(newId, epoch));
  stableIdMutationInFlight = mutation;
  void mutation.finally(() => {
    if (stableIdMutationInFlight === mutation) stableIdMutationInFlight = null;
  }).catch(noteSwallowedHandler('stable_id:promise_9'));
  return mutation;
}

/**
 * Сбросить in-memory кеш (force re-read из SecureStore/AsyncStorage при следующем getStableId).
 * Нужно после внешней правки SecureStore (например, тестов или recovery flow).
 */
export function _resetStableIdCache(): void {
  stableIdOperationEpoch += 1;
  invalidateAccountGeneration();
  cachedId = null;
  stableIdLoadInFlight = null;
}

/**
 * Полностью очистить stable_id во всех слоях хранения и в памяти.
 *
 * Используется ТОЛЬКО во flow "Сменить аккаунт" (Variant 2):
 * после успешного синка прогресса в облако и signOut от Google/Firebase
 * мы стираем локальный stable_id, чтобы getStableId() при следующем
 * вызове сгенерировал НОВЫЙ UUID, и приложение оказалось в чистом
 * "анонимном новом юзере" состоянии.
 *
 * Не путать с _resetStableIdCache: тот лишь чистит in-memory кеш,
 * а stored value в SecureStore/AsyncStorage остаётся прежним.
 */
async function clearStableIdStorage(): Promise<void> {
  // зачем (координатор 14.10, прогон №5: dep:clearStableId 1,1 с при выходе): «сперва логи» — мс каждой стадии одной строкой
  // [STABLE-ID-CLEAR]; порядок и проверки НЕ меняются. При сбое — стадия, после которой упало.
  const startedAt = identityTraceClockMs();
  let at = startedAt;
  const stages: Record<string, number> = {};
  let lastStage = 'start';
  const mark = (stage: string): void => { const now = identityTraceClockMs(); stages[stage] = now - at; at = now; lastStage = stage; };
  try {
    identityTrace('[PROFILE-FLIP]', 'cleared', { previous: identityTag(cachedId) }, { persist: true });
    mark('trace');
    const previousId = cachedId;
    cachedId = null;
    const SecureStore = getSecureStore();
    if (SecureStore) {
      const opts = getSecureStoreOpts(SecureStore);
      await SecureStore.deleteItemAsync(SECURE_KEY, opts);
      mark('secureDelete');
      await SecureStore.deleteItemAsync(SECURE_KEY);
      mark('secureDeleteLegacy');
      const [currentValue, legacyValue] = await Promise.all([
        SecureStore.getItemAsync(SECURE_KEY, opts),
        SecureStore.getItemAsync(SECURE_KEY),
      ]);
      mark('secureVerify');
      if (currentValue !== null || legacyValue !== null) {
        throw new Error('stable_id_secure_clear_mismatch');
      }
    }
    await AsyncStorage.removeItem(ASYNC_KEY);
    mark('asyncRemove');
    const asyncValue = await AsyncStorage.getItem(ASYNC_KEY);
    mark('asyncVerify');
    if (asyncValue !== null) throw new Error('stable_id_async_clear_mismatch');
    // зачем (AA S2d 🔴3): метка «SecureStore отстал» относится к стёртому профилю.
    await AsyncStorage.removeItem(SECURE_STALE_MARKER_KEY);
    mark('staleMarker');
    // AA S2d 🔴1: «Сменить аккаунт» — тоже смена аккаунта (новый id появится при следующем чтении).
    emitStableIdChange({ previous: previousId, next: null, kind: 'cleared' });
    mark('emit');
    console.warn('[STABLE-ID-CLEAR]', JSON.stringify({ ...stages, secureStore: Boolean(SecureStore), totalMs: identityTraceClockMs() - startedAt })); // guard-ok: стадии сброса
  } catch (error) {
    console.warn('[STABLE-ID-CLEAR]', JSON.stringify({ ...stages, failedAfter: lastStage, code: identityErrorCode(error), totalMs: identityTraceClockMs() - startedAt })); // guard-ok: сбой со стадией
    throw error;
  }
}

export function clearStableId(): Promise<void> {
  const loadToDrain = stableIdLoadInFlight;
  stableIdOperationEpoch += 1;
  stableIdLoadInFlight = null;
  invalidateAccountGeneration();
  const previous = stableIdMutationInFlight ?? Promise.resolve();
  const queuedAt = identityTraceClockMs();
  const mutation = previous
    .catch(noteSwallowedHandler('stable_id:promise_10'))
    .then(async () => {
      const queueMs = identityTraceClockMs() - queuedAt;
      await loadToDrain?.catch(noteSwallowedHandler('stable_id:promise_11'));
      // зачем ([STABLE-ID-CLEAR]): сколько ждали предыдущую операцию с id и незавершённое чтение — до самого сброса.
      console.warn('[STABLE-ID-CLEAR]', JSON.stringify({ step: 'waited', queueMs, drainMs: identityTraceClockMs() - queuedAt - queueMs, hadLoad: Boolean(loadToDrain) })); // guard-ok: ожидание
      await clearStableIdStorage();
    });
  stableIdMutationInFlight = mutation;
  void mutation.finally(() => {
    if (stableIdMutationInFlight === mutation) stableIdMutationInFlight = null;
  }).catch(noteSwallowedHandler('stable_id:promise_12'));
  return mutation;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
