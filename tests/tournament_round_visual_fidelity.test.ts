import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const round = readFileSync(path.join(root, 'app/tournament_round.tsx'), 'utf8');
const ui = readFileSync(
  path.join(root, 'components/tournament/tournament_v2_ui.tsx'),
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
    // Green is allowed only after the callable's authoritative boolean verdict;
    // no public payload key may paint an option correct optimistically.
    expect(round).toMatch(/authoritativeCorrect\s*\?\s*'ok'\s*:\s*'bad'/);
    expect(round).toContain('result.correct');
    expect(round).not.toContain('payload.correctIndex');
    expect(ui).toMatch(/selected && verdict === 'idle'[\s\S]*backgroundColor: P\.accentSoft/);
  });

  test('header uses the V2 segmented progress language without numeric timer copy', () => {
    expect(round).toContain('<V2Segments');
    expect(round).toContain('total={total}');
    expect(round).toContain('done={index + 1}');
  });

  test('timer keeps its visual ring and renders the remaining seconds at every point', () => {
    const timer = readFileSync(
      path.join(root, 'components/tournament/TournamentCountdown.tsx'),
      'utf8',
    );
    expect(timer).toContain('strokeDasharray="1.5 4"');
    expect(timer).toContain('r={2.25}');
    expect(timer).toContain('<Text style={[styles.ringText, low && styles.ringTextLow]}>');
    expect(timer).not.toContain('{low ? <Text');
    expect(round).toContain("question.kind !== 'choice' && styles.questionZoneCompact");
  });

  test('phrase builder uses a fixed surfaced answer lane and ghost-preserving V2 chips', () => {
    expect(round).toContain('styles.assembled');
    expect(round).toContain('<V2ChipGhost');
    expect(round).toContain('<V2Chip');
    expect(round).toContain('<V2Cta');
  });

  test('speed pairs resolve motion only after authoritative status and keep fixed slots', () => {
    expect(round).toContain('const MATCH_SELECT_MS = 140');
    expect(round).toContain('const MATCH_CORRECT_POP_MS = 160');
    expect(round).toContain('const MATCH_CORRECT_FADE_MS = 240');
    expect(round).toContain('const MATCH_WRONG_TONE_MS = 300');
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
