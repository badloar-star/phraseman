/**
 * Dev-флаг «вести себя как Free» для проверки доступа к урокам.
 *
 * зачем (координатор 05.10, learn-1): dev-сборка всегда даёт devMode = DEV_CONTENT_UNLOCK, и Free на эмуляторе видит
 * «Ещё рано» вместо пейвола — Сверка не может проверить пейвол уроков. Флаг из Dev Hub переключает ТОЛЬКО проверку
 * доступа к урокам на прод-поведение Free (isPremium=false, devMode=false). Покупки, кошелёк, сервер — не трогаются.
 *
 * Только __DEV__: в релизной сборке каждая функция — ранний выход; ключ не читается и не пишется.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_AS_FREE_KEY = 'dev_as_free_lessons_v1';

let devAsFreeEnabled = false;
// зачем: загрузка с диска стартует при импорте асинхронно; если человек успел переключить флаг раньше, поздняя загрузка
// не должна перезаписать его выбор (поздний ответ не затирает свежее значение).
let devAsFreeSetRevision = 0;

function devBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

export function isDevAsFreeActive(): boolean {
  return devBuild() && devAsFreeEnabled;
}

export async function loadDevAsFreeFlag(): Promise<void> {
  if (!devBuild()) return;
  const revisionAtStart = devAsFreeSetRevision;
  try {
    const stored = (await AsyncStorage.getItem(DEV_AS_FREE_KEY)) === '1';
    if (revisionAtStart !== devAsFreeSetRevision) {
      console.warn('[DEV-AS-FREE] load_skipped', JSON.stringify({ reason: 'set_during_load', current: devAsFreeEnabled })); // guard-ok: ветка логируется
      return;
    }
    devAsFreeEnabled = stored;
    if (devAsFreeEnabled) console.warn('[DEV-AS-FREE] loaded: enabled'); // guard-ok: dev-флаг виден в логе
  } catch (error) {
    console.warn('[DEV-AS-FREE] load_failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
  }
}

export async function setDevAsFreeFlag(enabled: boolean): Promise<boolean> {
  if (!devBuild()) return false;
  devAsFreeSetRevision += 1;
  devAsFreeEnabled = enabled;
  console.warn('[DEV-AS-FREE] set', JSON.stringify({ enabled })); // guard-ok: dev-флаг виден в логе
  try {
    if (enabled) await AsyncStorage.setItem(DEV_AS_FREE_KEY, '1');
    else await AsyncStorage.removeItem(DEV_AS_FREE_KEY);
  } catch (error) {
    console.warn('[DEV-AS-FREE] save_failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
  }
  return true;
}

/**
 * Подменяет для проверки доступа к уроку ТОЛЬКО isPremium и devMode — как у Free в релизной сборке. Без флага (и всегда
 * в релизе) возвращает вход без изменений.
 */
export function applyDevAsFreeToLessonAccess<T extends { isPremium: boolean; devMode?: boolean }>(
  input: T,
  where: string,
): T {
  if (!isDevAsFreeActive()) return input;
  console.warn('[DEV-AS-FREE] applied', JSON.stringify({ where, wasPremium: input.isPremium, wasDevMode: input.devMode ?? false })); // guard-ok: каждое применение dev-флага логируется
  return { ...input, isPremium: false, devMode: false };
}

/** Только для тестов: «перезапуск процесса» — флаг в памяти сброшен, на диске остаётся. */
export function __resetDevAsFreeForTests(): void {
  devAsFreeEnabled = false;
  devAsFreeSetRevision = 0;
}

if (devBuild()) void loadDevAsFreeFlag();

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
