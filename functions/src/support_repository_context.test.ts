import { createHash } from 'crypto';
import { retrieveSupportRepositoryContext, supportEvidenceFingerprint, tokenizeSupportQuery } from './support_repository_context';
import type { SupportRepositoryChunk, SupportRepositorySnapshot } from './support_repository_context_types';

const required: SupportRepositoryChunk[] = [
  { path: 'specs/gmail-support-inbox.md', line: 1, text: 'Phraseman support inbox contract.' },
  { path: 'knowly-www/PRODUCT.md', line: 1, text: 'Public product contract.' },
  { path: 'functions/src/support_auto_reply_policy.ts', line: 1, text: 'Bounded support reply policy.' },
  { path: 'functions/src/support_repository_context.ts', line: 1, text: 'Repository evidence retrieval.' },
  { path: 'functions/src/support_reply_delivery.ts', line: 1, text: 'Durable email delivery.' },
  { path: 'functions/src/support_inbox.ts', line: 1, text: 'Support orchestration.' },
  { path: 'specs/support-product-lifecycle.json', line: 1, text: 'Versioned product lifecycle registry.' },
  { path: 'app/help.tsx', line: 1, text: 'Application help screen.' },
  { path: 'components/Help.tsx', line: 1, text: 'Help component.' },
  { path: 'constants/help.ts', line: 1, text: 'Help constants.' },
];

function snapshot(extra: SupportRepositoryChunk[]): SupportRepositorySnapshot {
  const chunks = [...required, ...extra];
  return {
    schemaVersion: 2,
    generatedAt: '2026-08-11T00:00:00.000Z',
    repository: 'badloar-star/phraseman',
    commit: 'a'.repeat(40),
    dirty: false,
    appVersion: '1.6.7',
    appBuild: '112',
    sourceFingerprint: createHash('sha256').update(JSON.stringify(chunks)).digest('hex'),
    filesDiscovered: chunks.length,
    filesIndexed: new Set(chunks.map((chunk) => chunk.path)).size,
    requiredFilesIncluded: required.slice(0, 7).map((chunk) => chunk.path),
    rootsIncluded: { app: 1, components: 1, constants: 1, 'functions/src': 3 },
    chunks,
  };
}

describe('support repository context', () => {
  test('ranks the matching product concept and excludes a frequent distractor', () => {
    const input = snapshot([
      { path: 'app/auth.ts', line: 10, text: 'The app is available for account access.' },
      { path: 'components/Learning.tsx', line: 20, text: 'Learners practise with lessons, flashcards and review activities.' },
    ]);
    const result = retrieveSupportRepositoryContext('How can I practise? Which learning activities are available?', input, 2);
    expect(result.trustworthy).toBe(true);
    expect(result.evidence.map((item) => item.path)).toEqual(['components/Learning.tsx']);
    expect(result.evidence[0].matchedConcepts).toContain('learning_activity');
  });

  test('generic substring overlap is not evidence', () => {
    const input = snapshot([{ path: 'app/auth.ts', line: 1, text: 'scan mapping canonical apply' }]);
    expect(retrieveSupportRepositoryContext('How can I use the app?', input).evidence).toEqual([]);
  });

  test('unknown product behavior returns no nearest noise', () => {
    const input = snapshot([{ path: 'app/auth.ts', line: 1, text: 'Account sign in with Apple.' }]);
    expect(retrieveSupportRepositoryContext('Can you recover a deleted chat from 2019?', input).evidence).toEqual([]);
  });

  test('tokenization is bounded, ignores filler, and preserves the late real question', () => {
    const tokens = tokenizeSupportQuery(`${Array.from({ length: 100 }, (_, i) => `noise${i}`).join(' ')} как восстановить покупку`);
    expect(tokens.length).toBeLessThanOrEqual(80);
    expect(tokens).toEqual(expect.arrayContaining(['восстановить', 'покупку']));
  });

  test('tampered snapshot fails trust validation', () => {
    const input = snapshot([{ path: 'components/PremiumContext.tsx', line: 20, text: 'Restore Plus subscription purchase.' }]);
    const tampered = { ...input, chunks: [...input.chunks, { path: 'app/tampered.ts', line: 1, text: 'changed' }] };
    expect(retrieveSupportRepositoryContext('restore purchase', tampered).trustReason).toBe('fingerprint_mismatch');
  });

  test('retrieves a verified historical lifecycle fact instead of current-name noise', () => {
    const input = snapshot([
      { path: 'constants/weeklyCompassIcons.ts', line: 1, text: 'Current decorative Compass icon.' },
      { path: 'support-history/compass_daily_assistant.md', line: 1, text: 'Product feature: compass_daily_assistant\nNames: Компас, Compass\nLifecycle status: retired\nPast/history question: earlier, previously, removed, раньше, было, пропало, убрали.\nRU: Отдельный раздел «Компас» раньше был. Позже этот раздел убрали.' },
    ]);
    const result = retrieveSupportRepositoryContext('Куда делся Компас? Он раньше был', input, 3);
    expect(result.queryConcepts).toEqual(expect.arrayContaining(['compass', 'feature_lifecycle']));
    expect(result.evidence[0].path).toBe('support-history/compass_daily_assistant.md');
    expect(result.evidence[0].matchedConcepts).toEqual(expect.arrayContaining(['compass', 'feature_lifecycle']));
  });
});

// зачем этот блок (владелец, 2026-08-17: «я одобрил, но сообщение не
// отправилось»): готовый ответ сверялся с отпечатком ВСЕЙ кодовой базы. Он
// меняется на каждом деплое — в том числе от чужой правки в другой части
// проекта. Между подготовкой ответа и нажатием кнопки проходил деплой, и
// ответ отменялся как устаревший. Женщина ждала письма, которого никто не
// отправил. Смысл проверки — «не устарели ли ФАКТЫ ответа», а факты живут в
// процитированных фрагментах.
describe('supportEvidenceFingerprint — отпечаток только процитированного', () => {
  const ctx = (chunks: Array<{ id: string; path: string; line: number; text: string }>) => ({
    generatedAt: '2026-08-17T00:00:00.000Z',
    commit: 'abc',
    dirty: false,
    appVersion: '1.0.0',
    appBuild: '1',
    sourceFingerprint: 'f'.repeat(64),
    trustworthy: true,
    trustReason: 'ok',
    queryConcepts: [] as readonly string[],
    evidence: chunks.map((c) => ({
      evidenceId: c.id, path: c.path, line: c.line, text: c.text,
      relevanceScore: 1, queryCoverage: 1, matchedConcepts: [] as readonly string[],
    })),
  });

  const A = { id: 'e1', path: 'app/pay.ts', line: 10, text: 'оплата через бота' };
  const B = { id: 'e2', path: 'app/login.ts', line: 20, text: 'вход по коду' };
  const C = { id: 'e3', path: 'app/other.ts', line: 30, text: 'не при чём' };

  test('правка НЕ процитированного файла не меняет отпечаток', () => {
    // Главный случай: чужой деплой больше не рушит готовый ответ.
    const before = supportEvidenceFingerprint(ctx([A, B, C]), ['e1']);
    const after = supportEvidenceFingerprint(
      ctx([A, B, { ...C, text: 'переписали совсем другое' }]), ['e1'],
    );
    expect(after).toBe(before);
  });

  test('правка процитированного файла меняет отпечаток', () => {
    // Защита остаётся: факт изменился — ответ обязан пересобраться.
    const before = supportEvidenceFingerprint(ctx([A, B]), ['e1']);
    const after = supportEvidenceFingerprint(
      ctx([{ ...A, text: 'оплата только через магазин' }, B]), ['e1'],
    );
    expect(after).not.toBe(before);
  });

  test('порядок цитат не влияет на отпечаток', () => {
    // зачем: модель возвращает id в произвольном порядке, а отпечаток обязан
    // быть одинаковым — иначе он «менялся» бы сам по себе.
    expect(supportEvidenceFingerprint(ctx([A, B]), ['e1', 'e2']))
      .toBe(supportEvidenceFingerprint(ctx([A, B]), ['e2', 'e1']));
  });

  test('исчезнувший процитированный фрагмент меняет отпечаток', () => {
    const before = supportEvidenceFingerprint(ctx([A, B]), ['e1', 'e2']);
    const after = supportEvidenceFingerprint(ctx([B]), ['e1', 'e2']);
    expect(after).not.toBe(before);
  });

  test('без цитат — пустая строка, а не хеш пустоты', () => {
    // зачем: пустой отпечаток означает «состав фактов неизвестен», и
    // вызывающий код обязан упасть на прежнюю проверку по всей базе.
    expect(supportEvidenceFingerprint(ctx([A]), [])).toBe('');
    expect(supportEvidenceFingerprint(ctx([]), ['e1'])).toBe('');
  });

  test('несуществующий id не роняет расчёт', () => {
    expect(() => supportEvidenceFingerprint(ctx([A]), ['нет-такого'])).not.toThrow();
    expect(supportEvidenceFingerprint(ctx([A]), ['нет-такого'])).toBe('');
  });

  test('разные строки одного файла различаются', () => {
    const one = supportEvidenceFingerprint(ctx([A]), ['e1']);
    const two = supportEvidenceFingerprint(ctx([{ ...A, line: 999 }]), ['e1']);
    expect(one).not.toBe(two);
  });
});
