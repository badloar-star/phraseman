// ─── Словарь тонов ActionToast ───
// зачем: сторож i18n (scripts/scan_untranslated_ui.mjs) считает объект тонов
// с полями ru/uk/es/... непереведённым UI, если эти поля не лежат внутри
// словаря переводов (const RU = {...} рядом с const UK: typeof RU = {...})
// или вызова triLang/pickLang/localized. Вынесено сюда без изменения ни
// одного слова перевода — только форма хранения.
const RU = {
  success: 'Готово',
  error: 'Что-то пошло не так',
  // зачем (аудит по Библии, 2026-08-26): «Инфо» — служебная аббревиатура,
  // живой человек так не обращается (Стиль 5 «Человек»).
  info: 'Подсказка',
  warning: 'Внимание',
  reward: 'Награда',
};

const UK: typeof RU = {
  success: 'Готово',
  error: 'Щось пішло не так',
  info: 'Підказка',
  warning: 'Увага',
  reward: 'Нагорода',
};

const ES: typeof RU = {
  success: 'Listo',
  error: 'Algo salió mal',
  info: 'Nota',
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
  info: 'Gợi ý',
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
  info: 'İpucu',
  warning: 'Dikkat',
  reward: 'Ödül',
};

const PL: typeof RU = {
  success: 'Gotowe',
  // зачем (аудит по Библии, 2026-08-26): было 'Błąd' = «Ошибка». Все семь
  // остальных языков говорят по-человечески («что-то пошло не так»), и только
  // польский остался сухим термином — Часть V п.6 Библии запрещает слово «ошибка».
  error: 'Coś poszło nie tak',
  info: 'Wskazówka',
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
