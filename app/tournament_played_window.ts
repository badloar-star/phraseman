// ═══════════════════════════════════════════════════════════════════════════
// tournament_played_window.ts — «в этом окне я уже играл».
//
// зачем 2026-07-27 (владелец): один игрок за окно играет РОВНО ОДИН турнир
// (за день может пройти все окна). Правду хранит сервер — маркер
// tournament_last_slot_key в профиле, он же отдаёт slot_already_played при
// повторной попытке. Но экрану нужно знать это ДО тапа, чтобы:
//   • не показывать живую кнопку «Играть», которая гарантированно упадёт;
//   • сразу перевести таймер на отсчёт до следующего окна.
//
// FIREBASE-ЭКОНОМИЯ: читать профиль на каждый вход в экран ради одного поля —
// лишнее чтение на каждого игрока каждый заход. Поэтому запоминаем локально в
// момент СВОЕГО входа (мы и так знаем, что вошли), а сервер остаётся истиной:
// если локальная память потеряется, худшее — игрок увидит живую кнопку и
// получит честную ошибку «в этом турнире вы уже играли».
//
// Хранится ОДНО значение (последнее окно), а не история: старое незачем.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAYED_WINDOW_KEY = 'tournament_played_window_start_ms';

/**
 * Синхронный снимок для ПЕРВОГО КАДРА.
 *
 * зачем: hero обязан отрисоваться сразу в финальном виде (Performance Bible —
 * layout stability). Ждать AsyncStorage нельзя: это дало бы «отсчёт → прыжок
 * в другое состояние» на глазах у игрока.
 */
let playedWindowSnapshot = 0;

export function peekPlayedWindowStartMs(): number {
  return playedWindowSnapshot;
}

/** Подтягивает сохранённое значение в снимок (вызывается при входе в экран). */
export async function loadPlayedWindowStartMs(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(PLAYED_WINDOW_KEY);
    const value = Number(raw);
    playedWindowSnapshot = Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    // Хранилище недоступно — не повод ломать экран: сервер всё равно проверит.
    playedWindowSnapshot = 0;
  }
  return playedWindowSnapshot;
}

/**
 * Запоминает, что окно отыграно. Вызывается сразу после успешного входа —
 * Optimistic UI: экран переключается на «до следующего окна» не дожидаясь
 * возвращения игрока с турнира.
 */
export async function rememberPlayedWindow(windowStartMs: number): Promise<void> {
  if (!windowStartMs || !Number.isFinite(windowStartMs)) return;
  playedWindowSnapshot = windowStartMs;
  try {
    await AsyncStorage.setItem(PLAYED_WINDOW_KEY, String(windowStartMs));
  } catch {
    // Снимок в памяти уже обновлён — до перезапуска приложения экран честен.
  }
}
