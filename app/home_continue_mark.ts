// ═══════════════════════════════════════════════════════════════════════════
// home_continue_mark.ts — что показать в карточке «Продолжить» на Главной: старый урок или занятие курса V2, смотря что СВЕЖЕЕ.
//
// зачем (Ревизор P23, координатор 15.10, задача до сборки): карточка знала только старые уроки (ключ lastOpenedLessonKey пишут lesson1 и
// lesson_menu). Кто занимался только курсом V2 — карточки не было; кто ушёл из старых уроков в V2 — карточка навсегда показывала старый
// «Урок N» и вела в старое меню. Теперь:
//   • запуск занятия V2 (вкладка «Уроки») пишет метку «последнее V2»: урок, занятие, «пройдено / выпущено» в уроке, параметры маршрута, время;
//   • старые уроки пишут время рядом со своим lastOpenedLessonKey;
//   • Главная выбирает свежее по времени (pickHomeContinue) и пишет решение в [HOME-CONTINUE].
// Только локально: AsyncStorage + память процесса для первого кадра, ни одного чтения/записи Firestore. Смена владельца аккаунта
// чистит память и свои ключи (иначе гость увидел бы занятие прошлого аккаунта).
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
  /** Пройдено занятий в уроке (на момент запуска / последней сверки вкладки «Уроки»). */
  done: number;
  /** Выпущено занятий в уроке. */
  total: number;
  /** Параметры маршрута /learning-v2/session/[id] — тап на Главной открывает то же занятие. */
  route: Readonly<Record<string, string>>;
  atMs: number;
}>;

export type HomeContinueMarks = Readonly<{ v2: HomeContinueV2Mark | null; legacyAtMs: number | null }>;

const v2Key = (target: RuntimeStudyTarget): string => `${lastOpenedLessonKey(target)}__continue_v2`;
const legacyAtKey = (target: RuntimeStudyTarget): string => `${lastOpenedLessonKey(target)}__continue_at`;

// ключ памяти: изучаемый язык (null/undefined = как у lastOpenedLessonKey, английский)
const tk = (target: RuntimeStudyTarget): string => String(target ?? 'en');
const memory = new Map<string, HomeContinueMarks>();
const listeners = new Set<() => void>();
const emit = (): void => { listeners.forEach((l) => l()); };

onAccountOwnerChanged('home_continue_mark', () => {
  memory.clear();
  emit();
  void AsyncStorage.multiRemove(TARGETS.flatMap((t) => [v2Key(t), legacyAtKey(t)])).catch((error: unknown) => {
    console.warn(`${LOG} mark: ключи прошлого аккаунта не удалились (${error instanceof Error ? error.message : String(error)})`);
  });
});

function parseV2(raw: string | null): HomeContinueV2Mark | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<HomeContinueV2Mark>;
    const ok = Number.isInteger(v.lessonOrdinal) && Number.isInteger(v.sessionOrdinal) && typeof v.sessionId === 'string'
      && Number.isFinite(v.done) && Number.isFinite(v.total) && Number.isFinite(v.atMs) && v.route && typeof v.route === 'object';
    if (!ok) { console.warn(`${LOG} mark: метка V2 битая — игнорируем`); return null; }
    return v as HomeContinueV2Mark;
  } catch (error) {
    console.warn(`${LOG} mark: метка V2 не читается (${error instanceof Error ? error.message : String(error)})`);
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
    const pairs = await AsyncStorage.multiGet([v2Key(target), legacyAtKey(target)]);
    const at = Number(pairs[1]?.[1]);
    const marks: HomeContinueMarks = { v2: parseV2(pairs[0]?.[1] ?? null), legacyAtMs: Number.isFinite(at) && at > 0 ? at : null };
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
  console.log(`${LOG} mark: V2 урок ${mark.lessonOrdinal} занятие ${mark.sessionOrdinal} (${mark.done}/${mark.total}) target=${target}`);
  write(target, { ...prev, v2: mark }, () => AsyncStorage.setItem(v2Key(target), JSON.stringify(mark)), 'метка V2');
}

/** Вкладка «Уроки» сверила прогресс курса — обновить «пройдено / выпущено» в метке того же урока (время не трогаем). */
export function refreshHomeContinueV2Progress(target: RuntimeStudyTarget, lessonOrdinal: number, done: number, total: number): void {
  const prev = memory.get(tk(target));
  const v2 = prev?.v2;
  if (!prev || !v2 || v2.lessonOrdinal !== lessonOrdinal || (v2.done === done && v2.total === total)) return;
  const next = { ...v2, done, total };
  write(target, { ...prev, v2: next }, () => AsyncStorage.setItem(v2Key(target), JSON.stringify(next)), 'прогресс V2');
}

/** Открыт старый урок — время рядом с lastOpenedLessonKey. */
export function recordHomeContinueLegacy(target: RuntimeStudyTarget, atMs: number = Date.now()): void {
  const prev = memory.get(tk(target)) ?? { v2: null, legacyAtMs: null };
  write(target, { ...prev, legacyAtMs: atMs }, () => AsyncStorage.setItem(legacyAtKey(target), String(atMs)), 'время старого урока');
}

export type HomeContinueReason = 'none' | 'legacy_only' | 'v2_only' | 'v2_newer' | 'legacy_newer';
export type HomeContinueChoice = Readonly<{ kind: 'legacy' | 'v2' | 'none'; reason: HomeContinueReason }>;
export type HomeContinueInput = Readonly<{ hasLegacyLesson: boolean; legacyAtMs: number | null; v2: HomeContinueV2Mark | null }>;

/**
 * Что показать: то, что свежее. Старый урок без метки времени (открыт до этой версии) считается старым (время 0) —
 * свежее занятие V2 его обгоняет; без V2 карточка, как раньше, по старому уроку.
 */
export function pickHomeContinue(input: HomeContinueInput): HomeContinueChoice {
  const { hasLegacyLesson, legacyAtMs, v2 } = input;
  if (!v2 && !hasLegacyLesson) return { kind: 'none', reason: 'none' };
  if (!v2) return { kind: 'legacy', reason: 'legacy_only' };
  if (!hasLegacyLesson) return { kind: 'v2', reason: 'v2_only' };
  return v2.atMs >= (legacyAtMs ?? 0) ? { kind: 'v2', reason: 'v2_newer' } : { kind: 'legacy', reason: 'legacy_newer' };
}

/** Журнал решения: что выбрано и почему, с временем обеих меток. */
export function logHomeContinueChoice(choice: HomeContinueChoice, input: HomeContinueInput, target: string): void {
  const v2 = input.v2;
  console.log(`${LOG} выбор=${choice.kind} причина=${choice.reason === 'none' ? 'нет ни старого урока, ни занятия V2' : choice.reason === 'legacy_only' ? 'только старый урок' : choice.reason === 'v2_only' ? 'только V2' : choice.reason === 'v2_newer' ? 'V2 свежее' : 'старый урок свежее'} время: старый=${input.hasLegacyLesson ? (input.legacyAtMs ?? 'нет метки') : 'нет урока'} V2=${v2 ? `${v2.atMs} (урок ${v2.lessonOrdinal}, занятие ${v2.sessionOrdinal}, ${v2.done}/${v2.total})` : 'нет'} target=${target}`); // guard-ok: журнал решения карточки
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
  return `${triLang(lang, { ru: 'Занятие', en: 'Session', uk: 'Заняття', es: 'Sesión', 'pt-BR': 'Sessão', vi: 'Buổi', id: 'Sesi', tr: 'Oturum', pl: 'Zajęcia' })} ${sessionOrdinal}`;
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
