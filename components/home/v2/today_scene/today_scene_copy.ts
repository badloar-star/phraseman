// ═══════════════════════════════════════════════════════════════════════════
// today_scene_copy.ts — тексты «Сегодня» в стиле «Сцена» (вариант A) на 9 языках интерфейса.
//
// зачем (эталон today-scene-concepts.html, таблица «Что когда на экране»; координатор 22.10): заголовок и строки сцены зависят от состояния.
// Название кнопки — это название следующего задания (его уже локализует useTodayTasks), поэтому здесь его нет. Переводы кроме RU — предложение,
// носителем не проверены (передать 10 · ПЕРЕВОДЧИК). Числа склоняются через constants/plural.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../../constants/i18n';
import { pluralWord, type PluralForms } from '../../../../constants/plural';
import type { TodayTaskKind } from '../home_v2_types';
import type { TodaySceneDecision } from './today_scene_state';

export type TodaySceneCopyInput = Readonly<{
  lang: Lang;
  decision: TodaySceneDecision;
  /** Виды ещё не выполненных заданий по порядку — для «Осталось: диалог и карточки». */
  remainingKinds: readonly TodayTaskKind[];
  streakDays: number;
  minutesToMidnight: number;
  /** Дата для надписи над заголовком; null — надписи нет (Intl недоступен). */
  dateLabel: string | null;
}>;

export type TodaySceneCopy = Readonly<{
  kicker: string;
  title: string;
  /** Строка под заголовком; null — нет. */
  line: string | null;
  /** Тёплая строка вечера с огоньком; null — нет. */
  warm: string | null;
  panelTitle: string;
  panelCount: string;
}>;

type Words = Readonly<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>>;
const tri = (lang: Lang, w: Words): string => triLang(lang, w);

// «N из M»
export function ofLine(lang: Lang, n: number, m: number): string {
  return tri(lang, { ru: `${n} из ${m}`, uk: `${n} з ${m}`, en: `${n} of ${m}`, es: `${n} de ${m}`, 'pt-BR': `${n} de ${m}`, vi: `${n}/${m}`, id: `${n} dari ${m}`, tr: `${n} / ${m}`, pl: `${n} z ${m}` });
}

// Существительные заданий в именительном падеже для «Осталось: …».
const NOUN: Readonly<Record<TodayTaskKind, Words>> = {
  lesson: { ru: 'урок', uk: 'урок', en: 'lesson', es: 'lección', 'pt-BR': 'lição', vi: 'bài học', id: 'pelajaran', tr: 'ders', pl: 'lekcja' },
  dialog: { ru: 'диалог', uk: 'діалог', en: 'dialogue', es: 'diálogo', 'pt-BR': 'diálogo', vi: 'hội thoại', id: 'dialog', tr: 'diyalog', pl: 'dialog' },
  cards: { ru: 'карточки', uk: 'картки', en: 'cards', es: 'tarjetas', 'pt-BR': 'cartões', vi: 'thẻ', id: 'kartu', tr: 'kartlar', pl: 'karty' },
  video: { ru: 'видео', uk: 'відео', en: 'video', es: 'vídeo', 'pt-BR': 'vídeo', vi: 'video', id: 'video', tr: 'video', pl: 'wideo' },
  mistakes: { ru: 'ошибки', uk: 'помилки', en: 'mistakes', es: 'errores', 'pt-BR': 'erros', vi: 'lỗi', id: 'kesalahan', tr: 'hatalar', pl: 'błędy' },
  spire_steps: { ru: 'ступени Пика', uk: 'сходинки Піку', en: 'Peak steps', es: 'escalones del Pico', 'pt-BR': 'degraus do Pico', vi: 'bậc Đỉnh', id: 'anak tangga Puncak', tr: 'Zirve basamakları', pl: 'stopnie Szczytu' },
};

const AND: Words = { ru: 'и', uk: 'і', en: 'and', es: 'y', 'pt-BR': 'e', vi: 'và', id: 'dan', tr: 've', pl: 'i' };

function joinNouns(lang: Lang, items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} ${tri(lang, AND)} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} ${tri(lang, AND)} ${items[items.length - 1]}`;
}

const DAYS_FORMS: Readonly<Record<'ru' | 'uk' | 'pl' | 'other', PluralForms>> = {
  ru: { one: 'день', few: 'дня', many: 'дней' },
  uk: { one: 'день', few: 'дні', many: 'днів' },
  pl: { one: 'dzień', few: 'dni', many: 'dni' },
  other: { one: 'day', few: 'days', many: 'days' },
};

function streakKicker(lang: Lang, days: number): string {
  const n = Math.max(0, Math.trunc(days));
  if (lang === 'ru') return `Серия ${n} ${pluralWord(lang, n, DAYS_FORMS.ru)}`;
  if (lang === 'uk') return `Серія ${n} ${pluralWord(lang, n, DAYS_FORMS.uk)}`;
  if (lang === 'pl') return `Seria ${n} ${pluralWord(lang, n, DAYS_FORMS.pl)}`;
  const one = n === 1;
  return tri(lang, {
    ru: '', uk: '', pl: '',
    en: `${n}-day streak`,
    es: `Racha de ${n} ${one ? 'día' : 'días'}`,
    'pt-BR': `Sequência de ${n} ${one ? 'dia' : 'dias'}`,
    vi: `Chuỗi ${n} ngày`,
    id: `Runtunan ${n} hari`,
    tr: `${n} günlük seri`,
  });
}

function midnightTitle(lang: Lang, minutes: number): string {
  const m = Math.max(0, Math.trunc(minutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const hm = (hs: string, ms: string): string => [h > 0 ? `${h} ${hs}` : '', mm > 0 || h === 0 ? `${mm} ${ms}` : ''].filter(Boolean).join(' ');
  // зачем (Сверка 22.10, как на сцене Главной): заголовок рвался «До полуночи 2 ч 20 / мин». Два куска — фраза и время; внутри куска пробелы неразрывные,
  // между кусками обычный: строка рвётся только там («До полуночи / 2 ч 20 мин»), короткое время остаётся в одну строку.
  const pair = triLang(lang, {
    ru: ['До полуночи', hm('ч', 'мин')],
    uk: ['До опівночі', hm('год', 'хв')],
    en: [hm('h', 'min'), 'until midnight'],
    es: [`Faltan ${hm('h', 'min')}`, 'para la medianoche'],
    'pt-BR': [`Faltam ${hm('h', 'min')}`, 'para a meia-noite'],
    vi: [`Còn ${hm('giờ', 'phút')}`, 'đến nửa đêm'],
    id: [hm('jam', 'mnt'), 'lagi sampai tengah malam'],
    tr: ['Gece yarısına', `${hm('sa', 'dk')} kaldı`],
    pl: ['Do północy', hm('godz.', 'min')],
  });
  return (pair as readonly string[]).map((chunk) => chunk.replace(/ /g, ' ')).join(' ');
}

/** Тексты сцены для решения pickTodaySceneState. Ничего не выдумывает: всё из заданий дня, серии и часов. */
export function buildTodaySceneCopy(i: TodaySceneCopyInput): TodaySceneCopy {
  const { lang, decision: d } = i;
  const panelTitle = tri(lang, { ru: 'Задания дня', uk: 'Завдання дня', en: "Today's tasks", es: 'Tareas del día', 'pt-BR': 'Tarefas do dia', vi: 'Nhiệm vụ hôm nay', id: 'Tugas hari ini', tr: 'Günün görevleri', pl: 'Zadania dnia' });
  const panelCount = ofLine(lang, d.doneCount, d.total);
  const base = { panelTitle, panelCount };
  const dateKicker = i.dateLabel ?? '';
  if (d.state === 'done') {
    return {
      ...base, kicker: dateKicker, title: ofLine(lang, d.doneCount, d.total),
      line: tri(lang, { ru: 'Все кольца замкнуты', uk: 'Усі кільця замкнено', en: 'All rings closed', es: 'Todos los anillos cerrados', 'pt-BR': 'Todos os anéis fechados', vi: 'Đã đóng mọi vòng', id: 'Semua cincin tertutup', tr: 'Tüm halkalar kapandı', pl: 'Wszystkie kółka zamknięte' }),
      warm: null,
    };
  }
  if (d.state === 'evening') {
    return {
      ...base, kicker: streakKicker(lang, i.streakDays), title: midnightTitle(lang, i.minutesToMidnight), line: null,
      warm: tri(lang, { ru: 'Одно занятие сохранит серию', uk: 'Одне заняття збереже серію', en: 'One lesson keeps your streak', es: 'Una lección mantiene tu racha', 'pt-BR': 'Uma lição mantém sua sequência', vi: 'Một bài học sẽ giữ chuỗi của bạn', id: 'Satu pelajaran menjaga runtunanmu', tr: 'Bir ders serini korur', pl: 'Jedna lekcja ocali serię' }),
    };
  }
  if (d.state === 'morning') {
    return {
      ...base, kicker: dateKicker, title: ofLine(lang, d.doneCount, d.total),
      line: tri(lang, {
        ru: `Заданий на сегодня: ${d.total}`, uk: `Завдань на сьогодні: ${d.total}`, en: `${d.total} tasks for today`, es: `${d.total} tareas para hoy`, 'pt-BR': `${d.total} tarefas para hoje`,
        vi: `${d.total} nhiệm vụ hôm nay`, id: `${d.total} tugas hari ini`, tr: `Bugün ${d.total} görev`, pl: `Zadań na dziś: ${d.total}`,
      }),
      warm: null,
    };
  }
  return { ...base, kicker: dateKicker, title: ofLine(lang, d.doneCount, d.total), line: todaySceneRemainingLine(lang, i.remainingKinds), warm: null };
}

/** «Осталось: диалог и карточки» — из видов ещё не выполненных заданий. Пустой список — null. */
export function todaySceneRemainingLine(lang: Lang, remainingKinds: readonly TodayTaskKind[]): string | null {
  if (remainingKinds.length === 0) return null;
  const nouns = remainingKinds.map((kind) => tri(lang, NOUN[kind]));
  const head = tri(lang, { ru: 'Осталось', uk: 'Залишилось', en: 'Left', es: 'Quedan', 'pt-BR': 'Faltam', vi: 'Còn lại', id: 'Tersisa', tr: 'Kalan', pl: 'Zostało' });
  return `${head}: ${joinNouns(lang, nouns)}`;
}
