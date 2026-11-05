// Сторож (владелец 04.11): дополнительный язык классического курса — Plus, но только для НОВЫХ; нет записи/сбой/старый = не запирать.
// «Новый» фиксируется один раз при завершении онбординга и дальше не пересчитывается (ни прогресс, ни облачное восстановление его не меняют).
let mockOwner: string | null = 'owner-a';
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ phase: mockOwner ? 'active' : 'signed_out', stableId: mockOwner }),
}));
let mockCreatedAt: number | null | undefined = 2_000_000;
jest.mock('../app/account_created_at', () => ({ peekCurrentAccountCreatedAtMs: () => mockCreatedAt }));
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PRIMARY_COURSE_LANGUAGE_KEY,
  primaryCourseLanguageKey,
  __resetCourseLanguageAccessForTests,
  isCourseLanguageLockedSync,
  judgeCourseLanguageLock,
  parsePrimaryCourseLanguageRecord,
  recordPrimaryCourseLanguageAtOnboarding,
  resolveCourseLanguageLock,
} from '../app/course_language_access';
import { lessonBestScoreKey, lessonProgressKey } from '../app/target_storage_keys';

const KEY_A = primaryCourseLanguageKey('owner-a');
const KEY_B = primaryCourseLanguageKey('owner-b');
const storage = AsyncStorage as unknown as { __reset: () => void; setItem: jest.Mock; getItem: jest.Mock };
const SINCE = 1_000_000;
const AFTER = SINCE + 5_000;

const record = (over: Partial<{ primary: string; newUser: boolean }> = {}) =>
  ({ v: 1 as const, primary: 'en', newUser: true, atMs: AFTER, ...over });

beforeEach(() => {
  mockOwner = 'owner-a';
  mockCreatedAt = 2_000_000;
  storage.__reset();
  __resetCourseLanguageAccessForTests();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('judgeCourseLanguageLock — чистое правило', () => {
  it('новый пользователь на языке, отличном от первого → замок', () => {
    expect(judgeCourseLanguageLock({ record: record(), target: 'es' })).toMatchObject({ locked: true, reason: 'locked', primary: 'en' });
  });
  it('первый язык остаётся свободным (уроки 1–3 по прежним правилам)', () => {
    expect(judgeCourseLanguageLock({ record: record(), target: 'en' })).toMatchObject({ locked: false, reason: 'primary_language' });
  });
  it('старому пользователю ничего не отбираем', () => {
    expect(judgeCourseLanguageLock({ record: record({ newUser: false }), target: 'es' })).toMatchObject({ locked: false, reason: 'not_new_user' });
  });
  it('нет записи / неизвестный язык → не запирать', () => {
    expect(judgeCourseLanguageLock({ record: null, target: 'es' })).toMatchObject({ locked: false, reason: 'no_record' });
    expect(judgeCourseLanguageLock({ record: record(), target: 'xx' })).toMatchObject({ locked: false, reason: 'unknown_target' });
    expect(judgeCourseLanguageLock({ record: record(), target: null })).toMatchObject({ locked: false, reason: 'unknown_target' });
  });
});

describe('parsePrimaryCourseLanguageRecord — всё непохожее на запись не запирает', () => {
  it('верная запись разбирается', () => {
    expect(parsePrimaryCourseLanguageRecord(JSON.stringify(record()))).toEqual(record());
  });
  it.each([null, undefined, '', 'not json', '{}', '{"v":2,"primary":"en","newUser":true,"atMs":1}', '{"v":1,"primary":"zz","newUser":true,"atMs":1}', '{"v":1,"primary":"en","newUser":"yes","atMs":1}', '{"v":1,"primary":"en","newUser":true,"atMs":"x"}'])(
    'битое значение %p → null',
    (raw) => expect(parsePrimaryCourseLanguageRecord(raw as string | null | undefined)).toBeNull(),
  );
});

describe('recordPrimaryCourseLanguageAtOnboarding — вердикт фиксируется один раз при завершении онбординга', () => {
  it('новичок после выхода версии: первый язык и newUser=true', async () => {
    await AsyncStorage.multiSet([['study_target_v1', 'fr'], ['onboarding_completed_at_ms_v1', String(AFTER)]]);
    await expect(recordPrimaryCourseLanguageAtOnboarding(AFTER, SINCE)).resolves.toBe('recorded');
    expect(parsePrimaryCourseLanguageRecord(await AsyncStorage.getItem(KEY_A))).toMatchObject({ primary: 'fr', newUser: true });
  });
  // зачем (правило «молодой аккаунт», 9f84a4de4 / P0 05.11): у аккаунта, созданного ПОСЛЕ среза, серия и опыт первого дня — не прежний прогресс (иначе чистый новичок после первого занятия считался бы старым).
  // Поэтому «человек с прогрессом» проверяется на аккаунте с НЕИЗВЕСТНЫМ возрастом (undefined → правило прежнее: прогресс = не новый).
  it('повторное прохождение онбординга человеком с прогрессом (возраст аккаунта неизвестен) → newUser=false', async () => {
    mockCreatedAt = undefined;
    await AsyncStorage.multiSet([['study_target_v1', 'es'], ['onboarding_completed_at_ms_v1', String(AFTER)], ['user_total_xp', '120']]);
    await recordPrimaryCourseLanguageAtOnboarding(AFTER, SINCE);
    expect(parsePrimaryCourseLanguageRecord(await AsyncStorage.getItem(KEY_A))).toMatchObject({ primary: 'es', newUser: false });
  });
  it('молодой аккаунт (создан после среза): опыт первого дня НЕ делает его «не новым» → newUser=true', async () => {
    mockCreatedAt = 2_000_000;
    await AsyncStorage.multiSet([['study_target_v1', 'es'], ['onboarding_completed_at_ms_v1', String(AFTER)], ['user_total_xp', '120']]);
    await recordPrimaryCourseLanguageAtOnboarding(AFTER, SINCE);
    expect(parsePrimaryCourseLanguageRecord(await AsyncStorage.getItem(KEY_A))).toMatchObject({ primary: 'es', newUser: true });
  });
  it('до выхода версии (заглушка максимум) никто не новый — замок выключен', async () => {
    await AsyncStorage.multiSet([['study_target_v1', 'en'], ['onboarding_completed_at_ms_v1', String(AFTER)]]);
    await recordPrimaryCourseLanguageAtOnboarding(AFTER); // sinceMs = общая константа (максимум)
    expect(parsePrimaryCourseLanguageRecord(await AsyncStorage.getItem(KEY_A))).toMatchObject({ newUser: false });
    await expect(resolveCourseLanguageLock('es')).resolves.toMatchObject({ locked: false, reason: 'not_new_user' });
  });
  it('прогресс в любом языке при завершении онбординга → «не новый» (повторный онбординг старого пользователя не запирает)', async () => {
    mockCreatedAt = undefined; // зачем: возраст аккаунта неизвестен — действует прежнее правило «прогресс = не новый»
    await AsyncStorage.multiSet([['study_target_v1', 'fr'], ['onboarding_completed_at_ms_v1', String(AFTER)], [lessonProgressKey(5, 'es'), '40']]);
    await recordPrimaryCourseLanguageAtOnboarding(AFTER, SINCE);
    expect(parsePrimaryCourseLanguageRecord(await AsyncStorage.getItem(KEY_A))).toMatchObject({ primary: 'fr', newUser: false });
    await expect(resolveCourseLanguageLock('es', 30)).resolves.toMatchObject({ locked: false });
  });
  it('нет выбранного языка или нет метки времени → записи нет / newUser=false', async () => {
    await expect(recordPrimaryCourseLanguageAtOnboarding(AFTER, SINCE)).resolves.toBe('no_language');
    expect(await AsyncStorage.getItem(KEY_A)).toBeNull();
    await AsyncStorage.setItem('study_target_v1', 'de');
    await recordPrimaryCourseLanguageAtOnboarding(AFTER, SINCE);
    expect(parsePrimaryCourseLanguageRecord(await AsyncStorage.getItem(KEY_A))).toMatchObject({ newUser: false });
  });
  it('сбой записи не бросает и замок не включает', async () => {
    await AsyncStorage.multiSet([['study_target_v1', 'it'], ['onboarding_completed_at_ms_v1', String(AFTER)]]);
    storage.setItem.mockRejectedValueOnce(new Error('disk full'));
    await expect(recordPrimaryCourseLanguageAtOnboarding(AFTER, SINCE)).resolves.toBe('failed');
    await expect(resolveCourseLanguageLock('es')).resolves.toMatchObject({ locked: false });
  });
});

describe('resolveCourseLanguageLock — решение охранника', () => {
  it('новичок: дополнительный язык заперт, первый свободен; прогресс и «облако» вердикт не меняют', async () => {
    await AsyncStorage.setItem(KEY_A, JSON.stringify(record({ primary: 'en' })));
    await expect(resolveCourseLanguageLock('es', 1)).resolves.toMatchObject({ locked: true });
    expect(isCourseLanguageLockedSync('es')).toBe(true);
    await expect(resolveCourseLanguageLock('en', 2)).resolves.toMatchObject({ locked: false });
    expect(isCourseLanguageLockedSync('en')).toBe(false);
    // появился прогресс (streak/XP) или пришло восстановление — запись «новый» остаётся прежней
    await AsyncStorage.multiSet([['streak_count', '9'], ['user_total_xp', '900']]);
    __resetCourseLanguageAccessForTests();
    await expect(resolveCourseLanguageLock('es', 3)).resolves.toMatchObject({ locked: true });
  });
  it('выход из аккаунта стирает запись → замок не работает (у нового аккаунта своя запись из его онбординга)', async () => {
    await AsyncStorage.setItem(KEY_A, JSON.stringify(record()));
    await AsyncStorage.removeItem(KEY_A);
    __resetCourseLanguageAccessForTests();
    await expect(resolveCourseLanguageLock('es', 4)).resolves.toMatchObject({ locked: false, reason: 'no_record' });
  });
  it('начатое никогда не запирается: прогресс в языке (даже после окончания Plus или облачного восстановления) оставляет его открытым', async () => {
    await AsyncStorage.setItem(KEY_A, JSON.stringify(record({ primary: 'en' })));
    await expect(resolveCourseLanguageLock('es', 10)).resolves.toMatchObject({ locked: true });
    // пришло облачное восстановление (или человек уже учил язык при Plus): в es есть сохранённый прогресс урока 2
    await AsyncStorage.setItem(lessonProgressKey(2, 'es'), '14');
    await expect(resolveCourseLanguageLock('es', 11)).resolves.toMatchObject({ locked: false, reason: 'has_progress' });
    expect(isCourseLanguageLockedSync('es')).toBe(false);
    // другой язык без прогресса по-прежнему заперт
    await expect(resolveCourseLanguageLock('fr', 12)).resolves.toMatchObject({ locked: true });
  });
  it('лучший результат урока тоже считается начатым; «0», пусто и null — нет', async () => {
    await AsyncStorage.setItem(KEY_A, JSON.stringify(record({ primary: 'en' })));
    await AsyncStorage.multiSet([[lessonProgressKey(1, 'de'), '0'], [lessonBestScoreKey(1, 'de'), '']]);
    await expect(resolveCourseLanguageLock('de', 20)).resolves.toMatchObject({ locked: true });
    await AsyncStorage.setItem(lessonBestScoreKey(1, 'de'), '85');
    await expect(resolveCourseLanguageLock('de', 21)).resolves.toMatchObject({ locked: false, reason: 'has_progress' });
  });
  it('ошибка чтения → не запирать', async () => {
    storage.getItem.mockRejectedValueOnce(new Error('read failed'));
    await expect(resolveCourseLanguageLock('es', 5)).resolves.toMatchObject({ locked: false, reason: 'read_failed' });
  });
});

describe('запись по владельцу аккаунта (Ревизор 04.11): чужой язык на том же телефоне не виден', () => {
  it('ключ лежит в стираемом семействе story_events_v1 и содержит владельца', () => {
    expect(KEY_A).toBe('story_events_v1:primary_course_language:owner-a');
    expect(KEY_A.startsWith('story_events_v1:')).toBe(true);
  });
  it('смена аккаунта: у каждого своя запись, чужой первичный язык не решает замок', async () => {
    await AsyncStorage.setItem(KEY_A, JSON.stringify(record({ primary: 'en' })));
    await expect(resolveCourseLanguageLock('es', 1)).resolves.toMatchObject({ locked: true });
    mockOwner = 'owner-b'; // другой человек вошёл на том же телефоне; своей записи у него нет
    await expect(resolveCourseLanguageLock('es', 2)).resolves.toMatchObject({ locked: false, reason: 'no_record' });
    expect(isCourseLanguageLockedSync('es')).toBe(false);
    await AsyncStorage.setItem(KEY_B, JSON.stringify(record({ primary: 'es' })));
    __resetCourseLanguageAccessForTests();
    await expect(resolveCourseLanguageLock('es', 3)).resolves.toMatchObject({ locked: false, reason: 'primary_language' });
    await expect(resolveCourseLanguageLock('en', 4)).resolves.toMatchObject({ locked: true });
    mockOwner = 'owner-a'; // вернулся первый аккаунт: его запись по-прежнему своя
    await expect(resolveCourseLanguageLock('es', 5)).resolves.toMatchObject({ locked: true });
  });
  it('без активного аккаунта записи нет и замок не работает', async () => {
    mockOwner = null;
    await expect(recordPrimaryCourseLanguageAtOnboarding(2_000_000, 1_000_000)).resolves.toBe('no_owner');
    await expect(resolveCourseLanguageLock('es', 6)).resolves.toMatchObject({ locked: false, reason: 'no_record' });
    expect(isCourseLanguageLockedSync('es')).toBe(false);
  });
  it('онбординг пишет запись под ключом ТЕКУЩЕГО владельца, общий ключ не трогает', async () => {
    await AsyncStorage.multiSet([['study_target_v1', 'fr'], ['onboarding_completed_at_ms_v1', String(2_000_000)]]);
    await expect(recordPrimaryCourseLanguageAtOnboarding(2_000_000, 1_000_000)).resolves.toBe('recorded');
    expect(parsePrimaryCourseLanguageRecord(await AsyncStorage.getItem(KEY_A))).toMatchObject({ primary: 'fr', newUser: true });
    expect(await AsyncStorage.getItem(KEY_B)).toBeNull();
    expect(await AsyncStorage.getItem(PRIMARY_COURSE_LANGUAGE_KEY)).toBeNull();
  });
  it('ветеран на втором устройстве (аккаунт создан до выхода версии) не «новый»', async () => {
    mockCreatedAt = 500_000;
    await AsyncStorage.multiSet([['study_target_v1', 'fr'], ['onboarding_completed_at_ms_v1', String(2_000_000)]]);
    await recordPrimaryCourseLanguageAtOnboarding(2_000_000, 1_000_000);
    expect(parsePrimaryCourseLanguageRecord(await AsyncStorage.getItem(KEY_A))).toMatchObject({ newUser: false });
  });
  it('прежний общий ключ: запись «новый» переносится текущему владельцу один раз, прежний ключ удаляется', async () => {
    await AsyncStorage.setItem(PRIMARY_COURSE_LANGUAGE_KEY, JSON.stringify(record({ primary: 'en' })));
    await expect(resolveCourseLanguageLock('es', 7)).resolves.toMatchObject({ locked: true });
    expect(parsePrimaryCourseLanguageRecord(await AsyncStorage.getItem(KEY_A))).toMatchObject({ primary: 'en', newUser: true });
    expect(await AsyncStorage.getItem(PRIMARY_COURSE_LANGUAGE_KEY)).toBe('migrated_v1'); // погашен меткой, не удалён (замок: удалений не прибавляем)
    // другой аккаунт на том же телефоне уже не получит эту запись
    mockOwner = 'owner-b';
    __resetCourseLanguageAccessForTests();
    await expect(resolveCourseLanguageLock('es', 70)).resolves.toMatchObject({ locked: false, reason: 'no_record' });
  });
  it('прежний общий ключ с «не новый» игнорируется и удаляется', async () => {
    await AsyncStorage.setItem(PRIMARY_COURSE_LANGUAGE_KEY, JSON.stringify(record({ newUser: false })));
    await expect(resolveCourseLanguageLock('es', 8)).resolves.toMatchObject({ locked: false });
    expect(await AsyncStorage.getItem(KEY_A)).toBeNull();
    expect(await AsyncStorage.getItem(PRIMARY_COURSE_LANGUAGE_KEY)).toBe('migrated_v1');
  });
  it('язык с прогрессом по-прежнему не запирается и при записи по владельцу', async () => {
    await AsyncStorage.setItem(KEY_A, JSON.stringify(record({ primary: 'en' })));
    await AsyncStorage.setItem(lessonProgressKey(2, 'de'), '14');
    await expect(resolveCourseLanguageLock('de', 9)).resolves.toMatchObject({ locked: false, reason: 'has_progress' });
  });
});
