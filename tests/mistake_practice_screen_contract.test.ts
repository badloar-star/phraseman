import fs from 'node:fs';
import path from 'node:path';

const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_practice_session.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
const runtime = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_practice_session_runtime.ts'), 'utf8');

describe('mistake practice session screen', () => {
  test('keeps the visual background edge-to-edge while safe area only offsets content', () => {
    expect(screen).toContain("import ScreenGradient from '../components/ScreenGradient';");
    expect(screen).toContain('function MistakePracticeScreenFrame');
    expect(screen).toContain('<ScreenGradient>');
    expect(screen).toContain('<SafeAreaView style={styles.screen}>');
    expect(screen).not.toMatch(/<SafeAreaView[^>]*backgroundColor/);
  });

  test('keeps completion self-explanatory without helper microcopy', () => {
    expect(screen).toContain('Сессия завершена');
    expect(screen).not.toContain('Ошибки уже обновлены');
    expect(screen).not.toContain('Следующая проверка появится адаптивно');
    expect(screen).not.toContain('styles.completeCopy');
  });

  test('uses the new journal/session runtime and standard energy authority', () => {
    expect(screen).toContain('advanceMistakePracticeSession');
    expect(screen).toContain('appendMistakeEvent');
    expect(screen).toContain('confirmSpendOne');
    expect(screen).toContain('saveMistakePracticeSession');
    expect(screen).toContain('submissionLatchRef.current');
    expect(screen).toContain('MISTAKE_EXERCISE_MODE_REGISTRY[entry.exercise.mode]');
    expect(screen).not.toContain('independent: true');
    expect(screen).not.toMatch(/sm2/i);
  });

  test('renders correction feedback and voice through the shared speech panel', () => {
    expect(screen).toContain('Правильный ответ');
    expect(screen).toContain('Почему так');
    expect(screen).toContain('SpeakingPanel');
    expect(screen).toContain('Не удалось уверенно распознать речь');
    expect(screen).not.toContain("entry.exercise.mode.replace(/_/g, ' ')");
  });

  test('offers explicit hide confirmation and undo as journal events', () => {
    expect(screen).toContain('ThemedConfirmModal');
    expect(screen).toContain("type: 'hidden'");
    expect(screen).toContain("type: 'restored'");
    expect(screen).toContain('Скрыть ошибку?');
    expect(screen).toContain("undo: 'Вернуть'");
    expect(screen).toContain('{copy.undo}</Text>');
  });

  test('is registered as an Expo route', () => {
    expect(layout).toContain('<Stack.Screen name="mistake_practice_session"');
  });

  test('keeps focused practice isolated from the persisted generic session', () => {
    expect(screen).toContain('focusMistakeId?: string');
    expect(screen).toContain('returnTo?: string');
    expect(screen).toContain('focusMistakeId: focusedMistakeId');
    expect(screen).toContain("params.returnTo === 'max_voice_review'");
    expect(screen).toContain("pathname: '/max_voice_review'");
    expect(screen).toContain('params.maxReviewSessionId');
    expect(screen).toContain("const persistSession = entrySource === 'cards'");
    expect(screen).toContain('prepareMistakePracticeSession');
    expect(runtime).toContain('input.persistSession');
    expect(runtime).toContain('loadMistakePracticeSession');
    expect(runtime).toContain('saveMistakePracticeSession');
    expect(screen).toContain('if (persistSession) void clearMistakePracticeSession');
  });

  test('fences every asynchronous bootstrap before committing owner-scoped UI state', () => {
    expect(runtime).toContain('captureMistakePracticeSessionAccountFence(input.accountScope)');
    expect(runtime).toContain('accountFence.assertCurrent();');
    expect(screen).toMatch(/await prepareMistakePracticeSession\([\s\S]*?trackMistakePracticeEvent\([\s\S]*?setAccountScope\(scope\);/);
  });
});
