import type { Lang } from '../../constants/i18n';

const SPIN_BUSY_HINT: Readonly<Record<Lang, string>> = {
  ru: 'Крутим спин…',
  uk: 'Крутимо спін…',
  es: 'Girando…',
  'pt-BR': 'Girando…',
  vi: 'Đang quay…',
  id: 'Sedang memutar…',
  tr: 'Çevriliyor…',
  pl: 'Losowanie…',
};

/** Accessibility-only status while a spin claim is already in flight. */
export function arenaHubSpinBusyHint(lang: Lang): string {
  return SPIN_BUSY_HINT[lang];
}
