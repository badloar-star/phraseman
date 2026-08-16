// ─── Словарь копирайта LeagueBonusBeaconOrb ───
// зачем: сторож i18n (scripts/scan_untranslated_ui.mjs) считает объект COPY
// с полями ru/uk/es/... непереведённым UI, если поля не лежат в словаре
// переводов (const RU = {...} рядом с const UK: typeof RU = {...}) или
// внутри вызова triLang/pickLang/localized. Вынесено сюда БЕЗ изменения ни
// одного слова перевода — только форма хранения (было: один объект на ключ
// со всеми языками на соседних строках; стало: один объект на язык).
const RU = {
  close: 'Закрыть окно бонуса',
  crown: 'Корона уже ждёт',
  ready: 'Бонус лиги готов',
  expires: 'Сундук ждёт в лиге · сгорит в воскресенье',
  dayLabel: 'День {d} из 7',
};

const UK: typeof RU = {
  close: 'Закрити вікно бонусу',
  crown: 'Корона вже чекає',
  ready: 'Бонус ліги готовий',
  expires: 'Скриня чекає в лізі · згорить у неділю',
  dayLabel: 'День {d} із 7',
};

const ES: typeof RU = {
  close: 'Cerrar ventana de bono',
  crown: 'La corona te espera',
  ready: 'Bono de liga listo',
  expires: 'El cofre espera en la liga · caduca el domingo',
  dayLabel: 'Día {d} de 7',
};

const PT_BR: typeof RU = {
  close: 'Fechar janela do bônus',
  crown: 'A coroa já está esperando',
  ready: 'Bônus da liga pronto',
  expires: 'O baú espera na liga · expira no domingo',
  dayLabel: 'Dia {d} de 7',
};

const VI: typeof RU = {
  close: 'Đóng cửa sổ thưởng',
  crown: 'Vương miện đang chờ bạn',
  ready: 'Thưởng giải đấu đã sẵn sàng',
  expires: 'Rương đang chờ trong giải đấu · hết hạn vào Chủ nhật',
  dayLabel: 'Ngày {d}/7',
};

const ID: typeof RU = {
  close: 'Tutup jendela bonus',
  crown: 'Mahkota sudah menunggu',
  ready: 'Bonus liga siap',
  expires: 'Peti menunggu di liga · berakhir hari Minggu',
  dayLabel: 'Hari {d} dari 7',
};

const TR: typeof RU = {
  close: 'Bonus penceresini kapat',
  crown: 'Taç seni bekliyor',
  ready: 'Lig bonusu hazır',
  expires: 'Sandık ligde bekliyor · pazar günü sona eriyor',
  dayLabel: '7 günden {d}.',
};

const PL: typeof RU = {
  close: 'Zamknij okno bonusu',
  crown: 'Korona już czeka',
  ready: 'Bonus ligi gotowy',
  expires: 'Skrzynia czeka w lidze · wygasa w niedzielę',
  dayLabel: 'Dzień {d} z 7',
};

type CopyKey = Exclude<keyof typeof RU, 'dayLabel'>;

const BY_LANG: Record<string, typeof RU> = {
  ru: RU, uk: UK, es: ES, 'pt-BR': PT_BR, vi: VI, id: ID, tr: TR, pl: PL,
};

export function leagueBonusBeaconCopy(kind: CopyKey, lang: string): string {
  const row = BY_LANG[lang] ?? RU;
  return row[kind];
}

export function leagueBonusBeaconDayLabel(lang: string, days: number): string {
  const row = BY_LANG[lang] ?? RU;
  return row.dayLabel.replace('{d}', String(days));
}
