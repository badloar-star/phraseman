import { applyRemoteConfigSnapshot, __resetRemoteFlagsForTest } from '../app/remote_flags';
import {
  compassOn,
  compassLessonInviteOn,
  compassDeepDiveOn,
  compassEconomyOn,
  compassRetentionOn,
  compassTopicMapOn,
} from '../app/compass/compass_flags';

const ALL_GATES = [
  compassOn,
  compassLessonInviteOn,
  compassDeepDiveOn,
  compassEconomyOn,
  compassRetentionOn,
  compassTopicMapOn,
];

describe('compass_flags — isolation / kill-switch', () => {
  beforeEach(() => {
    __resetRemoteFlagsForTest();
  });

  it('по умолчанию Компас ВКЛЮЧЁН (kill-switch, дефолт ON)', () => {
    for (const gate of ALL_GATES) {
      expect(gate()).toBe(true);
    }
  });

  it('главный выключатель OFF гасит ВСЕ крылья, даже если под-флаги ON', () => {
    applyRemoteConfigSnapshot({
      bools: {
        compass_enabled: false,
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
  });
});
