// зачем (координатор/Дизайн 12.10, R1 «Уроки ≈2 с до первого кадра»): английский каталог курса собирается из бандла
// (seed + materialize, ≈2,1–2,3 с JS в debug), а вкладка Уроков звала peek и load подряд и снова на каждом фокусе.
// Сторож мемоизации: один и тот же замороженный объект на повторных вызовах; разные языки интерфейса — разные каталоги.
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({ getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn() }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => 'stable-catalog-user'),
  ensureStableAuthLink: jest.fn(async () => true),
}));

import { httpsCallable } from '@react-native-firebase/functions';

import { loadLearningV2ActiveCourseCatalogV1, peekLearningV2ActiveCourseCatalogV1 } from '../app/learning_v2_active_course_catalog_client_v1';

const en = Object.freeze({
  environment: 'lab' as const,
  targetLanguage: 'en',
  studyTarget: 'en',
  learnerSourceLocale: 'ru',
  interfaceLocale: 'ru' as const,
  seasonId: 'learning-v2',
});

describe('встроенный английский каталог: собирается один раз', () => {
  it('peek → peek → load отдают ТОТ ЖЕ замороженный каталог, без сети', async () => {
    const first = peekLearningV2ActiveCourseCatalogV1(en, 'scope-a');
    const second = peekLearningV2ActiveCourseCatalogV1(en, 'scope-b');
    const loaded = await loadLearningV2ActiveCourseCatalogV1(en);
    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(loaded.catalog).toBe(first);
    expect(loaded.source).toBe('bundled_factory');
    expect(Object.isFrozen(first)).toBe(true);
    expect(jest.mocked(httpsCallable)).not.toHaveBeenCalled();
  });

  it('другой язык интерфейса — отдельный каталог с его заголовками', () => {
    const ru = peekLearningV2ActiveCourseCatalogV1(en, 'scope-a');
    const uk = peekLearningV2ActiveCourseCatalogV1({ ...en, interfaceLocale: 'uk' as const }, 'scope-a');
    expect(uk).not.toBe(ru);
    expect(uk?.interfaceLocale).toBe('uk');
    expect(ru?.interfaceLocale).toBe('ru');
  });
});
