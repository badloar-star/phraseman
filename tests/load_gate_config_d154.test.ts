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
  expect(src).toContain('testID="mistake-practice-try-again"');
  // Смена аккаунта больше не оставляет экран в вечной загрузке.
  expect(src).not.toMatch(/stale_account_generation'\)\s*return;/);
  // Потолок трогает только стадию подготовки; окно подтверждения энергии — нет.
  expect(src).toContain("if (prepareStageRef.current !== 'preparing')");
  expect(src).toContain("prepareStageRef.current === 'abandoned'");
});
