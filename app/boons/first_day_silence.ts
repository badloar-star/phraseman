/**
 * first_day_silence.ts — «в свой первый календарный день человек не видит
 * модалок недельных бонусов».
 *
 * зачем (владелец, 2026-09-13): «сделай так чтобы бонус входа ежедневного тем
 * кто только установил приложение не показывался. а также модалы типа бонус
 * двойной опыт и тд, ничего этого не показывать. только модал бонус за
 * скачивание 300 рун и 100 жемчугов не трогай». Уточнение владельца тем же
 * ходом: «то есть в первый день они не показываются но начиная со второго да».
 *
 * Новичок в первые минуты уже получает приветственный подарок (+300 рун,
 * +100 жемчужин) и проходит онбординг. Ещё одна праздничная модалка поверх
 * этого — «агрессивный onboarding»: человек закрывает окна вместо того, чтобы
 * начать учиться. Со второго календарного дня бонусы работают штатно и сами,
 * без каких-либо действий пользователя.
 *
 * КУДА подключено: единственная точка — ранний выход в `getTodaysBoons`
 * (`app/boons/boon_engine.ts`). Через него правило разом накрывает и четыре
 * хоста модалок (BoonActivatedHost, MysteryMondayHost, ComebackBoonHost,
 * PerfectWeekHost), и write-эффекты (boon_bootstrap), и read-эффекты в
 * hot-path (xp/energy), и полоску бонуса на Главной. Дублировать условие по
 * хостам намеренно НЕ стали: восемь зеркальных мест гарантированно разошлись бы
 * при следующей правке.
 *
 * ЧЕГО НЕ КАСАЕТСЯ: приветственный подарок за установку
 * (`components/OnboardingWelcomeHost.tsx`) — владелец прямо запретил его
 * трогать. Этот модуль про недельные бонусы и ни одной строкой не участвует в
 * выдаче приветственного подарка.
 *
 * ПОЧЕМУ СИНХРОННО: `getTodaysBoons` живёт в hot-path (xp_manager зовёт его на
 * каждое начисление опыта, EnergyContext — на каждый пересчёт заряда) и ждать
 * диск не может. Поэтому `install_date` читается с диска ОДИН раз за запуск и
 * оседает в памяти процесса — тот же приём, что в `app/energy_peek_cache.ts`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDayKey } from '../local_date';
import { DebugLogger } from '../debug-logger';

/**
 * Рубильник правила. `false` возвращает прежнее поведение целиком, без удаления
 * кода — путь отката из пакета governance
 * (docs/work/tasks/2026-09-13-first-day-boon-modal-silence.md).
 */
export const FIRST_DAY_BOON_SILENCE_ENABLED = true;

/** Тот же ключ, что пишет `app/_layout.tsx` на первом запуске. */
export const INSTALL_DATE_STORAGE_KEY = 'install_date';

const LOG = '[FIRST-DAY-BOONS]';

/**
 * зачем через globalThis, а не голый `__DEV__`: модуль импортируется и из
 * jest-окружения, где глобали React Native нет. Форма `typeof __DEV__ !==
 * 'undefined' && !!__DEV__` тут НЕ спасает — второй операнд остаётся голой
 * ссылкой, и тест падал на ней `ReferenceError: __DEV__ is not defined`
 * (проверено прогоном, а не предположением). Чтение через globalThis голой
 * ссылки не содержит вовсе.
 */
const IS_DEV_RUNTIME: boolean = (globalThis as { __DEV__?: boolean }).__DEV__ === true;

/**
 * Локальный день установки (YYYY-MM-DD) или null, если ещё не прочитали/нет на
 * диске. Живёт в памяти процесса: переживает ремаунты и возврат из фона, но не
 * перезапуск приложения — на холодном старте его заполняет `primeFirstDaySilenceFromBoot`.
 */
let installDayKey: string | null = null;
/** Уже ходили на диск в этой сессии (чтобы не ходить повторно и не логировать дважды). */
let diskReadDone = false;

/** Разобрать сырое значение `install_date` в локальный день установки. */
function parseInstallDayKey(raw: string | null): string | null {
  if (raw == null || raw === '') return null;
  const ms = Number.parseInt(raw, 10);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return getLocalDayKey(new Date(ms));
}

/**
 * Запомнить день установки синхронно. Вызывается праймом и писателем
 * `install_date` в `_layout.tsx` — чтобы на самом первом запуске кэш был
 * заполнен тем же значением, что только что легло на диск, и первый вход уже
 * попадал под правило.
 */
export function rememberInstallDateMs(ms: number | null): void {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return;
  const next = getLocalDayKey(new Date(ms));
  if (installDayKey === next) return;
  installDayKey = next;
  diskReadDone = true;
  if (IS_DEV_RUNTIME) console.log(`${LOG} remembered installDayKey=${next} source=writer installMs=${ms}`);
}

/**
 * Разовое чтение `install_date` с диска в синхронный кэш. Самозапускается при
 * импорте модуля (см. низ файла) — то есть до первого кадра и НЕ дожидаясь
 * stableId, которого на самой первой установке может ещё не быть.
 */
export async function primeFirstDaySilenceFromBoot(): Promise<void> {
  if (diskReadDone) return; // уже читали в этой сессии
  try {
    const raw = await AsyncStorage.getItem(INSTALL_DATE_STORAGE_KEY);
    diskReadDone = true;
    installDayKey = parseInstallDayKey(raw);
    if (IS_DEV_RUNTIME) {
      console.log(
        `${LOG} primed installDayKey=${installDayKey ?? 'null'} raw=${raw ?? 'null'}`
        + ` todayKey=${getLocalDayKey()} silent=${isFirstDayAfterInstall()}`,
      );
    }
  } catch (e) {
    // Не немой catch: без причины в логе правило выглядело бы «сломанным молча».
    // Диск недоступен → кэш остаётся пустым → правило НЕ срабатывает (fail-open),
    // бонусы работают как раньше. Гасить бонусы всем из-за сбоя чтения было бы хуже.
    diskReadDone = false;
    DebugLogger.error(
      'first_day_silence:primeFirstDaySilenceFromBoot',
      e instanceof Error ? e : new Error(String(e)),
      'warning',
    );
    console.log(`${LOG} prime failed reason=${e instanceof Error ? e.message : String(e)} → fail-open`);
  }
}

/**
 * Сегодня — календарный день установки? Синхронно, без диска.
 *
 * FAIL-OPEN: день установки неизвестен (кэш не заполнен, ключа на диске нет —
 * старые установки, появившиеся до введения ключа) → возвращаем false, бонусы
 * работают как раньше. Fail-closed здесь погасил бы бонусы существующим
 * пользователям на каждом холодном старте, то есть тишина утекла бы далеко за
 * первый день.
 */
export function isFirstDayAfterInstall(todayKey: string = getLocalDayKey()): boolean {
  if (!FIRST_DAY_BOON_SILENCE_ENABLED) return false;
  if (installDayKey == null) return false;
  return installDayKey === todayKey;
}

/** Только для тестов: сбросить кэш между кейсами. */
export function __resetFirstDaySilenceCacheForTests(): void {
  installDayKey = null;
  diskReadDone = false;
}

/** Только для тестов: подставить день установки без диска. */
export function __setInstallDayKeyForTests(dayKey: string | null): void {
  installDayKey = dayKey;
  diskReadDone = dayKey != null;
}

// зачем самозапуск: правило обязано действовать уже на ПЕРВОМ кадре первого
// запуска, а `primeAppSnapshotFromStorage` до этого не доходит — он выходит
// рано, пока нет stableId, которого у только что установленного приложения
// может ещё не быть. Одно чтение AsyncStorage на старте; для всех, кто не в
// первый день, дальше это чистая проверка строки в памяти.
void primeFirstDaySilenceFromBoot().catch(() => {});
