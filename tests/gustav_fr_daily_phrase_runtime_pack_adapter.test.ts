import fs from 'fs';
import path from 'path';

import {
  FRENCH_TARGET_REMOTE_SURFACES,
  frenchTargetObjectPrefix,
  getFrenchStudyTargetServerPackRegistrations,
} from '../app/french_target_remote_registration';
import { entryToFrenchDailyPhrase } from '../app/french_daily_phrase_remote_runtime';

const ROOT = path.join(__dirname, '..');
const RUN_BUILD = path.join(
  ROOT,
  'docs',
  'gustav',
  'runs',
  '2026-07-04_fr_daily_phrases_production_v1',
  'build',
);

function readJson(name: string) {
  return JSON.parse(fs.readFileSync(path.join(RUN_BUILD, name), 'utf8'));
}

describe('Gustav French Daily Phrase runtime pack adapter', () => {
  it('registers Daily Phrase as a source-locale-scoped French server surface', () => {
    expect(FRENCH_TARGET_REMOTE_SURFACES).toContain('daily_phrase');
    expect(frenchTargetObjectPrefix('ru', 'daily_phrase')).toMatch(/^course-packs\/fr\/ru\/daily_phrase\//);
    expect(frenchTargetObjectPrefix('uk', 'daily_phrase')).toMatch(/^course-packs\/fr\/uk\/daily_phrase\//);

    const registrations = getFrenchStudyTargetServerPackRegistrations('ru', () => true);
    const dailyPhrase = registrations.find((registration) => registration.surface === 'daily_phrase');
    expect(dailyPhrase).toBeTruthy();
    expect(dailyPhrase?.manifestUrl).toContain('course-packs%2Ffr%2Fru%2Fdaily_phrase%2F');
    expect(dailyPhrase?.manifestUrl).not.toContain('course-packs%2Fen%2F');
  });

  it('adapts accepted server rows into DailyPhrase without English idiom fallback', () => {
    const payloadRu = readJson('fr_daily_phrase_runtime_payload_ru.dryrun.json');
    const payloadUk = readJson('fr_daily_phrase_runtime_payload_uk.dryrun.json');
    const ru = entryToFrenchDailyPhrase(payloadRu.entries[0], '2026-07-04');
    const uk = entryToFrenchDailyPhrase(payloadUk.entries[0], '2026-07-04');

    expect(ru).toMatchObject({
      id: payloadRu.entries[0].id,
      english: payloadRu.entries[0].targetText,
      literal: payloadRu.entries[0].literal,
      meaning: payloadRu.entries[0].meaning,
      text: payloadRu.entries[0].text,
      literal_uk: payloadRu.entries[0].literal_uk,
      meaning_uk: payloadRu.entries[0].meaning_uk,
      text_uk: payloadRu.entries[0].text_uk,
      date: '2026-07-04',
      scheduledDate: '2026-07-04',
      allowSave: true,
      active: false,
    });
    expect(uk).toMatchObject({
      english: payloadUk.entries[0].targetText,
      literal: payloadUk.entries[0].literal,
      meaning: payloadUk.entries[0].meaning,
      text: payloadUk.entries[0].text,
      literal_uk: payloadUk.entries[0].literal_uk,
      meaning_uk: payloadUk.entries[0].meaning_uk,
      text_uk: payloadUk.entries[0].text_uk,
    });
  });

  it('keeps the French Daily Phrase runtime isolated from English idioms and unscoped cloud reads', () => {
    const runtimeSource = fs.readFileSync(path.join(ROOT, 'app', 'french_daily_phrase_remote_runtime.ts'), 'utf8');
    const systemSource = fs.readFileSync(path.join(ROOT, 'app', 'daily_phrase_system.ts'), 'utf8');

    expect(runtimeSource).not.toContain('IDIOMS');
    expect(runtimeSource).toContain("item.surface === 'daily_phrase'");
    expect(systemSource).toContain('ensureFrenchRemoteDailyPhrases(sourceLocale)');
    expect(systemSource).toContain('frenchRemoteDailyPhraseForDay(sourceLocale) || frenchFlashcardForDay(sourceLocale)');
    expect(systemSource).toContain("dailyPhraseKey('fr')");
    expect(systemSource).toContain("dailyPhraseLastDateKey('fr')");
  });
});
