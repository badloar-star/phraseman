// ═══════════════════════════════════════════════════════════════════════════
// spire_ghost_strings.ts — тексты «призрака друга» на ступени Пика, 9 языков (ТЗ spire-engagement-2026-10-25.md §3а).
//
// зачем: ники нельзя склонять («Обогнал Аню», «Быстрее Ани» из живого макета не работают для «Max» или «Zoe_7»), поэтому имя всегда
// стоит в именительном и в начале/конце фразы: «{name} в среднем за 2:10», «Ты впереди», «Быстрее на 0:14 · {name} 2:10».
// Порядок в кортеже как в spire_game_strings.ts: ru, uk, en, es, pt-BR, vi, id, tr, pl. Переводы кроме RU — предложение Дизайна,
// носителем не проверены (Переводчик 10 — вычитка перед включением флага).
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const S = {
  /** Строка над кольцом: чей темп показываем. */
  average: ['{name} в среднем за {t}', '{name} у середньому за {t}', '{name} averages {t}', '{name}, de media {t}', '{name}, em média {t}', '{name} trung bình {t}', '{name} rata-rata {t}', '{name} ortalama {t}', '{name} średnio {t}'],
  /** Обогнал друга по темпу: имя не склоняем — строка без него. */
  ahead: ['Ты впереди', 'Ти попереду', 'You’re ahead', 'Vas por delante', 'Você está à frente', 'Bạn đang dẫn trước', 'Kamu di depan', 'Öndesin', 'Jesteś z przodu'],
  /** Итог ступени: на сколько быстрее средней ступени друга. */
  faster: ['Быстрее на {t} · {name} {avg}', 'Швидше на {t} · {name} {avg}', '{t} faster · {name} {avg}', '{t} más rápido · {name} {avg}', '{t} mais rápido · {name} {avg}', 'Nhanh hơn {t} · {name} {avg}', 'Lebih cepat {t} · {name} {avg}', '{t} daha hızlı · {name} {avg}', 'Szybciej o {t} · {name} {avg}'],
} as const satisfies Record<string, Nine>;

export type SpireGhostStringKey = keyof typeof S;

/** Слишком длинный ник в узкой полоске режем сами, а не оставляем троеточие системе в середине строки. */
export const SPIRE_GHOST_NAME_MAX = 14;
export function spireGhostShortName(name: string): string {
  const chars = Array.from(name.trim());
  return chars.length > SPIRE_GHOST_NAME_MAX ? `${chars.slice(0, SPIRE_GHOST_NAME_MAX - 1).join('')}…` : chars.join('');
}

export function spireGhostText(lang: Lang, key: SpireGhostStringKey, vars?: Readonly<Record<string, string>>): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = S[key];
  const raw = triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
  if (!vars) return raw;
  return raw.replace(/\{([a-z]+)\}/gu, (m, name: string) => (name in vars ? vars[name]! : m));
}
