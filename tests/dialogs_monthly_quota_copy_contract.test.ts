import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve(__dirname, '../components/DialogsTabContent.tsx'),
  'utf8',
);

describe('dialogue hub calendar-month quota copy', () => {
  test('uses monthly state names and the server reset boundary', () => {
    expect(source).toContain('readAiDialogMonthlyQuota');
    // resetAtMs есть только у известного серверного состояния (allowed/exhausted).
    expect(source).toContain('quotaResetAtMs(quota)');
    expect(source).toContain('resetAtMs={quotaResetAt}');
    expect(source).toContain('variant="monthly"');
    expect(source).toContain('repliesLeftThisMonth');
    expect(source).toContain("reason: 'monthly_limit'");
  });

  test('explains 30 replies per calendar month without daily Free-reply copy', () => {
    expect(source).toContain('В этом календарном месяце осталось');
    expect(source).toContain('Сброс —');
    expect(source).toContain('calendar month');
    expect(source).not.toMatch(/Сегодня осталось|Сьогодні лишилося|left today|Hoy te quedan|respostas hoje|Hôm nay còn|Hari ini sisa|Bugün .*kaldı|Dziś zostało/);
    expect(source).not.toContain('daily reply limit');
  });

  test('does not emit the unregistered ai_companion_opened analytics event', () => {
    expect(source).not.toContain("'ai_companion_opened'");
  });
});
