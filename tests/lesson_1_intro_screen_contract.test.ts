import { getLessonIntroScreens, LESSON_DATA } from '../app/lesson_data_all';
import type { IntroLine, IntroTextPart, LessonIntroScreen } from '../app/lesson_data_types';

function partText(parts?: IntroTextPart[]): string {
  return parts?.map((part) => part.text).join('') ?? '';
}

function lineText(line: IntroLine): string {
  return line.text ?? partText(line.parts);
}

function exampleText(example: any): string {
  const chunks: string[] = [];
  if (Array.isArray(example?.en)) chunks.push(partText(example.en));
  else if (typeof example?.en === 'string') chunks.push(example.en);

  for (const key of ['ru', 'uk', 'es', 'trRU', 'trUK', 'trES', 'noteRU', 'noteUK', 'noteES', 'labelRU', 'labelUK', 'labelES']) {
    if (typeof example?.[key] === 'string') chunks.push(example[key]);
  }
  return chunks.join(' ');
}

function screenVisibleText(screen: LessonIntroScreen): string {
  const chunks = [
    screen.titleRU,
    screen.titleUK,
    screen.titleES,
    screen.subtitleRU,
    screen.subtitleUK,
    screen.subtitleES,
    screen.textRU,
    screen.textUK,
    screen.textES,
    ...(screen.linesRU ?? []).map(lineText),
    ...(screen.linesUK ?? []).map(lineText),
    ...(screen.linesES ?? []).map(lineText),
    ...(screen.examples ?? []).map(exampleText),
  ];
  return chunks.filter(Boolean).join(' ');
}

function allIntroText(screens: LessonIntroScreen[]): string {
  return screens.map(screenVisibleText).join('\n');
}

describe('lesson 1 intro screen contract', () => {
  const screens = getLessonIntroScreens(1);
  const text = allIntroText(screens);

  it('is wired to the dedicated lesson 1 intro content', () => {
    expect(LESSON_DATA[1]?.introScreens).toBeDefined();
    expect(screens).toHaveLength(3);
    expect(screens.map((screen) => screen.lessonId)).toEqual([1, 1, 1]);
    expect(screens.map((screen) => screen.order)).toEqual([1, 2, 3]);
    expect(screens.map((screen) => screen.kind)).toEqual(['concept', 'formula', 'practice']);
    expect(screens.map((screen) => screen.screenId)).toEqual([
      'lesson_1_intro_1_concept',
      'lesson_1_intro_2_formula',
      'lesson_1_intro_3_practice',
    ]);
  });

  it('has complete visible copy for RU, UK, and ES on every block', () => {
    for (const screen of screens) {
      expect(screen.titleRU?.trim()).toBeTruthy();
      expect(screen.titleUK?.trim()).toBeTruthy();
      expect(screen.titleES?.trim()).toBeTruthy();
      expect(screen.subtitleRU?.trim()).toBeTruthy();
      expect(screen.subtitleUK?.trim()).toBeTruthy();
      expect(screen.subtitleES?.trim()).toBeTruthy();
      expect(screen.textRU?.trim()).toBeTruthy();
      expect(screen.textUK?.trim()).toBeTruthy();
      expect(screen.textES?.trim()).toBeTruthy();
      expect(screen.linesRU?.length).toBeGreaterThan(0);
      expect(screen.linesUK?.length).toBeGreaterThan(0);
      expect(screen.linesES?.length).toBeGreaterThan(0);
    }
  });

  it('keeps the core wrong and correct examples visible', () => {
    for (const phrase of [
      'I here',
      'He busy',
      'It important',
      'I am here',
      'He is busy',
      'It is important',
      'I am ready',
      'She is calm',
      'They are happy',
      'She ready',
      'She is ready',
      'I am outside',
      'They are tired',
      'It is empty',
    ]) {
      expect(text).toContain(phrase);
    }
  });

  it('keeps the intended A1 formula and am/is/are choice rules', () => {
    expect(text).toContain('am / is / are');
    expect(text).toContain('Who?');
    expect(text).toContain('description');
    expect(text).toContain('Use am with I.');
    expect(text).toContain('Use are with they.');
    expect(text).toContain('Use is with it.');
  });

  it('does not introduce later lesson topics into the first intro', () => {
    for (const forbidden of [
      'does not',
      "doesn't",
      'Did ',
      'will ',
      'Past Simple',
      'Present Continuous',
      'question word',
      'there is',
      'there are',
    ]) {
      expect(text.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it('does not expose broken placeholder values', () => {
    expect(text).not.toMatch(/\bundefined\b/i);
    expect(text).not.toMatch(/\bnull\b/i);
    expect(text).not.toMatch(/\btodo\b/i);
    expect(text).not.toMatch(/\blorem\b/i);
  });
});
