import fs from 'node:fs';
import path from 'node:path';
import { mistakePracticeLengthOptions } from '../modules/mistake-practice/session';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'mistake-practice', 'MistakePracticeSetupSheet.tsx'),
  'utf8',
);

describe('mistake practice setup sheet A contract', () => {
  test('uses the shared hybrid sheet with only title, lengths and the start action', () => {
    expect(source).toContain('HybridSheetShell');
    expect(source).toContain("title: 'Ошибки'");
    expect(source).toContain('{copy.title}</Text>');
    expect(source).toContain("start: 'Начать'");
    expect(source).toContain('{copy.start}</Text>');
    expect(source).not.toMatch(/Switch|voiceOnly|voiceReadyCount|Только голос|Только устно/);
    expect(source).not.toMatch(/Что повторим|смешиваются|энерги|наград|нужно ещё|ошибок готов/i);
  });

  test('keeps every launch control disabled below five', () => {
    expect(mistakePracticeLengthOptions(4).every((option) => !option.enabled)).toBe(true);
    expect(source).toContain("accessibilityState={{ disabled: !option.enabled, checked: active }}");
    expect(source).toContain('active && option.enabled ? t.accent : t.bgSurface2');
    expect(source).toContain('accessibilityLabel={`${copy.length}: ${optionLabel(option.id, copy.all)}`}');
  });
});
