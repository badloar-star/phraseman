/**
 * Тексты вкладки «Проверка» списка ошибок («Мои ошибки 3.0», решение владельца D203, 2026-11-11).
 *
 * зачем: вкладка показывает исправленные ошибки, которым ещё предстоит одна проверка, группами по сроку —
 * «Сегодня», «Завтра», «Через N дней». Тексты вынесены из экрана: у русского, украинского и польского форма слова
 * «день» зависит от числа, и это проще сторожить тестом отдельно от вёрстки.
 */
import { triLang, type Lang } from '../../constants/i18n';
import type { MistakeCheckDueGroup } from '../../modules/mistake-practice/check_queue';

/** Форма слова по числу для русского и украинского: 1 день · 2 дня · 5 дней. */
function slavicForm(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export interface MistakeCheckCopy {
  /** Название вкладки. */
  readonly tab: string;
  /** Кнопка внизу: «Проверить» (число добавляет экран). */
  readonly cta: string;
  /** Заголовок группы по сроку. */
  readonly group: (group: MistakeCheckDueGroup) => string;
}

export function mistakeCheckCopy(lang: Lang): MistakeCheckCopy {
  const base = triLang(lang, {
    ru: { tab: 'Проверка', cta: 'Проверить', today: 'Сегодня', tomorrow: 'Завтра' },
    uk: { tab: 'Перевірка', cta: 'Перевірити', today: 'Сьогодні', tomorrow: 'Завтра' },
    en: { tab: 'Check', cta: 'Check', today: 'Today', tomorrow: 'Tomorrow' },
    es: { tab: 'Repaso', cta: 'Repasar', today: 'Hoy', tomorrow: 'Mañana' },
    'pt-BR': { tab: 'Revisão', cta: 'Revisar', today: 'Hoje', tomorrow: 'Amanhã' },
    vi: { tab: 'Kiểm tra', cta: 'Kiểm tra', today: 'Hôm nay', tomorrow: 'Ngày mai' },
    id: { tab: 'Cek', cta: 'Cek', today: 'Hari ini', tomorrow: 'Besok' },
    tr: { tab: 'Kontrol', cta: 'Kontrol et', today: 'Bugün', tomorrow: 'Yarın' },
    pl: { tab: 'Sprawdzian', cta: 'Sprawdź', today: 'Dziś', tomorrow: 'Jutro' },
  });
  const inDays = (n: number): string => triLang(lang, {
    ru: `Через ${n} ${slavicForm(n, 'день', 'дня', 'дней')}`,
    uk: `Через ${n} ${slavicForm(n, 'день', 'дні', 'днів')}`,
    en: `In ${n} days`,
    es: `En ${n} días`,
    'pt-BR': `Em ${n} dias`,
    vi: `Sau ${n} ngày`,
    id: `${n} hari lagi`,
    tr: `${n} gün sonra`,
    pl: `Za ${n} dni`,
  });
  return {
    tab: base.tab,
    cta: base.cta,
    group: (group) => (group.kind === 'today' ? base.today : group.kind === 'tomorrow' ? base.tomorrow : inDays(group.days)),
  };
}
