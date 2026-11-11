import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const mockScheduleEnglishWordsSwitch = jest.fn();

jest.mock('../app/en_words_switch', () => ({
  scheduleEnglishWordsSwitch: (...args: unknown[]) => mockScheduleEnglishWordsSwitch(...args),
}));

import {
  classicLessonWordBank,
  classicLessonWordKeysForProgressCompatibility,
} from '../app/classic_lesson_words';
import {
  LEGACY_PLURAL_WORD_COUNT_MERGES,
  parseLessonWordCountsForBank,
} from '../app/lesson_word_progress_compat';
import lessonWordProgressCompatibilityRouteShim from '../app/lesson_word_progress_compat';

const REQUIRED = 3;
const PROVEN_DROPPED_CURRENT_KEYS = [
  'keys', 'windows', 'hands', 'tickets', 'cards', 'coins', 'messages', 'sundays', 'weekends', 'batteries',
  'tuesday', 'monday', 'friday', 'thursday', 'saturdays', 'days', 'sunday', 'towels', 'bags', 'boxes',
  'minutes', 'children', 'gloves', 'suitcases', 'friends', 'letters', 'hours', 'bookings', 'maps', 'eyes',
] as const;

type LiveParserDependencies = Readonly<{
  storageStudyTarget: jest.Mock;
  classicWordsActiveFor: jest.Mock;
  classicLessonWordKeysForProgressCompatibility: jest.Mock;
  lessonWordBank: jest.Mock;
  parseLessonWordCountsForBank: jest.Mock;
}>;

function loadLiveScreenParser(dependencies: LiveParserDependencies) {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_words.tsx'), 'utf8');
  const sourceFile = ts.createSourceFile('lesson_words.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = sourceFile.statements.find((statement): statement is ts.FunctionDeclaration => (
    ts.isFunctionDeclaration(statement) && statement.name?.text === 'parseLessonWordCounts'
  ));
  if (!declaration) throw new Error('parseLessonWordCounts declaration missing');
  const transpiled = ts.transpileModule(`
    const REQUIRED = 3;
    const storageStudyTarget = dependencies.storageStudyTarget;
    const classicWordsActiveFor = dependencies.classicWordsActiveFor;
    const classicLessonWordKeysForProgressCompatibility = dependencies.classicLessonWordKeysForProgressCompatibility;
    const lessonWordBank = dependencies.lessonWordBank;
    const parseLessonWordCountsForBank = dependencies.parseLessonWordCountsForBank;
    ${declaration.getText(sourceFile)}
    module.exports = parseLessonWordCounts;
  `, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} as unknown };
  vm.runInNewContext(transpiled, { module, exports: module.exports, dependencies, Set });
  return module.exports as (raw: string | null, lessonId: number, studyTarget?: string) => Record<string, number>;
}

const parseEnglish = (
  raw: string,
  lessonId: number,
  activeKeys: ReadonlySet<string>,
): Record<string, number> => parseLessonWordCountsForBank(raw, {
  lessonId,
  required: REQUIRED,
  englishCompatibility: true,
  activeKeys,
});

describe('Classic lesson word progress compatibility', () => {
  beforeEach(() => {
    mockScheduleEnglishWordsSwitch.mockClear();
  });

  test('keeps every current exact English key learned without scheduling storage migration', () => {
    const affectedCurrentKeys: string[] = [];

    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      const activeKeys = classicLessonWordKeysForProgressCompatibility('en', lessonId);
      const seeded = Object.fromEntries([...activeKeys].map((word) => [word, REQUIRED]));
      const parsed = parseEnglish(JSON.stringify(seeded), lessonId, activeKeys);

      for (const word of activeKeys) {
        expect(parsed[word]).toBe(REQUIRED);
        if (LEGACY_PLURAL_WORD_COUNT_MERGES[word]) affectedCurrentKeys.push(word);
      }
    }

    expect(affectedCurrentKeys).toEqual(expect.arrayContaining([...PROVEN_DROPPED_CURRENT_KEYS]));
    expect(mockScheduleEnglishWordsSwitch).not.toHaveBeenCalled();
  });

  test('keeps the compatibility helper valid as an Expo Router app module', () => {
    expect(lessonWordProgressCompatibilityRouteShim()).toBeNull();
  });

  test('keeps the public bank wrapper scheduling the existing English switch', () => {
    classicLessonWordBank('en', 1);

    expect(mockScheduleEnglishWordsSwitch).toHaveBeenCalledTimes(1);
    const bankOf = mockScheduleEnglishWordsSwitch.mock.calls[0]?.[0] as ((lessonId: number) => readonly string[]);
    expect(bankOf(1)).toEqual(classicLessonWordBank('en', 1).map((word) => word.en));
  });

  test('preserves legacy plural-to-singular migration when only the singular is active', () => {
    const parsed = parseEnglish(JSON.stringify({ keys: 3, key: 1 }), 2, new Set(['key']));

    expect(parsed).toEqual({ key: 3 });
  });

  test('does not guess historical recovery from a singular count when only the plural is active', () => {
    const parsed = parseEnglish(JSON.stringify({ key: 3 }), 2, new Set(['keys']));

    expect(parsed).toEqual({ key: 3 });
    expect(parsed.keys).toBeUndefined();
  });

  test('leaves ambiguous aliases unchanged when both or neither key is active', () => {
    const raw = JSON.stringify({ keys: 2, key: 3 });

    expect(parseEnglish(raw, 2, new Set(['keys', 'key']))).toEqual({ keys: 2, key: 3 });
    expect(parseEnglish(raw, 2, new Set())).toEqual({ keys: 2, key: 3 });
  });

  test('is byte-idempotent after a valid legacy migration', () => {
    const once = parseEnglish(JSON.stringify({ keys: 3 }), 2, new Set(['key']));
    const onceRaw = JSON.stringify(once);
    const twiceRaw = JSON.stringify(parseEnglish(onceRaw, 2, new Set(['key'])));

    expect(twiceRaw).toBe(onceRaw);
  });

  test('does not apply English alias or pronoun compatibility to another target', () => {
    const raw = JSON.stringify({ keys: 3 });
    const parsed = parseLessonWordCountsForBank(raw, {
      lessonId: 1,
      required: REQUIRED,
      englishCompatibility: false,
      activeKeys: new Set(['key']),
    });

    expect(parsed).toEqual({ keys: 3 });
    expect(parsed.I).toBeUndefined();
  });

  test('the live screen parser chooses the side-effect-free bank only for active English Classic words', () => {
    const dependencies: LiveParserDependencies = {
      storageStudyTarget: jest.fn((target?: string) => target ?? 'en'),
      classicWordsActiveFor: jest.fn((target: string) => target === 'en'),
      classicLessonWordKeysForProgressCompatibility: jest.fn(() => new Set(['keys'])),
      lessonWordBank: jest.fn(() => [{ en: 'legacy' }]),
      parseLessonWordCountsForBank: jest.fn(() => ({ marker: 1 })),
    };
    const parseLive = loadLiveScreenParser(dependencies);

    expect(parseLive(null, 1, 'en')).toEqual({});
    expect(parseLive('', 1, 'en')).toEqual({});
    expect(dependencies.classicWordsActiveFor).not.toHaveBeenCalled();
    expect(dependencies.classicLessonWordKeysForProgressCompatibility).not.toHaveBeenCalled();
    expect(dependencies.lessonWordBank).not.toHaveBeenCalled();
    expect(dependencies.parseLessonWordCountsForBank).not.toHaveBeenCalled();

    expect(parseLive('{"keys":3}', 1, 'en')).toEqual({ marker: 1 });
    expect(dependencies.classicLessonWordKeysForProgressCompatibility).toHaveBeenCalledWith('en', 1);
    expect(dependencies.lessonWordBank).not.toHaveBeenCalled();
    expect(dependencies.parseLessonWordCountsForBank).toHaveBeenLastCalledWith('{"keys":3}', expect.anything());

    parseLive('{"keys":3}', 1, 'fr');
    expect(dependencies.classicLessonWordKeysForProgressCompatibility).toHaveBeenCalledTimes(1);
    expect(dependencies.parseLessonWordCountsForBank).toHaveBeenLastCalledWith('{"keys":3}', expect.objectContaining({
      englishCompatibility: false,
    }));
  });

  test('the screen parser wiring contains no completion, stats, or reward call', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_words.tsx'), 'utf8');

    expect(source).toContain('classicLessonWordKeysForProgressCompatibility');
    expect(source).toContain('parseLessonWordCountsForBank');
    expect(source).not.toMatch(/parseLessonWordCounts[\s\S]{0,1200}(practiceRunes|bumpStatsDaily|onCorrectAnswer)/);
  });
});
