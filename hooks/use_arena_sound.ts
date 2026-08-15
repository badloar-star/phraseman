import { useCallback } from 'react';
import { soundDirector } from '../modules/audio/sound_director';
import type { SoundEventId } from '../modules/audio/sound_events';
import { arenaSoundEventId, type ArenaSoundKey } from '../modules/arena/sound_catalog';

/**
 * Звуки Арены на экранах.
 *
 * Единственный способ проиграть ареновый звук. Смысл — не удобство, а то, что
 * идентификатор события НЕ пишется строкой в экране: строка молча
 * рассинхронизируется с каталогом, и звук просто перестаёт звучать, а заметить
 * это можно только ушами.
 *
 * Файлов пока нет — их генерирует владелец по промптам. Директор молча
 * пропускает события без источника, поэтому вызовы уже стоят на местах и
 * ничего не ломают: когда файл появится, звук зазвучит без правок экранов.
 */
export function useArenaSound() {
  return useCallback((key: ArenaSoundKey) => {
    soundDirector.request(arenaSoundEventId(key) as SoundEventId);
  }, []);
}

/** Разовый вызов вне React — для мест, где хука нет. */
export function playArenaSound(key: ArenaSoundKey): void {
  soundDirector.request(arenaSoundEventId(key) as SoundEventId);
}
