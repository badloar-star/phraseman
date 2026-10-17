// ═══════════════════════════════════════════════════════════════════════════
// home_continue_mark.ts — что показать в карточке «Продолжить» на Главной: старый урок или занятие курса V2, смотря что СВЕЖЕЕ.
//
// зачем (Ревизор P23, координатор 15.10, задача до сборки): карточка знала только старые уроки (ключ lastOpenedLessonKey пишут lesson1 и
// lesson_menu). Кто занимался только курсом V2 — карточки не было; кто ушёл из старых уроков в V2 — карточка навсегда показывала старый
// «Урок N» и вела в старое меню. Теперь:
//   • запуск занятия V2 (вкладка «Уроки») пишет метку «последнее V2»: урок, занятие, параметры маршрута, время (координатор 15.10,
//     поправка 1: «пройдено / выпущено» в метке НЕ хранится — Главная считает его при показе, learning_v2_home_continue_route);
//   • старые уроки пишут время рядом со своим lastOpenedLessonKey;
//   • Главная выбирает свежее по времени (pickHomeContinue) и пишет решение в [HOME-CONTINUE].
// Только локально: AsyncStorage + память процесса для первого кадра, ни одного чтения/записи Firestore. Смена владельца аккаунта
// чистит память и свои ключи (иначе гость увидел бы занятие прошлого аккаунта).
//
// зачем (слово владельца 17.10 через координатора: «над плитками Уроки / Карточки / Диалоги — карточка последнего места»): к урокам добавились ещё два
// вида места — ДИАЛОГ (сценарий) и НАБОР КАРТОЧЕК (последняя тренировка). Их пишут точки входа разделов (старт диалога, старт тренировки карточек),
// метка {id, title, subtitle, route, atMs}; Главная берёт самое СВЕЖЕЕ из четырёх (урок / занятие V2 / диалог / карточки). Второй карточки и второго
// хранилища нет — это то же «Продолжить», расширенное. Нет ни одной метки — «Начать урок 1»; метка устарела (сценарий удалён, раздел закрыт для языка) —
// тихий откат с журналом [HOME-CONTINUE] stale.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { onAccountOwnerChanged } from './account_owner_change';
import { lastOpenedLessonKey, type RuntimeStudyTarget } from './target_storage_keys';
import { triLang, type Lang } from '../constants/i18n';

const LOG = '[HOME-CONTINUE]';
const TARGETS: readonly RuntimeStudyTarget[] = ['en', 'es', 'fr', 'de', 'it'] as RuntimeStudyTarget[];

export type HomeContinueV2Mark = Readonly<{
  lessonOrdinal: number;
  sessionOrdinal: number;
  sessionId: string;
  /** Параметры маршрута /learning-v2/session/[id] — тап на Главной открывает то же занятие. */
  route: Readonly<Record<string, string>>;
  atMs: number;
}>;

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
  v2: HomeContinueV2Mark | null;
  legacyAtMs: number | null;
  dialog?: HomeContinuePlaceMark | null;
  cards?: HomeContinuePlaceMark | null;
}>;

const v2Key = (target: RuntimeStudyTarget): string => `${lastOpenedLessonKey(target)}__continue_v2`;
const legacyAtKey = (target: RuntimeStudyTarget): string => `${lastOpenedLessonKey(target)}__continue_at`;
const placeKey = (target: RuntimeStudyTarget, kind: HomeContinuePlaceKind): string => `${lastOpenedLessonKey(target)}__continue_${kind}`;

// ключ памяти: изучаемый язык (null/undefined = как у lastOpenedLessonKey, английский)
const tk = (target: RuntimeStudyTarget): string => String(target ?? 'en');
const memory = new Map<string, HomeContinueMarks>();
const listeners = new Set<() => void>();
const emit = (): void => { listeners.forEach((l) => l()); };

onAccountOwnerChanged('home_continue_mark', () => {
  memory.clear();
  emit();
  void AsyncStorage.multiRemove(TARGETS.flatMap((t) => [v2Key(t), legacyAtKey(t), placeKey(t, 'dialog'), placeKey(t, 'cards')])).catch((error: unknown) => {
    console.warn(`${LOG} mark: ключи прошлого аккаунта не удалились (${error instanceof Error ? error.message : String(error)})`);
  });
});

function parseV2(raw: string | null): HomeContinueV2Mark | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<HomeContinueV2Mark>;
    const ok = Number.isInteger(v.lessonOrdinal) && Number.isInteger(v.sessionOrdinal) && typeof v.sessionId === 'string'
      && Number.isFinite(v.atMs) && v.route && typeof v.route === 'object';
    if (!ok) { console.warn(`${LOG} mark: метка V2 битая — игнорируем`); return null; }
    // зачем: метки первой версии P23 несли done/total — берём только нужные поля
    return { lessonOrdinal: v.lessonOrdinal!, sessionOrdinal: v.sessionOrdinal!, sessionId: v.sessionId!, route: v.route!, atMs: v.atMs! };
  } catch (error) {
    console.warn(`${LOG} mark: метка V2 не читается (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

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
  const known = memory.get(tk(target));
  if (known) return known;
  try {
    const pairs = await AsyncStorage.multiGet([v2Key(target), legacyAtKey(target), placeKey(target, 'dialog'), placeKey(target, 'cards')]);
    const at = Number(pairs[1]?.[1]);
    const marks: HomeContinueMarks = {
      v2: parseV2(pairs[0]?.[1] ?? null),
      legacyAtMs: Number.isFinite(at) && at > 0 ? at : null,
      dialog: parsePlace(pairs[2]?.[1] ?? null, 'dialog'),
      cards: parsePlace(pairs[3]?.[1] ?? null, 'cards'),
    };
    if (!memory.has(tk(target))) memory.set(tk(target), marks);
    return memory.get(tk(target))!;
  } catch (error) {
    console.warn(`${LOG} mark: чтение меток не удалось — карточка по старому уроку (${error instanceof Error ? error.message : String(error)})`);
    return { v2: null, legacyAtMs: null };
  }
}

function write(target: RuntimeStudyTarget, next: HomeContinueMarks, persist: () => Promise<void>, what: string): void {
  memory.set(tk(target), next);
  emit();
  persist().catch((error: unknown) => {
    console.warn(`${LOG} mark: ${what} — не записалось на диск, до перезапуска работает из памяти (${error instanceof Error ? error.message : String(error)})`);
  });
}

/** Запуск/продолжение занятия V2. */
export function recordHomeContinueV2(target: RuntimeStudyTarget, mark: HomeContinueV2Mark): void {
  const prev = memory.get(tk(target)) ?? { v2: null, legacyAtMs: null };
  console.log(`${LOG} mark: V2 урок ${mark.lessonOrdinal} занятие ${mark.sessionOrdinal} target=${target}`);
  write(target, { ...prev, v2: mark }, () => AsyncStorage.setItem(v2Key(target), JSON.stringify(mark)), 'метка V2'); // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
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
  const prev = memory.get(tk(target)) ?? { v2: null, legacyAtMs: null };
  console.log(`${LOG} mark: ${kind} id=${mark.id} путь=${mark.route.pathname} target=${target}`);
  write(target, { ...prev, [kind]: mark }, () => AsyncStorage.setItem(placeKey(target, kind), JSON.stringify(mark)), `метка «${kind}»`); // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
}

/** Открыт старый урок — время рядом с lastOpenedLessonKey. */
export function recordHomeContinueLegacy(target: RuntimeStudyTarget, atMs: number = Date.now()): void {
  const prev = memory.get(tk(target)) ?? { v2: null, legacyAtMs: null };
  write(target, { ...prev, legacyAtMs: atMs }, () => AsyncStorage.setItem(legacyAtKey(target), String(atMs)), 'время старого урока'); // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
}

export type HomeContinueReason = 'none' | 'legacy_only' | 'v2_only' | 'v2_newer' | 'legacy_newer' | 'dialog_only' | 'cards_only' | 'dialog_newer' | 'cards_newer';
export type HomeContinueChoice = Readonly<{ kind: 'legacy' | 'v2' | 'dialog' | 'cards' | 'none'; reason: HomeContinueReason }>;
export type HomeContinueInput = Readonly<{
  hasLegacyLesson: boolean;
  legacyAtMs: number | null;
  v2: HomeContinueV2Mark | null;
  /** Уже проверенные на устаревание (resolveHomeContinuePlaces); не заданы — как раньше, только уроки. */
  dialog?: HomeContinuePlaceMark | null;
  cards?: HomeContinuePlaceMark | null;
}>;

/**
 * Что показать: то, что свежее. Старый урок без метки времени (открыт до этой версии) считается старым (время 0) —
 * свежее занятие V2 его обгоняет; без V2 карточка, как раньше, по старому уроку.
 */
export function pickHomeContinue(input: HomeContinueInput): HomeContinueChoice {
  const { hasLegacyLesson, legacyAtMs, v2, dialog = null, cards = null } = input;
  // зачем (слово владельца 17.10): кроме урока — диалог и набор карточек; побеждает самое свежее, при равном времени порядок V2 > диалог > карточки > старый урок
  const candidates: { kind: 'legacy' | 'v2' | 'dialog' | 'cards'; at: number; rank: number }[] = [];
  if (v2) candidates.push({ kind: 'v2', at: v2.atMs, rank: 3 });
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
    : triLang(lang, { ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas', 'pt-BR': 'Cartões', vi: 'Thẻ học', id: 'Kartu', tr: 'Kartlar', pl: 'Karty' });
}

/** Заголовок карточки, когда меток нет вовсе (первый запуск): «Начать урок 1» — новые уроки. */
export function homeContinueStartTitle(lang: Lang): string {
  return triLang(lang, { ru: 'Начать урок 1', uk: 'Почати урок 1', en: 'Start lesson 1', es: 'Empezar la lección 1', 'pt-BR': 'Começar a lição 1', vi: 'Bắt đầu bài 1', id: 'Mulai pelajaran 1', tr: '1. derse başla', pl: 'Zacznij lekcję 1' });
}

/** Журнал решения: что выбрано и почему, с временем обеих меток. */
const REASON_TEXT: Readonly<Record<HomeContinueReason, string>> = {
  none: 'нет ни урока, ни занятия V2, ни диалога, ни карточек — «Начать урок 1»', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  legacy_only: 'только старый урок', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  v2_only: 'только V2', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  v2_newer: 'V2 свежее', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  legacy_newer: 'старый урок свежее', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  dialog_only: 'только диалог', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  cards_only: 'только карточки', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  dialog_newer: 'диалог свежее', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  cards_newer: 'карточки свежее', // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
};

export function logHomeContinueChoice(choice: HomeContinueChoice, input: HomeContinueInput, target: string): void {
  const v2 = input.v2;
  const place = (m: HomeContinuePlaceMark | null | undefined) => (m ? `${m.atMs} (${m.id})` : 'нет');
  console.log(`${LOG} выбор=${choice.kind} причина=${REASON_TEXT[choice.reason]} время: старый=${input.hasLegacyLesson ? (input.legacyAtMs ?? 'нет метки') : 'нет урока'} V2=${v2 ? `${v2.atMs} (урок ${v2.lessonOrdinal}, занятие ${v2.sessionOrdinal})` : 'нет'} диалог=${place(input.dialog)} карточки=${place(input.cards)} target=${target}`); // guard-ok: журнал решения карточки
}

/**
 * Заголовок карточки для занятия V2 — как на вкладке «Уроки»: авторское название (план курса пока только по-русски), иначе «Занятие N».
 * Модуль названий (~16 КБ) грузится лениво — только когда карточка действительно показывает V2 (холодный старт Главной не платит).
 */
export function homeContinueV2Title(lang: Lang, lessonOrdinal: number, sessionOrdinal: number): string {
  if (lang === 'ru') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { learningV2SessionTitleV1 } = require('../modules/learning-v2/content/session_titles_v1.generated') as typeof import('../modules/learning-v2/content/session_titles_v1.generated');
      const authored = learningV2SessionTitleV1(lessonOrdinal, sessionOrdinal);
      if (authored) return authored;
    } catch (error) {
      console.warn(`${LOG} title: модуль названий не загрузился — номер занятия (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  return `${triLang(lang, { ru: 'Занятие', en: 'Session', uk: 'Заняття', es: 'Sesión', 'pt-BR': 'Sessão', vi: 'Buổi', id: 'Sesi', tr: 'Oturum', pl: 'Zajęcia' })} ${sessionOrdinal}`; // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
}

export function useHomeContinueMarks(target: RuntimeStudyTarget): HomeContinueMarks {
  const [marks, setMarks] = useState<HomeContinueMarks>(() => peekHomeContinueMarks(target) ?? { v2: null, legacyAtMs: null });
  useEffect(() => {
    let alive = true;
    const sync = () => { const m = peekHomeContinueMarks(target); if (m && alive) setMarks(m); };
    listeners.add(sync);
    void loadHomeContinueMarks(target).then((m) => { if (alive) setMarks(m); });
    return () => { alive = false; listeners.delete(sync); };
  }, [target]);
  return marks;
}

export function resetHomeContinueMarksForTests(): void {
  memory.clear();
  listeners.clear();
}

export default function __RouteShim() { return null; }
