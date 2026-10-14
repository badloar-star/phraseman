// sound_v2_boot.ts — запуск звуков V2 ПОСЛЕ первого кадра Главной (вызывает корень через runAfterHomeFirstFrame).
//
// зачем (координатор 14.10, п.2): холодный старт не ждёт ни одного файла звука. Здесь только: прогреть флаг sound_v2 из уже лежащего в памяти кэша конфигурации (ни одного чтения Firestore)
// и — лишь если флаг ВКЛЮЧЁН — поставить в очередь прогрев плееров самых частых событий (по одному с паузой, это умеет сам банк). Выключен — ничего не грузим и не импортируем.
// Журнал одной строкой: [SOUND-V2] prime ms=… flag=… events=… files≈… Каждая ошибка загрузки пишется движком с причиной.
import { SOUND_V2_CATALOG, type SoundV2EventId } from './catalog';
import { tryPlayV2Event } from './legacy_bridge';
import { isSoundV2Enabled, primeSoundV2Flag } from './sound_v2_flag';

const LOG = '[SOUND-V2]';

/** Самые частые события: тап, верный/неверный ответ, монета, конец урока. Остальные плееры создаются лениво при первом запуске. */
export const SOUND_V2_BOOT_EVENTS: readonly SoundV2EventId[] = ['tap', 'correct', 'wrong', 'coin', 'lesson_done'];

// зачем (координатор 14.10): звук ачивки V2 — по событию приложения 'achievement_unlocked' (его шлёт выдача достижений); подписка одна на процесс, поздно (после первого кадра),
// проверка флага — в самом мосте: выключен → тишина. Пачка достижений подряд не трещит: не чаще раза в 800 мс.
let achievementSubscribed = false;
let achievementLastAt = 0;
export const SOUND_V2_ACHIEVEMENT_THROTTLE_MS = 800;
export function subscribeAchievementSound(now: () => number = Date.now): void {
  if (achievementSubscribed) return;
  achievementSubscribed = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { onAppEvent } = require('../../app/events') as typeof import('../../app/events');
    onAppEvent('achievement_unlocked', () => {
      const t = now();
      if (t - achievementLastAt < SOUND_V2_ACHIEVEMENT_THROTTLE_MS) return;
      achievementLastAt = t;
      tryPlayV2Event('achievement', 'achievement_unlocked');
    });
  } catch (error) {
    achievementSubscribed = false;
    console.warn(`${LOG} подписка на achievement_unlocked не удалась (${error instanceof Error ? error.message : String(error)}) — звука ачивки не будет`);
  }
}

export type SoundV2BootResult = Readonly<{ ms: number; enabled: boolean; events: number; files: number }>;

export async function bootSoundV2(now: () => number = Date.now): Promise<SoundV2BootResult> {
  const startedAt = now();
  subscribeAchievementSound();
  try {
    await primeSoundV2Flag();
  } catch (error) {
    console.warn(`${LOG} prime: флаг не прогрелся (${error instanceof Error ? error.message : String(error)}) — звуки V2 выключены`);
    return { ms: now() - startedAt, enabled: false, events: 0, files: 0 };
  }
  if (!isSoundV2Enabled()) {
    const ms = now() - startedAt;
    console.log(`${LOG} prime ms=${ms} flag=off — файлы не грузим, старые звуки без изменений`);
    return { ms, enabled: false, events: 0, files: 0 };
  }
  let files = 0;
  for (const event of SOUND_V2_BOOT_EVENTS) files += SOUND_V2_CATALOG[event].variants.length;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { prewarmSoundV2 } = require('./sound_bank') as typeof import('./sound_bank');
    prewarmSoundV2(SOUND_V2_BOOT_EVENTS);
  } catch (error) {
    console.warn(`${LOG} prime: прогрев плееров не поставился (${error instanceof Error ? error.message : String(error)}) — плееры создадутся при первом запуске`);
  }
  const ms = now() - startedAt;
  console.log(`${LOG} prime ms=${ms} flag=on events=${SOUND_V2_BOOT_EVENTS.length} files≈${files} (плееры создаются по одному, с паузой)`);
  return { ms, enabled: true, events: SOUND_V2_BOOT_EVENTS.length, files };
}
