// use_moments_v3_flag.ts — реактивное чтение удалённого флага moments_v3 для экранов (кольца «Сегодня» на Главной и пр.).
// зачем (координатор 14.10): всё перенесённое показывается только за флагом, по умолчанию ВЫКЛ. Читаем ТОТ ЖЕ кэш remote_config_cache_v1, что и ворота окна Пика и sound_v2:
// ни одного нового чтения Firestore; пока кэш не прочитан — false (безопасная сторона). Один общий промис на приложение, подписка на 'remote_config_changed'.
import { useEffect, useState } from 'react';
import { isMomentsV3Enabled } from './streak_moments_flag';

const LOG = '[MOMENTS-V3-FLAG]';
let value = false;
let hydrated = false;
let promise: Promise<void> | null = null;
let subscribed = false;
const listeners = new Set<() => void>();

async function readOnce(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readRemoteConfigCacheRaw } = require('../../../app/remote_config_client') as typeof import('../../../app/remote_config_client');
    const raw = await readRemoteConfigCacheRaw();
    const bools = raw ? (JSON.parse(raw) as { bools?: Record<string, unknown> }).bools : null;
    const next = isMomentsV3Enabled(bools);
    if (next !== value) console.log(`${LOG} moments_v3=${String(next)} (раньше=${String(value)}, кэш=${raw ? 'есть' : 'нет'})`); // guard-ok: смена флага
    value = next;
  } catch (error) {
    value = false; // битый кэш не включает новое
    console.warn(`${LOG} кэш конфига не прочитался — выключено (${error instanceof Error ? error.message : String(error)})`);
  } finally {
    hydrated = true;
    listeners.forEach((l) => l());
  }
}

function subscribeOnce(): void {
  if (subscribed) return;
  subscribed = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { onAppEvent } = require('../../../app/events') as typeof import('../../../app/events');
    onAppEvent('remote_config_changed', () => { void readOnce(); });
  } catch (error) {
    console.warn(`${LOG} подписка на remote_config_changed не удалась (${error instanceof Error ? error.message : String(error)})`);
  }
}

/** Синхронное чтение: до прогрева кэша false. */
export function isMomentsV3FlagOn(): boolean {
  return hydrated && value;
}

export function useMomentsV3Enabled(): boolean {
  const [on, setOn] = useState<boolean>(() => isMomentsV3FlagOn());
  useEffect(() => {
    const sync = () => setOn(isMomentsV3FlagOn());
    listeners.add(sync);
    if (!promise) { promise = readOnce(); subscribeOnce(); } else { sync(); }
    return () => { listeners.delete(sync); };
  }, []);
  return on;
}
