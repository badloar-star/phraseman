// R58 🟡 (аудит кнопок 15.10, button-audit-home-learn-overlays, зона Ядра): #55, #57, #22.
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('R58: окна — кнопки без дублей и без «ложного успеха»', () => {
  it('#55 «Оценить»: отметка только если стор открылся; двойной тап не открывает стор дважды; catch стора не немой', () => {
    const modal = read('components/ReviewPromptModal.tsx');
    expect(modal).toMatch(/const opened = await openStoreReviewPage\(\);[\s\S]{0,200}if \(opened\) await markReviewRated\(\);/);
    expect(modal).toContain('if (rateInFlightRef.current) return;');
    expect(read('app/store_review.ts')).toContain('[REVIEW-PROMPT] store: не открылся ни один адрес');
  });

  it('#57 «Обновить»: повторный тап не открывает стор второй раз, сбой открытия пишет причину и отпускает кнопку', () => {
    const modal = read('components/UpdateModal.tsx');
    expect(modal).toMatch(/if \(openingStoreRef\.current\) \{[\s\S]{0,160}return;/);
    expect(modal).toMatch(/\[UPDATE-MODAL\] стор не открылся[\s\S]{0,200}openingStoreRef\.current = false;/);
  });

  it('#22 «Понятно» в «Что нового»: окно закрывается сразу, отметка пишется фоном с причиной сбоя', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toMatch(/const variant = releaseNotesVariant;\s*setReleaseNotesVariant\(null\);/);
    expect(layout).toContain("dismissReleaseNotesModalPermanently().catch(noteSwallowedHandler('_layout:useCallback.dismissReleaseNotesModalPermanently'))");
  });
});
