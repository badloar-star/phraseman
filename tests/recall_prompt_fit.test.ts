import fs from 'node:fs';
import path from 'node:path';

import { recallInstructionClearance, recallPromptFit, RECALL_PROMPT_BASE_LINE, RECALL_PROMPT_BASE_SIZE, RECALL_PROMPT_MIN_SIZE } from '../app/flashcards/recall_prompt_fit';

// зачем (владелец 11.11.2026, жалоба Стеллы): в «Напиши» фраза задания была жёстко 34/40 и не ужималась на узком экране и при крупном
// системном шрифте — вопрос занимал весь экран. Фраза обязана подстраиваться под устройство; на макетной ширине вид не меняется.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const STELLA = 'Можешь объяснить мне это правило по порядку?';

describe('recallPromptFit', () => {
  it('на макетной ширине 390 и обычном шрифте фраза остаётся 34/40 — вид совпадает с макетом', () => {
    for (const text of ['Привет', 'Рад познакомиться', STELLA]) {
      expect(recallPromptFit({ text, contentWidth: 390, fontScale: 1 })).toEqual({ fontSize: RECALL_PROMPT_BASE_SIZE, lineHeight: RECALL_PROMPT_BASE_LINE });
    }
  });

  it('узкий экран с крупным системным шрифтом (случай Стеллы) уменьшает фразу', () => {
    const fit = recallPromptFit({ text: STELLA, contentWidth: 320, fontScale: 1.5 });
    expect(fit.fontSize).toBeLessThan(RECALL_PROMPT_BASE_SIZE);
    expect(fit.fontSize).toBeGreaterThanOrEqual(RECALL_PROMPT_MIN_SIZE);
  });

  it('чем уже экран и крупнее шрифт, тем кегль не больше', () => {
    let previous = 99;
    for (const [contentWidth, fontScale] of [[430, 1], [390, 1], [360, 1.15], [320, 1.3], [300, 2]] as const) {
      const { fontSize } = recallPromptFit({ text: STELLA, contentWidth, fontScale });
      expect(fontSize).toBeLessThanOrEqual(previous);
      previous = fontSize;
    }
  });

  it('системный шрифт сверх общего потолка 1.3 дальше не влияет — текст всё равно растёт не больше потолка', () => {
    expect(recallPromptFit({ text: STELLA, contentWidth: 320, fontScale: 2 })).toEqual(recallPromptFit({ text: STELLA, contentWidth: 320, fontScale: 1.3 }));
  });

  it('межстрочный держит пропорцию макета и растёт вместе с системным шрифтом (низ букв не срезается)', () => {
    const plain = recallPromptFit({ text: 'Привет', contentWidth: 390, fontScale: 1 });
    const large = recallPromptFit({ text: 'Привет', contentWidth: 390, fontScale: 1.3 });
    expect(large.fontSize).toBe(plain.fontSize);
    expect(large.lineHeight).toBe(52);
    const shrunk = recallPromptFit({ text: STELLA.repeat(3), contentWidth: 320, fontScale: 1 });
    expect(shrunk.lineHeight).toBe(Math.round((shrunk.fontSize * 40) / 34));
  });

  // зачем (эмулятор 11.11, ширина 320 + шрифт 1.5): подпись задания переносилась на две строки, и фраза вставала вплотную к ней.
  it('зазор под подпись задания: 24 при одной строке и обычном шрифте, больше — когда подпись переносится', () => {
    const instruction = 'Напиши на изучаемом языке';
    expect(recallInstructionClearance({ instruction, contentWidth: 390, fontScale: 1 })).toBe(24);
    expect(recallInstructionClearance({ instruction: 'Write in English', contentWidth: 390, fontScale: 1 })).toBe(24);
    const narrowLarge = recallInstructionClearance({ instruction, contentWidth: 320, fontScale: 1.5 });
    expect(narrowLarge).toBeGreaterThan(24 * 1.3);
    expect(narrowLarge).toBe(Math.round(18 + 2 * 21 * 1.3 + 5 - 20));
  });

  // зачем (жалоба Стеллы, подтверждено на эмуляторе Android 15): окно не сжимается под клавиатуру, поле ввода оставалось под ней.
  it('на Android список ужимается на высоту клавиатуры и прокручивается к полю ввода', () => {
    const source = read('app/flashcards_recall_session.tsx');
    expect(source).toContain("useKeyboardBottomInset(Platform.OS === 'android') - safeBottomInset");
    expect(source).toContain('style={keyboardInset > 0 ? [styles.scroll, { marginBottom: keyboardInset }] : styles.scroll}');
    expect(source).toContain('recallScrollRef.current?.scrollTo({ y: Math.max(0, inputShellBottomRef.current + 8 - recallViewportH), animated: true });');
    expect(source).toContain('inputShellBottomRef.current = event.nativeEvent.layout.y + event.nativeEvent.layout.height;');
    // временная трассировка починки убрана
    expect(source).not.toContain('[RECALL-KB]');
  });

  it('экран «Напиши» берёт размер фразы из подгонки, а не жёстко 34/40, и не пользуется adjustsFontSizeToFit', () => {
    const source = read('app/flashcards_recall_session.tsx');
    expect(source).toContain('recallPromptFit({ text: promptOf(activeCard), contentWidth: Math.min(windowWidth, contentMaxW), fontScale: systemFontScale })');
    expect(source).toContain('fontSize: promptFit.fontSize, lineHeight: promptFit.lineHeight');
    expect(source).not.toContain('{ color: t.textPrimary, fontSize: 34, lineHeight: 40 }');
    expect(source).not.toContain('adjustsFontSizeToFit');
    // подпись задания приколота к верху карточки — фразе оставлено под неё место
    expect(source).toContain('style={[styles.focusPrompt, { marginTop: promptClearance, marginBottom: 24 }]}');
  });
});
