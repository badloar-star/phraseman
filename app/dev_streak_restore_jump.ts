/**
 * DEV: «прыжок серии после восстановления» — для проверки [HOME-RESTORE-JUMP] на эмуляторе.
 *
 * зачем (координатор 12.10): у тестовых аккаунтов серия 0, и строки [HOME-RESTORE-JUMP] ничего не доказывают. Фикстура
 * моделирует настоящий случай: Главная открылась с локальной серией A, затем «пришло облако» с серией B. Пишем A,
 * ждём кадр Главной + 3 с, пишем B и шлём то же событие, что настоящее восстановление (`cloud_profile_hydrated`).
 * Только dev-сборка (вызывается из applyDevState за воротами isDevStateAvailable). `streak_count` клиент в облако не
 * отправляет (серверный ключ), так что облако подделка не задевает.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';

const LOG = '[DEV-STATE] streak_jump';
export const DEV_STREAK_JUMP_DELAY_AFTER_PAINT_MS = 3_000;

export type DevStreakJump = Readonly<{ local: number; cloud: number }>;

/** «5:12» → { local: 5, cloud: 12 }; null — неверный формат. */
export function parseDevStreakJump(raw: unknown): DevStreakJump | null {
  if (typeof raw !== 'string') return null;
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(raw.trim());
  if (!match) return null;
  return { local: Number(match[1]), cloud: Number(match[2]) };
}

type Deps = Readonly<{
  whenHomePainted: (ceilingMs: number) => Promise<unknown>;
  wait: (ms: number) => Promise<void>;
}>;

/** Пишет локальную серию сразу; «облачную» — после кадра Главной и паузы, затем событие восстановления. Не бросает. */
export async function runDevStreakRestoreJump(jump: DevStreakJump, deps: Deps): Promise<void> {
  await AsyncStorage.setItem('streak_count', String(jump.local));
  console.log(LOG, JSON.stringify({ step: 'local_written', local: jump.local }));
  void (async () => {
    try {
      const painted = await deps.whenHomePainted(30_000);
      await deps.wait(DEV_STREAK_JUMP_DELAY_AFTER_PAINT_MS);
      await AsyncStorage.setItem('streak_count', String(jump.cloud));
      console.log(LOG, JSON.stringify({ step: 'cloud_written', cloud: jump.cloud, painted }));
      emitAppEvent('cloud_profile_hydrated');
      console.log(LOG, JSON.stringify({ step: 'event_emitted', event: 'cloud_profile_hydrated' }));
    } catch (error) {
      console.warn(LOG, 'не доиграл', error instanceof Error ? error.message : String(error));
    }
  })();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
