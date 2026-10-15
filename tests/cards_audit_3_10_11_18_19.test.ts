// зачем (аудит кнопок Карточек #3/#10/#11/#18/#19, координатор 15.10): сторож связей, чтобы правки не откатили незаметно.
import { readFileSync } from 'fs';
import path from 'path';

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8').split('\r\n').join('\n');

describe('аудит Карточек', () => {
  it('#3 «Верно/неверно» не подменяет запрошенные колоды всеми источниками', () => {
    const src = read('app/flashcards_swipe.tsx');
    expect(src).toContain('if (requestedDeckIds.length > 0) return new Set();');
    expect(src).toContain('[SWIPE-DECKS]');
  });
  it('#10 ключ подсказки удаления зависит от языка обучения, пишется общим помощником', () => {
    expect(read('app/flashcards/delete_hint_seen.ts')).toContain('flashcardsDeleteHintSeenKey(studyTarget)');
    expect(read('app/flashcards/CollectionGalleryView.tsx')).toContain('markDeleteHintSeen(');
    expect(read('app/flashcards/CollectionListView.tsx')).toContain('markDeleteHintSeen(');
  });
  it('#11 лимит Free считается по языку набора', () => {
    expect(read('app/flashcards_collection.tsx')).toContain('savedCardsForPackLanguage.length >= FREE_SAVED_CARD_LIMIT');
  });
  it('#18 настройка тренировки обновляется при возврате, первый фокус пропущен', () => {
    const src = read('app/flashcards_training_setup.tsx');
    expect(src).toContain('focusSeenRef');
    expect(src).toContain('setLoadRevision((value) => value + 1);');
  });
  it('#19 кэш списка по языку живёт ограниченно и сбрасывается сигналом состава моих наборов', () => {
    const src = read('app/flashcards/deck_options.ts');
    expect(src).toContain('LOCAL_ONLY_DECK_OPTIONS_TTL_MS = 60_000');
    expect(src).toContain('hit.ownedVersion !== ownedPackIdsVersion()');
  });
});

describe('витрина топ-наборов по языку (🟡 Хаб/наборы, 15.10)', () => {
  it('pickTopCommunityPacks получает язык, «без языка» проходит, пустой catch скрытия пишет причину', () => {
    const top = read('app/flashcards/SavedTopCommunityPacks.tsx');
    expect(top).toContain('packMatchesLanguageFilter(p.packLanguage ?? p.studyTarget, language)');
    expect(read('app/flashcards_training_setup.tsx')).toContain('normalizePackLanguage(studyTarget)');
    expect(read('app/flashcards/CardPackShardPaywallModal.tsx')).toContain('[PACK-HIDE] hide on device FAILED');
  });
});

describe('Тренировки 🟡 (15.10)', () => {
  it('«Вспомнить»: Enter в многострочном поле отправляет ответ', () => {
    expect(read('app/flashcards_recall_session.tsx')).toContain('submitBehavior="submit"');
  });
  it('Блиц: «Ещё разок» начинает новое начисление рун', () => {
    const src = read('app/flashcards_blitz_session.tsx');
    expect(src.slice(src.indexOf('const restart = useCallback'), src.indexOf('const restart = useCallback') + 700)).toContain('practiceRunes.startNewCompletion();');
  });
});

describe('граница Free «50/50» (#11) — журнал и условие', () => {
  it('лимит по языку набора, решение пишет [CARDS-LIMIT]', () => {
    const src = read('app/flashcards_collection.tsx');
    expect(src).toContain('savedCardsForPackLanguage.length >= FREE_SAVED_CARD_LIMIT');
    expect(src).toContain('[CARDS-LIMIT]');
  });
});

describe('#3 глубокое: «Верно/неверно» по набору ролика без документа', () => {
  it('источник собирается из набора фраз, карточки — с запасным путём', () => {
    const src = read('app/flashcards_swipe.tsx');
    expect(src).toContain('const videoGapIds = missingOwned.filter(');
    expect(src).toContain('buildOwnedVideoPackMeta({ packId: id, phraseSetPacks, communityDoc: null, storedTitle: undefined })');
    expect(src).toContain('return loadVideoPackFallbackCards(pack.id, studyTarget);');
  });
});
