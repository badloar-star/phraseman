export const BASE_SOURCE_LOCALES = ['ru', 'uk'] as const;

export const HEISENBERG_BATCH_SOURCE_LOCALES = [
  'es',
  'pt-BR',
  'vi',
  'id',
  'tr',
  'pl',
] as const;

export const SOURCE_LOCALES = [
  ...BASE_SOURCE_LOCALES,
  ...HEISENBERG_BATCH_SOURCE_LOCALES,
] as const;

export type BaseSourceLocale = (typeof BASE_SOURCE_LOCALES)[number];
export type HeisenbergSourceLocale = (typeof HEISENBERG_BATCH_SOURCE_LOCALES)[number];
export type SourceLocale = (typeof SOURCE_LOCALES)[number];

export const ACTIVE_INTERFACE_SOURCE_LOCALES = ['ru', 'uk', 'es'] as const;
export const PLANNED_INTERFACE_SOURCE_LOCALES = HEISENBERG_BATCH_SOURCE_LOCALES.filter(
  (locale): locale is Exclude<HeisenbergSourceLocale, 'es'> => locale !== 'es',
);
export const REGISTERED_INTERFACE_SOURCE_LOCALES = [
  ...ACTIVE_INTERFACE_SOURCE_LOCALES,
  ...PLANNED_INTERFACE_SOURCE_LOCALES,
] as const;

export type ActiveInterfaceSourceLocale = (typeof ACTIVE_INTERFACE_SOURCE_LOCALES)[number];
export type PlannedInterfaceSourceLocale = (typeof PLANNED_INTERFACE_SOURCE_LOCALES)[number];
export type RegisteredInterfaceSourceLocale = (typeof REGISTERED_INTERFACE_SOURCE_LOCALES)[number];
export type InterfaceSourceLocaleStatus = 'active' | 'planned';

export const INTERFACE_SOURCE_LOCALE_STATUS = {
  ru: 'active',
  uk: 'active',
  es: 'active',
  'pt-BR': 'planned',
  vi: 'planned',
  id: 'planned',
  tr: 'planned',
  pl: 'planned',
} as const satisfies Record<RegisteredInterfaceSourceLocale, InterfaceSourceLocaleStatus>;

export const SOURCE_LOCALE_FIELD_SUFFIX = {
  es: 'es',
  'pt-BR': 'pt_br',
  vi: 'vi',
  id: 'id',
  tr: 'tr',
  pl: 'pl',
} as const satisfies Record<HeisenbergSourceLocale, string>;

export function normalizeSourceLocale(value: unknown): SourceLocale | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (normalized === 'pt_BR' || normalized.toLowerCase() === 'pt-br') return 'pt-BR';
  return (SOURCE_LOCALES as readonly string[]).includes(normalized)
    ? (normalized as SourceLocale)
    : null;
}

export function isHeisenbergBatchSourceLocale(value: unknown): value is HeisenbergSourceLocale {
  const normalized = normalizeSourceLocale(value);
  return !!normalized && (HEISENBERG_BATCH_SOURCE_LOCALES as readonly string[]).includes(normalized);
}
