/**
 * Название набора из имени исходного документа — без служебного хвоста файла.
 *
 * зачем (владелец, OWNER_REQUESTS_LEDGER строка 5; координатор 14:10): набор ролика собирается на сервере
 * из `sourceName`, а в админке это имя загруженного файла. В витрине люди видели
 * «Английский по-человечески — 500 фраз.docx». Одна функция на клиент и сервер: сервер чистит при записи,
 * маппер каталога — уже записанные документы при чтении (без миграции и записей в прод).
 *
 * Срезаем ТОЛЬКО хвост в конце строки: расширение документа и отметки копии от системы
 * («(1)», «- копия», «- Copy»). Середину названия не трогаем — там бывают точки и скобки по смыслу.
 */
const FILE_EXTENSION_TAIL = /\.(docx|doc|pdf|txt|csv|xlsx|xls|rtf|odt|pages|numbers|md)\s*$/i;
const COPY_NUMBER_TAIL = /\s*\(\d{1,3}\)\s*$/;
// зачем разделитель обязателен: «Hard copy» — честное название; отметка копии от Windows всегда через « - ».
const COPY_WORD_TAIL = /\s*[-–—_]\s*(копия|копія|copy|kopia|kopya|cópia|copia)\s*$/i;

/** Пустая строка — значит от названия ничего не осталось; вызывающий подставляет своё запасное имя. */
export function cleanPackSourceTitle(raw: unknown): string {
  let title = String(raw ?? '').replace(/\s+/g, ' ').trim();
  for (let pass = 0; pass < 3; pass += 1) {
    const next = title
      .replace(FILE_EXTENSION_TAIL, '')
      .replace(COPY_NUMBER_TAIL, '')
      .replace(COPY_WORD_TAIL, '')
      .trim();
    if (next === title) break;
    title = next;
  }
  return title;
}
