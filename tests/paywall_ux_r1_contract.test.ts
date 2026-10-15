// зачем (координатор 12.10, R1_PAYWALL_UX): аудит пейволов нашёл пять UI-дыр; сторож держит правки, чтобы они не вернулись.
// Логика покупки / RevenueCat не затрагивалась — проверяем только вид и защиту нажатий.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('R1_PAYWALL_UX: окно Plus', () => {
  const screen = read('components/paywall/PaywallPlusScreen.tsx');
  const plus = read('components/paywall/PaywallPlus.tsx');

  it('«Восстановить» не блокируется загрузкой цен — только самой оплатой/восстановлением', () => {
    expect(screen).toContain('restoring={p.restoring} restoreDisabled={checkoutInFlight}');
    expect(screen).not.toContain("restoreDisabled={checkoutInFlight || state === 'loading'}");
  });

  it('недоступные «закрыть» и «восстановить» приглушены, восстановление показывает крутилку', () => {
    expect(plus).toContain('const PAYWALL_DISABLED_OPACITY = 0.4;');
    expect(plus).toContain('opacity: closeDisabled ? PAYWALL_DISABLED_OPACITY : 1');
    expect(plus).toContain('opacity: restoreDisabled && !restoring ? PAYWALL_DISABLED_OPACITY : 1');
    expect(plus).toContain('{restoring ? <ActivityIndicator size="small" color={g.mutedText} /> : null}');
  });
});

describe('R1_PAYWALL_UX: экран напоминания о конце пробного', () => {
  it('крутилка на кнопке — того же цвета, что подпись на заливке ctaFill (ctaFillInk), а не ctaInk сырого cta', () => {
    const prompt = read('components/paywall/PaywallTrialReminderPrompt.tsx');
    expect(prompt).toContain('<ActivityIndicator color={g.ctaFillInk} />');
    expect(prompt).not.toContain('<ActivityIndicator color={g.ctaInk} />');
  });
});

describe('R1_PAYWALL_UX: шторка остановки по энергии', () => {
  const sheet = read('components/energy/EnergyStopSheet.tsx');
  it('второй тап по «Продолжить с Plus» не открывает окно Plus повторно; защёлка снимается при возврате в фокус', () => {
    expect(sheet).toContain('const plusOpeningRef = useRef(false);');
    expect(sheet).toContain('if (plusOpeningRef.current) {');
    expect(sheet).toContain('plusOpeningRef.current = true;\n    setPlusOpen(true);');
    expect(sheet).toContain('setPlusOpen(false); plusOpeningRef.current = false;');
  });
});

describe('R1_PAYWALL_UX: окно покупки набора', () => {
  const owner = read('app/flashcards_collection.tsx');
  it('отказ и сбой покупки не немые: тост «Не удалось купить набор» (кроме нехватки рун — её показывает само окно)', () => {
    expect(owner).toContain('function packBuyFailedToast() {');
    expect(owner).toContain("if (res.reason !== 'insufficient_runes') emitAppEvent('action_toast', res.reason === 'invalid_price' ? packBuyUnavailableToast() : packBuyFailedToast());");
    expect(owner).toContain("emitAppEvent('action_toast', packBuyFailedToast()); // зачем (R1_PAYWALL_UX)");
  });
  it('двойной тап по-прежнему гасится ref-ом', () => {
    expect(owner).toContain('if (purchasingRef.current || !purchasePack) return;');
  });
});
