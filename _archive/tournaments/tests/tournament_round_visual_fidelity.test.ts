import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const round = readFileSync(path.join(root, 'app/tournament_round.tsx'), 'utf8');
const ui = readFileSync(
  path.join(root, 'components/ui/v2_ui.tsx'),
  'utf8',
);

describe('tournament round visual fidelity', () => {
  test('renders only the five owner-approved tournament modes', () => {
    for (const mode of [
      'guess_phrase',
      'fill_gap',
      'find_oddity',
      'translate_build',
      'speed_match',
    ]) {
      expect(round).toContain(`'${mode}'`);
    }
    for (const removed of ['listen_choose', 'listen_build', 'sound_contrast', 'dictate', 'voice']) {
      expect(round).not.toContain(`'${removed}'`);
    }
  });

  test('choice rows preserve the mock letter tile and separate authoritative feedback card', () => {
    expect(round).toContain('styles.optionLetter');
    expect(round).toContain('{letter}');
    expect(round).toContain('styles.choiceFeedbackCard');
    expect(round).toContain('styles.choiceFeedbackCorrect');
    expect(round).toContain('styles.choiceFeedbackWrong');
    // A room-scoped fingerprint paints the selected option immediately while
    // the callable remains authoritative for score and review details.
    expect(round).toMatch(/displayedCorrect\s*\?\s*'ok'\s*:\s*'bad'/);
    expect(round).toContain('answerFingerprints');
    expect(round).toContain('result.correct');
    expect(round).not.toContain('payload.correctIndex');
    expect(ui).toMatch(/selected && verdict === 'idle'[\s\S]*backgroundColor: P\.accentSoft/);
  });

  test('header uses the V2 segmented progress language without numeric timer copy', () => {
    expect(round).toContain('<V2Segments');
    expect(round).toContain('total={total}');
    expect(round).toContain('done={index + 1}');
  });

  // зачем 2026-08-03, вечер (новое указание владельца — отменяет утреннее
  // «цифра видна всегда»): кольцо чистое, без пунктирного декора и центральной
  // точки; отсчёт 3-2-1 появляется только на последних трёх секундах.
  test('timer is a clean ring: no inner dots, digits only in the final three seconds', () => {
    const timer = readFileSync(
      path.join(root, 'components/ui/V2Countdown.tsx'),
      'utf8',
    );
    expect(timer).not.toContain('strokeDasharray="1.5 4"');
    expect(timer).not.toContain('r={2.25}');
    expect(timer).toContain('const showDigit = seconds > 0 && seconds <= 3');
    expect(timer).toContain('{showDigit && (');
    expect(round).toContain("question.kind !== 'choice' && styles.questionZoneCompact");
  });

  test('phrase builder uses a fixed surfaced answer lane and ghost-preserving V2 chips', () => {
    expect(round).toContain('styles.assembled');
    expect(round).toContain('<V2ChipGhost');
    expect(round).toContain('<V2Chip');
    expect(round).toContain('<V2Cta');
  });

  test('speed pairs resolve motion only after authoritative status and keep fixed slots', () => {
    // зачем 2026-08-01 (аудит турнира): раньше контракт прибивал четыре
    // конкретных числа (140/160/240/300). Но охранять надо не сами величины, а
    // СВОЙСТВО: pendingTuple блокирует всё поле на время этой анимации, и на
    // прежних значениях режим «пары на скорость» отнимал у игрока до 2.4 с за
    // шесть пар. Теперь тест читает константы из исходника и проверяет
    // потолок блокировки — попадание успевает прочитаться, но темп не страдает.
    const matchConstant = (name: string): number => {
      const found = new RegExp(`const ${name} = (\\d+);`).exec(round);
      if (!found) throw new Error(`${name} не найдена в tournament_round.tsx`);
      return Number(found[1]);
    };
    const selectMs = matchConstant('MATCH_SELECT_MS');
    const correctPopMs = matchConstant('MATCH_CORRECT_POP_MS');
    const correctFadeMs = matchConstant('MATCH_CORRECT_FADE_MS');
    const wrongToneMs = matchConstant('MATCH_WRONG_TONE_MS');

    // Анимация обязана быть видимой — мгновенное исчезновение читается как сбой.
    expect(selectMs).toBeGreaterThanOrEqual(80);
    expect(correctPopMs).toBeGreaterThanOrEqual(80);
    // Верхняя граница блокировки ввода: верная пара ≤300 мс, неверная ≤220 мс.
    expect(correctPopMs + correctFadeMs).toBeLessThanOrEqual(300);
    expect(wrongToneMs).toBeLessThanOrEqual(220);
    expect(round).toContain('const [pendingTuple, setPendingTuple]');
    expect(round).toContain("verdict === 'correct'");
    expect(round).toContain('selected={selected}');
    expect(round).toContain('styles.matchSlot');
    expect(round).toMatch(/withDelay\(\s*MATCH_CORRECT_POP_MS/);
  });

  test('selected speed-pair cards use one rounded fill without a nested Android layer', () => {
    const matchCard = round.slice(round.indexOf('const MatchCard'), round.indexOf('const StrictMatchBoard'));
    const pickedStyle = round.slice(
      round.indexOf('strictMatchCardPicked:'),
      round.indexOf('strictMatchCardWrong:'),
    );

    expect(matchCard).not.toContain('translateY');
    expect(round).toMatch(/strictMatchCard:\s*\{[\s\S]*?overflow: 'hidden'/);
    expect(round).toContain("strictMatchTextSelected: { color: P.text, backgroundColor: 'transparent' }");
    expect(pickedStyle).toContain('backgroundColor: P.accentSoft');
    expect(pickedStyle).toContain('shadowOpacity: 0');
    expect(pickedStyle).toContain('elevation: 0');
    expect(pickedStyle).not.toContain('shadowRadius');
  });

  test('authoritative correct states use dark readable ink and a non-color mark', () => {
    expect(round).toContain('styles.strictMatchTextSelected');
    expect(round).toContain('styles.strictMatchTextCorrect');
    expect(round).toContain('strictMatchTextCorrect: { color: P.accentText }');
    expect(round).toContain('optionTextCorrect: { color: P.accentText }');
    expect(round).toContain('right={isCorrectOption ? (');
    expect(round).toContain('>✓</Text>');
    expect(round).not.toContain('optionTextCorrect: { color: P.accent }');
  });

  test('round motion has an explicit reduced-motion path', () => {
    expect(round).toContain("import { useReduceMotion } from '../hooks/use_reduce_motion'");
    expect(round).toContain('const reduceMotion = useReduceMotion()');
    expect(round).toContain('entering={reduceMotion ? undefined');
  });

  test('tournament primitives route haptics through user settings', () => {
    expect(ui).toContain("from '../../hooks/use-haptics'");
    expect(ui).not.toContain("from 'expo-haptics'");
  });
});
