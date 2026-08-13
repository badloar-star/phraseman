import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';
// Cards 2.1 §1.2: цена набора удалена из схемы — в payload'е поля priceShards больше нет.
import {
  buildCommunityPackPayloadForCloud,
  validateCommunityPackPayload,
  type CommunityPackSubmissionPayload,
} from '../app/community_packs/schema';
import { mapCommunityPackDocToMarket } from '../app/community_packs/communityFirestore';
import {
  clearCommunityPackCreateDraft,
  loadCommunityPackCreateDraft,
  saveCommunityPackCreateDraft,
  type CommunityPackCreateDraftV1,
} from '../app/community_packs/communityPackDraftStorage';
import { communityPackCreateDraftKey } from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-firebase/firestore', () => jest.fn());
jest.mock('../app/community_packs/functionsClient', () => ({
  callCommunityFetchPackCardsIfAccessible: jest.fn(),
  isCommunityPacksCloudEnabled: jest.fn(() => true),
}));

const ROOT = path.join(__dirname, '..');
const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

function validPayload(studyTarget?: 'en' | 'fr'): CommunityPackSubmissionPayload {
  return {
    studyTarget,
    title: 'Creator pack',
    description: 'Community examples',
    sourceLang: 'ru',
    cards: Array.from({ length: 10 }, (_, i) => ({
      id: `c${i + 1}`,
      en: `Phrase ${i + 1}`,
      ru: `Фраза ${i + 1}`,
    })),
  };
}

function validDraft(title: string): Omit<CommunityPackCreateDraftV1, 'v'> {
  return {
    title,
    description: 'Draft description',
    themeIdx: 0,
    cardBackIdx: 0,
    rows: [],
    addCardFormOpen: false,
    draftEn: '',
    draftRu: '',
    draftEs: '',
    draftPlannedTranslation: '',
    draftNote: '',
  };
}

beforeEach(() => {
  storage.__reset?.();
  jest.clearAllMocks();
});

describe('Gustav community pack target gate', () => {
  it('keeps new UGC payloads tagged as English and blocks French until source approval', () => {
    expect(validateCommunityPackPayload(validPayload('en'))).toBeNull();
    expect(validateCommunityPackPayload(validPayload('fr'))).toBe('study_target_gate');
    expect(buildCommunityPackPayloadForCloud(validPayload())).toMatchObject({ studyTarget: 'en' });
    expect(buildCommunityPackPayloadForCloud(validPayload('en'))).toMatchObject({ studyTarget: 'en' });
  });

  it('accepts planned source-locale cards without writing them into RU/UK/ES fields', () => {
    const payload: CommunityPackSubmissionPayload = {
      studyTarget: 'en',
      title: 'Pacote do criador',
      description: 'Exemplos da comunidade',
      sourceLang: 'pt-BR',
      cards: Array.from({ length: 10 }, (_, i) => ({
        id: `c${i + 1}`,
        en: `Phrase ${i + 1}`,
        sourceLocales: { 'pt-BR': `Frase ${i + 1}` },
      })),
    };

    expect(validateCommunityPackPayload(payload)).toBeNull();
    const cloudPayload = buildCommunityPackPayloadForCloud(payload);
    expect(cloudPayload).toMatchObject({
      sourceLang: 'pt-BR',
      titleRu: '',
      titlePtBr: 'Pacote do criador',
      descriptionPtBr: 'Exemplos da comunidade',
    });
    expect(cloudPayload.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceLocales: { 'pt-BR': 'Frase 1' },
        }),
      ]),
    );
    expect((cloudPayload.cards as Array<Record<string, unknown>>)[0]).not.toHaveProperty('ru');
  });

  it('filters Firestore UGC docs by study target while keeping missing legacy docs as English', () => {
    const baseDoc = {
      listingStatus: 'published',
      titleRu: 'UGC',
      cardCount: 10,
      updatedAt: 1,
    };

    expect(mapCommunityPackDocToMarket('legacy_en', baseDoc, { studyTarget: 'en' })?.studyTarget).toBe('en');
    expect(mapCommunityPackDocToMarket('legacy_en', baseDoc, { studyTarget: 'fr' })).toBeNull();
    expect(mapCommunityPackDocToMarket('fr_pack', { ...baseDoc, studyTarget: 'fr' }, { studyTarget: 'fr' })?.studyTarget).toBe('fr');
    expect(mapCommunityPackDocToMarket('fr_pack', { ...baseDoc, studyTarget: 'fr' }, { studyTarget: 'en' })).toBeNull();
  });

  it('keeps French community pack create drafts scoped by target and RU/UK source locale', async () => {
    await saveCommunityPackCreateDraft(validDraft('French RU draft'), 'fr', 'ru');
    await saveCommunityPackCreateDraft(validDraft('French UK draft'), 'fr', 'uk');
    await saveCommunityPackCreateDraft({ ...validDraft('English PT draft'), draftPlannedTranslation: 'olá' }, 'en', 'pt-BR');

    await expect(loadCommunityPackCreateDraft('fr', 'ru')).resolves.toMatchObject({ title: 'French RU draft' });
    await expect(loadCommunityPackCreateDraft('fr', 'uk')).resolves.toMatchObject({ title: 'French UK draft' });
    await expect(loadCommunityPackCreateDraft('en', 'pt-BR')).resolves.toMatchObject({
      title: 'English PT draft',
      draftPlannedTranslation: 'olá',
    });
    await expect(loadCommunityPackCreateDraft('en', 'ru')).resolves.toBeNull();
    await expect(AsyncStorage.getItem(communityPackCreateDraftKey('en', 'ru'))).resolves.toBeNull();
    await expect(AsyncStorage.getItem(communityPackCreateDraftKey('en', 'pt-BR'))).resolves.toContain('English PT draft');
    await expect(AsyncStorage.getItem(communityPackCreateDraftKey('fr', 'ru'))).resolves.toContain('French RU draft');
    await expect(AsyncStorage.getItem(communityPackCreateDraftKey('fr', 'uk'))).resolves.toContain('French UK draft');

    await clearCommunityPackCreateDraft('fr', 'ru');

    await expect(loadCommunityPackCreateDraft('fr', 'ru')).resolves.toBeNull();
    await expect(loadCommunityPackCreateDraft('fr', 'uk')).resolves.toMatchObject({ title: 'French UK draft' });
    await expect(loadCommunityPackCreateDraft('en', 'pt-BR')).resolves.toMatchObject({ title: 'English PT draft' });
  });

  it('threads studyTarget through community create, catalog, cards, opening, and server gates', () => {
    const createSource = fs.readFileSync(path.join(ROOT, 'app', 'community_pack_create.tsx'), 'utf8');
    const firestoreSource = fs.readFileSync(path.join(ROOT, 'app', 'community_packs', 'communityFirestore.ts'), 'utf8');
    const stagingSource = fs.readFileSync(path.join(ROOT, 'app', 'community_packs', 'staging.ts'), 'utf8');
    /**
     * Cards 2.1 §5.1/§5.3: хаб-дашборд уехал с `/flashcards` (там теперь сохранённые
     * карточки) на отдельный экран каталога наборов `/flashcards_packs`.
     */
    const hubSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards_packs.tsx'), 'utf8');
    const categoryHubSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards', 'FlashcardsCategoryHub.tsx'), 'utf8');
    const collectionSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards_collection.tsx'), 'utf8');
    const collectionDataSource = fs.readFileSync(
      path.join(ROOT, 'app', 'flashcards', 'useCollectionData.ts'),
      'utf8',
    );
    const swipeSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards_swipe.tsx'), 'utf8');
    const openingSource = fs.readFileSync(path.join(ROOT, 'app', 'pack_opening.tsx'), 'utf8');
    const functionsSource = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'community_packs.ts'), 'utf8');
    const functionsClientSource = fs.readFileSync(path.join(ROOT, 'app', 'community_packs', 'functionsClient.ts'), 'utf8');
    const purchaseSource = fs.readFileSync(path.join(ROOT, 'app', 'community_packs', 'purchaseCommunityPack.ts'), 'utf8');
    const alertsSource = fs.readFileSync(path.join(ROOT, 'app', 'community_packs', 'communityModerationAlerts.ts'), 'utf8');
    const reportModalSource = fs.readFileSync(path.join(ROOT, 'components', 'ReportPackModal.tsx'), 'utf8');
    const userReportSource = fs.readFileSync(path.join(ROOT, 'app', 'user_report.ts'), 'utf8');
    const adminSource = fs.readFileSync(path.join(ROOT, 'admin', 'legacy.html'), 'utf8');

    expect(createSource).toContain('const { studyTarget } = useStudyTarget()');
    expect(createSource).toContain('flashcardsCommunityPacksAvailableForTarget(studyTarget)');
    expect(createSource).toContain('loadCommunityPackCreateDraft(studyTarget, lang)');
    expect(createSource).toContain('clearCommunityPackCreateDraft(studyTarget, lang)');
    expect(createSource).toContain('plannedCommunitySourceLocale(lang)');
    expect(createSource).toContain('communityPackRowWithSourceLocale(row, en, ru, es, note, plannedDraftLocale, translation)');
    expect(createSource).toContain('}, studyTarget, lang)');
    expect(createSource).toContain('studyTarget,');
    expect(createSource).toContain("case 'study_target_gate'");
    expect(createSource).not.toMatch(/emitAppEvent\('action_toast',\s*\{[\s\S]{0,400}\bmessageRu:/);
    expect(purchaseSource).not.toMatch(/emitAppEvent\('action_toast',\s*\{[\s\S]{0,400}\bmessageRu:/);
    expect(categoryHubSource).toContain('hasMeaningfulCommunityPackCreateDraft(studyTarget, lang)');

    expect(firestoreSource).toContain('communityPackDocMatchesStudyTarget');
    expect(firestoreSource).toContain('studyTarget?: RuntimeStudyTarget');
    expect(firestoreSource).toContain('return storageStudyTarget(data?.studyTarget as RuntimeStudyTarget | undefined)');
    expect(firestoreSource).not.toContain("data?.studyTarget === 'fr'");
    expect(firestoreSource).toContain('studyTarget !== storageStudyTarget(opts?.studyTarget)');
    expect(stagingSource).toContain('fetchCommunityPackCards(packId, studyTarget)');

    expect(hubSource).toContain('loadPublishedCommunityMarketPacks(studyTarget)');
    expect(hubSource).toContain('loadAuthorCommunityPacksPendingUpdate(sid, studyTarget)');
    expect(hubSource).toContain('fetchCommunityPackMeta(id, studyTarget)');
    expect(categoryHubSource).toContain('stageCommunityPackCardsForNavigation(pack.id, studyTarget)');
    /**
     * E11: загрузка каталога/карточек уехала из монолита `flashcards_collection.tsx`
     * в хук данных — контракт проверяем в модуле, который этими вызовами владеет.
     */
    expect(collectionDataSource).toContain('loadPublishedCommunityMarketPacks(studyTarget)');
    expect(collectionDataSource).toContain('fetchCommunityPackCards(id, studyTarget)');
    expect(swipeSource).toContain('loadPublishedCommunityMarketPacks(studyTarget)');
    expect(swipeSource).toContain('fetchCommunityPackCards(pack.id, studyTarget)');
    expect(openingSource).toContain('fetchCommunityPackMeta(packId, studyTarget)');
    expect(openingSource).toContain('fetchCommunityPackCards(packId, studyTarget)');

    expect(functionsSource).toContain('studyTarget?:');
    expect(functionsSource).toContain('French community packs are source-gated');
    expect(functionsSource).toContain('Cannot change pack study target');
    expect(functionsSource).toContain('studyTarget: normalizeCommunityPackStudyTarget(payload.studyTarget)');
    expect(functionsSource).toContain('requireMatchingPackStudyTarget(requestedStudyTarget, pack)');
    expect(functionsSource).toContain("throw new HttpsError('failed-precondition', 'Pack study target mismatch')");
    expect(functionsSource).toContain('studyTarget,');
    expect(functionsClientSource).toContain("studyTarget?: 'en' | 'fr'");
    expect(purchaseSource).toContain('studyTarget: storageStudyTarget(studyTarget)');
    expect(firestoreSource).toContain('studyTarget: storageStudyTarget(studyTarget)');
    expect(alertsSource).toContain('fetchCommunityPackMeta(pid, eventStudyTarget)');
    expect(reportModalSource).toContain('studyTarget,');
    expect(userReportSource).toContain('studyTarget: storageStudyTarget(params.studyTarget)');
    expect(adminSource).toContain('cpStudyTargetBadge');
    expect(adminSource).toContain("'target ' +");
    expect(adminSource).toContain('studyTarget: row.studyTarget');
  });
});
