import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

function between(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function expectGuardBeforeProviders(body: string, providers: readonly string[]): void {
  const guard = body.indexOf('await requireDialogExtraRepliesProviderReady(');
  expect(guard).toBeGreaterThan(-1);
  for (const provider of providers) {
    const providerCall = body.indexOf(provider);
    expect(providerCall).toBeGreaterThan(guard);
  }
  expect(body.match(/await requireDialogExtraRepliesProviderReady\(/g)).toHaveLength(1);
}

describe('paid Dialogue grant provider guard', () => {
  const scenario = read('app/ai_dialog_session.tsx');
  const companion = read('app/ai_companion_session.tsx');
  const tutor = read('app/ai_dialog_tutor_session.tsx');

  test('scenario send and retry guard stream and callable fallback before either provider', () => {
    const send = between(
      scenario,
      'const send = useCallback(',
      '// Голосовой ввод «зажми и продиктуй»',
    );
    expectGuardBeforeProviders(send, [
      'callPremiumDialogStream(payload,',
      'callPremiumDialogSend(payload)',
    ]);

    const retry = between(
      scenario,
      'const retryLastSend = useCallback(',
      '// Приветствие уже стоит в начальном состоянии.',
    );
    expectGuardBeforeProviders(retry, [
      'callPremiumDialogStream(payload,',
      'callPremiumDialogSend(payload)',
    ]);
  });

  test('companion guards callable send before provider execution', () => {
    const sendToTheo = between(
      companion,
      'const sendToTheo = useCallback(',
      'const send = useCallback(',
    );
    expectGuardBeforeProviders(sendToTheo, ['callPremiumDialogSend({']);
  });

  test('text tutor guards its turn callable before provider execution', () => {
    const runTurnStart = tutor.indexOf('const runTurn = useCallback(');
    const provider = tutor.indexOf('callTutorTextTurn({', runTurnStart);
    expect(runTurnStart).toBeGreaterThan(-1);
    expect(provider).toBeGreaterThan(runTurnStart);
    const runTurnPrefix = tutor.slice(runTurnStart, provider + 'callTutorTextTurn({'.length);
    expectGuardBeforeProviders(runTurnPrefix, ['callTutorTextTurn({']);
  });

  test('all six provider call sites are covered by exactly four ordered guards', () => {
    expect(scenario.match(/callPremiumDialogStream\(payload,/g)).toHaveLength(2);
    expect(scenario.match(/callPremiumDialogSend\(payload\)/g)).toHaveLength(2);
    expect(companion.match(/callPremiumDialogSend\(\{/g)).toHaveLength(1);
    expect(tutor.match(/callTutorTextTurn\(\{/g)).toHaveLength(1);
    expect(scenario.match(/await requireDialogExtraRepliesProviderReady\(/g)).toHaveLength(2);
    expect(companion.match(/await requireDialogExtraRepliesProviderReady\(/g)).toHaveLength(1);
    expect(tutor.match(/await requireDialogExtraRepliesProviderReady\(/g)).toHaveLength(1);
  });
});

