// Локальные метки продолжения уроков, диалогов и тренировок карточек.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import { onAccountOwnerChanged } from './account_owner_change';
import { homeContinueMarkKey, homeContinueMarkKeys, type RuntimeStudyTarget } from './target_storage_keys';
import { triLang, type Lang } from '../constants/i18n';

const LOG = '[HOME-CONTINUE]';
const TARGETS: readonly RuntimeStudyTarget[] = ['en', 'es', 'fr', 'de', 'it'] as RuntimeStudyTarget[];

/** Вид «места», кроме урока: диалог или набор карточек. */
export type HomeContinuePlaceKind = 'dialog' | 'cards';

export type HomeContinuePlaceMark = Readonly<{
  /** Стабильный id места: сценарий диалога / выбранные наборы (через запятую). */
  id: string;
  /** Снимок названия на момент записи; для диалога Главная берёт свежее по языку интерфейса. */
  title: string;
  subtitle: string | null;
  /** Куда ведёт тап на Главной (маршрут экрана-входа, со своими проверками доступа). */
  route: Readonly<{ pathname: string; params?: Readonly<Record<string, string>> }>;
  atMs: number;
}>;

export type HomeContinueMarks = Readonly<{
  legacyAtMs: number | null;
  dialog?: HomeContinuePlaceMark | null;
  cards?: HomeContinuePlaceMark | null;
}>;

// зачем (координатор 18.10): ключи строит общий homeContinueMarkKey (target_storage_keys.ts) — тот же, что берёт общее стирание
// аккаунта; чтение и удаление получают готовый массив, без строк внутри вызова (сторож описи принимал 'dialog'/'cards' за ключи).
const placeKey = (target: RuntimeStudyTarget, kind: HomeContinuePlaceKind): string => homeContinueMarkKey(kind, target);

// ключ памяти: изучаемый язык (null/undefined = как у lastOpenedLessonKey, английский)
const tk = (target: RuntimeStudyTarget): string => String(target ?? 'en');
const memory = new Map<string, HomeContinueMarks>();
const hydratedTargets = new Set<string>();
const listeners = new Set<() => void>();
const emit = (): void => { listeners.forEach((l) => l()); };
const EMPTY_MARKS: HomeContinueMarks = { legacyAtMs: null };
let ownerRevision = 0;
const readOwnerRevision = () => ownerRevision;
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

onAccountOwnerChanged('home_continue_mark', () => {
  ownerRevision += 1;
  memory.clear();
  hydratedTargets.clear();
  emit();
  void AsyncStorage.multiRemove(TARGETS.flatMap((t) => homeContinueMarkKeys(t))).catch((error: unknown) => {
    console.warn(`${LOG} mark: ключи прошлого аккаунта не удалились (${error instanceof Error ? error.message : String(error)})`);
  });
});

function parsePlace(raw: string | null, kind: HomeContinuePlaceKind): HomeContinuePlaceMark | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<HomeContinuePlaceMark>;
    const route = v.route as Partial<HomeContinuePlaceMark['route']> | undefined;
    const ok = typeof v.id === 'string' && v.id.length > 0 && typeof v.title === 'string' && v.title.length > 0
      && Number.isFinite(v.atMs) && route && typeof route.pathname === 'string' && route.pathname.startsWith('/');
    if (!ok) { console.warn(`${LOG} mark: метка «${kind}» битая — игнорируем`); return null; }
    return { id: v.id!, title: v.title!, subtitle: typeof v.subtitle === 'string' ? v.subtitle : null, route: { pathname: route!.pathname!, ...(route!.params ? { params: route!.params } : {}) }, atMs: v.atMs! };
  } catch (error) {
    console.warn(`${LOG} mark: метка «${kind}» не читается (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

/** Синхронно из памяти (первый кадр); null — ещё не читали с диска. */
export function peekHomeContinueMarks(target: RuntimeStudyTarget): HomeContinueMarks | null {
  return memory.get(tk(target)) ?? null;
}

export async function loadHomeContinueMarks(target: RuntimeStudyTarget): Promise<HomeContinueMarks> {
  const key = tk(target);
  const known = memory.get(key);
  if (known && hydratedTargets.has(key)) return known;
  const revision = ownerRevision;
  try {
    const pairs = await AsyncStorage.multiGet([
      homeContinueMarkKey('at', target),
      placeKey(target, 'dialog'),
      placeKey(target, 'cards'),
    ]);
    if (revision !== ownerRevision) return EMPTY_MARKS;
    const at = Number(pairs[0]?.[1]);
    const current = memory.get(key);
    const marks: HomeContinueMarks = {
      legacyAtMs: current?.legacyAtMs ?? (Number.isFinite(at) && at > 0 ? at : null),
      dialog: current?.dialog ?? parsePlace(pairs[1]?.[1] ?? null, 'dialog'),
      cards: current?.cards ?? parsePlace(pairs[2]?.[1] ?? null, 'cards'),
    };
    hydratedTargets.add(key);
    memory.set(key, marks);
    emit();
    return marks;
  } catch (error) {
    console.warn(`${LOG} mark: чтение меток не удалось — карточка по старому уроку (${error instanceof Error ? error.message : String(error)})`);
    return EMPTY_MARKS;
  }
}

function write(target: RuntimeStudyTarget, next: HomeContinueMarks, persist: () => Promise<void>, what: string): void {
  memory.set(tk(target), next);
  emit();
  persist().catch((error: unknown) => {
    console.warn(`${LOG} mark: ${what} — не записалось на диск, до перезапуска работает из памяти (${error instanceof Error ? error.message : String(error)})`);
  });
}

/**
 * Начат диалог или тренировка карточек. Пишут точки входа разделов; на тот же id повтор только обновляет время.
 * Без названия метка бессмысленна (карточке нечего показать) — отказ с причиной в журнале.
 */
export function recordHomeContinuePlace(kind: HomeContinuePlaceKind, target: RuntimeStudyTarget, mark: HomeContinuePlaceMark): void {
  if (!mark.id || !mark.title || !mark.route.pathname.startsWith('/')) {
    console.warn(`${LOG} mark: «${kind}» не записана — пустой id/название/маршрут (${JSON.stringify({ id: mark.id, title: mark.title, pathname: mark.route.pathname })})`);
    return;
  }
  const prev = memory.get(tk(target)) ?? EMPTY_MARKS;
  console.log(`${LOG} mark: ${kind} id=${mark.id} путь=${mark.route.pathname} target=${target}`);
  write(target, { ...prev, [kind]: mark }, () => AsyncStorage.setItem(placeKey(target, kind), JSON.stringify(mark)), `метка «${kind}»`); // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
}

/** Открыт старый урок — время рядом с lastOpenedLessonKey. */
export function recordHomeContinueLegacy(target: RuntimeStudyTarget, atMs: number = Date.now()): void {
  const prev = memory.get(tk(target)) ?? EMPTY_MARKS;
  write(target, { ...prev, legacyAtMs: atMs }, () => AsyncStorage.setItem(homeContinueMarkKey('at', target), String(atMs)), 'время старого урока'); // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
}

export type HomeContinueReason = 'none' | 'legacy_only' | 'legacy_newer' | 'dialog_only' | 'cards_only' | 'dialog_newer' | 'cards_newer';
export type HomeContinueChoice = Readonly<{ kind: 'legacy' | 'dialog' | 'cards' | 'none'; reason: HomeContinueReason }>;
export type HomeContinueInput = Readonly<{
  hasLegacyLesson: boolean;
  legacyAtMs: number | null;
  /** Уже проверенные на устаревание (resolveHomeContinuePlaces); не заданы — как раньше, только уроки. */
  dialog?: HomeContinuePlaceMark | null;
  cards?: HomeContinuePlaceMark | null;
}>;

export function pickHomeContinue(input: HomeContinueInput): HomeContinueChoice {
  const { hasLegacyLesson, legacyAtMs, dialog = null, cards = null } = input;
  // зачем (слово владельца 17.10): кроме урока — диалог и набор карточек; побеждает самое свежее, при равном времени порядок диалог > карточки > старый урок
  const candidates: { kind: 'legacy' | 'dialog' | 'cards'; at: number; rank: number }[] = [];
  if (dialog) candidates.push({ kind: 'dialog', at: dialog.atMs, rank: 2 });
  if (cards) candidates.push({ kind: 'cards', at: cards.atMs, rank: 1 });
  if (hasLegacyLesson) candidates.push({ kind: 'legacy', at: legacyAtMs ?? 0, rank: 0 });
  if (candidates.length === 0) return { kind: 'none', reason: 'none' };
  candidates.sort((a, b) => (b.at - a.at) || (b.rank - a.rank));
  const winner = candidates[0]!;
  const reason = (candidates.length === 1 ? `${winner.kind}_only` : `${winner.kind}_newer`) as HomeContinueReason;
  return { kind: winner.kind, reason };
}

/**
 * Метки «диалог» и «карточки» → то, что можно показать. Проверка дешёвая и локальная: раздел виден для языка обучения; сценарий диалога ещё существует.
 * Не прошло — метка молча отбрасывается (откат на другое место или «Начать урок 1»), причина — в журнале [HOME-CONTINUE] stale.
 * Название диалога берётся свежее по языку интерфейса (метка хранит снимок). Каталог сценариев (большой) грузится лениво, только если метка диалога есть.
 */
export function resolveHomeContinuePlaces(args: Readonly<{ marks: HomeContinueMarks; dialoguesVisible: boolean; flashcardsVisible: boolean; lang: Lang }>): Readonly<{ dialog: HomeContinuePlaceMark | null; cards: HomeContinuePlaceMark | null }> {
  const { marks, dialoguesVisible, flashcardsVisible, lang } = args;
  let dialog: HomeContinuePlaceMark | null = null;
  const dialogMark = marks.dialog ?? null;
  if (dialogMark) {
    if (!dialoguesVisible) {
      console.log(`${LOG} stale: диалог id=${dialogMark.id} — раздел диалогов закрыт для этого языка обучения`);
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const scenarios = require('./ai_dialog_scenarios') as typeof import('./ai_dialog_scenarios');
        const scenario = scenarios.getScenarioById(dialogMark.id);
        if (!scenario) {
          console.log(`${LOG} stale: диалог id=${dialogMark.id} — сценария больше нет`);
        } else {
          dialog = { ...dialogMark, title: scenarios.dialogScenarioTitle(scenario, lang) || dialogMark.title };
        }
      } catch (error) {
        console.warn(`${LOG} stale: диалог id=${dialogMark.id} — каталог сценариев не загрузился, метка пропущена (${error instanceof Error ? error.message : String(error)})`);
      }
    }
  }
  let cards: HomeContinuePlaceMark | null = null;
  const cardsMark = marks.cards ?? null;
  if (cardsMark) {
    if (!flashcardsVisible) console.log(`${LOG} stale: карточки id=${cardsMark.id} — раздел карточек закрыт для этого языка обучения`);
    else cards = cardsMark;
  }
  return { dialog, cards };
}

/** Плашка на арте карточки: какого рода место. */
export function homeContinuePlaceBadge(lang: Lang, kind: HomeContinuePlaceKind): string {
  return kind === 'dialog'
    ? triLang(lang, { ru: 'Диалог', uk: 'Діалог', en: 'Dialogue', es: 'Diálogo', 'pt-BR': 'Diálogo', vi: 'Hội thoại', id: 'Dialog', tr: 'Diyalog', pl: 'Dialog' })
    : triLang(lang, { ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas', 'pt-BR': 'Cartões', vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Karty' });
}

/** Заголовок карточки, когда меток нет вовсе (первый запуск): «Начать урок 1» — новые уроки. */
export function homeContinueStartTitle(lang: Lang): string {
  return triLang(lang, { ru: 'Начать урок 1', uk: 'Почати урок 1', en: 'Start lesson 1', es: 'Empezar la lección 1', 'pt-BR': 'Começar a lição 1', vi: 'Bắt đầu bài 1', id: 'Mulai pelajaran 1', tr: '1. derse başla', pl: 'Zacznij lekcję 1' });
}

/** Журнал решения: что выбрано и почему, с временем обеих меток. */
const REASON_TEXT: Readonly<Record<HomeContinueReason, string>> = {
  none: 'нет ни урока, ни диалога, ни карточек — «Начать урок 1»', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  legacy_only: 'только старый урок', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  legacy_newer: 'старый урок свежее', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  dialog_only: 'только диалог', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  cards_only: 'только карточки', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  dialog_newer: 'диалог свежее', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  cards_newer: 'карточки свежее', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
};

export function logHomeContinueChoice(choice: HomeContinueChoice, input: HomeContinueInput, target: string): void {
  const place = (m: HomeContinuePlaceMark | null | undefined) => (m ? `${m.atMs} (${m.id})` : 'нет');
  console.log(`${LOG} выбор=${choice.kind} причина=${REASON_TEXT[choice.reason]} время: старый=${input.hasLegacyLesson ? (input.legacyAtMs ?? 'нет метки') : 'нет урока'} диалог=${place(input.dialog)} карточки=${place(input.cards)} target=${target}`); // guard-ok: журнал решения карточки
}

export function useHomeContinueMarks(target: RuntimeStudyTarget): HomeContinueMarks {
  const revision = useSyncExternalStore(subscribe, readOwnerRevision, readOwnerRevision);
  const readMarks = () => peekHomeContinueMarks(target) ?? EMPTY_MARKS;
  const marks = useSyncExternalStore(subscribe, readMarks, readMarks);
  useEffect(() => {
    void loadHomeContinueMarks(target);
  }, [target, revision]);
  return marks;
}

export function resetHomeContinueMarksForTests(): void {
  ownerRevision += 1;
  memory.clear();
  hydratedTargets.clear();
  listeners.clear();
}

export default function __RouteShim() { return null; }
