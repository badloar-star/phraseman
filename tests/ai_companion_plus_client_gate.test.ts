import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn() }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(),
}));

// Jest hoists the dependency mocks above this import at runtime.
// eslint-disable-next-line import/first
import {
  classifyPremiumDialogError,
  getPremiumDialogErrorMessage,
} from '../app/ai_dialog_client';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'ai_companion_session.tsx'),
  'utf8',
);

function between(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('free-form dialogue Plus client boundary', () => {
  test('classifies a Plus denial separately from Free quota exhaustion', () => {
    const plusError = { code: 'functions/permission-denied', message: 'dialog_plus_required' };
    const quotaError = { code: 'functions/resource-exhausted', message: 'dialog_free_limit' };

    expect(classifyPremiumDialogError(plusError)).toBe('plus_required');
    expect(classifyPremiumDialogError(quotaError)).toBe('free_limit');
    expect(getPremiumDialogErrorMessage(plusError, { lang: 'ru' })).toContain('Plus');
    expect(getPremiumDialogErrorMessage(plusError, { lang: 'ru' })).not.toContain('лимит');
  });

  test('mounts the usable companion only after resolved Plus access', () => {
    const gate = between('function AiCompanionPlusGate(', 'function AiCompanionSession()');

    expect(gate).toContain('const { accessResolved, hasPremiumAccess } = usePremium();');
    expect(gate).toContain("pathname: '/premium_modal'");
    expect(gate).toContain("source: 'ai_companion_direct_entry'");
    expect(gate).toContain('if (!accessResolved)');
    expect(gate).toContain('if (!hasPremiumAccess)');

    const routeStart = source.indexOf('export default function AiCompanionSessionRoute()');
    expect(routeStart).toBeGreaterThanOrEqual(0);
    const route = source.slice(routeStart);
    expect(route).toContain('<AiCompanionPlusGate>');
    expect(route).toContain('<AiDialogConsentGate>');
    expect(route.indexOf('<AiCompanionPlusGate>')).toBeLessThan(route.indexOf('<AiDialogConsentGate>'));
  });

  test('never reads, records, renders, or purchases Free quota from companion', () => {
    expect(source).not.toContain('readAiDialogDailyQuota');
    expect(source).not.toContain('recordAiDialogDailyQuotaFromServer');
    expect(source).not.toContain('markAiDialogDailyQuotaExhausted');
    expect(source).not.toContain('requireDialogExtraRepliesProviderReady');
    expect(source).not.toContain('DialogQuotaBadge');
    expect(source).not.toContain('dailyQuota');
  });

  test('warms only while the live route entitlement is resolved Plus', () => {
    const warmEffect = between(
      '// Греем ТОЛЬКО после подтверждения доступа',
      '// Приветствие собеседника присутствует',
    );

    const guard = warmEffect.indexOf('if (!companionGateOpen || !accessResolved || !hasPremiumAccess) return;');
    const warm = warmEffect.indexOf('warmPremiumDialog(studyTarget);');
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(warm).toBeGreaterThan(guard);
  });

  // зачем (владелец 11.11, «сообщение Тео — мгновенно»): прежний порядок «перепроверка → реплика» заменён решением владельца:
  // реплика появляется по тапу. Неизменным остаётся главное — на СЕРВЕР реплика уходит только после некэшированной
  // перепроверки Plus, а ответ «Plus нет» сначала откатывает реплику и только потом открывает оплату.
  test('shows the turn instantly but rechecks uncached Plus before provider work', () => {
    const send = between('const send = useCallback(', '// Приветствие уже в начальном состоянии.');
    const append = send.indexOf("setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);");
    const recheck = send.indexOf('await getVerifiedPremiumAccessStatus({');
    const provider = send.indexOf('sendToTheo(trimmed, history)');
    const history = send.indexOf('const history = buildHistory();');

    expect(send).toContain('bypassCache: true');
    expect(send).toContain('allowCloudRefresh: false');
    expect(append).toBeGreaterThanOrEqual(0);
    expect(history).toBeGreaterThanOrEqual(0);
    expect(history).toBeLessThan(append);
    expect(recheck).toBeGreaterThan(append);
    expect(provider).toBeGreaterThan(recheck);
  });

  test('a confirmed "no Plus" recheck rolls the instant turn back before the paywall; a failed recheck never opens it', () => {
    const send = between('const send = useCallback(', '// Приветствие уже в начальном состоянии.');
    const noPlusBranch = send.indexOf('if (!stillHasPlus && !recheck.failed) {');
    const rollback = send.indexOf('prev.slice(0, -1)', noPlusBranch);
    const restoreInput = send.indexOf('setInput(trimmed);', noPlusBranch);
    const paywall = send.indexOf('openCompanionPlusPaywall()', noPlusBranch);
    const provider = send.indexOf('sendToTheo(trimmed, history)');

    expect(noPlusBranch).toBeGreaterThanOrEqual(0);
    expect(rollback).toBeGreaterThan(noPlusBranch);
    expect(restoreInput).toBeGreaterThan(rollback);
    expect(paywall).toBeGreaterThan(restoreInput);
    expect(paywall).toBeLessThan(provider);
    expect(send).toContain('recheck.failed = true;');
  });

  test('removes the unanswered optimistic turn when the server denies Plus', () => {
    const send = between('const send = useCallback(', '// Приветствие уже в начальном состоянии.');
    const plusBranch = send.indexOf("errorKind === 'plus_required'");
    const removeLastTurn = send.indexOf('prev.slice(0, -1)', plusBranch);
    const paywall = send.indexOf('openCompanionPlusPaywall()', plusBranch);

    expect(plusBranch).toBeGreaterThanOrEqual(0);
    expect(removeLastTurn).toBeGreaterThan(plusBranch);
    expect(paywall).toBeGreaterThan(removeLastTurn);
  });
});
