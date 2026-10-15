import { classifyGuestCleanKey, describeGuestValueShape } from '../app/guest_clean_classifier';

// зачем (координатор 15.10): разметка ключей свежего гостя для [GUEST-CLEAN]. Правило безопасности —
// при сомнении progress: лишнее окно смены аккаунта лучше молча потерянного прогресса.
describe('guest clean classifier', () => {
  it('marks values a fresh install writes by itself as default', () => {
    expect(classifyGuestCleanKey('user_avatar', '1')).toBe('default');
    expect(classifyGuestCleanKey('user_frame', 'plain')).toBe('default');
    expect(classifyGuestCleanKey('streak_count', '1')).toBe('default');
    expect(classifyGuestCleanKey('unlocked_lessons', '[1]')).toBe('default');
    expect(classifyGuestCleanKey('legacy_free_lesson_cap_v1', '3')).toBe('default');
  });

  it('treats a changed default as progress', () => {
    expect(classifyGuestCleanKey('user_avatar', '7')).toBe('progress');
    expect(classifyGuestCleanKey('streak_count', '5')).toBe('progress');
    expect(classifyGuestCleanKey('unlocked_lessons', '[1,2]')).toBe('progress');
    expect(classifyGuestCleanKey('user_frame', null)).toBe('progress');
  });

  it('marks install traces as service', () => {
    for (const key of ['install_date', 'energy_state', 'phraseman_foreground_usage_ms_v1',
      'phraseman_foreground_daily_ms_v1', 'stable_auth_link_cache_v1', 'cloud_migration_v1']) {
      expect(classifyGuestCleanKey(key, 'x')).toBe('service');
    }
  });

  it('describes value shape without printing values', () => {
    const shape = describeGuestValueShape(JSON.stringify({ version: 2, maxEligibleShardBalance: 40, activeDates: ['2026-10-15'], comeback: null, name: 'Мария' }));
    expect(shape).toBe('{version:num+,maxEligibleShardBalance:num+,activeDates:arr1[str10],comeback:null,name:str5}');
    expect(shape).not.toContain('Мария');
    expect(shape).not.toContain('40');
    expect(describeGuestValueShape(JSON.stringify({ abc123def456ghi789jk: 1, 'a@b.c': 2, maxEligibleShardBalance: 0 }))).toBe('{<id>:num+,<id>:num+,maxEligibleShardBalance:num0}');
    expect(describeGuestValueShape('plain')).toBe('str5(not_json)');
    expect(describeGuestValueShape(null)).toBe('empty');
  });

  it('reads value-aware defaults of a fresh install', () => {
    expect(classifyGuestCleanKey('active_days_v1', '{"anchor":"2026-10-15","bits":"1"}')).toBe('default');
    expect(classifyGuestCleanKey('active_days_v1', '{"anchor":"2026-10-15","bits":"1011"}')).toBe('progress');
    const freshFoundation = { version: 2, maxEligibleShardBalance: 0, activeDates: ['2026-10-15'], comeback: null, paidAccess: { plus: false, pro: false } };
    expect(classifyGuestCleanKey('achievement_foundation_progress_v2', JSON.stringify(freshFoundation))).toBe('default');
    expect(classifyGuestCleanKey('achievement_foundation_progress_v2', JSON.stringify({ ...freshFoundation, maxEligibleShardBalance: 120 }))).toBe('progress');
    expect(classifyGuestCleanKey('achievement_foundation_progress_v2', JSON.stringify({ ...freshFoundation, paidAccess: { plus: true, pro: false } }))).toBe('progress');
    expect(classifyGuestCleanKey('lesson_progress_v2::fr::legacy_free_lesson_cap_v1', '3')).toBe('default');
    expect(classifyGuestCleanKey('lesson_progress_v2::fr::legacy_free_lesson_cap_v1', '5')).toBe('progress');
    expect(classifyGuestCleanKey('legacy_free_lesson_migration_v1', '1')).toBe('service');
    expect(classifyGuestCleanKey('friends_push_v1', 'true')).toBe('service');
  });

  it('treats every unknown key and broken value as progress', () => {
    expect(classifyGuestCleanKey('lesson_progress_v2::fr::lesson_1', '{"done":true}')).toBe('progress');
    expect(classifyGuestCleanKey('client_shard_phone_state_outbox_v1:abc', '[{"e":1}]')).toBe('progress');
    expect(classifyGuestCleanKey('active_days_v1', '{"anchor":"2026-10-15"}')).toBe('progress');
    expect(classifyGuestCleanKey('active_days_v1', '{broken')).toBe('progress');
    expect(classifyGuestCleanKey('achievement_foundation_progress_v2', '{broken')).toBe('progress');
  });
});
