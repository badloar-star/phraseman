// ЗАМОК ВЛАДЕЛЬЦА 25.10: «Не могу говорить выключи это! чтобы такого не было! в админке в пульте управления добавь возможность
// добавить эту кнопку и она будет работать! но сейчас убери не должно быть такой кнопки это удар по монетизации».
// По умолчанию (флаг «Пульта» learning_cant_speak_enabled выключен) кнопки нет и голосовые задания не обходятся.
import fs from 'node:fs';
import path from 'node:path';
import { applyRemoteConfigSnapshot } from '../app/remote_flags';
import {
  __resetLearningV2CantSpeakForTests,
  activateLearningV2CantSpeakV1,
  isLearningV2CantSpeakActiveV1,
  isLearningV2CantSpeakEnabledV1,
} from '../app/learning_v2_cant_speak_v1';

beforeEach(() => {
  __resetLearningV2CantSpeakForTests();
  applyRemoteConfigSnapshot({ bools: {} });
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('ЗАМОК ВЛАДЕЛЬЦА 25.10: «Не могу говорить» только по переключателю Пульта', () => {
  it('by default there is no cant-speak mode: activation is refused and voice tasks are not skipped', () => {
    expect(isLearningV2CantSpeakEnabledV1()).toBe(false);
    expect(activateLearningV2CantSpeakV1('button', 1000)).toBe(0);
    expect(isLearningV2CantSpeakActiveV1(1001)).toBe(false);
  });

  it('switched on in the Pult it works as before', () => {
    applyRemoteConfigSnapshot({ bools: { learning_cant_speak_enabled: true } });
    expect(isLearningV2CantSpeakEnabledV1()).toBe(true);
    expect(activateLearningV2CantSpeakV1('button', 1000)).toBeGreaterThan(1000);
    expect(isLearningV2CantSpeakActiveV1(1001)).toBe(true);
  });

  it('the player shows the button and the heads-up option only when the flag is on', () => {
    const player = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning_v2_direct_session_player_v1.tsx'), 'utf8');
    expect(player).toContain('{cantSpeakEnabled && showVoiceFooter && result !== "correct" ? (');
    expect(player).toContain('onCantSpeak={cantSpeakEnabled ? () => {');
    const at = player.indexOf('const activateCantSpeak = useCallback');
    expect(player.slice(at, at + 400)).toContain('if (!cantSpeakEnabled)');
  });
});
