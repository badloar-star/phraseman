import { OLIVE_RICH } from '../constants/oliveTheme';
import type { ThemeMode } from '../constants/theme';
import type { Lang } from '../constants/i18n';

export function oliveDailyTaskChrome(themeMode: ThemeMode, semanticAccent: string, claimed: boolean) {
  if (themeMode !== 'olive') return null;
  return {
    surface: OLIVE_RICH.surface,
    text: OLIVE_RICH.ivory,
    muted: OLIVE_RICH.champagneLight,
    border: 'transparent',
    shadow: true,
    fill: `${semanticAccent}${claimed ? '34' : '18'}`,
    claimed: OLIVE_RICH.raised,
    reroll: OLIVE_RICH.champagneLight,
  };
}

export function oliveLevelExamChrome(themeMode: ThemeMode) {
  if (themeMode !== 'olive') return null;
  return { panel: OLIVE_RICH.panel, raised: OLIVE_RICH.raised, ivory: OLIVE_RICH.ivory, muted: OLIVE_RICH.champagneLight, cta: OLIVE_RICH.champagne, ctaText: OLIVE_RICH.piano, border: 'transparent' };
}

export function oliveThemeTileA11y(lang: Lang | 'en', state: 'locked' | 'preview' | 'applied' | 'available'): string {
  const copy = {
    locked: { ru: 'Требуется Plus', uk: 'Потрібен Plus', es: 'Requiere Plus', 'pt-BR': 'Requer Plus', vi: 'Cần Plus', id: 'Memerlukan Plus', tr: 'Plus gerekli', pl: 'Wymaga Plus', en: 'Plus required' },
    preview: { ru: 'Предпросмотр', uk: 'Попередній перегляд', es: 'Vista previa', 'pt-BR': 'Prévia', vi: 'Xem trước', id: 'Pratinjau', tr: 'Önizleme', pl: 'Podgląd', en: 'Preview' },
    applied: { ru: 'Применена', uk: 'Застосована', es: 'Aplicado', 'pt-BR': 'Aplicado', vi: 'Đã áp dụng', id: 'Diterapkan', tr: 'Uygulandı', pl: 'Zastosowany', en: 'Applied' },
    available: { ru: 'Доступна', uk: 'Доступна', es: 'Disponible', 'pt-BR': 'Disponível', vi: 'Có sẵn', id: 'Tersedia', tr: 'Kullanılabilir', pl: 'Dostępny', en: 'Available' },
  } as const;
  return copy[state][lang] ?? copy[state].en;
}
