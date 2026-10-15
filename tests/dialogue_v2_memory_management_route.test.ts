import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

describe('Dialogue V2 Plus memory management route', () => {
  const source = normalizeEol(fs.readFileSync(
    path.join(__dirname, '..', 'app', 'dialogue_v2_memory.tsx'),
    'utf8',
  ));

  test('loads and clears only the selected language through audited callables', () => {
    expect(source).toContain('viewDialogueV2Memory({ studyTarget })');
    expect(source).toContain('clearDialogueV2Memory({ studyTarget })');
    // R52 (15.10): пустая расписка = очистка не подтверждена — плашка ошибки, а не молчание
    expect(source).toMatch(/if \(receipt\) \{[\s\S]{0,600}\} else \{[\s\S]{0,300}setClearFailed\(true\);/);
    expect(source).toContain("'[DIALOGUE-V2] memory: clear not confirmed (receipt=null)'");
    expect(source).toContain('fetchReleasedDialogueV2Catalogue(studyTarget)');
    expect(source).toContain('scenarioCheckpoints');
    expect(source).toContain('sharedSummary');
    expect(source).not.toMatch(/@react-native-firebase\/firestore|collection\(|doc\(/);
  });

  test('keeps summaries Plus-gated while exposing a confirmed delete-only privacy control', () => {
    expect(source).toContain('usePremium()');
    expect(source).toContain('accessResolved');
    expect(source).toContain('hasPremiumAccess');
    expect(source).toContain("pathname: '/premium_modal'");
    // зачем (2.0, 04.10): подтверждение очистки — стеклянное окно с деструктивным тоном, не системный Alert.
    expect(source).not.toContain('Alert.alert(');
    expect(source).toContain('<ThemedConfirmModal');
    expect(source).toMatch(/<ThemedConfirmModal[\s\S]*?\n\s+destructive\n/);
    expect(source).toContain('dialogue-v2-memory-clear-confirm');
    expect(source).toContain('dialogue-v2-memory-delete-only');
    expect(source).not.toContain('clearing || !hasPremiumAccess');
  });

  test('uses only the existing Design 2.0 tokens and neutral free-dialogue naming', () => {
    expect(source).toContain('useV2Palette');
    expect(source).toContain('V2_TYPE');
    expect(source).toContain('V2.radius.card');
    expect(source).toContain("ru: 'Память диалогов'");
    expect(source).not.toMatch(/Компас|Compass/);
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
