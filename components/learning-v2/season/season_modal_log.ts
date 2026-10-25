// ════════════════════════════════════════════════════════════════════════════
// season_modal_log.ts — журнал окна эпизода/экзамена и раскладки «Обучения»: единый вход, чтобы строки не расходились по файлам.
//
// зачем (жалоба владельца, iPhone 2.0.2: окно «Экзамен главы» / «Эпизод» срезано справа; координатор: сперва логи): в релизной сборке iOS console.log уходит в системный
// журнал устройства — владелец видит его в «Консоли» на Mac с подключённым iPhone (фильтр по процессу и префиксу [EPISODE-MODAL] / [SEASON-LAYOUT]). Журнал приложения
// (app/debug-logger.ts, debug_logs_v1) в релизе читать некому (Ядро 25.10: info/warn там тоже молчат вне dev), поэтому ТОЛЬКО консоль — без лишней записи на диск.
// ════════════════════════════════════════════════════════════════════════════
export type SeasonLogLevel = 'info' | 'warn';

/** [EPISODE-MODAL] событие. Четвёртый аргумент оставлен для совместимости вызовов (раньше — «ещё и в журнал устройства»), сейчас не используется. */
export function episodeModalLog(level: SeasonLogLevel, event: string, json: string, _legacyPersist = false): void {
  void _legacyPersist;
  (level === 'warn' ? console.warn : console.log)('[EPISODE-MODAL]', event, json); // guard-ok: единый вход журнала окна эпизода
}

/** [SEASON-LAYOUT] — раскладка «Обучения» и открытие окна; одна строка на смену значений. */
export function seasonLayoutLog(level: SeasonLogLevel, json: string): void {
  (level === 'warn' ? console.warn : console.log)('[SEASON-LAYOUT]', json); // guard-ok: единый вход журнала раскладки
}
