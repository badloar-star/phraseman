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
    // зачем (2026-09-14): запрет на «болтливые» подписи касается ВИДИМОГО текста,
    // а не имён функций. `mistakePracticeSessionCostsEnergy` решает, показывать ли
    // канонический бейдж цены (правило владельца 2026-08-23 «цена входа видна до
    // нажатия»), и словом «энергия» в интерфейсе не является.
    const visibleCopy = source
      .split('\n')
      .filter((line) => !line.includes('mistakePracticeSessionCostsEnergy') && !line.includes('EnergyCostBadge') && !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*'))
      .join('\n');
    expect(visibleCopy).not.toMatch(/Что повторим|смешиваются|энерги|наград|нужно ещё|ошибок готов/i);
  });

  test('keeps fixed lengths disabled below five, All stays open from one mistake', () => {
    expect(mistakePracticeLengthOptions(4).filter((option) => option.enabled).map((option) => option.id)).toEqual(['all']);
    expect(mistakePracticeLengthOptions(0).every((option) => !option.enabled)).toBe(true);
    expect(source).toContain("accessibilityState={{ disabled: !option.enabled, checked: active }}");
    expect(source).toContain('active && option.enabled ? t.accent : t.bgSurface2');
    expect(source).toContain('accessibilityLabel={`${copy.length}: ${optionLabel(option.id, copy.all)}`}');
  });
});
