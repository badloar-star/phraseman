/**
 * DEV-подмена наборов ДРУГИХ языков для кнопки языка на настройке тренировки Карточек: `dev_state?cardslangs=on|off` (п.83, cards-027).
 *
 * зачем (координатор 12.10): у анонимного гостя наборы есть только на одном языке (cards=demo → английский), поэтому кнопка языка
 * остаётся чипом без стрелки, а меню, список другого языка и запуск на нём снять нечем. Подменяются ТОЛЬКО списки в памяти процесса
 * (то, что обычно собирает loadFcDeckOptions с localOnly): испанский (3 набора) и французский (2) при языке приложения en; для
 * других языков приложения — три из {en, es, fr}, кроме своего. Ни хранилище, ни Firestore, ни облако не затрагиваются.
 * Карточки этих наборов в хранилище не пишутся: сессия на выбранном языке откроется с тем, что реально лежит на устройстве
 * (для проверки запуска важен маршрут `?target=` и журнал [FC-LANG-FILTER], а не содержимое).
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда null, установка отклоняется. Перезапуск приложения сбрасывает.
 */
import { IS_STORE_RELEASE } from './config';
import type { DeckSheetOption } from './flashcards/DeckPickerSheet';
import type { LearningLanguageTarget } from './learning_language_contour';

let on = false;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Включить/выключить подмену. В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevFcLangs(next: boolean): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] cardslangs: отклонено — не dev-сборка', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  on = next;
  console.log(`[DEV-STATE] cardslangs=${next ? 'on' : 'off'} (списки других языков в памяти, хранилище и облако не затронуты)`); // guard-ok: единичный лог на ссылку
  return true;
}

const PACK_TITLES: Readonly<Partial<Record<LearningLanguageTarget, readonly [string, string]>>> = {
  en: ['Travel essentials', 'Office talk'],
  es: ['Viajes', 'En el restaurante'],
  fr: ['Voyage', 'Au café'],
};

function fixtureFor(language: LearningLanguageTarget, withSaved: boolean): DeckSheetOption[] {
  const titles = PACK_TITLES[language] ?? ['Pack 1', 'Pack 2'];
  const out: DeckSheetOption[] = [];
  if (withSaved) out.push({ deckId: 'saved', title: 'Сохранённые', count: 12, icon: 'bookmark-outline', sourceKind: 'saved' });
  out.push({ deckId: `pack:dev_lang_${language}_1`, title: titles[0], count: 18, icon: 'albums-outline', sourceKind: 'pack' });
  out.push({ deckId: `pack:dev_lang_${language}_2`, title: titles[1], count: 9, icon: 'albums-outline', sourceKind: 'pack' });
  return out;
}

/** Подменённые списки языков, отличных от языка приложения, либо null (подмена выключена / стор-сборка). */
export function getDevOtherLanguageDecks(appTarget: LearningLanguageTarget): Partial<Record<LearningLanguageTarget, DeckSheetOption[]>> | null {
  if (!devAvailable() || !on) return null;
  const out: Partial<Record<LearningLanguageTarget, DeckSheetOption[]>> = {};
  // испанский: «Сохранённые» + 2 набора = 3; французский: 2 набора; английский (если язык приложения другой): 2 набора
  if (appTarget !== 'es') out.es = fixtureFor('es', true);
  if (appTarget !== 'fr') out.fr = fixtureFor('fr', false);
  if (appTarget !== 'en') out.en = fixtureFor('en', false);
  return out;
}

export function resetDevFcLangsForTests(): void {
  on = false;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
