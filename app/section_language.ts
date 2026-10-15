// ═══════════════════════════════════════════════════════════════════════════
// section_language.ts — «локальный язык раздела»: выбор языка в пилюле раздела («Видео», «Карточки») НЕ меняет язык изучения всего приложения.
//
// зачем (требование владельца, координатор 15.10): переключатель языка в разделах «Видео» и «Карточки» живёт только в этом разделе и только на время захода;
// при возврате в раздел снова язык из Настроек. Глобальный язык (studyTarget) меняется ТОЛЬКО в Настройках — отсюда в него никто не пишет.
// Значение — в памяти (диск не трогаем): оно сбрасывается, когда человек уходит из раздела (трекер по пути экрана, см. trackSectionPathname в (tabs)/_layout).
// Журнал: [SECTION-LANG] {section, from, to, global} на каждое переключение и сброс.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useSyncExternalStore } from 'react';
import { peekStudyTargetRaw } from './app_snapshot_bootstrap';

export type LanguageSection = 'video' | 'cards';

const overrides: Record<LanguageSection, string | null> = { video: null, cards: null };
const listeners = new Set<() => void>();
const resetListeners = new Set<(section: LanguageSection) => void>();
let version = 0;

function globalLanguageForLog(): string {
  return peekStudyTargetRaw() ?? 'unknown';
}

function emit(): void {
  version += 1;
  for (const listener of Array.from(listeners)) listener();
}

export function getSectionLanguageOverride(section: LanguageSection): string | null {
  return overrides[section];
}

/** Локальный выбор в разделе. Глобальный язык не трогается — в журнале `global` остаётся прежним. */
export function setSectionLanguageOverride(section: LanguageSection, to: string): void {
  const from = overrides[section];
  if (from === to) return;
  overrides[section] = to;
  console.log(`[SECTION-LANG] ${JSON.stringify({ section, from: from ?? 'global', to, global: globalLanguageForLog(), event: 'select' })}`); // guard-ok: переключение
  emit();
}

/** Возврат к языку из Настроек (человек ушёл из раздела). */
export function resetSectionLanguage(section: LanguageSection, reason: string): void {
  const from = overrides[section];
  if (from === null) return;
  overrides[section] = null;
  console.log(`[SECTION-LANG] ${JSON.stringify({ section, from, to: 'global', global: globalLanguageForLog(), event: 'reset', reason })}`); // guard-ok: сброс
  for (const listener of Array.from(resetListeners)) listener(section);
  emit();
}

/** Подписка на сброс — экранам, у которых свой кэш выбранного языка (например, фильтр языка наборов). */
export function subscribeSectionLanguageReset(listener: (section: LanguageSection) => void): () => void {
  resetListeners.add(listener); // guard-ok: подписка в памяти
  return () => { resetListeners.delete(listener); };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener); // guard-ok: подписка в памяти
  return () => { listeners.delete(listener); };
}

/** Раздел по пути экрана (null — вне разделов с локальным языком). */
export function sectionOfPathname(pathname: string | null | undefined): LanguageSection | null {
  const path = String(pathname ?? '');
  if (path === '/video' || path.startsWith('/video/') || path.startsWith('/lingman_video')) return 'video';
  if (path.startsWith('/flashcards') || path.startsWith('/community_pack')) return 'cards';
  return null;
}

let lastSection: LanguageSection | null = null;

/** Зовётся при смене пути: ушли из раздела — его локальный язык сбрасывается. */
export function trackSectionPathname(pathname: string | null | undefined): void {
  const next = sectionOfPathname(pathname);
  if (next === lastSection) return;
  const left = lastSection;
  lastSection = next;
  if (left) resetSectionLanguage(left, `left_section_to=${next ?? String(pathname)}`);
}

/** Язык раздела: локальный выбор, иначе язык из Настроек. */
export function useSectionLanguage<T extends string>(section: LanguageSection, globalLanguage: T): {
  language: T;
  isLocal: boolean;
  setLanguage: (code: T) => void;
} {
  useSyncExternalStore(subscribe, () => version, () => version);
  const override = overrides[section] as T | null;
  const setLanguage = useCallback((code: T) => setSectionLanguageOverride(section, code), [section]);
  return { language: override ?? globalLanguage, isLocal: override !== null, setLanguage };
}

export function __resetSectionLanguageForTests(): void {
  overrides.video = null;
  overrides.cards = null;
  lastSection = null;
  version = 0;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
