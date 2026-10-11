import type { SessionAttemptsEffect, SessionAttemptsPhase } from './session_attempts_domain';

/**
 * зачем (владелец 11.10, режим энергии Б; ревью Ядра п.1/п.4): экраны занятий раньше знали один «стоп» — `attempts_exhausted` (кончились
 * сердечки). В режиме Б стопом служит `energy_exhausted` (ошибка на последней энергии). Реакция экрана одна: остаться на этом вопросе,
 * остановить таймер/звук/автопереход. Один источник правды вместо 10 разрозненных сравнений.
 */
export function isAttemptsStopEffect(effect: SessionAttemptsEffect): boolean {
  return effect === 'attempts_exhausted' || effect === 'energy_exhausted';
}

/** Фазы, в которых ввод на занятии заблокирован: ждём восстановления (режим А) или остановлены без энергии (режим Б). */
export function isAttemptsInputBlocked(phase: SessionAttemptsPhase): boolean {
  return phase === 'awaiting_recovery' || phase === 'stopped_no_energy';
}
