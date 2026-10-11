/**
 * Режим списания энергии — А («start_charge», как было) или Б («mistake_charge»).
 *
 * зачем (владелец 11.10, ENERGY_MODES_OWNER_BRIEF_2026-10-11.md): в админке переключатель. А — 1 энергия за старт занятия,
 * за ошибки сердечки. Б — старт бесплатный, каждая ошибка снимает 1 энергию, на последней занятие останавливается
 * (продолжить можно, оформив Plus), сердечек нет.
 *
 * Источник — рубильник `remote_config/app.bools.energy_mistake_charge` (true → Б), через общий писатель рубильников.
 * Первый кадр — из кэша рубильников (remote_flags читает его до первого экрана), поэтому без «вспышки» режима.
 * По умолчанию и при любой неясности — А: включение Б — только явное действие в админке.
 * Логи: [ENERGY-MODE].
 */
import { useEffect, useState } from 'react';
import { getRemoteBool } from './remote_flags';
import { onAppEvent } from './events';
import type { EnergyActivityKey } from './energy_contract';

export type EnergyMode = 'start_charge' | 'mistake_charge';

export const ENERGY_MISTAKE_CHARGE_FLAG = 'energy_mistake_charge' as const;

/**
 * Занятия, на которые действует режим Б: те, где есть сердечки (useSessionAttempts). Диалоги, экзамены, диагностика,
 * Шпиль — по-прежнему за старт (у диалогов своя модель лимитов; «Фраза дня» энергию не тратит вовсе).
 */
// зачем (ревью Opus 11.10): 'preposition_drill' не работает на сердечках (useSessionAttempts) — в режиме Б был бы бесплатным
// целиком; 'mistake_practice' не показывает общий HUD и не блокирует ввод по фазе — после остановки ошибки шли бы
// бесплатно. Оба остаются в режиме А (энергия за старт), пока их экраны не поддержат остановку.
const MISTAKE_CHARGE_ACTIVITIES: ReadonlySet<EnergyActivityKey> = new Set<EnergyActivityKey>([
  'flashcards',
  'lesson_words',
  'irregular_verbs',
  'classic_lesson',
  'learning_v2_session',
]);

let lastLoggedMode: EnergyMode | null = null;

export function peekEnergyMode(): EnergyMode {
  let mode: EnergyMode = 'start_charge';
  try {
    mode = getRemoteBool(ENERGY_MISTAKE_CHARGE_FLAG) ? 'mistake_charge' : 'start_charge';
  } catch (error) {
    console.warn('[ENERGY-MODE] flag read failed → start_charge', error instanceof Error ? error.message : String(error)); // guard-ok: ранний выход логируется
    mode = 'start_charge';
  }
  if (mode !== lastLoggedMode) {
    lastLoggedMode = mode;
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[ENERGY-MODE] resolved', JSON.stringify({ mode }));
  }
  return mode;
}

/** Действует ли режим Б на это занятие. */
export function isMistakeChargeActivity(activity: EnergyActivityKey): boolean {
  return MISTAKE_CHARGE_ACTIVITIES.has(activity);
}

/** Режим Б и занятие из его списка — старт бесплатный, энергия снимается за ошибку. */
export function chargesEnergyOnMistake(activity: EnergyActivityKey, mode: EnergyMode = peekEnergyMode()): boolean {
  return mode === 'mistake_charge' && isMistakeChargeActivity(activity);
}

/**
 * Вид занятия по ключу сердечек (useSessionAttempts sessionId) — чтобы режим Б работал на всех 10 экранах без их правки.
 * Неизвестный ключ → null: режим Б к нему не применяется (лог), занятие ведёт себя как в режиме А.
 */
export function energyActivityForAttemptsSessionId(sessionId: string): EnergyActivityKey | null {
  const id = String(sessionId ?? '');
  if (id.startsWith('flashcard-')) return 'flashcards';
  if (id.startsWith('learning-v2-')) return 'learning_v2_session';
  if (id.startsWith('lesson-words:')) return 'lesson_words';
  if (id.startsWith('irregular-verbs:')) return 'irregular_verbs';
  if (id.startsWith('mistake-practice:')) return 'mistake_practice';
  if (id.startsWith('preposition-drill:')) return 'preposition_drill';
  if (id.startsWith('lesson:')) return 'classic_lesson';
  return null;
}

export function useEnergyMode(): EnergyMode {
  const [mode, setMode] = useState<EnergyMode>(peekEnergyMode);
  useEffect(() => {
    const sub = onAppEvent('remote_config_changed', () => setMode(peekEnergyMode()));
    return () => sub.remove();
  }, []);
  return mode;
}
