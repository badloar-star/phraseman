// ═══════════════════════════════════════════════════════════════════════════
// first_dialog_strings.ts — тексты момента m17 «Первый диалог пройден», 9 языков.
//
// зачем (владелец 14.10: «перенести точно по макетам», «тексты под изучаемый язык»; ТЗ ETALON_MOMENTS_V3_TRANSFER m17; образец engagement-moments-v3-all.html `first3`): заголовок «Первый разговор по-английски — есть!» —
// язык вставляется из constants/study_language_words.ts (studyLanguageWord(ui, study, 'adv'): «по-английски / по-испански / …» на всех 9 языках интерфейса), поэтому в шаблонах стоит {adv}, а не слово «английский».
// Нейтральные по роду формулировки («Получилось!», не «Получилась»). «6 реплик · 5 заданий из 5» без склонений: «Реплик: 6 · заданий 5 из 5». Переводы кроме RU — предложение, носителем не проверены.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  overline: ['Первый диалог', 'Перший діалог', 'First dialogue', 'Primer diálogo', 'Primeiro diálogo', 'Cuộc đối thoại đầu tiên', 'Dialog pertama', 'İlk diyalog', 'Pierwszy dialog'],
  title: ['Первый разговор {adv} — есть!', 'Перша розмова {adv} — є!', 'Your first conversation {adv} — done!', 'Primera conversación {adv}: ¡hecho!', 'Primeira conversa {adv} — feito!', 'Cuộc trò chuyện đầu tiên {adv} — xong!', 'Percakapan pertama {adv} — selesai!', 'İlk konuşma {adv} — tamam!', 'Pierwsza rozmowa {adv} — zrobione!'],
  say: ['Получилось!', 'Вийшло!', 'You did it!', '¡Lo lograste!', 'Deu certo!', 'Được rồi!', 'Berhasil!', 'Başardık!', 'Udało się!'],
  stats: ['Реплик: {turns} · заданий {done} из {all}', 'Реплік: {turns} · завдань {done} з {all}', 'Turns: {turns} · goals {done} of {all}', 'Intervenciones: {turns} · objetivos {done} de {all}', 'Falas: {turns} · metas {done} de {all}', 'Lượt nói: {turns} · nhiệm vụ {done}/{all}', 'Giliran: {turns} · tugas {done} dari {all}', 'Konuşma: {turns} · görev {done}/{all}', 'Wypowiedzi: {turns} · zadania {done} z {all}'],
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
