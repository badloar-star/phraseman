/**
 * Доступ к текстам онбординга по языку интерфейса: onboardingCopy(lang) → { ключ: строка }, fill() для подстановок
 * и React-контекст, чтобы вложенные компоненты (шапка, телефон, шторка предложений) не тащили lang через пропсы.
 *
 * зачем (координатор 12.10): онбординг был только по-русски. Сами строки — в clean_onboarding_copy_core.ts и
 * clean_onboarding_copy_paywall.ts (кортеж из 9 языков); сторож tests/clean_onboarding_copy.test.ts следит, чтобы у каждого ключа
 * были все 9 языков и одинаковые подстановки. Неизвестный язык показываем по-английски.
 */
import React, { createContext, useContext, useMemo } from 'react';
import type { Lang } from '../../constants/i18n';
import { CORE_COPY, type Tuple9 } from './clean_onboarding_copy_core';
import { LANGUAGE_WELCOME_COPY } from './clean_onboarding_copy_language';
import { PAYWALL_COPY } from './clean_onboarding_copy_paywall';
import { ONBOARDING_LANG_KEYS, onboardingLangKey, type OnboardingLangKey } from './clean_onboarding_dates';

export const ONBOARDING_COPY_TABLE = { ...CORE_COPY, ...PAYWALL_COPY, ...LANGUAGE_WELCOME_COPY } as const;
export type OnboardingCopyKey = keyof typeof ONBOARDING_COPY_TABLE;
export type OnboardingCopy = { readonly [K in OnboardingCopyKey]: string };

const cache = new Map<OnboardingLangKey, OnboardingCopy>();

export function onboardingCopy(lang: Lang | string): OnboardingCopy {
  const key = onboardingLangKey(lang);
  const hit = cache.get(key);
  if (hit) return hit;
  const index = ONBOARDING_LANG_KEYS.indexOf(key);
  const entries = Object.entries(ONBOARDING_COPY_TABLE) as [OnboardingCopyKey, Tuple9][];
  const built = Object.fromEntries(entries.map(([name, tuple]) => [name, tuple[index] as string])) as OnboardingCopy;
  cache.set(key, built);
  return built;
}

/** Подставляет {name} → значение. Неизвестный ключ остаётся как есть (виден в тесте, а не пропадает молча). */
export function fill(template: string, vars: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

type CopyContextValue = { readonly copy: OnboardingCopy; readonly lang: OnboardingLangKey };
const OnboardingCopyContext = createContext<CopyContextValue | null>(null);

export function OnboardingCopyProvider({ lang, children }: { lang: Lang | string; children: React.ReactNode }) {
  const value = useMemo<CopyContextValue>(() => ({ copy: onboardingCopy(lang), lang: onboardingLangKey(lang) }), [lang]);
  return React.createElement(OnboardingCopyContext.Provider, { value }, children);
}

/** Тексты онбординга для текущего языка. Вне провайдера — английский (а не русский), чтобы не показать чужой язык по ошибке. */
export function useOnboardingCopy(): OnboardingCopy {
  return useContext(OnboardingCopyContext)?.copy ?? onboardingCopy('en');
}

/** Ключ языка интерфейса для дат и склонения «дней». */
export function useOnboardingLang(): OnboardingLangKey {
  return useContext(OnboardingCopyContext)?.lang ?? 'en';
}
