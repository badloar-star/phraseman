// ═══════════════════════════════════════════════════════════════════════════
// theme_ownership_store.ts — какие темы человек КУПИЛ за жемчуг.
//
// зачем (владелец 2026-08-24): темы (кроме «Индиго»/«Нефрит»/«Оливы»/«Золота»)
// продаются за 200 жемчужин и подпиской НЕ открываются. Купленное — это
// потраченная валюта, поэтому список обязан пережить переустановку и переезд
// на другое устройство: ключ уходит в облачную синхронизацию (SYNC_KEYS) и
// мержится ОБЪЕДИНЕНИЕМ, а не перезаписью.
//
// Почему отдельный ключ, а не `app_theme`: `app_theme` (выбранная тема) СОЗНАТЕЛЬНО
// не синхронизируется — облако когда-то перетирало живой выбор пользователя
// старым значением (см. комментарий в cloud_sync.ts). Здесь противоположный
// случай: список только растёт, конфликт невозможен по построению — покупка
// никогда не «отменяется», поэтому объединение двух устройств всегда корректно.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSelectableThemeMode } from './theme_access_policy';
import { getCanonicalUserId } from './user_id_policy';
// зачем: чистые правила слияния живут отдельно (без AsyncStorage), чтобы их
// можно было покрыть тестом — импорт этого файла в jest раздувает воркер до OOM.
import {
  GRANDFATHERED_THEMES_KEY,
  OWNED_THEMES_KEY,
  mergeOwnedThemesRestoreValue,
  mergeThemeModeLists,
  parseThemeModeList as parseModes,
} from './theme_ownership_merge';

export {
  GRANDFATHERED_THEMES_KEY,
  OWNED_THEMES_KEY,
  mergeOwnedThemesRestoreValue,
  mergeThemeModeLists,
};

/**
 * Префикс маркера «разовая миграция дедушек уже проведена». Составной ключ
 * per-АККАУНТ (см. grandfatherMigrationKey), а не просто per-устройство.
 *
 * зачем per-аккаунт (аудит 2026-08-25): устройство часто общее — «дедушка»
 * аккаунта A на этом телефоне не должен «сжигать» право миграции для аккаунта
 * B, который зайдёт сюда позже и имеет своё законное основание на дедушку
 * (жил на теме на другом устройстве). Плоский маркер устройства это право B
 * молча гасил бы навсегда.
 *
 * зачем НЕ в SYNC_KEYS (как и раньше): если бы маркер ездил в облако, то на
 * втором телефоне миграция для ТОГО ЖЕ аккаунта считалась бы уже сделанной и
 * не закрепила бы тему, которой человек пользуется именно там — он потерял бы
 * её. Ключ привязан к аккаунту, но живёт только локально на каждом устройстве;
 * сам результат миграции (список тем) синхронизируется, поэтому повторный
 * прогон на другом устройстве того же аккаунта только дополняет список.
 */
const GRANDFATHER_MIGRATION_KEY_PREFIX = 'theme_grandfather_migrated_v2_';
/** До введения per-account ключа (аудит 2026-08-24) маркер был общим на устройство. */
const LEGACY_DEVICE_MIGRATION_KEY = 'theme_grandfather_migrated_v1';

async function grandfatherMigrationKey(): Promise<string> {
  const stableId = await getCanonicalUserId().catch(() => null);
  // Без stable id (гость до первого входа) миграция откладывается до её появления —
  // тема ещё не может быть куплена/закреплена без аккаунта, терять нечего.
  return `${GRANDFATHER_MIGRATION_KEY_PREFIX}${stableId ?? 'anon'}`;
}

async function readList(key: string): Promise<string[]> {
  try {
    return parseModes(await AsyncStorage.getItem(key));
  } catch {
    return [];
  }
}

async function addToList(key: string, mode: string): Promise<string[]> {
  const current = await readList(key);
  if (current.includes(mode)) return current;
  const next = mergeThemeModeLists(current, [mode]);
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next;
}

/** Темы, купленные за жемчуг. */
export function loadOwnedThemeModes(): Promise<string[]> {
  return readList(OWNED_THEMES_KEY);
}

/** Записать покупку темы. Идемпотентно: повтор не портит список. */
export function addOwnedThemeMode(mode: string): Promise<string[]> {
  return addToList(OWNED_THEMES_KEY, mode);
}

/** Темы, сохранённые за «дедушками». */
export function loadGrandfatheredThemeModes(): Promise<string[]> {
  return readList(GRANDFATHERED_THEMES_KEY);
}

/** Закрепить тему за «дедушкой» навсегда. */
export function addGrandfatheredThemeMode(mode: string): Promise<string[]> {
  return addToList(GRANDFATHERED_THEMES_KEY, mode);
}

/**
 * Разовая миграция при смене правил (2026-08-24).
 *
 * До этой правки «Полночь/Янтарь/Сияние/Лайм/Форест» открывались подпиской.
 * Теперь они продаются за жемчуг — и человек, который прямо СЕЙЧАС сидит на
 * такой теме, потерял бы её на ровном месте. Владелец потребовал: активная
 * тема остаётся навсегда. Закрепляем её за «дедушкой» ровно один раз.
 *
 * Намеренно закрепляется ТОЛЬКО активная тема, а не весь премиум-набор:
 * иначе продажи тем за жемчуг обнулились бы для всех текущих подписчиков.
 */
export async function grandfatherActiveThemeIfNeeded(
  activeMode: string | null | undefined,
  opts: { hadAccess: boolean },
): Promise<string[]> {
  const current = await loadGrandfatheredThemeModes();
  // зачем маркер (аудит 2026-08-24): БЕЗ него закрепление срабатывало на КАЖДОМ
  // запуске, и активный подписчик, переключаясь между темами, копил их все в
  // «дедушки» — после отмены подписки у него навсегда остался бы весь платный
  // набор, а темы за жемчуг он бы просто не покупал. Миграция обязана быть
  // одноразовой: она нужна лишь чтобы никто не потерял тему В МОМЕНТ смены
  // правил, а не чтобы раздавать темы дальше.
  //
  // зачем проверяем И legacy-ключ (аудит 2026-08-25): устройства, обновившиеся
  // ДО перехода на per-account ключ, уже честно прошли миграцию под старым
  // плоским флагом — без этой проверки они закрепили бы активную тему ВТОРОЙ
  // раз при первом запуске после апдейта (тот самый баг, который маркер и
  // должен предотвращать).
  const migrationKey = await grandfatherMigrationKey();
  const [alreadyMigrated, legacyMigrated] = await AsyncStorage.multiGet([
    migrationKey,
    LEGACY_DEVICE_MIGRATION_KEY,
  ]).then((pairs) => pairs.map(([, value]) => value));
  if (alreadyMigrated === '1' || legacyMigrated === '1') {
    if (alreadyMigrated !== '1') await AsyncStorage.setItem(migrationKey, '1');
    return current;
  }
  // Маркер ставится в любом случае — даже когда закреплять нечего, иначе
  // миграция осталась бы «открытой» и сработала бы позже, уже не по делу.
  await AsyncStorage.setItem(migrationKey, '1');
  if (!opts.hadAccess) return current;
  if (!activeMode || !isSelectableThemeMode(activeMode)) return current;
  return addGrandfatheredThemeMode(activeMode);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
