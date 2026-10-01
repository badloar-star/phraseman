import fs from 'node:fs';
import path from 'node:path';

import { applyUserSettingsNow, getUserSettingsSnapshot } from '@/app/user_settings_store';
import { SOUND_EVENTS, type SoundEventId } from '@/modules/audio/sound_events';
import {
  getSoundSettingsSnapshot,
  subscribeSoundSettings,
} from '@/modules/audio/sound_settings';

const MISSING_EVENTS: SoundEventId[] = [
  // зачем 2026-08-30 (раунд 5): владелец подключил 6 звуков Арены
  // (search_start, search_loop, countdown_go, result_draw, rank_up,
  // rank_down) — они ушли из этого списка. Остальные 19 отвергнуты
  // словами «ни один — не надо их вообще»: события остаются немыми
  // НАВСЕГДА, файлы не генерировать (star_land — не отмечен, ждёт
  // отдельного решения). Директор молча пропускает события без источника.
  // зачем: D83 — клиентская Арена удалена, 9 подключённых файлов сняты из
  // бандла; теперь немы ВСЕ 28 событий Арены (порядок = порядок объявления).
  'pm.arena.search_start',
  'pm.arena.search_loop',
  'pm.arena.opponent_found',
  'pm.arena.countdown_tick',
  'pm.arena.countdown_go',
  'pm.arena.task_in',
  'pm.arena.option_tap',
  'pm.arena.answer_correct',
  'pm.arena.answer_first',
  'pm.arena.answer_wrong',
  'pm.arena.opponent_answered',
  'pm.arena.timer_tick',
  'pm.arena.timeout',
  'pm.arena.combo_start',
  'pm.arena.combo_up',
  'pm.arena.combo_break',
  'pm.arena.pair_match',
  'pm.arena.pair_miss',
  'pm.arena.pair_clear',
  'pm.arena.result_win',
  'pm.arena.result_loss',
  'pm.arena.result_draw',
  'pm.arena.star_fly',
  'pm.arena.star_land',
  'pm.arena.goal_complete',
  'pm.arena.reward_unlock',
  'pm.arena.rank_up',
  'pm.arena.rank_down',
];

describe('semantic sound event catalog', () => {
  test('types every manifest event and enables every supplied asset', () => {
    const ids = Object.keys(SOUND_EVENTS) as SoundEventId[];
    const enabled = ids.filter((id) => SOUND_EVENTS[id].source !== null);
    const disabled = ids.filter((id) => SOUND_EVENTS[id].source === null);

    // зачем 2026-08-30 (раунд 5, выбор владельца): −1 hint_reveal (удалён
    // навсегда), +2 новых (ui.tap_blocked, onboarding.step), +6 арен получили
    // файлы. После полного retirement коллекционных предметов и всех звуков
    // paywall-контуров каталог содержит 134 / 114; Daily Journey добавляет
    // ровно один intro-cue: 135 / 115.
    // зачем: PM-206-A2 (2026-09-30) — сняты 22 id без вызывающих (награды/спины/
    // соцсобытия, pm.voice.turn_ready и т.п., см. tests/pm206_sound_event_callers.probe.ts),
    // каталог 120 → 98, со звуком 91 → 70. Счёт подтверждён пробой: catalog=98, orphaned=0.
    expect(ids).toHaveLength(98);
    // D83: −9 файлов Арены (стали немыми).
    expect(enabled).toHaveLength(70);
    expect(disabled).toEqual(MISSING_EVENTS);
    enabled.forEach((id) => expect(SOUND_EVENTS[id].source).toBeTruthy());
  });

  test('keeps approved runtime volumes, priorities, durations and cooldowns', () => {
    // зачем (решение владельца 2026-09-15): звуки вердикта ответа
    // (pm.learn.correct / pm.learn.needs_work) убраны — ответ выражается
    // вибрацией. Образцом семейства learning служит живой звук таймера.
    expect(SOUND_EVENTS['pm.learn.timer_expired']).toMatchObject({
      family: 'learning',
    });
    expect(SOUND_EVENTS['pm.reward.rune_flight_start']).toMatchObject({
      mixWithVoice: true,
      allowConcurrent: true,
    });
    expect(SOUND_EVENTS['pm.reward.rune_flight_land']).toMatchObject({
      mixWithVoice: true,
      allowConcurrent: true,
    });
    expect(SOUND_EVENTS['pm.voice.record_ready']).toMatchObject({
      volume: 0.4,
      priority: 95,
      platform: 'ios',
    });
    Object.values(SOUND_EVENTS).forEach((definition) => {
      expect(definition.volume).toBeGreaterThan(0);
      expect(definition.volume).toBeLessThanOrEqual(1);
      expect(definition.priority).toBeGreaterThan(0);
      expect(definition.cooldownMs).toBeGreaterThanOrEqual(0);
      expect(definition.durationMs).toBeGreaterThan(0);
    });
  });

  test('keeps the rejected lesson combo cue deleted', () => {
    const rejectedEventId = 'pm.learn.combo_up';
    // зачем: sfx переехали wav -> m4a (экономия ~13 МБ в APK); сторож обязан
    // ловить возврат отклонённого звука в ЛЮБОМ формате, не только старом wav.
    const rejectedAssets = ['.wav', '.m4a'].map((ext) => path.resolve(
      __dirname,
      `../assets/audio/sfx/v1/learning/pm_learn_combo_up_v1${ext}`,
    ));
    const lessonSource = fs.readFileSync(path.resolve(__dirname, '../app/lesson1.tsx'), 'utf8');

    expect(SOUND_EVENTS).not.toHaveProperty(rejectedEventId);
    rejectedAssets.forEach((asset) => expect(fs.existsSync(asset)).toBe(false));
    expect(lessonSource).not.toContain(rejectedEventId);
  });

  test('keeps the retired collectible cue out of the runtime catalog', () => {
    const retiredEventId = 'pm.reward.collectible';
    const retiredAsset = path.resolve(
      __dirname,
      '../assets/audio/sfx/v1/reward/pm_reward_collectible_v1.m4a',
    );
    const motionSource = fs.readFileSync(
      path.resolve(__dirname, '../modules/audio/sound_motion.ts'),
      'utf8',
    );

    expect(SOUND_EVENTS).not.toHaveProperty(retiredEventId);
    expect(fs.existsSync(retiredAsset)).toBe(false);
    expect(motionSource).not.toContain(retiredEventId);
  });
});

describe('sound settings bridge', () => {
  test('publishes uiSounds and voiceOut changes synchronously', () => {
    const original = getUserSettingsSnapshot();
    const seen: { effectsEnabled: boolean; voiceEnabled: boolean }[] = [];
    const unsubscribe = subscribeSoundSettings(() => seen.push(getSoundSettingsSnapshot()));

    applyUserSettingsNow({ ...original, uiSounds: false, voiceOut: false });

    expect(getSoundSettingsSnapshot()).toEqual({ effectsEnabled: false, voiceEnabled: false });
    expect(seen.at(-1)).toEqual({ effectsEnabled: false, voiceEnabled: false });

    unsubscribe();
    applyUserSettingsNow(original);
  });
});
