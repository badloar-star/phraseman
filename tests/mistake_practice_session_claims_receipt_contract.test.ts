import fs from 'node:fs';
import path from 'node:path';

// зачем (Ревизор 2.71): функцию «занять чек» проверяет tests/mistake_practice_quota_receipt; здесь — что ЭКРАН тренировки её
// реально зовёт при монтировании и дальше работает только с занятым чеком: чек из маршрута не используется напрямую, возврат
// (not_started) и «потрачено» (started) идут по ref, который заполняет только успешный claim.
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_practice_session.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('mistake practice screen claims the daily-attempt receipt on mount', () => {
  it('imports and calls claimMistakeQuotaReceipt inside a mount-only effect, before registering the leave handler', () => {
    expect(src).toMatch(/import \{ claimMistakeQuotaReceipt, settleMistakeQuotaStart \} from '\.\/mistake_practice_quota_receipt';/);
    const claimAt = src.indexOf('claimMistakeQuotaReceipt(routeQuotaReceipt, quotaOwnerRef.current)');
    expect(claimAt).toBeGreaterThan(-1);
    const effectStart = src.lastIndexOf('useEffect(() => {', claimAt);
    const effectBody = src.slice(effectStart, src.indexOf('}, []);', claimAt) + '}, []);'.length);
    // эффект монтирования: пустой массив зависимостей, claim — в теле, возврат попытки — в очистке (уход с экрана)
    expect(effectBody.endsWith('}, []);')).toBe(true);
    expect(effectBody.indexOf('claimMistakeQuotaReceipt(')).toBeLessThan(effectBody.indexOf('return () => {'));
    expect(effectBody).toContain("settleMistakeQuotaStart('not_started', notStartedReasonRef.current, quotaReceiptRef.current)");
  });

  it('the receipt ref starts empty and is filled ONLY by a successful claim', () => {
    expect(src).toContain('const quotaReceiptRef = useRef<string | null>(null);');
    expect(src).toContain('quotaReceiptRef.current = claimMistakeQuotaReceipt(routeQuotaReceipt, quotaOwnerRef.current) ? routeQuotaReceipt : null;');
    const assignments = src.match(/quotaReceiptRef\.current = /g) ?? [];
    expect(assignments).toHaveLength(1);
  });

  it('every settle of the attempt uses the claimed receipt, never the raw route param', () => {
    const settles = src.match(/settleMistakeQuotaStart\([^)]*\)/g) ?? [];
    expect(settles.length).toBeGreaterThanOrEqual(2);
    for (const call of settles) {
      expect(call).toContain('quotaReceiptRef.current');
      expect(call).not.toContain('params.quotaReceipt');
      expect(call).not.toContain('routeQuotaReceipt');
    }
  });

  it('each screen has its own owner token', () => {
    expect(src).toMatch(/const quotaOwnerRef = useRef\(`mps:\$\{Date\.now\(\)\.toString\(36\)\}:\$\{Math\.random\(\)\.toString\(36\)\.slice\(2, 8\)\}`\);/);
  });
});
