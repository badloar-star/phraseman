// зачем (владелец 11.11: «Да, убрать» — старые давно включённые переключатели убрать, «я всё равно потом забуду»):
// функции из списка включены ВСЕГДА — ни «Пульт», ни значение по умолчанию их больше не выключают.
// Сторожим три вещи: (1) закреплённое не выключается снимком; (2) в список не попал ни один аварийный инструмент,
// режим, эксперимент или недоделанная система; (3) обычные переключатели по-прежнему слушают «Пульт».
import {
  RETIRED_ALWAYS_ON_FLAGS, applyRemoteConfigSnapshot, getRemoteBool, hasRemoteBoolOverride,
} from '../app/remote_flags';

const RETIRED = [...RETIRED_ALWAYS_ON_FLAGS];

describe('закреплённые включёнными функции', () => {
  afterEach(() => { applyRemoteConfigSnapshot({}); });

  it('список — ровно двенадцать ключей, согласованных с владельцем 11.11', () => {
    expect(RETIRED.sort()).toEqual([
      'dialogue_freeform_translate_enabled',
      'paywall_reviews_enabled',
      'promo_codes_enabled',
      'rank_gates_enabled',
      'referral_enabled',
      'referral_ladder_enabled',
      'soft_upsell_first_lesson_enabled',
      'soft_upsell_free_lessons_complete_enabled',
      'spire_gold',
      'spire_streak_heart',
      'video_button_enabled',
      'weekly_review_ai_v2_enabled',
    ]);
  });

  it.each(RETIRED)('%s включён без снимка и остаётся включённым, когда «Пульт» прислал false', (key) => {
    applyRemoteConfigSnapshot({});
    expect(getRemoteBool(key)).toBe(true);
    applyRemoteConfigSnapshot({ bools: { [key]: false } });
    expect(getRemoteBool(key)).toBe(true);
    expect(hasRemoteBoolOverride(key)).toBe(false); // значение «Пульта» не запоминается вовсе
  });

  it('в список не попали аварийные инструменты, режимы, эксперименты и недоделанные системы', () => {
    const mustStaySwitchable = [
      'maintenance_banner', 'maintenance_block', 'force_update_enabled', 'manual_update_enabled', 'promo_banner_enabled',
      'phone_state_emergency_stop', 'phone_state_sync_enabled', 'phone_state_shadow_enabled',
      'accounts_v2_client_enabled', 'accounts_v2_legacy_sync_disabled',
      'energy_mistake_charge', // режим А/Б, а не функция
      'ghost_friend_ab', // идущая проба 50/50
      'lifetime_button_enabled', 'energy_gift_enabled', 'referral_ladder_v2_enabled', 'rank_gates_existing_users',
    ];
    for (const key of mustStaySwitchable) expect(RETIRED).not.toContain(key);
  });

  // Пример — force_update_enabled: он в списке ключей, которые приложение 2.0 принимает из «Пульта» (allowedBools).
  it('обычный переключатель по-прежнему слушает «Пульт»', () => {
    applyRemoteConfigSnapshot({});
    expect(getRemoteBool('force_update_enabled')).toBe(false);
    applyRemoteConfigSnapshot({ bools: { force_update_enabled: true } });
    expect(getRemoteBool('force_update_enabled')).toBe(true);
  });
});
