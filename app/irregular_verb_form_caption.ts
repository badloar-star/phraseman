// irregular_verb_form_caption.ts — подпись формы неправильного глагола («прошлое», «причастие», «настоящее») для «Моих ошибок».
// зачем (жалоба 23.10 №11: «Уходить/оставлять» → ответ Left, «непонятно, откуда задание»): с 13.10 упражнение «Неправильные
// глаголы» кладёт в ошибку подпись формы, но ошибки, записанные раньше, её не несут — тренировка показывала голый перевод
// глагола, а ждала прошедшую форму. Форма лежит в самом id задания (`leave:past`), поэтому подпись восстанавливается.
// Строки те же, что в app/lesson_irregular_verbs.tsx (verbTenseCaptions).
import { triLang, type Lang } from '../constants/i18n';

export type IrregularVerbFormV1 = 'base' | 'past' | 'pp';

export function irregularVerbFormCaptionV1(lang: Lang, form: IrregularVerbFormV1): string {
  if (form === 'past') return triLang(lang, { ru: 'прошлое', uk: 'минуле', en: 'past', es: 'pasado', 'pt-BR': 'passado', vi: 'quá khứ', id: 'lampau', tr: 'geçmiş', pl: 'przeszły' });
  if (form === 'pp') return triLang(lang, { ru: 'причастие', uk: 'дієприкметник', en: 'participle', es: 'participio', 'pt-BR': 'particípio', vi: 'phân từ', id: 'partisip', tr: 'ortaç', pl: 'imiesłów' });
  return triLang(lang, { ru: 'настоящее', uk: 'теперішнє', en: 'present', es: 'presente', 'pt-BR': 'presente', vi: 'hiện tại', id: 'sekarang', tr: 'şimdiki', pl: 'teraźniejszy' });
}

/** Форма из id задания «Неправильных глаголов» (`<глагол>:<форма>`); не тот формат — null. */
export function irregularVerbFormFromSourceIdV1(sourceId: string | null | undefined): IrregularVerbFormV1 | null {
  const form = String(sourceId ?? '').split(':').pop();
  return form === 'past' || form === 'pp' || form === 'base' ? form : null;
}

/** Задание для старой ошибки без подписи: «перевод — форма». Не получилось — null (остаётся прежний вид). */
export function irregularVerbLegacyPromptV1(
  item: Readonly<{ sourceKind?: string | null; sourcePrompt?: string | null; sourceId?: string | null; sourceMeaning?: string | null }>,
  lang: Lang,
): string | null {
  if (item.sourceKind !== 'irregular_verb' || item.sourcePrompt?.trim()) return null;
  const form = irregularVerbFormFromSourceIdV1(item.sourceId);
  const meaning = item.sourceMeaning?.trim();
  if (!form || !meaning) return null;
  return `${meaning} — ${irregularVerbFormCaptionV1(lang, form)}`;
}

export default function __RouteShim() { return null; }
