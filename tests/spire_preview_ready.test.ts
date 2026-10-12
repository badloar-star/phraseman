// зачем (Сверка spire-005, поручение координатора 15.10): в превью у игры не было поля pending, поэтому готовность кнопки «Подняться» (climbReady) была ложной
// во всех состояниях, даже при живой комнате. Форма игры в превью должна совпадать с настоящим useSpireGame.
import { SPIRE_PREVIEW_STATES, spirePreviewModel } from '../components/spire/spire_preview_fixtures';

const climbReady = (game: { live: boolean; tier: number | null; session: unknown; pending: unknown }) =>
  game.live && game.tier !== null && game.session === null && game.pending === null;

describe('превью Шпиля: готовность «Подняться»', () => {
  it('в живой комнате (room, lobby, win, offline…) кнопка готова', () => {
    for (const state of ['room', 'lobby', 'win', 'summit', 'lose', 'offline', 'weekresult', 'guard', 'passed'] as const) {
      const model = spirePreviewModel(state);
      expect({ state, ready: climbReady(model.game as never) }).toEqual({ state, ready: true });
    }
  });
  it('без уровня (empty) и при выключенном Шпиле (locked) кнопка не готова', () => {
    expect(climbReady(spirePreviewModel('empty').game as never)).toBe(false);
    expect(climbReady(spirePreviewModel('locked').game as never)).toBe(false);
  });
  it('у каждой модели есть pending === null и cancelPendingStep (форма настоящего хука)', () => {
    for (const state of SPIRE_PREVIEW_STATES) {
      const game = spirePreviewModel(state).game as unknown as Record<string, unknown>;
      expect({ state, pending: game.pending, cancel: typeof game.cancelPendingStep }).toEqual({ state, pending: null, cancel: 'function' });
    }
  });
});
