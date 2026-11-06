// ЗАМОК ВЛАДЕЛЬЦА 06.11 (TestFlight 150, через координатора, дословно): «приветствие с кошечкой (Лингманом) появляется на Главной — три экрана приветствия. Но это должно быть в ИСТОРИИ, а не сразу на Главной!»
// Приветствие новичка (3 экрана Лингмана; тексты по решению 04.11 — без заголовков и слов про ранги) — ТОЛЬКО формат истории: полноэкранно, сегментная полоска из 3 сегментов сверху, тап справа/слева, удержание — пауза,
// свайп вниз и «Пропустить» — закрыть, на последнем кадре кнопка «Начать занятие». Не модальное окно и не карточки поверх Главной. Условия показа не менялись: один раз на аккаунт, «Пропустить» — навсегда.
// Реестр docs/work/OWNER_LOCKS.md, строка 06.11. Ослабить можно только по новому слову владельца.
import fs from 'node:fs';
import path from 'node:path';
import { nextWelcomeAction, welcomeUi } from '../components/onboarding/welcomeCopy';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const view = read('components/onboarding/ApprovedWelcome.tsx');
const gate = read('components/onboarding/WelcomeGate.tsx');

describe('замок: приветствие — формат истории', () => {
  it('сегментная полоска из 3 сегментов сверху вместо точек внизу', () => {
    expect(view).toContain('testID="welcome-story-progress"');
    expect(view).toContain('[0,1,2].map(index=><View key={index} style={styles.segment}>');
    expect(view).not.toContain('styles.dots');
  });

  it('жесты истории: тап слева/справа, удержание — пауза, свайп вниз — закрыть; один набор RNGH на подложке', () => {
    expect(view).toContain('testID="welcome-story-gesture-zone"');
    expect(view).toContain('Gesture.Race(');
    expect(view).toContain('Gesture.LongPress().minDuration(180)');
    expect(view).toContain('Gesture.Tap().maxDistance(15)');
    expect(view).toContain('runOnJS(swipeClose)()');
    for (const action of ["action:'finish_text'", "action:'next_frame'", "action:'noop_last_frame'", "action:'prev_frame'", "action:'restart_frame'"]) expect(view).toContain(action);
  });

  it('тап справа на последнем кадре ничего не закрывает и не запускает урок — только кнопка «Начать занятие»', () => {
    expect(view).toContain("storyLog('tap_next',{action:'noop_last_frame'})");
    expect(welcomeUi('ru').start).toBe('Начать занятие');
    expect(nextWelcomeAction(2)).toEqual({ step: 2, start: true });
    expect(nextWelcomeAction(0)).toEqual({ step: 1, start: false });
  });

  it('журнал [WELCOME-STORY]: show, show_decision с условием, skip, finish', () => {
    expect(view).toContain("'[WELCOME-STORY]','show'");
    expect(gate).toContain("'show_decision'");
    expect(gate).toContain("condition: show ? 'new_user_not_shown_yet'");
    expect(gate).toContain("how === 'skip' ? 'skip' : 'finish'");
  });

  it('не модал на Главной: полноэкранный слой, фон Главной не вставляется; условия показа прежние (один раз, «Пропустить» навсегда)', () => {
    expect(gate).toContain('<Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent');
    expect(gate).toContain('homeBackdrop={<></>}');
    expect(gate).toContain('return input.isNew && !input.alreadyShown;'); // показ только новому и один раз
    expect(gate).toContain('AsyncStorage.setItem(welcomeB3ShownKey(owner)');
  });
});
