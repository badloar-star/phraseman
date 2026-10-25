/**
 * [HOME-SCENE] Владелец 25.10 утвердил 12 новых состояний сцены Главной (спецификация
 * docs/work/tasks/home-scene-new-states-spec-2026-10-25.md). Сторож модели выбора: срочные главнее, одна особая сцена в день,
 * та же — не два дня подряд, частоты и ключи, порядок приоритета, «вместо» для личного рекорда / статистики.
 */
import {
  HOME_SCENE_SPECIAL_EMPTY_JOURNAL,
  HOME_SCENE_SPECIAL_STATES,
  homeSceneSpecialCandidates,
  homeSceneTimeTone,
  parseHomeSceneSpecialJournal,
  pickHomeSceneSpecial,
  recordHomeSceneSpecialShown,
  type HomeSceneSpecialInput,
} from '../components/home/v2/scene/home_scene_special';
import type { HomeSceneDecision, HomeSceneState } from '../components/home/v2/scene/home_scene_state';

// Среда, 21.10.2026, 12:00 по часам телефона.
const WED = new Date(2026, 9, 21, 12, 0, 0);
const at = (y: number, m: number, d: number, h = 12): Date => new Date(y, m - 1, d, h, 0, 0);

const quiet = (now: Date = WED): HomeSceneSpecialInput => ({
  now, mistakesOpen: 0, repeatedMistake: null, masteredMistake: null, phraseOfDaySeen: true, wordsDue: 0, progressDays: 0,
  today: null, activeLastWeek: false, milestoneKey: null, friendAhead: null, peakOvertaken: null,
});
const base = (state: HomeSceneState): HomeSceneDecision => ({ state, offlineLine: false, zeroEnergyNote: false, reason: 'test' });

describe('[HOME-SCENE] особые сцены поверх героя', () => {
  it('12 состояний из утверждённого списка', () => {
    expect([...HOME_SCENE_SPECIAL_STATES].sort()).toEqual([
      'friend_nudge', 'fun_stats', 'holiday', 'milestone', 'mistake_mastered', 'mistake_poke', 'mistakes_pile',
      'peak_overtaken', 'personal_best', 'phrase_of_day_unseen', 'weekly_recap', 'words_due',
    ]);
  });

  it('срочные герои всегда главнее — особой сцены нет', () => {
    for (const s of ['newbie', 'streak_risk', 'no_energy', 'welcome_back', 'streak_lost', 'exam_ready'] as const) {
      const d = pickHomeSceneSpecial({ ...quiet(), milestoneKey: 'phrases_100', mistakesOpen: 40 }, base(s), HOME_SCENE_SPECIAL_EMPTY_JOURNAL);
      expect(d.special).toBeNull();
      expect(d.reason).toContain(`urgent base=${s}`);
    }
  });

  it('порядок: рубеж → праздник → ошибки → слова → Пик → друг → та же ошибка → фраза дня', () => {
    const all: HomeSceneSpecialInput = {
      ...quiet(at(2026, 10, 31, 10)), milestoneKey: 'lessons_10', mistakesOpen: 20, wordsDue: 15, peakOvertaken: { from: 3, to: 4 },
      friendAhead: { uid: 'f1', lessonsToday: 3 }, repeatedMistake: { id: 'm1', times: 2 }, phraseOfDaySeen: false,
    };
    expect(homeSceneSpecialCandidates(all, 'continue').map((c) => c.state)).toEqual([
      'milestone', 'holiday', 'mistakes_pile', 'words_due', 'peak_overtaken', 'friend_nudge', 'mistake_poke', 'phrase_of_day_unseen',
    ]);
  });

  it('«Всё пройдено» перебивают только рубеж и праздник', () => {
    const c = homeSceneSpecialCandidates({ ...quiet(), mistakesOpen: 50, milestoneKey: 'rank_3' }, 'all_done');
    expect(c.map((x) => x.state)).toEqual(['milestone']);
  });

  it('пороги: 14 ошибок и 11 слов — ещё нет; 15 и 12 — да', () => {
    expect(homeSceneSpecialCandidates({ ...quiet(), mistakesOpen: 14, wordsDue: 11 }, 'continue')).toEqual([]);
    expect(homeSceneSpecialCandidates({ ...quiet(), mistakesOpen: 15, wordsDue: 12 }, 'continue').map((c) => c.state)).toEqual(['mistakes_pile', 'words_due']);
  });

  it('фраза дня — только до 20:00', () => {
    expect(homeSceneSpecialCandidates({ ...quiet(at(2026, 10, 21, 19)), phraseOfDaySeen: false }, 'continue').map((c) => c.state)).toEqual(['phrase_of_day_unseen']);
    expect(homeSceneSpecialCandidates({ ...quiet(at(2026, 10, 21, 20)), phraseOfDaySeen: false }, 'continue')).toEqual([]);
  });

  it('личный рекорд — только вместо «Продолжить»; статистика и исправленная ошибка — только вместо «День засчитан»', () => {
    const i: HomeSceneSpecialInput = { ...quiet(), today: { tasks: 30, bestDay: 36 }, progressDays: 9, masteredMistake: { id: 'm9', streak: 5 } };
    expect(homeSceneSpecialCandidates(i, 'continue').map((c) => c.state)).toEqual(['personal_best']);
    expect(homeSceneSpecialCandidates(i, 'day_done').map((c) => c.state)).toEqual(['mistake_mastered', 'fun_stats']);
    expect(homeSceneSpecialCandidates({ ...i, today: { tasks: 20, bestDay: 36 } }, 'continue')).toEqual([]);
  });

  it('итоги недели — понедельник и активность на прошлой неделе', () => {
    const mon = at(2026, 10, 26, 9);
    expect(homeSceneSpecialCandidates({ ...quiet(mon), activeLastWeek: true }, 'continue').map((c) => c.state)).toEqual(['weekly_recap']);
    expect(homeSceneSpecialCandidates({ ...quiet(WED), activeLastWeek: true }, 'continue')).toEqual([]);
  });

  it('одна особая сцена в день: показанная остаётся, другая сегодня не появляется', () => {
    const j = recordHomeSceneSpecialShown(HOME_SCENE_SPECIAL_EMPTY_JOURNAL, 'words_due', null, WED);
    const again = pickHomeSceneSpecial({ ...quiet(), wordsDue: 20, mistakesOpen: 30 }, base('continue'), j);
    expect(again.special).toBe('words_due');
    const other = pickHomeSceneSpecial({ ...quiet(), mistakesOpen: 30 }, base('continue'), j);
    expect(other.special).toBeNull();
    expect(other.reason).toContain('already shown today: words_due');
  });

  it('та же сцена не два дня подряд — берётся следующая по приоритету', () => {
    const j = recordHomeSceneSpecialShown(HOME_SCENE_SPECIAL_EMPTY_JOURNAL, 'peak_overtaken', null, at(2026, 10, 20));
    const d = pickHomeSceneSpecial({ ...quiet(), peakOvertaken: { from: 2, to: 5 }, phraseOfDaySeen: false }, base('continue'), j);
    expect(d.special).toBe('phrase_of_day_unseen');
    expect(d.reason).toContain('peak_overtaken:yesterday');
  });

  it('частота: «гора ошибок» раз в 3 дня', () => {
    const j = recordHomeSceneSpecialShown(HOME_SCENE_SPECIAL_EMPTY_JOURNAL, 'mistakes_pile', null, at(2026, 10, 19));
    expect(pickHomeSceneSpecial({ ...quiet(), mistakesOpen: 20 }, base('continue'), j).special).toBeNull();
    expect(pickHomeSceneSpecial({ ...quiet(at(2026, 10, 22)), mistakesOpen: 20 }, base('continue'), j).special).toBe('mistakes_pile');
  });

  it('ключи: рубеж и исправленная ошибка — один раз; тот же друг — раз в неделю', () => {
    let j = recordHomeSceneSpecialShown(HOME_SCENE_SPECIAL_EMPTY_JOURNAL, 'milestone', 'phrases_100', at(2026, 10, 1));
    expect(pickHomeSceneSpecial({ ...quiet(), milestoneKey: 'phrases_100' }, base('continue'), j).special).toBeNull();
    expect(pickHomeSceneSpecial({ ...quiet(), milestoneKey: 'lessons_10' }, base('continue'), j).key).toBe('lessons_10');
    j = recordHomeSceneSpecialShown(HOME_SCENE_SPECIAL_EMPTY_JOURNAL, 'friend_nudge', 'f1', at(2026, 10, 17));
    expect(pickHomeSceneSpecial({ ...quiet(), friendAhead: { uid: 'f1', lessonsToday: 4 } }, base('continue'), j).special).toBeNull();
    expect(pickHomeSceneSpecial({ ...quiet(), friendAhead: { uid: 'f2', lessonsToday: 4 } }, base('continue'), j).key).toBe('f2');
    expect(pickHomeSceneSpecial({ ...quiet(at(2026, 10, 24)), friendAhead: { uid: 'f1', lessonsToday: 4 } }, base('continue'), j).key).toBe('f1');
  });

  it('праздник — в оба дня Нового года, хотя «не два дня подряд»', () => {
    const j = recordHomeSceneSpecialShown(HOME_SCENE_SPECIAL_EMPTY_JOURNAL, 'holiday', 'new_year', at(2026, 12, 31));
    const d = pickHomeSceneSpecial(quiet(at(2027, 1, 1)), base('continue'), j);
    expect(d.special).toBe('holiday');
    expect(d.key).toBe('new_year');
  });

  it('повторный показ в тот же день журнал не меняет; запись неизменяема', () => {
    const j1 = recordHomeSceneSpecialShown(HOME_SCENE_SPECIAL_EMPTY_JOURNAL, 'words_due', null, WED);
    expect(recordHomeSceneSpecialShown(j1, 'words_due', null, WED)).toBe(j1);
    expect(HOME_SCENE_SPECIAL_EMPTY_JOURNAL.last).toBeNull();
    expect(Object.isFrozen(j1)).toBe(true);
  });

  it('разбор журнала: мусор → пусто, верные поля сохраняются', () => {
    expect(parseHomeSceneSpecialJournal('x')).toEqual(HOME_SCENE_SPECIAL_EMPTY_JOURNAL);
    const j = recordHomeSceneSpecialShown(HOME_SCENE_SPECIAL_EMPTY_JOURNAL, 'mistake_poke', 'm1', WED);
    expect(parseHomeSceneSpecialJournal(JSON.parse(JSON.stringify(j)))).toEqual(j);
    expect(parseHomeSceneSpecialJournal({ last: { state: 'bogus', day: '2026-10-21' }, byState: { bogus: '2026-10-21', words_due: 'bad' } })).toEqual(HOME_SCENE_SPECIAL_EMPTY_JOURNAL);
  });

  it('тон времени суток у «Продолжить»', () => {
    expect(homeSceneTimeTone(8)).toBe('morning');
    expect(homeSceneTimeTone(9)).toBeNull();
    expect(homeSceneTimeTone(22)).toBe('late');
  });
});
