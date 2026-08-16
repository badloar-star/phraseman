// ─── Словарь тонов ActionToast ───
// зачем: сторож i18n (scripts/scan_untranslated_ui.mjs) считает объект тонов
// с полями ru/uk/es/... непереведённым UI, если эти поля не лежат внутри
// словаря переводов (const RU = {...} рядом с const UK: typeof RU = {...})
// или вызова triLang/pickLang/localized. Вынесено сюда без изменения ни
// одного слова перевода — только форма хранения.
const RU = {
  success: 'Готово',
  error: 'Что-то пошло не так',
  info: 'Инфо',
  warning: 'Внимание',
  reward: 'Награда',
};

const UK: typeof RU = {
  success: 'Готово',
  error: 'Щось пішло не так',
  info: 'Інфо',
  warning: 'Увага',
  reward: 'Нагорода',
};

const ES: typeof RU = {
  success: 'Listo',
  error: 'Algo salió mal',
  info: 'Info',
  warning: 'Atención',
  reward: 'Premio',
};

const PT_BR: typeof RU = {
  success: 'Pronto',
  error: 'Algo deu errado',
  info: 'Info',
  warning: 'Atenção',
  reward: 'Prêmio',
};

const VI: typeof RU = {
  success: 'Xong',
  error: 'Có lỗi xảy ra',
  info: 'Tin',
  warning: 'Chú ý',
  reward: 'Phần thưởng',
};

const ID: typeof RU = {
  success: 'Selesai',
  error: 'Ada yang salah',
  info: 'Info',
  warning: 'Perhatian',
  reward: 'Hadiah',
};

const TR: typeof RU = {
  success: 'Tamam',
  error: 'Bir şeyler ters gitti',
  info: 'Bilgi',
  warning: 'Dikkat',
  reward: 'Ödül',
};

const PL: typeof RU = {
  success: 'Gotowe',
  error: 'Błąd',
  info: 'Info',
  warning: 'Uwaga',
  reward: 'Nagroda',
};

export type ActionToastToneKey = keyof typeof RU;

/** Ключ тона → метка тоста на всех восьми языках. */
export function actionToastToneLabel(kind: ActionToastToneKey): Record<string, string> {
  return {
    ru: RU[kind],
    uk: UK[kind],
    es: ES[kind],
    'pt-BR': PT_BR[kind],
    vi: VI[kind],
    id: ID[kind],
    tr: TR[kind],
    pl: PL[kind],
  };
}
