/**
 * D158 (§117): «тихо» = без паники, не «бесконечно». Один конфиг потолка загрузки и правило, что
 * экран после потолка говорит спокойное «Сейчас недоступно» вместо вечного скелетона.
 */
import fs from 'fs';
import path from 'path';
import {
  LOAD_GATE_ATTEMPTS,
  LOAD_GATE_BACKOFF_MS,
  LOAD_GATE_TOTAL_MS,
  loadGateBackoffMs,
} from '../app/load_gate_config';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('three quiet retries with ~1/3/8 s pauses sum to the 12 s ceiling', () => {
  expect(LOAD_GATE_ATTEMPTS).toBe(3);
  expect([...LOAD_GATE_BACKOFF_MS]).toEqual([1000, 3000, 8000]);
  expect(LOAD_GATE_BACKOFF_MS.reduce((a, b) => a + b, 0)).toBe(LOAD_GATE_TOTAL_MS);
  expect([1, 2, 3].map(loadGateBackoffMs)).toEqual([1000, 3000, 8000]);
  expect(loadGateBackoffMs(4)).toBeNull();
  expect(loadGateBackoffMs(0)).toBeNull();
  expect(loadGateBackoffMs(Number.NaN)).toBeNull();
});

test('«Вспомни» uses the shared gate and ends in a calm «Сейчас недоступно», not an eternal skeleton', () => {
  const src = read('app/flashcards_recall_session.tsx');
  expect(src).toContain("from './load_gate_config'");
  expect(src).toContain('loadGateBackoffMs(silentRecallRetryRef.current + 1)');
  expect(src).toContain('testID="fc-recall-unavailable"');
  expect(src).toContain("testID: 'fc-recall-try-again'");
  expect(src).toContain("AppState.addEventListener('change'");
  // Старый «5 по 20 с, затем вечный скелетон» не возвращается.
  expect(src).not.toMatch(/silentRecallRetryRef\.current >= 5/);
});

test('mistake practice: skeleton instead of a full-screen spinner, calm unavailable, ceiling never cuts the energy prompt', () => {
  const src = read('app/mistake_practice_session.tsx');
  expect(src).toContain("from './load_gate_config'");
  expect(src).toContain('<MistakePracticeLoadingSkeleton />');
  expect(src).not.toMatch(/<ActivityIndicator/);
  expect(src).not.toContain('alert-circle-outline');
  // зачем (владелец 18.10: «экранов-ошибок нигде»): «Сейчас недоступно / Попробовать снова» убрано — тихий уход в «Мои ошибки».
  expect(src).not.toContain('testID="mistake-practice-try-again"');
  expect(src).toContain("useSilentLeave(mistakeSilentLeave, 'mistake_practice_session'");
  // Смена аккаунта больше не оставляет экран в вечной загрузке.
  expect(src).not.toMatch(/stale_account_generation'\)\s*return;/);
  // Потолок трогает только стадию подготовки; окно подтверждения энергии — нет.
  expect(src).toContain("if (prepareStageRef.current !== 'preparing')");
  expect(src).toContain("prepareStageRef.current === 'abandoned'");
});

test('stats screen: no eternal skeleton — ceiling and failure end in calm «Сейчас недоступно» with retry', () => {
  const src = read('app/streak_stats.tsx');
  expect(src).toContain("from './load_gate_config'");
  expect(src).toContain('testID="stats-unavailable"');
  expect(src).toContain('testID="stats-try-again"');
  expect(src).toContain("'[STATS-GATE] skeleton:ceiling → unavailable'");
  expect(src).toContain("'[STATS-GATE] loadAll:failed'");
  // Немые catch в кэше статистики не возвращаются.
  expect(read('app/statsCache.ts')).not.toMatch(/\.catch\(\(\) => \{\}\)/);
});

test('training setup: shared gate, calm «Сейчас недоступно», no 5×20 s eternal deck skeleton', () => {
  const src = read('app/flashcards_training_setup.tsx');
  expect(src).toContain("from './load_gate_config'");
  expect(src).toContain('loadGateBackoffMs(silentRetryRef.current + 1)');
  // зачем (cards-section): разметка «Сейчас недоступно» — в TrainingSetupV2
  const setupView = read('app/flashcards/TrainingSetupV2.tsx');
  // зачем (правило владельца 18.10): «Сейчас недоступно» с кнопкой заменено спокойным пустым состоянием — повтор идёт сам (ворота), без кнопки
  expect(setupView).toContain('testID="fc-training-setup-quiet"');
  expect(setupView).not.toContain('fc-training-setup-try-again');
  expect(src).toContain("AppState.addEventListener('change'");
  expect(src).not.toMatch(/silentRetryRef\.current >= 5/);
  expect(src).not.toContain('}, 20_000);');
});

test('video packs: hung load has a ceiling, retries 1/3/8 s, then calm «Сейчас недоступно» (no eternal skeleton)', () => {
  const src = read('app/flashcards_video_packs.tsx');
  expect(src).toContain("from './load_gate_config'");
  expect(src).toContain("const delayMs = loadState === 'loading' ? LOAD_GATE_TOTAL_MS : (backoffMs as number);");
  // зачем (правило владельца 18.10 «экранов-ошибок нигде»): сбой каталога рисует то же спокойное «Пока пусто», что и пустой список; повтор идёт сам
  expect(src).not.toContain('fc-video-packs-unavailable');
  expect(src).not.toContain('fc-video-packs-try-again');
  expect(src).toContain("branch === 'empty' || branch === 'error'");
  expect(src).toContain("logNoErrorScreen('flashcards_video_packs'");
  expect(src).toContain("AppState.addEventListener('change'");
  expect(src).not.toMatch(/silentRetryRef\.current >= 5/);
  expect(src).not.toContain('}, 20_000);');
});

test('«Видео» tab: ceiling + 1/3/8 s retries, then calm «Сейчас недоступно» instead of eternal skeletons', () => {
  const src = read('app/lingman_videos.tsx');
  expect(src).toContain("from './load_gate_config'");
  expect(src).toContain('loadGateBackoffMs(catalogRetryRef.current + 1)');
  expect(src).toContain('testID="youtube-catalog-unavailable"');
  expect(src).toContain('testID="youtube-catalog-try-again"');
  expect(src).toContain("AppState.addEventListener('change'");
  expect(src).not.toMatch(/catalogRetryRef\.current >= 5/);
  expect(src).not.toContain('}, 20000);');
});

test('French diagnostic: per-attempt ceiling, 1/3/8 s retries, calm «Сейчас недоступно» instead of eternal question skeleton', () => {
  const src = read('app/diagnostic_test.tsx');
  expect(src).toContain("from './load_gate_config'");
  expect(src).toContain('const backoffMs = loadGateBackoffMs(attempt);');
  expect(src).toContain('ceiling_${LOAD_GATE_TOTAL_MS}ms');
  // зачем (владелец 18.10: «экранов-ошибок нигде»): после всех попыток — тихий уход назад, без «Сейчас недоступно».
  expect(src).not.toContain('testID="diagnostic-questions-unavailable"');
  expect(src).toContain('questionsUnavailable && !questionsLoading');
  expect(src).toContain("'questions_unavailable_after_retries'");
  expect(src).not.toContain('DIAG_RETRY_DELAY_MS = 20000');
  expect(src).not.toContain('остаётся скелетон');
});
