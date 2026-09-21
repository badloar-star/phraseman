import type { Lang } from '../constants/i18n';

// ─── Словарь тонов ActionToast ───
// зачем: сторож i18n (scripts/scan_untranslated_ui.mjs) считает объект тонов
// с полями ru/uk/es/... непереведённым UI, если эти поля не лежат внутри
// словаря переводов (const RU = {...} рядом с const UK: typeof RU = {...})
// или вызова triLang/pickLang/localized. Вынесено сюда без изменения ни
// одного слова перевода — только форма хранения.
const RU = {
  success: 'Готово',
  error: 'Что-то пошло не так',
  // зачем (аудит по Библии, 2026-08-26): «Инфо» — служебная аббревиатура.
  // Заголовок стоит НАД сообщением и сопровождает любые нейтральные тосты
  // («Друг убран из списка», «Буст включён»), поэтому «Подсказка» врала бы:
  // это не совет, а факт. «Готово» тоже не подходит — тон занят success.
  info: 'Сообщение',
  warning: 'Внимание',
  reward: 'Награда',
};

const UK: typeof RU = {
  success: 'Готово',
  error: 'Щось пішло не так',
  info: 'Повідомлення',
  warning: 'Увага',
  reward: 'Нагорода',
};

const EN: typeof RU = {
  success: 'Done',
  error: 'Something went wrong',
  info: 'Message',
  warning: 'Attention',
  reward: 'Reward',
};

const ES: typeof RU = {
  success: 'Listo',
  error: 'Algo salió mal',
  info: 'Aviso',
  warning: 'Atención',
  reward: 'Premio',
};

const PT_BR: typeof RU = {
  success: 'Pronto',
  error: 'Algo deu errado',
  info: 'Aviso',
  warning: 'Atenção',
  reward: 'Prêmio',
};

const VI: typeof RU = {
  success: 'Xong',
  error: 'Có lỗi xảy ra',
  info: 'Lưu ý',
  warning: 'Chú ý',
  reward: 'Phần thưởng',
};

const ID: typeof RU = {
  success: 'Selesai',
  error: 'Ada yang salah',
  info: 'Catatan',
  warning: 'Perhatian',
  reward: 'Hadiah',
};

const TR: typeof RU = {
  success: 'Tamam',
  error: 'Bir şeyler ters gitti',
  info: 'Not',
  warning: 'Dikkat',
  reward: 'Ödül',
};

const PL: typeof RU = {
  success: 'Gotowe',
  // зачем (аудит по Библии, 2026-08-26): было 'Błąd' = «Ошибка». Все семь
  // остальных языков говорят по-человечески («что-то пошло не так»), и только
  // польский остался сухим термином — Часть V п.6 Библии запрещает слово «ошибка».
  error: 'Coś poszło nie tak',
  info: 'Uwaga',
  warning: 'Uwaga',
  reward: 'Nagroda',
};

export type ActionToastToneKey = keyof typeof RU;

/** Ключ тона → метка тоста на всех восьми языках. */
export function actionToastToneLabel(kind: ActionToastToneKey): Record<string, string> {
  return {
    ru: RU[kind],
    uk: UK[kind],
    en: EN[kind],
    es: ES[kind],
    'pt-BR': PT_BR[kind],
    vi: VI[kind],
    id: ID[kind],
    tr: TR[kind],
    pl: PL[kind],
  };
}

export type LocalizedActionToastMessage = Readonly<{
  type: ActionToastToneKey;
  messageRu: string;
  messageUk?: string;
  messageEn?: string;
  messageEs?: string;
  messagePtBr?: string;
  messageVi?: string;
  messageId?: string;
  messageTr?: string;
  messagePl?: string;
}>;

export function resolveActionToastMessage(
  toast: LocalizedActionToastMessage,
  lang: Lang,
): string {
  const esFallback = toast.type === 'error'
    ? 'Algo salió mal.'
    : toast.type === 'success'
      ? 'Hecho.'
      : toast.type === 'reward'
        ? '¡Premio!'
        : toast.type === 'warning'
          ? 'Atención.'
          : 'Listo.';
  if (lang === 'uk') return toast.messageUk ?? toast.messageRu;
  if (lang === 'en') return toast.messageEn ?? toast.messageRu;
  if (lang === 'es') return toast.messageEs ?? esFallback;
  if (lang === 'pt-BR') return toast.messagePtBr ?? toast.messageRu;
  if (lang === 'vi') return toast.messageVi ?? toast.messageRu;
  if (lang === 'id') return toast.messageId ?? toast.messageRu;
  if (lang === 'tr') return toast.messageTr ?? toast.messageRu;
  if (lang === 'pl') return toast.messagePl ?? toast.messageRu;
  return toast.messageRu;
}

/** Подпись кнопки-действия в тосте. Те же правила отката, что у сообщения. */
export type LocalizedActionToastAction = Readonly<{
  labelRu: string;
  labelUk?: string;
  labelEn?: string;
  labelEs?: string;
  labelPtBr?: string;
  labelVi?: string;
  labelId?: string;
  labelTr?: string;
  labelPl?: string;
}>;

export function resolveActionToastActionLabel(
  action: LocalizedActionToastAction,
  lang: Lang,
): string {
  if (lang === 'uk') return action.labelUk ?? action.labelRu;
  if (lang === 'en') return action.labelEn ?? action.labelRu;
  if (lang === 'es') return action.labelEs ?? action.labelRu;
  if (lang === 'pt-BR') return action.labelPtBr ?? action.labelRu;
  if (lang === 'vi') return action.labelVi ?? action.labelRu;
  if (lang === 'id') return action.labelId ?? action.labelRu;
  if (lang === 'tr') return action.labelTr ?? action.labelRu;
  if (lang === 'pl') return action.labelPl ?? action.labelRu;
  return action.labelRu;
}
