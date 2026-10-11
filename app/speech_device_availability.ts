// Доступность распознавания речи НА ЭТОМ УСТРОЙСТВЕ (§SPEECH-NA, владелец 04.10.2026).
//
// зачем: на Huawei без сервисов Google (и любом устройстве без системного
// распознавателя) микрофон «работал» до первого зажатия и только потом говорил
// «недоступно». Владелец решил: серверное распознавание НЕ делаем; вместо этого
// все голосовые места заранее показывают спокойное отключённое состояние с
// текстом «Распознавание речи не работает на этом устройстве», голосовые шаги
// пропускаются, а энергия за недоступный голосовой режим не списывается.
//
// Три разных случая, и постоянным считается ТОЛЬКО первый:
//   1) на устройстве нет распознавателя (нет нативного модуля / системной службы)
//      → 'unavailable', запоминаем локально;
//   2) нет разрешения на микрофон → это НЕ «не работает на устройстве», им
//      занимаются сами экраны (просьба разрешения / «Открыть настройки»);
//   3) временный сбой движка (проверка бросила исключение) → 'unknown', кнопки
//      остаются рабочими, решение не запоминаем.
//
// Скорость: проверка — один синхронный вызов нативного модуля, ОДИН раз за
// запуск (дальше память процесса). Первый кадр экрана её не ждёт сети/диска.
// Локальная запись (AsyncStorage) хранит последний твёрдый вердикт, чтобы при
// временном сбое проверки не мигать рабочей кнопкой на устройстве, где
// распознавания точно нет. Запись перепроверяется при обновлении приложения и
// раз в SPEECH_AVAILABILITY_RECHECK_MS. Свежий живой ответ «есть распознаватель»
// всегда побеждает запись (человек мог поставить сервис Google).
//
// Приватность: ничего не отправляется наружу — только локальная запись на
// устройстве и строки журнала [SPEECH-AVAIL].
import { useSyncExternalStore } from 'react';
import { getDevSpeechMode } from './dev_cards_state';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Только тип: модуль нарочно не тянет constants/i18n (и app/config) — его
// импортируют лёгкие кнопки и онбординг, первый кадр не должен платить за это.
import type { Lang } from '../constants/i18n';
import {
  loadSpeechRecognitionModule,
  type SpeechRecognitionModule,
} from './speech_recognition_module';

export type SpeechDeviceAvailabilityState = 'available' | 'unavailable' | 'unknown';

export type SpeechDeviceUnavailableReason =
  | 'no_native_module'
  | 'no_recognizer_service'
  | 'dev_forced';

export type SpeechRecognizerProbe =
  | Readonly<{ kind: 'available'; reason: 'recognizer_present' | 'no_availability_api'; services: number | null }>
  | Readonly<{ kind: 'unavailable'; reason: SpeechDeviceUnavailableReason; services: number | null }>
  | Readonly<{ kind: 'transient'; reason: 'native_check_threw'; error: string }>;

export type SpeechAvailabilityRecord = Readonly<{
  v: 1;
  state: 'available' | 'unavailable';
  reason: string;
  appVersion: string;
  checkedAtMs: number;
}>;

export const SPEECH_AVAILABILITY_STORAGE_KEY = 'speech_device_availability_v1';
/** Перепроверка сохранённого вердикта: раз в неделю или при новой версии. */
export const SPEECH_AVAILABILITY_RECHECK_MS = 7 * 24 * 60 * 60 * 1000;

const LOG = '[SPEECH-AVAIL]';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120);
}

/**
 * Чистая проверка распознавателя. Не просит разрешений и не стартует запись.
 * Android: пустой список служб распознавания (Huawei без GMS) = нет распознавателя,
 * но только если сам модуль не сказал явно «доступно».
 */
export function probeSpeechRecognizer(
  speechModule: SpeechRecognitionModule | null,
  platform: string,
): SpeechRecognizerProbe {
  if (!speechModule) return { kind: 'unavailable', reason: 'no_native_module', services: null };
  let services: number | null = null;
  if (platform === 'android' && typeof speechModule.getSpeechRecognitionServices === 'function') {
    try {
      const list = speechModule.getSpeechRecognitionServices();
      services = Array.isArray(list) ? list.length : null;
    } catch (error) {
      // зачем: список служб — вспомогательный признак; его сбой не решает вердикт.
      console.warn(LOG, 'probe: getSpeechRecognitionServices threw — игнорируем признак', errorText(error));
      services = null;
    }
  }
  if (typeof speechModule.isRecognitionAvailable === 'function') {
    let raw: unknown;
    try {
      raw = speechModule.isRecognitionAvailable();
    } catch (error) {
      return { kind: 'transient', reason: 'native_check_threw', error: errorText(error) };
    }
    if (raw === false) return { kind: 'unavailable', reason: 'no_recognizer_service', services };
    return { kind: 'available', reason: 'recognizer_present', services };
  }
  if (services === 0) return { kind: 'unavailable', reason: 'no_recognizer_service', services };
  return { kind: 'available', reason: 'no_availability_api', services };
}

/** Можно ли доверять сохранённой записи прямо сейчас. */
export function isSpeechAvailabilityRecordFresh(
  record: SpeechAvailabilityRecord | null,
  appVersion: string,
  nowMs: number,
): boolean {
  if (!record) return false;
  if (record.appVersion !== appVersion) return false;
  const age = nowMs - record.checkedAtMs;
  return age >= 0 && age < SPEECH_AVAILABILITY_RECHECK_MS;
}

export function parseSpeechAvailabilityRecord(raw: string | null): SpeechAvailabilityRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SpeechAvailabilityRecord> | null;
    if (
      !value || value.v !== 1 ||
      (value.state !== 'available' && value.state !== 'unavailable') ||
      typeof value.reason !== 'string' ||
      typeof value.appVersion !== 'string' ||
      typeof value.checkedAtMs !== 'number' || !Number.isFinite(value.checkedAtMs)
    ) {
      console.warn(LOG, 'record: malformed — игнорируем');
      return null;
    }
    return value as SpeechAvailabilityRecord;
  } catch (error) {
    console.warn(LOG, 'record: JSON.parse threw — игнорируем', errorText(error));
    return null;
  }
}

function currentAppVersion(): string {
  const version = Constants.expoConfig?.version ?? (Constants as { nativeAppVersion?: string | null }).nativeAppVersion ?? 'unknown';
  const build = (Constants as { nativeBuildVersion?: string | null }).nativeBuildVersion ?? '';
  return build ? `${version}+${build}` : String(version);
}

// ── Хранилище процесса ──────────────────────────────────────────────────────

let memoryState: SpeechDeviceAvailabilityState | null = null;
let memoryReason = '';
let hydrateStarted = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn(LOG, 'listener threw', errorText(error));
    }
  });
}

function setState(next: SpeechDeviceAvailabilityState, reason: string, source: string): void {
  if (memoryState === next && memoryReason === reason) return;
  const prev = memoryState;
  memoryState = next;
  memoryReason = reason;
  console.warn(LOG, 'state', JSON.stringify({ prev, next, reason, source }));
  // зачем: emit асинхронно — setState может случиться внутри getSnapshot рендера.
  if (prev !== null) Promise.resolve().then(emit).catch((error: unknown) => console.warn(LOG, 'emit failed', errorText(error)));
}

async function syncStoredRecord(probe: SpeechRecognizerProbe): Promise<void> {
  const appVersion = currentAppVersion();
  const nowMs = Date.now();
  let stored: SpeechAvailabilityRecord | null = null;
  try {
    stored = parseSpeechAvailabilityRecord(await AsyncStorage.getItem(SPEECH_AVAILABILITY_STORAGE_KEY));
  } catch (error) {
    console.warn(LOG, 'record: read failed', errorText(error));
  }
  const fresh = isSpeechAvailabilityRecordFresh(stored, appVersion, nowMs);
  console.warn(LOG, 'record: read', JSON.stringify({
    found: Boolean(stored), fresh, stored: stored?.state ?? null, storedReason: stored?.reason ?? null,
    storedVersion: stored?.appVersion ?? null, appVersion, probe: probe.kind,
  }));

  if (probe.kind === 'transient') {
    // Временный сбой проверки: опираемся на последний твёрдый вердикт, если он свежий.
    if (fresh && stored?.state === 'unavailable') setState('unavailable', `${stored.reason}:from_record`, 'record_after_transient');
    return;
  }
  if (fresh && stored?.state === probe.kind && stored.reason === probe.reason) return;
  const record: SpeechAvailabilityRecord = { v: 1, state: probe.kind, reason: probe.reason, appVersion, checkedAtMs: nowMs };
  try {
    await AsyncStorage.setItem(SPEECH_AVAILABILITY_STORAGE_KEY, JSON.stringify(record));
    console.warn(LOG, 'record: saved', JSON.stringify({ state: record.state, reason: record.reason, appVersion }));
  } catch (error) {
    console.warn(LOG, 'record: write failed', errorText(error));
  }
}

async function logPermissionDiagnostics(speechModule: SpeechRecognitionModule | null): Promise<void> {
  // Только диагностика: отличаем «нет разрешения» от «нет распознавателя». Без запроса.
  if (!speechModule || typeof speechModule.getPermissionsAsync !== 'function') {
    console.warn(LOG, 'permission: skip', JSON.stringify({ hasModule: Boolean(speechModule) }));
    return;
  }
  try {
    const result = await speechModule.getPermissionsAsync();
    console.warn(LOG, 'permission', JSON.stringify({ granted: result?.granted ?? null }));
  } catch (error) {
    console.warn(LOG, 'permission: getPermissionsAsync threw', errorText(error));
  }
}

function devForcedUnavailable(): boolean {
  // зачем: проверить отключённое состояние на эмуляторе с сервисами Google.
  return typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_FORCE_SPEECH_UNAVAILABLE === '1';
}

function resolveOnce(): SpeechDeviceAvailabilityState {
  // зачем (координатор 12.10, R1 «нет пути», Карточки): dev `speech=unavailable` — экран «Распознавание речи не работает на этом устройстве»; в стор-сборке геттер выключен.
  if (getDevSpeechMode() === 'unavailable') return 'unavailable';
  if (memoryState !== null) return memoryState;
  const startedAt = Date.now();
  const speechModule = devForcedUnavailable() ? null : loadSpeechRecognitionModule();
  const probe: SpeechRecognizerProbe = devForcedUnavailable()
    ? { kind: 'unavailable', reason: 'dev_forced', services: null }
    : probeSpeechRecognizer(speechModule, Platform.OS);
  console.warn(LOG, 'probe', JSON.stringify({
    platform: Platform.OS,
    androidApi: Platform.OS === 'android' ? Number(Platform.Version) : null,
    result: probe.kind,
    reason: probe.reason,
    services: 'services' in probe ? probe.services : null,
    error: probe.kind === 'transient' ? probe.error : null,
    ms: Date.now() - startedAt,
  }));
  setState(probe.kind === 'transient' ? 'unknown' : probe.kind, probe.reason, 'probe');
  if (!hydrateStarted) {
    hydrateStarted = true;
    // Фоном, после текущего кадра: запись на диск и диагностика разрешения.
    setTimeout(() => {
      void syncStoredRecord(probe);
      void logPermissionDiagnostics(speechModule);
    }, 0);
  }
  return memoryState ?? 'unknown';
}

/** Синхронный взгляд для решения «в кадре тапа» и первого кадра экрана. */
export function peekSpeechDeviceAvailability(): SpeechDeviceAvailabilityState {
  return resolveOnce();
}

/** true только при твёрдом «на устройстве нет распознавателя». */
export function isSpeechUnavailableOnDevice(): boolean {
  return resolveOnce() === 'unavailable';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Реактивный вариант для экранов. Первый кадр уже знает ответ. */
export function useSpeechDeviceAvailability(): SpeechDeviceAvailabilityState {
  return useSyncExternalStore(subscribe, resolveOnce, resolveOnce);
}

export function useSpeechUnavailableOnDevice(): boolean {
  return useSpeechDeviceAvailability() === 'unavailable';
}

const SPEECH_UNAVAILABLE_ON_DEVICE_TEXT: Readonly<Record<Lang | 'en', string>> = {
  ru: 'Распознавание речи не работает на этом устройстве',
  uk: 'Розпізнавання мовлення не працює на цьому пристрої',
  en: 'Speech recognition doesn’t work on this device',
  es: 'El reconocimiento de voz no funciona en este dispositivo',
  'pt-BR': 'O reconhecimento de voz não funciona neste aparelho',
  vi: 'Nhận dạng giọng nói không hoạt động trên thiết bị này',
  id: 'Pengenalan suara tidak berfungsi di perangkat ini',
  tr: 'Konuşma tanıma bu cihazda çalışmıyor',
  pl: 'Rozpoznawanie mowy nie działa na tym urządzeniu',
};

/** Единый короткий текст на всех голосовых местах (9 языков интерфейса). */
export function speechUnavailableOnDeviceText(lang: Lang | string): string {
  return SPEECH_UNAVAILABLE_ON_DEVICE_TEXT[lang as Lang] ?? SPEECH_UNAVAILABLE_ON_DEVICE_TEXT.ru;
}

/** Только для тестов: сбросить/подставить состояние процесса. */
export function __setSpeechDeviceAvailabilityForTests(state: SpeechDeviceAvailabilityState | null): void {
  memoryState = state;
  memoryReason = state ? 'test' : '';
  hydrateStarted = state !== null;
  emit();
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
