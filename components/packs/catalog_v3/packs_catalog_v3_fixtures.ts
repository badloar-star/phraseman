// ═══════════════════════════════════════════════════════════════════════════
// packs_catalog_v3_fixtures.ts — моки каталога для dev-превью (только разработка): те же поля, что у наборов каталога, без сети и хранилища.
//
// зачем (координатор 26.10: «Сверка снимет на эмуляторе в 3–4 активных темах»): состояния снимаются по ссылке
//   /dev_packs_catalog_v3?state=full|few|empty|loading|me &theme=<id темы> &appearance=dark|light &sort=popular|new
// full — десять наборов, подиум полный; few — два набора (пустое третье место); empty — каталог пришёл пустым; loading — каталога ещё нет (скелет);
// me — как full, но один из лидеров — свой (своё место в блоке). Один набор «из прошлого месяца» с рекордом лайков — проверка, что он в конкурсе не участвует.
// ═══════════════════════════════════════════════════════════════════════════
import type { PacksCatalogV3Pack } from './PacksCatalogV3';

export const PACKS_CATALOG_V3_PREVIEW_STATES = ['full', 'few', 'empty', 'loading', 'me'] as const;
export type PacksCatalogV3PreviewState = (typeof PACKS_CATALOG_V3_PREVIEW_STATES)[number];

export function isPacksCatalogV3PreviewState(value: unknown): value is PacksCatalogV3PreviewState {
  return typeof value === 'string' && (PACKS_CATALOG_V3_PREVIEW_STATES as readonly string[]).includes(value);
}

/** Свой стабильный id в моках — для состояния «me». */
export const PACKS_CATALOG_V3_PREVIEW_ME = 'preview-me';

const HOUR_MS = 60 * 60 * 1000;

const ROWS: readonly Readonly<{ title: string; author: string; cards: number; likes: number }>[] = [
  { title: 'Английский в дороге', author: 'Марина К.', cards: 48, likes: 132 },
  { title: 'Слова для работы', author: 'Артём', cards: 36, likes: 97 },
  { title: 'Кухня и рестораны', author: 'Лена Т.', cards: 52, likes: 81 },
  { title: 'Фразовые глаголы без боли', author: 'Игорь', cards: 24, likes: 64 },
  { title: 'Путешествие по Лиссабону', author: 'Саша', cards: 30, likes: 40 },
  { title: 'Идиомы про погоду', author: 'Оля', cards: 18, likes: 33 },
  { title: 'Собеседование на английском', author: 'Дима', cards: 41, likes: 21 },
  { title: 'Здоровье и врач', author: 'Катя', cards: 27, likes: 12 },
  { title: 'Покупки и скидки', author: 'Влад', cards: 22, likes: 7 },
  { title: 'Первые 100 слов', author: 'Аня', cards: 100, likes: 2 },
];

export function packsCatalogV3Fixtures(state: PacksCatalogV3PreviewState, nowMs: number): { packs: PacksCatalogV3Pack[]; loaded: boolean; myStableId: string | null } {
  if (state === 'loading') return { packs: [], loaded: false, myStableId: null };
  if (state === 'empty') return { packs: [], loaded: true, myStableId: null };
  const monthStart = Date.UTC(new Date(nowMs).getUTCFullYear(), new Date(nowMs).getUTCMonth(), 1);
  const rows = state === 'few' ? ROWS.slice(0, 2) : ROWS;
  const packs: PacksCatalogV3Pack[] = rows.map((row, i) => ({
    id: `preview-${i + 1}`,
    title: row.title,
    authorName: row.author,
    authorStableId: state === 'me' && i === 3 ? PACKS_CATALOG_V3_PREVIEW_ME : `preview-author-${i + 1}`,
    cardCount: row.cards,
    likesCount: row.likes,
    // зачем: наборы лежат внутри текущего месяца, не позже «сейчас» — иначе первого числа часть набора оказалась бы «в будущем»
    publishedAt: new Date(Math.min(nowMs, monthStart + (i + 1) * 3 * HOUR_MS)).toISOString(),
  }));
  if (state !== 'few') {
    packs.push({
      id: 'preview-old',
      title: 'Прошлый рекордсмен',
      authorName: 'Старожил',
      authorStableId: 'preview-author-old',
      cardCount: 60,
      likesCount: 999,
      publishedAt: new Date(monthStart - 2 * 24 * HOUR_MS).toISOString(),
    });
  }
  return { packs, loaded: true, myStableId: state === 'me' ? PACKS_CATALOG_V3_PREVIEW_ME : null };
}

// ═══════════════════════════════════════════════════════════════════════════
// Экраны макета (экран набора, подача набора, «Условия участия», окно победителя): состояния dev-фотостудии.
//   /dev_packs_catalog_v3?state=pack|pack-added|submit|submit-clean|submit-checking|rules|win1|win2|win3 &theme=… &appearance=…
// Тексты карточек — данные набора (английская фраза и перевод), а не подписи интерфейса.
// ═══════════════════════════════════════════════════════════════════════════
export const PACKS_SCREEN_STATES = ['pack', 'pack-added', 'submit', 'submit-clean', 'submit-checking', 'rules', 'win1', 'win2', 'win3'] as const;
export type PacksScreenState = (typeof PACKS_SCREEN_STATES)[number];

export function isPacksScreenState(value: unknown): value is PacksScreenState {
  return typeof value === 'string' && (PACKS_SCREEN_STATES as readonly string[]).includes(value);
}

export const PACK_SCREEN_FIXTURE = Object.freeze({
  pack: Object.freeze({ id: 'preview-1', title: 'Английский в дороге', authorName: 'Марина К.', likes: 132 }),
  cards: Object.freeze([
    { front: 'Where is the nearest station?', back: 'Где ближайшая станция?' },
    { front: 'I would like a window seat.', back: 'Я бы хотел место у окна.' },
    { front: 'How much is a ticket to the airport?', back: 'Сколько стоит билет до аэропорта?' },
    { front: 'My luggage is missing.', back: 'Мой багаж пропал.' },
    { front: 'Could you call a taxi, please?', back: 'Вызовите такси, пожалуйста.' },
    { front: 'What time does the train leave?', back: 'Во сколько отправляется поезд?' },
    { front: 'I have a reservation.', back: 'У меня есть бронь.' },
    { front: 'Is breakfast included?', back: 'Завтрак включён?' },
  ]),
});

export const PACK_SUBMIT_FIXTURE = Object.freeze({
  languageName: 'Английский',
  name: 'Английский в дороге',
  cards: Object.freeze([
    { front: 'Where is the nearest station?', back: 'Где ближайшая станция?' },
    { front: 'I would like a window sit.', back: 'Я бы хотел место у окна.', fix: 'I would like a window seat.' },
    { front: 'How much is a ticket to the airport?', back: 'Сколько стоит билет до аэропорта?' },
    { front: 'My luggage are missing.', back: 'Мой багаж пропал.', fix: 'My luggage is missing.' },
    { front: 'Could you call a taxi, please?', back: 'Вызовите такси, пожалуйста.' },
    { front: 'I have a reservation.', back: 'У меня есть бронь.' },
  ] as const),
});

export const PACK_WINNER_FIXTURE = Object.freeze({ id: 'preview-1', title: 'Английский в дороге', likes: 132 });
