// ═══════════════════════════════════════════════════════════════════════════
// ⚠️  СОКРОВИЩНИЦА — WIP. НЕ ПУСКАТЬ В ПРОД.
//
// Фича «Сокровищница» (коллекционные карточки-фразы) находится в разработке.
// По умолчанию флаг выключен (COLLECTIBLES_ENABLED_DEFAULT = false).
// Для dev-разработки: установи EXPO_PUBLIC_COLLECTIBLES_ENABLED=true в .env.local
//
// Что ещё не готово к проду:
//   - UI экрана Сокровищницы (нет entry-point в Статистике)
//   - Firestore rules: collectibles_owned_v1 / collectibles_state_v1 не в blocklist
//   - collectiblesClaimDrop НЕ должен быть в deploy:safe до завершения фичи
//   - Локализация 7 языков (только русский)
//   - TTS-аудио для карточек
//   - Визуальный QA всех 330 SVG-артов
// ═══════════════════════════════════════════════════════════════════════════

/** Фича выключена по умолчанию — только явный env включает в dev. */
export const COLLECTIBLES_ENABLED_DEFAULT = false;

function boolFromEnv(name: string): boolean | undefined {
  const raw = process.env[name];
  if (raw == null || raw === '') return undefined;
  return raw === 'true' || raw === '1';
}

/** Включена ли Сокровищница. По умолчанию false (WIP, не для прода). */
export function isCollectiblesEnabled(): boolean {
  return boolFromEnv('EXPO_PUBLIC_COLLECTIBLES_ENABLED') ?? COLLECTIBLES_ENABLED_DEFAULT;
}
