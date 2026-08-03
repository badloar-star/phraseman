import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const RELEASE_LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export const RELEASE_LANGUAGES = Object.freeze(['es', 'de', 'it', 'fr']);

export function buildReleaseBank({ language, bankVersion, levelBanks }) {
  if (!RELEASE_LANGUAGES.includes(language)) throw new TypeError(`Unsupported release language: ${language}`);
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(bankVersion)) throw new TypeError('Invalid release bankVersion');
  if (!levelBanks || typeof levelBanks !== 'object') throw new TypeError('levelBanks are required');

  const questions = [];
  for (const level of RELEASE_LEVELS) {
    const levelBank = levelBanks[level];
    if (levelBank?.language !== language || levelBank?.level !== level) {
      throw new TypeError(`${language}/${level}: candidate metadata mismatch`);
    }
    if (!Array.isArray(levelBank.questions) || levelBank.questions.length !== 40) {
      throw new TypeError(`${language}/${level}: expected 40 questions`);
    }
    for (let index = 0; index < levelBank.questions.length; index += 1) {
      const question = levelBank.questions[index];
      const expectedId = `${language}-${level.toLowerCase()}-${String(index + 1).padStart(3, '0')}`;
      if (question?.id !== expectedId || question?.level !== level) {
        throw new TypeError(`${language}/${level}: invalid question identity at ${index + 1}`);
      }
      questions.push({ ...structuredClone(question), reviewStatus: 'independent_ai_reviewed' });
    }
  }

  if (new Set(questions.map(({ id }) => id)).size !== 240) {
    throw new TypeError(`${language}: duplicate question IDs`);
  }
  return {
    schemaVersion: 3,
    bankVersion,
    language,
    levels: [...RELEASE_LEVELS],
    questions,
  };
}

export function writeReleaseBank(filePath, bank) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(bank, null, 2)}\n`, 'utf8');
}
