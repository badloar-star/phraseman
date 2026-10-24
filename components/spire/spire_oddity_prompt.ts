/**
 * Фраза-подсказка задания Шпиля «Найди лишнее» (find_oddity) на языке интерфейса.
 *
 * зачем (координатор 11.10, первый выпуск): сервер кладёт в payload.phrase русский promptRu пула на «вы»
 * («Найдите фразу с ошибкой согласования.») — человек с интерфейсом uk/es/pt-BR… видел русскую строку, да ещё с
 * грамматическим термином. Во всех 4 пулах (es/de/fr/it, 1260 заданий) шаблон ОДИН, поэтому таблица на клиенте:
 * шаблон → строка на «ты» без терминов, как в образце («Найди фразу, которую нужно исправить.»).
 * Незнакомый шаблон → та же общая строка на языке интерфейса + предупреждение [SPIRE-ODDITY-PROMPT] (один раз).
 * Сервер не меняется.
 */
import { triLang, type Lang } from '../../constants/i18n';

type OddityCopy = { ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string };

const FIND_PHRASE_TO_FIX: OddityCopy = {
  ru: 'Найди фразу, которую нужно исправить.',
  uk: 'Знайди вислів, який треба виправити.',
  en: 'Find the phrase that needs fixing.',
  es: 'Encuentra la frase que hay que corregir.',
  'pt-BR': 'Encontre a frase que precisa ser corrigida.',
  vi: 'Tìm câu cần sửa.',
  id: 'Temukan frasa yang perlu diperbaiki.',
  tr: 'Düzeltilmesi gereken ifadeyi bul.',
  pl: 'Znajdź zdanie, które trzeba poprawić.',
};

/** Шаблоны promptRu пулов → строка интерфейса. Новый шаблон в пуле — добавить сюда (тест сверяет с пулами). */
export const SPIRE_ODDITY_PROMPT_TEMPLATES: Readonly<Record<string, OddityCopy>> = Object.freeze({
  'Найдите фразу с ошибкой согласования.': FIND_PHRASE_TO_FIX,
  // Английский пул (functions/src/tournament_pool_v11_oddity.ts) кладёт инструкцию в prompt.
  'Найдите предложение с грамматической ошибкой.': FIND_PHRASE_TO_FIX,
  // зачем (Переводчик 24.10, скан 315 облачных заданий tpool_20260801_v10): у всех этот шаблон — без строки здесь каждый
  // запуск писал [SPIRE-ODDITY-PROMPT] «незнакомый шаблон», хотя текст на экране и так верный.
  'Найдите фразу, которую нужно исправить.': FIND_PHRASE_TO_FIX,
});

/**
 * Варианты «Найди ошибку» с заглавной первой буквой.
 * зачем (Переводчик 24.10, 13 облачных заданий): ошибочный вариант начинался со строчной («he am…»), три остальных — с
 * заглавной, и ответ угадывался по форме. Чиним показ на телефоне (облако правим после релиза): только первая буква, остальное
 * как есть. Проверка ответа идёт по номеру варианта (selectedIndex), текст на неё не влияет.
 */
export function capitalizeSpireOddityOptions(taskId: string, options: readonly string[]): string[] {
  let fixed = 0;
  const out = options.map((option) => {
    const first = option.charAt(0);
    const upper = first.toLocaleUpperCase('en-US');
    if (first === upper) return option;
    fixed += 1;
    return upper + option.slice(1);
  });
  if (fixed > 0) console.log('[SPIRE-ODDITY-CASE]', JSON.stringify({ taskId, fixed, total: options.length })); // guard-ok: только когда поправлено
  return out;
}

const warned = new Set<string>();

export function isKnownSpireOddityTemplate(raw: string): boolean {
  return Object.prototype.hasOwnProperty.call(SPIRE_ODDITY_PROMPT_TEMPLATES, raw.trim());
}

export function localizeSpireOddityPrompt(raw: unknown, lang: Lang): string {
  const template = typeof raw === 'string' ? raw.trim() : '';
  const copy = SPIRE_ODDITY_PROMPT_TEMPLATES[template];
  if (copy) return triLang(lang, copy);
  if (!warned.has(template)) {
    warned.add(template);
    console.warn('[SPIRE-ODDITY-PROMPT] незнакомый шаблон — показываю общую строку', JSON.stringify({ template, lang }));
  }
  return triLang(lang, FIND_PHRASE_TO_FIX);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
