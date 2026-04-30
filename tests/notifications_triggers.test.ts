/**
 * Контракт expo-notifications 0.32+ (см. hasValidTriggerObject в пакете):
 * объект-триггер (кроме null) должен содержать `type` или `channelId`.
 * Иначе scheduleNotificationAsync кидает TypeError — раньше это глоталось в catch {}.
 */
function hasValidTriggerObject(trigger: unknown): boolean {
  return (
    trigger === null ||
    (typeof trigger === 'object' &&
      trigger !== null &&
      ('type' in trigger || 'channelId' in trigger))
  );
}

describe('notification trigger contract (expo-notifications 0.32+)', () => {
  it('старый daily без type считается невалидным', () => {
    expect(hasValidTriggerObject({ hour: 19, minute: 0, repeats: true })).toBe(false);
  });

  it('старый interval только с seconds — невалиден', () => {
    expect(hasValidTriggerObject({ seconds: 60 })).toBe(false);
  });

  it('typed daily — валиден', () => {
    expect(hasValidTriggerObject({ type: 'daily', hour: 19, minute: 5 })).toBe(true);
  });

  it('typed weekly — валиден', () => {
    expect(
      hasValidTriggerObject({ type: 'weekly', weekday: 2, hour: 9, minute: 0 }),
    ).toBe(true);
  });

  it('typed timeInterval — валиден', () => {
    expect(hasValidTriggerObject({ type: 'timeInterval', seconds: 120 })).toBe(true);
  });

  it('немедленное уведомление: null', () => {
    expect(hasValidTriggerObject(null)).toBe(true);
  });
});
