jest.mock('firebase-admin', () => ({ firestore: jest.fn() }));
jest.mock('./auth_identity', () => ({ resolveStableUidForAuth: jest.fn() }));
jest.mock('./community_packs', () => ({ syncFlashcardRegistryPackMutation: jest.fn() }));

import {
  COMMUNITY_PACK_CARD_COUNT_MIN,
  normalizePackCardId,
  planPackCardRemoval,
} from './community_pack_card_remove';

const AUTHOR = 'stable_author';

function pack(cardCount: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    authorStableId: AUTHOR,
    listingStatus: 'published',
    cards: Array.from({ length: cardCount }, (_, i) => ({ id: `c${i + 1}`, en: `word ${i + 1}`, ru: `слово ${i + 1}` })),
    cardCount,
    ...overrides,
  };
}

describe('planPackCardRemoval — удаление карточки из своего опубликованного набора', () => {
  test('убирает карточку, cardCount меняется вместе с cards, реестр синхронизируется', () => {
    const plan = planPackCardRemoval(pack(12), AUTHOR, 'c3');
    expect(plan).toMatchObject({ kind: 'remove', removedIndex: 2, cardCount: 11, syncRegistry: true });
    if (plan.kind !== 'remove') throw new Error('expected remove');
    expect(plan.cards).toHaveLength(11);
    expect(plan.cards.some((card) => (card as { id: string }).id === 'c3')).toBe(false);
  });

  test('повтор с тем же cardId — ok, not_found_already_removed (идемпотентно)', () => {
    expect(planPackCardRemoval(pack(11), AUTHOR, 'c99')).toEqual({ kind: 'already_removed', cardCount: 11 });
  });

  test(`отказ card_count, если после удаления останется меньше ${COMMUNITY_PACK_CARD_COUNT_MIN}`, () => {
    expect(planPackCardRemoval(pack(COMMUNITY_PACK_CARD_COUNT_MIN), AUTHOR, 'c1'))
      .toEqual({ kind: 'refuse', reason: 'card_count', cardCount: COMMUNITY_PACK_CARD_COUNT_MIN });
    expect(planPackCardRemoval(pack(COMMUNITY_PACK_CARD_COUNT_MIN + 1), AUTHOR, 'c1').kind).toBe('remove');
  });

  test('чужой набор — not_author; автор определяется сервером, а не клиентом', () => {
    expect(planPackCardRemoval(pack(12), 'someone_else', 'c1')).toEqual({ kind: 'refuse', reason: 'not_author' });
  });

  test('нет набора / снят / висит заявка на правку / не опубликован — отказ с причиной', () => {
    expect(planPackCardRemoval(null, AUTHOR, 'c1')).toEqual({ kind: 'refuse', reason: 'pack_not_found' });
    expect(planPackCardRemoval(pack(12, { listingStatus: 'admin_removed' }), AUTHOR, 'c1'))
      .toEqual({ kind: 'refuse', reason: 'pack_removed' });
    expect(planPackCardRemoval(pack(12, { listingStatus: 'update_pending' }), AUTHOR, 'c1'))
      .toEqual({ kind: 'refuse', reason: 'update_pending' });
    expect(planPackCardRemoval(pack(12, { listingStatus: 'draft' }), AUTHOR, 'c1'))
      .toEqual({ kind: 'refuse', reason: 'not_published' });
  });

  test('набор на доработке у модератора правится, но реестр не трогаем — его там уже нет', () => {
    expect(planPackCardRemoval(pack(12, { listingStatus: 'admin_revision_required' }), AUTHOR, 'c1'))
      .toMatchObject({ kind: 'remove', syncRegistry: false });
  });

  test('id карточки из приложения (<packId>_<id>) приводится к сырому id документа', () => {
    expect(normalizePackCardId('pack_1', 'pack_1_c4')).toBe('c4');
    expect(normalizePackCardId('pack_1', 'c4')).toBe('c4');
  });
});
