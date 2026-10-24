// зачем (жалоба бета-тестера 24.10 «встречный вопрос появляется на секунду и исчезает»; скрин: между карточкой цели и строкой ввода
// ленты не видно): реплика ИИ остаётся видимой при открытой клавиатуре — карточка цели свёрнута, пока клавиатура открыта, а лента,
// окно которой сжалось, возвращается к концу, если человек был у конца.
import fs from 'node:fs';
import path from 'node:path';

import {
  DIALOG_GOAL_STRIP_GAP,
  DIALOG_GOAL_STRIP_HEIGHT,
  DIALOG_GOAL_STRIP_MIN_LIST,
  DIALOG_LIST_END_SLACK,
  dialogGoalStripFits,
  dialogListViewportDecision,
  isDialogListAtEnd,
} from '../components/dialogs/dialog_list_viewport';

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

describe('плашка цели при свёрнутой карточке (решение координатора 25.10: ≥ 220 dp ленты)', () => {
  const stripTotal = DIALOG_GOAL_STRIP_HEIGHT + DIALOG_GOAL_STRIP_GAP;
  it('ленте с плашкой остаётся ≥ 220 — показываем', () => {
    expect(dialogGoalStripFits({ listHeight: DIALOG_GOAL_STRIP_MIN_LIST + stripTotal, stripShown: false })).toBe(true);
  });
  it('места меньше — не показываем', () => {
    expect(dialogGoalStripFits({ listHeight: DIALOG_GOAL_STRIP_MIN_LIST + stripTotal - 1, stripShown: false })).toBe(false);
    expect(dialogGoalStripFits({ listHeight: 70, stripShown: false })).toBe(false);
  });
  it('без дрожания: плашка уже показана и съела свою высоту — решение не меняется', () => {
    expect(dialogGoalStripFits({ listHeight: DIALOG_GOAL_STRIP_MIN_LIST, stripShown: true })).toBe(true);
    expect(dialogGoalStripFits({ listHeight: DIALOG_GOAL_STRIP_MIN_LIST - 1, stripShown: true })).toBe(false);
  });
});

describe('экран сценарного диалога: реплика ИИ видна при открытой клавиатуре', () => {
  it('карточка цели сворачивается по фокусу поля, плавно; клавиатура — запасной путь', () => {
    expect(src).toContain("const goalShown = !!(goal && coachingLabels && bottom === 'input' && !goalFolded);");
    expect(src).toContain('{goalShown && goal && coachingLabels ? (');
    expect(src).toContain("onFocus={() => setGoalFold(true, 'focus')}");
    expect(src).toContain("onBlur={() => setGoalFold(false, 'blur')}");
    expect(src).toContain("setGoalFold(true, 'keyboard');");
    expect(src).toContain("setGoalFold(false, 'keyboard');");
    const fold = src.slice(src.indexOf('const setGoalFold = React.useCallback'), src.indexOf('const setGoalFold = React.useCallback') + 700);
    expect(fold.indexOf('animateNextLayoutTransition();')).toBeGreaterThan(-1);
    expect(fold.indexOf('animateNextLayoutTransition();')).toBeLessThan(fold.indexOf('setGoalFolded(folded);'));
    expect(fold).toContain('[DIALOG-GOAL] fold');
  });
  it('свёрнуто не пусто: плашка цели, если ленте остаётся место; подсказки компактные; цель в подписи поля', () => {
    expect(src).toContain('testID="dialogue-v2-session-goal-strip"');
    expect(src).toContain('height: DIALOG_GOAL_STRIP_HEIGHT');
    expect(src).toContain('[DIALOG-GOAL] strip');
    expect(src).toContain('accessibilityLabel={goal ? `${labels.placeholder}. ${goal.kicker}: ${goal.label}` : labels.placeholder}');
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
