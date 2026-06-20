import { applyRemoteConfigSnapshot, __resetRemoteFlagsForTest } from '../app/remote_flags';
import {
  compassOn,
  compassLessonInviteOn,
  compassDeepDiveOn,
  compassEconomyOn,
  compassRetentionOn,
  compassTopicMapOn,
  compassAiVoiceOn,
} from '../app/compass/compass_flags';

const ALL_GATES = [
  compassOn,
  compassLessonInviteOn,
  compassDeepDiveOn,
  compassEconomyOn,
  compassRetentionOn,
  compassTopicMapOn,
  compassAiVoiceOn,
];

describe('compass_flags — isolation / kill-switch', () => {
  beforeEach(() => {
    __resetRemoteFlagsForTest();
  });

  it('по умолчанию весь Компас выключен (sell-switch)', () => {
    for (const gate of ALL_GATES) {
      expect(gate()).toBe(false);
    }
  });

  it('главный выключатель OFF гасит ВСЕ крылья, даже если под-флаги ON', () => {
    applyRemoteConfigSnapshot({
      bools: {
        compass_enabled: false,
        compass_ai_voice_enabled: true,
        compass_deep_dive_enabled: true,
        compass_lesson_invite_enabled: true,
        compass_economy_enabled: true,
        compass_retention_enabled: true,
        compass_topic_map_enabled: true,
      },
    });
    for (const gate of ALL_GATES) {
      expect(gate()).toBe(false);
    }
  });

  it('главный ON + под-флаги по умолчанию → крылья активны', () => {
    applyRemoteConfigSnapshot({ bools: { compass_enabled: true } });
    expect(compassOn()).toBe(true);
    expect(compassLessonInviteOn()).toBe(true);
    expect(compassDeepDiveOn()).toBe(true);
    expect(compassEconomyOn()).toBe(true);
    expect(compassRetentionOn()).toBe(true);
    expect(compassTopicMapOn()).toBe(true);
    expect(compassAiVoiceOn()).toBe(true);
  });

  it('точечный рычаг гасит ОДНО крыло, остальные живут', () => {
    applyRemoteConfigSnapshot({
      bools: { compass_enabled: true, compass_ai_voice_enabled: false },
    });
    expect(compassOn()).toBe(true);
    expect(compassAiVoiceOn()).toBe(false); // голос выключен
    expect(compassEconomyOn()).toBe(true); // остальные крылья работают
    expect(compassTopicMapOn()).toBe(true);
  });
});
