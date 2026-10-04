/**
 * Три группы типов ошибок из макета «Панель»: Значение · Грамматика · Произношение.
 *
 * зачем (владелец: раздел 1 в 1 с макетом): в макете ленты-фильтры называют ТРИ группы, а в журнале шесть типов ошибок —
 * «форма слова», «порядок слов», «пропущенное слово» складываются в «Грамматику», «на слух» — в «Произношение».
 */
import { triLang, type Lang } from '../../constants/i18n';
import type { MistakeFacet } from '../../modules/mistake-practice/contracts';

export type MistakeGroup = 'meaning' | 'grammar' | 'sound';
export type MistakeGroupFilter = 'all' | MistakeGroup;

export const MISTAKE_GROUPS: readonly MistakeGroup[] = ['meaning', 'grammar', 'sound'];

export function mistakeGroupOf(facet: MistakeFacet): MistakeGroup {
  switch (facet) {
    case 'meaning':
      return 'meaning';
    case 'pronunciation':
    case 'listening':
      return 'sound';
    case 'form':
    case 'word_order':
    case 'missing_token':
    default:
      return 'grammar';
  }
}

/** Типы ошибок журнала, входящие в группу макета (обратное к mistakeGroupOf). */
export function facetsOfGroup(group: MistakeGroup): readonly MistakeFacet[] {
  switch (group) {
    case 'meaning':
      return ['meaning'];
    case 'sound':
      return ['pronunciation', 'listening'];
    case 'grammar':
    default:
      return ['form', 'word_order', 'missing_token'];
  }
}

/** Из параметра маршрута (`facetGroup`) — список типов для сессии; неизвестное или пустое значение = без сужения. */
export function facetsFromParam(value: unknown): readonly MistakeFacet[] | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'meaning' || raw === 'grammar' || raw === 'sound' ? facetsOfGroup(raw) : undefined;
}

export function mistakeGroupLabel(lang: Lang, group: MistakeGroup): string {
  switch (group) {
    case 'meaning':
      return triLang(lang, { ru: 'Значение', uk: 'Значення', en: 'Meaning', es: 'Significado', 'pt-BR': 'Significado', vi: 'Nghĩa', id: 'Makna', tr: 'Anlam', pl: 'Znaczenie' });
    case 'grammar':
      return triLang(lang, { ru: 'Грамматика', uk: 'Граматика', en: 'Grammar', es: 'Gramática', 'pt-BR': 'Gramática', vi: 'Ngữ pháp', id: 'Tata bahasa', tr: 'Dilbilgisi', pl: 'Gramatyka' });
    case 'sound':
    default:
      return triLang(lang, { ru: 'Произношение', uk: 'Вимова', en: 'Pronunciation', es: 'Pronunciación', 'pt-BR': 'Pronúncia', vi: 'Phát âm', id: 'Pelafalan', tr: 'Telaffuz', pl: 'Wymowa' });
  }
}
