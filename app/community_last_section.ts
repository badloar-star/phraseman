// ═══════════════════════════════════════════════════════════════════════════
// community_last_section.ts — какой раздел «Сообщества» был открыт в прошлый раз.
//
// зачем (владелец 11.11: «приложение должно запоминать — если последний раз был открыт Пик, при входе на вкладку
// „Сообщество“ должен быть открыт Пик, или Наборы, если последний раз были Наборы»): выбор раздела жил только в
// состоянии экрана и после перезапуска всегда сбрасывался на «Друзей». Здесь — одна строка на устройстве
// (без сервера и без синхронизации: это привычка на этом телефоне, а не данные аккаунта).
//
// Память читается один раз при старте оболочки вкладок, поэтому к первому открытию «Сообщества» значение уже
// лежит в памяти и раздел встаёт с первого кадра, без «мигания» через «Друзей».
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUB_RUNTIME_OWNER_IDS, type SubRuntimeOwnerId } from './tab_page_model';

const KEY = 'community_last_section_v1';
const LOG = '[COMMUNITY]';

let _saved: SubRuntimeOwnerId | null = null;
/** Выбор сделан в этом запуске — поздний ответ диска его не затирает. */
let _chosenThisRun = false;
let _primePromise: Promise<SubRuntimeOwnerId | null> | null = null;

function parse(raw: string | null): SubRuntimeOwnerId | null {
  return raw !== null && (SUB_RUNTIME_OWNER_IDS as readonly string[]).includes(raw) ? (raw as SubRuntimeOwnerId) : null;
}

async function readOnce(): Promise<SubRuntimeOwnerId | null> {
  try {
    const fromDisk = parse(await AsyncStorage.getItem(KEY));
    if (!_chosenThisRun) _saved = fromDisk;
  } catch (e) {
    // зачем: не прочиталось — ведём себя как раньше («Друзья»), вкладка открывается в любом случае.
    console.warn(LOG, 'последний раздел не прочитался, открываем по умолчанию', String(e));
  }
  return _saved;
}

/** Прогреть память с диска (безопасно звать сколько угодно раз — чтение одно на запуск). */
export function primeCommunityLastSection(): Promise<SubRuntimeOwnerId | null> {
  if (!_primePromise) _primePromise = readOnce();
  return _primePromise;
}

/** Запомненный раздел без ожидания; null — ещё не прочитано или ничего не запомнено. */
export function peekCommunityLastSection(): SubRuntimeOwnerId | null {
  return _saved;
}

/** Пользователь открыл раздел: в памяти — сразу, на диск — фоном. */
export function rememberCommunityLastSection(section: SubRuntimeOwnerId): void {
  if (_chosenThisRun && _saved === section) return;
  _saved = section;
  _chosenThisRun = true;
  AsyncStorage.setItem(KEY, section).catch((e: unknown) => {
    console.warn(LOG, 'последний раздел не сохранился — после перезапуска откроется прежний', String(e));
  });
}

/**
 * Какой раздел показать при входе на вкладку. Ссылка (пуш, «Сегодня», старый адрес /friends) главнее привычки;
 * запомненный «Пик» при закрытом Пике — «Друзья» (вернётся сам, когда Пик откроется, см. community.tsx).
 */
export function resolveCommunityEntrySection(input: Readonly<{
  link: SubRuntimeOwnerId | null;
  saved: SubRuntimeOwnerId | null;
  spireOpen: boolean;
}>): SubRuntimeOwnerId {
  if (input.link) return input.link;
  if (!input.saved) return 'friends';
  return input.saved === 'spire' && !input.spireOpen ? 'friends' : input.saved;
}

/* expo-router route shim */
export default function __CommunityLastSectionRouteShim() { return null; }
