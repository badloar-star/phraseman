// ═══════════════════════════════════════════════════════════════════════════
// first_dialog_strings.ts — тексты момента m17 «Первый диалог пройден», 9 языков.
//
// зачем (владелец 14.10: «перенести точно по макетам», «тексты под изучаемый язык»; ТЗ ETALON_MOMENTS_V3_TRANSFER m17; образец engagement-moments-v3-all.html `first3`): заголовок «Первый разговор по-английски — есть!» —
// язык вставляется из constants/study_language_words.ts (studyLanguageWord(ui, study, 'adv'): «по-английски / по-испански / …» на всех 9 языках интерфейса), поэтому в шаблонах стоит {adv}, а не слово «английский».
// Нейтральные по роду формулировки («Получилось!», не «Получилась»). «6 реплик · 5 заданий из 5» со склонением слов (firstDialogStats). Переводы кроме RU — предложение, носителем не проверены.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../constants/i18n';
import { pluralWord, type PluralForms } from '../../constants/plural';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  overline: ['Первый диалог', 'Перший діалог', 'First dialogue', 'Primer diálogo', 'Primeiro diálogo', 'Cuộc đối thoại đầu tiên', 'Dialog pertama', 'İlk diyalog', 'Pierwszy dialog'],
  title: ['Первый разговор {adv} — есть!', 'Перша розмова {adv} — є!', 'Your first conversation {adv} — done!', 'Primera conversación {adv}: ¡hecho!', 'Primeira conversa {adv} — concluída!', 'Cuộc trò chuyện đầu tiên {adv} — xong!', 'Percakapan pertama {adv} — selesai!', 'İlk konuşma {adv} — tamam!', 'Pierwsza rozmowa {adv} — zaliczona!'],
  say: ['Получилось!', 'Вийшло!', 'You did it!', '¡Lo lograste!', 'Deu certo!', 'Được rồi!', 'Berhasil!', 'Başardın!', 'Udało się!'],
  next: ['Следующий сценарий', 'Наступний сценарій', 'Next scenario', 'Siguiente escenario', 'Próximo cenário', 'Kịch bản tiếp theo', 'Skenario berikutnya', 'Sonraki senaryo', 'Następny scenariusz'],
} as const satisfies Readonly<Record<string, Nine>>;

export type FirstDialogStringKey = keyof typeof S;
export const FIRST_DIALOG_STRING_KEYS = Object.keys(S) as readonly FirstDialogStringKey[];
export const FIRST_DIALOG_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Текст на языке интерфейса; `{ключ}` заменяется значением из vars. Неизвестный язык — английский. */
export function firstDialogText(lang: Lang, key: FirstDialogStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const raw = (S[key] as Nine)[LANG_INDEX[lang] ?? LANG_INDEX.en];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

// зачем (лист приёмки m17, решение координатора 15.10): строка итога «6 реплик · 5 заданий из 5» — слова согласуются с числом (ru/uk/pl — три формы, остальные — две), а не «Реплик: 6 · заданий 5 из 5».
// Числа приходят из итога диалога; строка собирается функцией, потому что порядок слов и союз «из» зависят от языка.
type Forms3 = readonly [string, string, string];
const TURN_WORD: Readonly<Record<string, Forms3>> = {
  ru: ['реплика', 'реплики', 'реплик'], uk: ['репліка', 'репліки', 'реплік'], pl: ['wypowiedź', 'wypowiedzi', 'wypowiedzi'],
  en: ['turn', 'turns', 'turns'], es: ['intervención', 'intervenciones', 'intervenciones'], 'pt-BR': ['fala', 'falas', 'falas'],
  vi: ['lượt nói', 'lượt nói', 'lượt nói'], id: ['giliran', 'giliran', 'giliran'], tr: ['replik', 'replik', 'replik'],
};
const GOAL_WORD: Readonly<Record<string, Forms3>> = {
  ru: ['задание', 'задания', 'заданий'], uk: ['завдання', 'завдання', 'завдань'], pl: ['zadanie', 'zadania', 'zadań'],
  en: ['goal', 'goals', 'goals'], es: ['objetivo', 'objetivos', 'objetivos'], 'pt-BR': ['meta', 'metas', 'metas'],
  vi: ['nhiệm vụ', 'nhiệm vụ', 'nhiệm vụ'], id: ['tugas', 'tugas', 'tugas'], tr: ['görev', 'görev', 'görev'],
};
const wordOf = (table: Readonly<Record<string, Forms3>>, lang: Lang, n: number): string => {
  const f = table[lang] ?? table.en!;
  const forms: PluralForms = { one: f[0], few: f[1], many: f[2] };
  return pluralWord(lang, n, forms);
};

/** «6 реплик · 5 заданий из 5» на языке интерфейса. */
export function firstDialogStats(lang: Lang, turns: number, done: number, all: number): string {
  const t = `${turns} ${wordOf(TURN_WORD, lang, turns)}`;
  switch (lang) {
    case 'ru': return `${t} · ${done} ${wordOf(GOAL_WORD, lang, done)} из ${all}`;
    case 'uk': return `${t} · ${done} ${wordOf(GOAL_WORD, lang, done)} з ${all}`;
    case 'pl': return `${t} · ${done} ${wordOf(GOAL_WORD, lang, done)} z ${all}`;
    case 'es': case 'pt-BR': return `${t} · ${done} de ${all} ${wordOf(GOAL_WORD, lang, all)}`;
    case 'vi': return `${t} · ${done}/${all} ${wordOf(GOAL_WORD, lang, all)}`;
    case 'id': return `${t} · ${done} dari ${all} ${wordOf(GOAL_WORD, lang, all)}`;
    case 'tr': return `${t} · ${done}/${all} ${wordOf(GOAL_WORD, lang, all)}`;
    default: return `${t} · ${done} of ${all} ${wordOf(GOAL_WORD, 'en', all)}`;
  }
}
