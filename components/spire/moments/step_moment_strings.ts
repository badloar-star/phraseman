// ═══════════════════════════════════════════════════════════════════════════
// step_moment_strings.ts — тексты моментов m06 «Ступень пройдена / не пройдена» и m07 «Этаж пройден / Вершина», 9 языков (то, чего нет в spire_game_strings).
//
// зачем (владелец 14.10: «перенести точно по макетам»; ТЗ ETALON_MOMENTS_V3_TRANSFER m06; образец engagement-moments-v3-all.html `stepPass3` / `stepFail3`): остальные строки (без ошибок, ошибок: N, {k} из {n} на этаже,
// сердца, «Дальше», «Позже»…) берутся из spire_game_strings — один источник правды. Реплики монеты («Чисто!», «Ещё раз?») — облачко образца, не описание монеты как живой. Переводы кроме RU — предложение.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { glueNumbers } from '../../moments/glue_numbers';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  ofTasks: ['{ok} из {all}', '{ok} з {all}', '{ok} of {all}', '{ok} de {all}', '{ok} de {all}', '{ok}/{all}', '{ok} dari {all}', '{ok}/{all}', '{ok} z {all}'],
  ofBudget: ['из {t}', 'з {t}', 'of {t}', 'de {t}', 'de {t}', '/ {t}', 'dari {t}', '/ {t}', 'z {t}'],
  clean: ['Чисто!', 'Чисто!', 'Clean!', '¡Limpio!', 'Limpo!', 'Sạch!', 'Bersih!', 'Temiz!', 'Czysto!'],
  failHearts: ['3 ошибки — ступень не пройдена', 'Сходинку не пройдено', '3 mistakes — step not cleared', '3 errores: escalón no superado', '3 erros — degrau não concluído', '3 lỗi — chưa qua bậc', '3 salah — anak tangga belum lewat', '3 hata — basamak geçilmedi', '3 błędy — stopień niezaliczony'],
  retrySet: ['Ещё раз — другой набор', 'Ще раз — інший набір', 'Try again — a new set', 'Otra vez — otro conjunto', 'Outro conjunto', 'Làm lại — bộ khác', 'Lagi — set lain', 'Tekrar — başka set', 'Inny zestaw'],
  // зачем (владелец 18.10 через координатора): после ступени две кнопки — «Следующее задание» и «В раздел Пик»; переводы кроме RU — предложение, ревью — «Переводчик»
  nextTask: ['Следующее задание', 'Наступне завдання', 'Next task', 'Siguiente tarea', 'Próxima tarefa', 'Nhiệm vụ tiếp theo', 'Tugas berikutnya', 'Sonraki görev', 'Następne zadanie'],
  toSpire: ['В раздел Пик', 'У розділ Пік', 'Back to Peak', 'Al Pico', 'Para o Pico', 'Về Đỉnh', 'Ke Puncak', "Zirve'ye", 'Do Szczytu'],
  toTower: ['К башне', 'До вежі', 'To the tower', 'A la torre', 'À torre', 'Về tháp', 'Ke menara', 'Kuleye', 'Do wieży'],
  toFloor: ['На {n} этаж', 'На {n} поверх', 'To floor {n}', 'Al piso {n}', 'Ao andar {n}', 'Lên tầng {n}', 'Ke lantai {n}', '{n}. kata', 'Na piętro {n}'],
  rest: ['Передохнуть', 'Перепочити', 'Take a break', 'Descansar', 'Descansar', 'Nghỉ một chút', 'Istirahat', 'Mola ver', 'Odpocznij'],
  floorN: ['{n} этаж', '{n} поверх', 'Floor {n}', 'Piso {n}', 'Andar {n}', 'Tầng {n}', 'Lantai {n}', 'Kat {n}', 'Piętro {n}'],
  summitBonus: ['+{n} монет за вершину', '+{n} монет за вершину', '+{n} coins for the summit', '+{n} monedas por la cima', '+{n} moedas pelo topo', '+{n} xu vì lên đỉnh', '+{n} koin untuk puncak', 'Zirve için +{n} jeton', '+{n} monet za szczyt'],
  againQ: ['Ещё раз?', 'Ще раз?', 'Again?', '¿Otra vez?', 'De novo?', 'Làm lại?', 'Lagi?', 'Tekrar?', 'Jeszcze raz?'],
} as const satisfies Readonly<Record<string, Nine>>;

export type StepMomentStringKey = keyof typeof S;
export const STEP_MOMENT_STRING_KEYS = Object.keys(S) as readonly StepMomentStringKey[];
export const STEP_MOMENT_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Текст на языке интерфейса; `{ключ}` заменяется значением из vars. Неизвестный язык — английский. */
export function stepMomentText(lang: Lang, key: StepMomentStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const raw = (S[key] as Nine)[LANG_INDEX[lang] ?? LANG_INDEX.en];
  if (!vars) return raw;
  // зачем (координатор 18.10, длинные языки): число не отрывается от слова при переносе — неразрывный пробел на подстановке, текст не меняется
  return glueNumbers(raw.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole)));
}
