// ═══════════════════════════════════════════════════════════════════════════
// tournament_theme.ts — токены режима «Турниры» (Deep Forest Green).
//
// зачем: перенесены 1:1 из утверждённого прототипа
// (docs/design/tournaments/prototype/src/data/players.ts), чтобы экраны в
// приложении совпадали с 47 макетами попиксельно.
//
// ГЛАВНОЕ ПРАВИЛО ВЛАДЕЛЬЦА: контейнеры БЕЗ обводок. Разделяем тоном
// (card → elev → elev2), тенью и внутренним бликом сверху (innerLight).
// borderWidth/borderColor вокруг блоков в этом режиме запрещены.
// ═══════════════════════════════════════════════════════════════════════════

export const T = Object.freeze({
  bg: '#070C08',
  card: '#101710',
  elev: '#17241A',
  elev2: '#1D2E22',
  text: '#F0F7F2',
  muted: '#8AB49A',
  ghost: '#5B7A67',
  accent: '#47C870',
  accentSoft: 'rgba(71,200,112,0.14)',
  accentText: '#042010',
  accentDark: '#1E6B3A',
  gold: '#FFD43B',
  goldSoft: 'rgba(255,212,59,0.12)',
  goldText: '#B98A1B',
  goldDark: '#7D5F0E',
  silver: '#C9D4DC',
  bronze: '#D29A6A',
  danger: '#FF5B6C',
  dangerSoft: 'rgba(255,91,108,0.12)',
  dangerDark: '#7A2530',
  streak: '#FB923C',
});

export const radius = Object.freeze({ lg: 26, md: 18, sm: 12 });

/**
 * Мягкий внутренний блик сверху — заменяет бордер.
 * RN не поддерживает inset-тени, поэтому кладём тонкую полосу отдельным View
 * (см. Card в tournament_ui.tsx).
 */
export const INNER_LIGHT = 'rgba(255,255,255,0.045)';

/** Типографика: крупная, без микро-текста (правило владельца). */
export const type = Object.freeze({
  hero: { fontSize: 64, fontWeight: '900' as const, letterSpacing: -1 },
  title: { fontSize: 28, fontWeight: '900' as const, letterSpacing: -0.8 },
  section: { fontSize: 22, fontWeight: '900' as const, letterSpacing: -0.4 },
  card: { fontSize: 17, fontWeight: '800' as const },
  body: { fontSize: 15, fontWeight: '600' as const },
  label: { fontSize: 13, fontWeight: '700' as const },
});

/** Тайминги. Spring для появлений, ease-out для переходов состояний. */
export const motion = Object.freeze({
  /** Pop-in карточек и игроков в лобби. */
  popIn: { damping: 14, stiffness: 190, mass: 0.9 },
  /** FLIP-перестановка строк таблицы между раундами. */
  reorder: { damping: 18, stiffness: 140, mass: 1 },
  /** Быстрый отклик на нажатие. */
  press: { damping: 20, stiffness: 400 },
  /** Пауза после фидбека ответа перед следующим вопросом (§4 спеки). */
  answerFeedbackMs: 1400,
  /** Показ таблицы между раундами. */
  tableHoldMs: 11000,
});

/**
 * Единый формат таймера (§ спеки): <1ч → MM:SS, <24ч → H:MM:SS,
 * ≥24ч → «Nд» + H:MM. Везде tabular-nums, чтобы цифры не «прыгали».
 */
export function formatTimeLeft(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  if (days >= 1) return `${days}д ${hours}:${pad(minutes)}`;
  if (hours >= 1) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** Цвет медали по месту — для подиума и таблицы. */
export function placeColor(place: number): string {
  if (place === 1) return T.gold;
  if (place === 2) return T.silver;
  if (place === 3) return T.bronze;
  return T.muted;
}

/** Медаль-эмодзи призовых мест. */
export function placeMedal(place: number): string {
  return place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : '';
}
