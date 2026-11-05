/**
 * Строки хаба «Карточки» — модель списка по утверждённому макету (владелец 05.11: «ХАБ ДЕЛАЕТ КАК МАКЕТ Я ОДОБРИЛ»).
 *
 * Эталон: docs/work/golden/approved-rev8/hub-community-approved-rev4.png и интерактивный макет approved-rev8
 * (views.js, `view === 'cards'`): пять строк сверху вниз — Сохранённые, Мои наборы, Из видео, Мои ошибки, Сообщество;
 * у каждой объёмный предмет слева, название и шеврон справа, подписи под названием нет.
 *
 * зачем отдельный файл: порядок, предметы и маршрут «Моих ошибок» — чистые данные без React; их сторожит
 * tests/cards_hub_list_layout_2026_11_05.test.ts, а вид (CardsHubV2) только рисует то, что здесь решено.
 */
import { triLang, type Lang } from '../../constants/i18n';
import type { ThemedArtName } from '../../components/theme/themed_art_registry';

export type CardsHubRowId = 'saved' | 'mine' | 'video' | 'mistakes' | 'community';

/** Порядок строк — ровно как в макете rev4 (сверху вниз). */
export const CARDS_HUB_ROW_ORDER: readonly CardsHubRowId[] = Object.freeze(['saved', 'mine', 'video', 'mistakes', 'community']);

/**
 * Предмет слева у каждой строки — те же имена, что в макете (`row(…, 'cards_empty_saved' | 'cards' | 'cards_from_video' |
 * 'mistakes_entry' | 'dialogs')`). Картинка берётся из реестра тем (тёмный/светлый комплект + слой цвета темы).
 */
export const CARDS_HUB_ROW_ART: Readonly<Record<CardsHubRowId, ThemedArtName>> = Object.freeze({
  saved: 'cards_empty_saved',
  mine: 'cards',
  video: 'cards_from_video',
  mistakes: 'mistakes_entry',
  community: 'dialogs',
});

/** «Мои ошибки» ведут туда же, куда плитка Главной (openHomeMistakesHub → '/mistakes_hub'). */
export const CARDS_HUB_MISTAKES_ROUTE = '/mistakes_hub';

/** Название строки «Мои ошибки» — те же слова, что у плитки Главной (9 языков). */
export function cardsHubMistakesTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Мои ошибки', uk: 'Мої помилки', en: 'My mistakes', es: 'Mis errores', 'pt-BR': 'Meus erros',
    vi: 'Lỗi của tôi', id: 'Kesalahanku', tr: 'Hatalarım', pl: 'Moje błędy',
  });
}

export type CardsHubRowInput = Readonly<{
  id: CardsHubRowId;
  title: string;
  /** Число для скринридера (на экране чисел нет — в макете строка без подписи). Пустая строка — ещё не известно. */
  count: string;
  unit?: string;
  onPress: () => void;
}>;

export type CardsHubRow = CardsHubRowInput & Readonly<{ art: ThemedArtName }>;

/**
 * Собирает строки в порядке макета. Строки, которой не пришло, нет — причина в журнал [CARDS-HUB]
 * (ранний выход логируется всегда: немой пропуск строки уже стоил бы потерянного раздела).
 */
export function buildCardsHubRows(inputs: readonly CardsHubRowInput[]): CardsHubRow[] {
  const byId = new Map(inputs.map((row) => [row.id, row] as const));
  const rows: CardsHubRow[] = [];
  for (const id of CARDS_HUB_ROW_ORDER) {
    const row = byId.get(id);
    if (!row) {
      console.warn('[CARDS-HUB] row missing', JSON.stringify({ id, got: inputs.map((r) => r.id) })); // guard-ok: строка макета не пришла — причина в журнал
      continue;
    }
    rows.push({ ...row, art: CARDS_HUB_ROW_ART[id] });
  }
  return rows;
}

/** Подпись строки для скринридера: «Сохранённые. карточек: 64»; число неизвестно — только название. */
export function cardsHubRowA11yLabel(row: Pick<CardsHubRowInput, 'title' | 'count' | 'unit'>): string {
  return row.count === '' ? row.title : `${row.title}. ${row.unit ? `${row.unit}: ` : ''}${row.count}`;
}
