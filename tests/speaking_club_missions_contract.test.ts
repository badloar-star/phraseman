/**
 * Контракт каталога миссий «Разговорного клуба» (specs/speaking-club.md, волна 1):
 * 8 миссий Акта I строго по урокам 1–8, целевые фразы резолвятся из контента
 * уроков, объединённые под-цели укладываются в серверный кап (6), звёзды и
 * локальная проверка фраз детерминированы.
 */
import {
  CLUB_ACT1_MISSION_COUNT,
  CLUB_MISSIONS,
  MISSION_TARGET_PHRASE_COUNT,
  buildMissionObjectives,
  computeMissionStars,
  didLearnerSayPhrase,
  getClubMissionById,
  missionCefr,
  missionTargetPhrases,
} from '../app/speaking_club_missions';

describe('speaking club mission catalog', () => {
  it('has exactly 8 Act I missions mapped 1:1 to lessons 1–8', () => {
    expect(CLUB_MISSIONS).toHaveLength(CLUB_ACT1_MISSION_COUNT);
    expect(CLUB_MISSIONS.map((m) => m.lessonId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const ids = new Set(CLUB_MISSIONS.map((m) => m.id));
    expect(ids.size).toBe(CLUB_MISSIONS.length);
  });

  it('every mission is A1 (Act I) with scenario fields and 1–3 scenario objectives', () => {
    for (const mission of CLUB_MISSIONS) {
      expect(missionCefr(mission)).toBe('A1');
      expect(mission.role.length).toBeGreaterThan(4);
      expect(mission.setting.length).toBeGreaterThan(4);
      expect(mission.goalEn.length).toBeGreaterThan(8);
      expect(mission.objectives.length).toBeGreaterThanOrEqual(1);
      expect(mission.objectives.length).toBeLessThanOrEqual(3);
      for (const o of mission.objectives) {
        expect(o.id).toBeTruthy();
        expect(o.labelRu).toBeTruthy();
        expect(o.en).toBeTruthy();
        // Айди phrase_N зарезервированы под фразовые цели.
        expect(o.id.startsWith('phrase_')).toBe(false);
      }
    }
  });

  it('resolves lesson target phrases for the en study target', () => {
    for (const mission of CLUB_MISSIONS) {
      const phrases = missionTargetPhrases(mission.lessonId, 'en');
      expect(phrases).toHaveLength(MISSION_TARGET_PHRASE_COUNT);
      for (const p of phrases) {
        expect(p.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('combined objectives fit the server cap of 6', () => {
    for (const mission of CLUB_MISSIONS) {
      const phrases = missionTargetPhrases(mission.lessonId, 'en');
      const combined = buildMissionObjectives(mission, phrases);
      expect(combined.length).toBeLessThanOrEqual(6);
      const phraseIds = combined.filter((o) => o.id.startsWith('phrase_')).map((o) => o.id);
      expect(phraseIds).toEqual(phrases.map((_, i) => `phrase_${i + 1}`));
    }
  });

  it('getClubMissionById finds missions and rejects unknown ids', () => {
    expect(getClubMissionById('club_3')?.lessonId).toBe(3);
    expect(getClubMissionById('nope')).toBeNull();
  });
});

describe('computeMissionStars', () => {
  const base = { phrasesUsed: 0, phrasesTotal: 3, scenarioObjectivesMet: 0, scenarioObjectivesTotal: 2 };

  it('gives 0 stars when the mission was not completed', () => {
    expect(computeMissionStars({ ...base, completed: false, phrasesUsed: 3, scenarioObjectivesMet: 2 })).toBe(0);
  });

  it('gives 1 star for completion, +1 for all phrases, +1 for all objectives', () => {
    expect(computeMissionStars({ ...base, completed: true })).toBe(1);
    expect(computeMissionStars({ ...base, completed: true, phrasesUsed: 3 })).toBe(2);
    expect(computeMissionStars({ ...base, completed: true, phrasesUsed: 3, scenarioObjectivesMet: 2 })).toBe(3);
  });
});

describe('didLearnerSayPhrase', () => {
  it('matches case-insensitively and ignores punctuation', () => {
    expect(didLearnerSayPhrase(['Well, HOW MUCH is it, please?'], 'How much is it?')).toBe(true);
  });

  it('normalizes curly apostrophes', () => {
    expect(didLearnerSayPhrase(['i’m not a doctor'], "I'm not a doctor")).toBe(true);
  });

  it('does not match when the phrase was not said', () => {
    expect(didLearnerSayPhrase(['Hello there'], 'How much is it?')).toBe(false);
    expect(didLearnerSayPhrase([], 'anything')).toBe(false);
  });
});
