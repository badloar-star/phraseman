import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ONBOARDING_STUDY_TARGET_SERVER_PREFETCH_RESULT_KEY,
  prefetchAndRecordStudyTargetServerPack,
  prefetchStudyTargetServerPack,
} from '../app/study_target_server_prefetch';
import {
  FRENCH_TARGET_CONTENT_VERSION,
  FRENCH_TARGET_REMOTE_SURFACES,
  frenchTargetObjectPrefix,
  frenchTargetStorageUrl,
  getFrenchStudyTargetServerPackRegistrations,
  isFrenchStudyTargetServerPackActivationApproved,
  normalizeFrenchTargetSourceLocale,
  sanitizeFrenchTargetInPackPath,
} from '../app/french_target_remote_registration';

const prefetchSource = fs.readFileSync(path.join(process.cwd(), 'app/study_target_server_prefetch.ts'), 'utf8');
const registrationSource = fs.readFileSync(path.join(process.cwd(), 'app/french_target_remote_registration.ts'), 'utf8');

describe('study target server prefetch contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not download anything for English', async () => {
    await expect(prefetchStudyTargetServerPack('en', 'ru')).resolves.toEqual({
      state: 'not_required',
      studyTarget: 'en',
    });
  });

  it('opens French server pack registrations after the activation gate is approved', async () => {
    const calls: { manifestUrl: string; rowSample: string }[] = [];
    await expect(prefetchStudyTargetServerPack('fr', 'ru', {
      ensureRemoteCoursePack: async (manifestUrl, rowUrl) => {
        calls.push({ manifestUrl, rowSample: rowUrl('index.json') });
        return { state: 'ready', cacheDirUri: `cache://${calls.length}` };
      },
    })).resolves.toEqual({
      state: 'ready',
      studyTarget: 'fr',
      sourceLocale: 'ru',
      cacheDirUris: Array.from({ length: FRENCH_TARGET_REMOTE_SURFACES.length }, (_value, index) => `cache://${index + 1}`),
    });
    expect(calls).toHaveLength(FRENCH_TARGET_REMOTE_SURFACES.length);
    expect(calls.every((call) => call.manifestUrl.includes('course-packs%2Ffr%2Fru%2F'))).toBe(true);
    expect(calls.every((call) => call.rowSample.includes('course-packs%2Ffr%2Fru%2F'))).toBe(true);
    expect(calls.every((call) => !call.manifestUrl.includes('course-packs%2Fen%2F'))).toBe(true);
  });

  it('rejects unsupported source locales for French prefetch', async () => {
    await expect(prefetchStudyTargetServerPack('fr', 'es')).resolves.toEqual({
      state: 'blocked',
      studyTarget: 'fr',
      sourceLocale: null,
      reason: 'unsupported_source_locale',
    });
  });

  it('declares only source-locale-scoped French server pack containers', () => {
    expect(FRENCH_TARGET_CONTENT_VERSION).toContain('2026-05-19_fr_inventory_v0a1');
    expect(FRENCH_TARGET_REMOTE_SURFACES).toEqual([
      'lesson',
      'lesson_intro',
      'quiz',
      'daily_phrase',
      'audio_metadata',
      'flashcard',
    ]);
    expect(frenchTargetObjectPrefix('ru', 'lesson')).toMatch(/^course-packs\/fr\/ru\/lesson\//);
    expect(frenchTargetObjectPrefix('uk', 'quiz')).toMatch(/^course-packs\/fr\/uk\/quiz\//);
    expect(frenchTargetStorageUrl('course-packs/fr/ru/lesson/x/manifest.json')).toContain(
      'course-packs%2Ffr%2Fru%2Flesson%2Fx%2Fmanifest.json',
    );
    expect(normalizeFrenchTargetSourceLocale('ru')).toBe('ru');
    expect(normalizeFrenchTargetSourceLocale('uk')).toBe('uk');
    expect(normalizeFrenchTargetSourceLocale('es')).toBeNull();
  });

  it('exposes French registrations after activation approval only inside source-locale containers', () => {
    expect(isFrenchStudyTargetServerPackActivationApproved()).toBe(true);
    expect(getFrenchStudyTargetServerPackRegistrations('ru')).toHaveLength(FRENCH_TARGET_REMOTE_SURFACES.length);
    expect(getFrenchStudyTargetServerPackRegistrations('uk')).toHaveLength(FRENCH_TARGET_REMOTE_SURFACES.length);
    expect(getFrenchStudyTargetServerPackRegistrations('ru').every((registration) => registration.sourceLocale === 'ru')).toBe(true);
    expect(getFrenchStudyTargetServerPackRegistrations('uk').every((registration) => registration.sourceLocale === 'uk')).toBe(true);
  });

  it('prefetches every approved French surface from server registrations only', async () => {
    const calls: { manifestUrl: string; rowSample: string }[] = [];
    const result = await prefetchStudyTargetServerPack('fr', 'ru', {
      activationApproved: () => true,
      ensureRemoteCoursePack: async (manifestUrl, rowUrl) => {
        calls.push({ manifestUrl, rowSample: rowUrl('rows/sample.jsonl') });
        return { state: 'ready', cacheDirUri: `cache://${calls.length}` };
      },
    });
    expect(result).toEqual({
      state: 'ready',
      studyTarget: 'fr',
      sourceLocale: 'ru',
      cacheDirUris: Array.from({ length: FRENCH_TARGET_REMOTE_SURFACES.length }, (_value, index) => `cache://${index + 1}`),
    });
    expect(calls).toHaveLength(FRENCH_TARGET_REMOTE_SURFACES.length);
    expect(calls.every((call) => call.manifestUrl.includes('course-packs%2Ffr%2Fru%2F'))).toBe(true);
    expect(calls.every((call) => call.rowSample.includes('course-packs%2Ffr%2Fru%2F'))).toBe(true);
    expect(calls.every((call) => !call.manifestUrl.includes('course-packs%2Fen%2F'))).toBe(true);
    expect(calls.every((call) => !call.rowSample.includes('course-packs%2Fen%2F'))).toBe(true);
  });

  it('fails closed when an approved French surface cannot be loaded', async () => {
    await expect(prefetchStudyTargetServerPack('fr', 'uk', {
      activationApproved: () => true,
      ensureRemoteCoursePack: async () => ({ state: 'missing' }),
    })).resolves.toEqual({
      state: 'error',
      studyTarget: 'fr',
      sourceLocale: 'uk',
      reason: 'remote_loader_failed',
    });
  });

  it('records French prefetch result separately from active study target state when activation is blocked by an injected gate', async () => {
    await expect(prefetchAndRecordStudyTargetServerPack('fr', 'ru', {
      activationApproved: () => false,
      now: () => '2026-06-29T00:00:00.000Z',
    })).resolves.toEqual({
      state: 'blocked',
      studyTarget: 'fr',
      sourceLocale: 'ru',
      reason: 'french_server_pack_activation_required',
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      ONBOARDING_STUDY_TARGET_SERVER_PREFETCH_RESULT_KEY,
      JSON.stringify({
        studyTarget: 'fr',
        sourceLocale: 'ru',
        state: 'blocked',
        reason: 'french_server_pack_activation_required',
        recordedAt: '2026-06-29T00:00:00.000Z',
      }),
    );
  });

  it('does not overwrite the French prefetch diagnostic record for English', async () => {
    await expect(prefetchAndRecordStudyTargetServerPack('en', 'ru', {
      now: () => '2026-06-29T00:00:30.000Z',
    })).resolves.toEqual({
      state: 'not_required',
      studyTarget: 'en',
    });

    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      ONBOARDING_STUDY_TARGET_SERVER_PREFETCH_RESULT_KEY,
      expect.any(String),
    );
  });

  it('records ready French prefetch cache directories only after every remote surface is ready', async () => {
    const result = await prefetchAndRecordStudyTargetServerPack('fr', 'uk', {
      activationApproved: () => true,
      now: () => '2026-06-29T00:01:00.000Z',
      ensureRemoteCoursePack: async (_manifestUrl, _rowUrl) => ({ state: 'ready', cacheDirUri: 'cache://surface' }),
    });

    expect(result.state).toBe('ready');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      ONBOARDING_STUDY_TARGET_SERVER_PREFETCH_RESULT_KEY,
      JSON.stringify({
        studyTarget: 'fr',
        sourceLocale: 'uk',
        state: 'ready',
        cacheDirUris: Array.from({ length: FRENCH_TARGET_REMOTE_SURFACES.length }, () => 'cache://surface'),
        recordedAt: '2026-06-29T00:01:00.000Z',
      }),
    );
  });

  it('would expose exactly source-locale-scoped French server registrations after the approval gate', () => {
    const registrations = getFrenchStudyTargetServerPackRegistrations('ru', () => true);
    expect(registrations).toHaveLength(6);
    expect(registrations.map((registration) => registration.surface)).toEqual([...FRENCH_TARGET_REMOTE_SURFACES]);
    for (const registration of registrations) {
      expect(registration.studyTarget).toBe('fr');
      expect(registration.sourceLocale).toBe('ru');
      expect(registration.manifestUrl).toContain('course-packs%2Ffr%2Fru%2F');
      expect(registration.manifestUrl).toContain('%2Fmanifest.json');
      expect(registration.manifestUrl).not.toContain('course-packs%2Fen%2F');
      expect(registration.rowUrl('rows/a.jsonl')).toContain('course-packs%2Ffr%2Fru%2F');
      expect(registration.rowUrl('rows/a.jsonl')).toContain('%2Frows%2Fa.jsonl');
      expect(registration.rowUrl('rows/a.jsonl')).not.toContain('course-packs%2Fen%2F');
    }

    const ukRegistrations = getFrenchStudyTargetServerPackRegistrations('uk', () => true);
    expect(ukRegistrations).toHaveLength(6);
    expect(ukRegistrations.every((registration) => registration.sourceLocale === 'uk')).toBe(true);
    expect(getFrenchStudyTargetServerPackRegistrations('es', () => true)).toEqual([]);
  });

  it('rejects in-pack paths that could escape the French source-locale container', () => {
    expect(sanitizeFrenchTargetInPackPath('rows/a.jsonl')).toBe('rows/a.jsonl');

    for (const badPath of [
      '../en/lesson/index.json',
      'rows/../index.json',
      '/rows/a.jsonl',
      'https://example.com/rows/a.jsonl',
      'course-packs/en/ru/lesson/index.json',
      'course-packs/fr/es/lesson/index.json',
      'rows/a.jsonl?alt=media',
      'rows/a.jsonl#fragment',
    ]) {
      expect(() => sanitizeFrenchTargetInPackPath(badPath)).toThrow('French target in-pack path');
    }

    const [registration] = getFrenchStudyTargetServerPackRegistrations('ru', () => true);
    expect(() => registration.rowUrl('../en/lesson/index.json')).toThrow('French target in-pack path');
  });

  it('does not import bundled French content or English plan-content registration', () => {
    expect(prefetchSource).not.toMatch(/require\(/);
    expect(prefetchSource).not.toMatch(/generated_fr|runtime_slices|plan_content_remote_registration/);
    expect(registrationSource).not.toMatch(/generated_fr|app_domains|runtime_slices|plan_content_remote_registration/);
    expect(prefetchSource).toContain('ensureRemoteCoursePack');
    expect(prefetchSource).toContain('ONBOARDING_STUDY_TARGET_SERVER_PREFETCH_RESULT_KEY');
    expect(prefetchSource).toContain('prefetchAndRecordStudyTargetServerPack');
    expect(prefetchSource).toContain('getFrenchStudyTargetServerPackRegistrations');
    expect(prefetchSource).toContain('isFrenchStudyTargetServerPackActivationApproved');
    expect(registrationSource).toContain('sanitizeFrenchTargetInPackPath');
  });
});
