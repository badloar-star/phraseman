// зачем (жалоба бета-тестера 24.10 «встречный вопрос появляется на секунду и исчезает»; скрин: между карточкой цели и строкой ввода
// ленты не видно): реплика ИИ остаётся видимой при открытой клавиатуре — карточка цели свёрнута, пока клавиатура открыта, а лента,
// окно которой сжалось, возвращается к концу, если человек был у конца.
import fs from 'node:fs';
import path from 'node:path';

import { DIALOG_LIST_END_SLACK, dialogListViewportDecision, isDialogListAtEnd } from '../components/dialogs/dialog_list_viewport';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/dialogs/DialogueV2SessionScreen.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('лента диалога у конца', () => {
  it('всё помещается — у конца', () => {
    expect(isDialogListAtEnd({ offsetY: 0, viewport: 400, content: 300 })).toBe(true);
  });
  it('нижний край окна у конца содержимого (в пределах допуска) — у конца', () => {
    expect(isDialogListAtEnd({ offsetY: 600, viewport: 400, content: 1000 })).toBe(true);
    expect(isDialogListAtEnd({ offsetY: 600 - DIALOG_LIST_END_SLACK, viewport: 400, content: 1000 })).toBe(true);
  });
  it('листает историю вверх — не у конца', () => {
    expect(isDialogListAtEnd({ offsetY: 100, viewport: 400, content: 1000 })).toBe(false);
  });
});

describe('окно ленты поменяло высоту', () => {
  it('сжалось (клавиатура, карточка цели, подсказки), человек был у конца — докрутить к концу', () => {
    expect(dialogListViewportDecision({ prevViewport: 520, viewport: 180, wasAtEnd: true })).toBe('stick_to_end');
  });
  it('человек листал вверх — не дёргаем', () => {
    expect(dialogListViewportDecision({ prevViewport: 520, viewport: 180, wasAtEnd: false })).toBe('user_scrolled_up');
  });
  it('первая раскладка и та же высота — ничего не делаем', () => {
    expect(dialogListViewportDecision({ prevViewport: 0, viewport: 520, wasAtEnd: true })).toBe('first_layout');
    expect(dialogListViewportDecision({ prevViewport: 520, viewport: 520, wasAtEnd: true })).toBe('same_height');
  });
});

describe('экран сценарного диалога: реплика ИИ видна при открытой клавиатуре', () => {
  it('карточка цели свёрнута, пока клавиатура открыта', () => {
    expect(src).toContain("const goalShown = !!(goal && coachingLabels && bottom === 'input' && !keyboardOpen);");
    expect(src).toContain('{goalShown && goal && coachingLabels ? (');
    expect(src).toContain('setKeyboardOpen(true);');
    expect(src).toContain('setKeyboardOpen(false);');
  });
  it('сжатие окна ленты докручивает к концу без анимации, и это пишется в журнал', () => {
    expect(src).toContain('onLayout={onListLayout}');
    expect(src).toContain('onScroll={onListScroll}');
    expect(src).toContain("if (decision === 'stick_to_end') scrollRef.current?.scrollToEnd({ animated: false });");
    expect(src).toContain('[DIALOG-VANISH] list');
  });
  it('рост содержимого по-прежнему докручивает к концу', () => {
    expect(src).toContain('onContentSizeChange={scrollToEnd}');
  });
});
