// sound_v2_boot.ts — запуск звуков V2 ПОСЛЕ первого кадра Главной (вызывает корень через runAfterHomeFirstFrame).
//
// зачем (координатор 14.10, п.2): холодный старт не ждёт ни одного файла звука. Здесь только: прогреть флаг sound_v2 из уже лежащего в памяти кэша конфигурации (ни одного чтения Firestore)
// и — лишь если флаг ВКЛЮЧЁН — поставить в очередь прогрев плееров самых частых событий (по одному с паузой, это умеет сам банк). Выключен — ничего не грузим и не импортируем.
// Журнал одной строкой: [SOUND-V2] prime ms=… flag=… events=… files≈… Каждая ошибка загрузки пишется движком с причиной.
import { SOUND_V2_CATALOG, type SoundV2EventId } from './catalog';
import { isSoundV2Enabled, primeSoundV2Flag } from './sound_v2_flag';

const LOG = '[SOUND-V2]';

/** Самые частые события: тап, верный/неверный ответ, монета, конец урока. Остальные плееры создаются лениво при первом запуске. */
export const SOUND_V2_BOOT_EVENTS: readonly SoundV2EventId[] = ['tap', 'correct', 'wrong', 'coin', 'lesson_done'];

export type SoundV2BootResult = Readonly<{ ms: number; enabled: boolean; events: number; files: number }>;

export async function bootSoundV2(now: () => number = Date.now): Promise<SoundV2BootResult> {
  const startedAt = now();
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
