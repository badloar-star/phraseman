// зачем (владелец 11.11: «Звуки не добавлены в приложение… исправляй»): он выбрал звук для «верно» и «неверно» и снял замок 25.10,
// но вердикт урока оставался немым — в журнале устройства за целый урок не было ни одного события correct/wrong.
// Тест держит связь «ответ в уроке → выбранный звук» и то, что вибрация при этом не пропала.
const tryPlayMock = jest.fn();
jest.mock('../modules/sound_v2/legacy_bridge', () => ({
  tryPlayV2Event: (...args: unknown[]) => tryPlayMock(...args),
}));
const hapticCorrect = jest.fn();
const hapticWrong = jest.fn();
jest.mock('../app/feedback/haptics', () => ({
  correct: () => hapticCorrect(),
  wrong: () => hapticWrong(),
  light: jest.fn(),
  pop: jest.fn(),
  tap: jest.fn(),
  success: jest.fn(),
}));
const requestMock = jest.fn();
jest.mock('../modules/audio/sound_director', () => ({
  soundDirector: { request: (...args: unknown[]) => requestMock(...args), stopActiveCompletion: jest.fn(), stopActiveEvent: jest.fn() },
}));

import fk from '../app/feedback/feedback_kit';

describe('feedback_kit.verdict: ответ в уроке звучит выбранным владельцем звуком', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  beforeEach(() => {
    tryPlayMock.mockReset();
    tryPlayMock.mockReturnValue(true);
    hapticCorrect.mockClear();
    hapticWrong.mockClear();
    requestMock.mockClear();
    warn.mockClear();
  });

  it('верный ответ: событие correct с продвижением серии и вибрация', () => {
    fk.verdict({ correct: true });
    expect(tryPlayMock).toHaveBeenCalledTimes(1);
    expect(tryPlayMock).toHaveBeenCalledWith('correct', 'learning_verdict', true);
    expect(hapticCorrect).toHaveBeenCalledTimes(1);
    expect(hapticWrong).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('неверный ответ: событие wrong и вибрация ошибки', () => {
    fk.verdict({ correct: false });
    expect(tryPlayMock).toHaveBeenCalledTimes(1);
    expect(tryPlayMock).toHaveBeenCalledWith('wrong', 'learning_verdict');
    expect(hapticWrong).toHaveBeenCalledTimes(1);
    expect(hapticCorrect).not.toHaveBeenCalled();
  });

  it('звук не сыграл — причина попадает в журнал, вибрация остаётся', () => {
    tryPlayMock.mockReturnValue(false);
    fk.verdict({ correct: true });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain('вердикт урока без звука');
    expect(hapticCorrect).toHaveBeenCalledTimes(1);
  });
});
