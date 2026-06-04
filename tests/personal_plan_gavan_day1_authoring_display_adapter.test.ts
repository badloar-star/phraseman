import { readFileSync } from 'fs';
import path from 'path';
import {
  buildGavanDay1AuthoringBundle,
} from '../app/personal_plan_gavan_day1_authoring_bundle';
import {
  buildGavanDay1AuthoringDisplayModel,
  validateGavanDay1AuthoringDisplayModel,
} from '../app/personal_plan_gavan_day1_authoring_display_adapter';

describe('Gavan day 1 authoring display adapter', () => {
  it('adapts the authoring bundle into stable reviewer cards without live integration', () => {
    const display = buildGavanDay1AuthoringDisplayModel(
      buildGavanDay1AuthoringBundle(),
    );

    expect(display.kind).toBe('gavan_day1_authoring_display_model');
    expect(display.dayId).toBe('gavan-week1-day1');
    expect(display.liveIntegration).toBe(false);
    expect(display.cards.map((card) => card.id)).toEqual([
      'content',
      'package',
      'quiz',
      'explanations',
      'listening',
      'pronunciation',
      'release',
    ]);
    expect(display.cards).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'content',
        label: 'Контент дня',
        status: 'ready',
        countSummary: '5 фраз',
        issueCodes: [],
      }),
      expect.objectContaining({
        id: 'quiz',
        label: 'Квиз',
        status: 'ready',
        countSummary: expect.stringContaining('10 вопросов'),
        issueCodes: [],
      }),
      expect.objectContaining({
        id: 'release',
        label: 'Release gate',
        status: 'ready',
      }),
    ]));
    expect(validateGavanDay1AuthoringDisplayModel(display).valid).toBe(true);
  });

  it('keeps planned media rows visibly planned instead of production-ready by default', () => {
    const display = buildGavanDay1AuthoringDisplayModel(
      buildGavanDay1AuthoringBundle(),
    );
    const listening = display.cards.find((card) => card.id === 'listening')!;
    const pronunciation = display.cards.find((card) => card.id === 'pronunciation')!;

    expect(listening.status).toBe('planned');
    expect(listening.countSummary).toBe('5 prompts · 1 audio requirement');
    expect(listening.issueCodes).toEqual([]);
    expect(listening.reviewerCopy).toMatch(/planned/i);
    expect(listening.reviewerCopy).not.toMatch(/ready|final|approved|production-ready/i);

    expect(pronunciation.status).toBe('planned');
    expect(pronunciation.countSummary).toBe('5 targets · 1 scoring requirement');
    expect(pronunciation.issueCodes).toEqual([]);
    expect(pronunciation.reviewerCopy).toMatch(/planned/i);
    expect(pronunciation.reviewerCopy).not.toMatch(/ready|final|score is available|production-ready/i);
  });

  it('shows exact blocker codes when media authoring is attached to release evidence', () => {
    const display = buildGavanDay1AuthoringDisplayModel(
      buildGavanDay1AuthoringBundle({
        attachListeningToRelease: true,
        attachPronunciationToRelease: true,
      }),
    );

    expect(display.summary).toEqual(expect.objectContaining({
      ready: 4,
      blocked: 3,
      planned: 0,
      canRelease: false,
      blockedSections: expect.arrayContaining(['audio', 'pronunciation']),
    }));
    expect(display.cards).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'listening',
        status: 'blocked',
        issueCodes: expect.arrayContaining(['audio_not_production_ready']),
      }),
      expect.objectContaining({
        id: 'pronunciation',
        status: 'blocked',
        issueCodes: expect.arrayContaining(['pronunciation_scoring_not_ready']),
      }),
      expect.objectContaining({
        id: 'release',
        status: 'blocked',
        issueCodes: expect.arrayContaining(['audio', 'pronunciation']),
      }),
    ]));
  });

  it('keeps every reviewer card safe from developer wording and fake media claims', () => {
    const display = buildGavanDay1AuthoringDisplayModel(
      buildGavanDay1AuthoringBundle({
        attachListeningToRelease: true,
        attachPronunciationToRelease: true,
      }),
    );
    const visibleText = display.cards
      .map((card) => `${card.label} ${card.countSummary} ${card.reviewerCopy}`)
      .join(' ');

    expect(visibleText).not.toMatch(/DEV|debug|sourcePhraseId|contentUnit|renderer|TODO|placeholder/i);
    expect(visibleText).not.toMatch(/final audio|final scoring|exact pronunciation score|score is available/i);
    expect(validateGavanDay1AuthoringDisplayModel(display).valid).toBe(true);
  });

  it('fails validation when a card hides its status copy or release blockers', () => {
    const display = buildGavanDay1AuthoringDisplayModel(
      buildGavanDay1AuthoringBundle({
        attachListeningToRelease: true,
        attachPronunciationToRelease: true,
      }),
    );

    expect(validateGavanDay1AuthoringDisplayModel({
      ...display,
      cards: display.cards.map((card) =>
        card.id === 'listening'
          ? { ...card, reviewerCopy: '' }
          : card,
      ),
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_reviewer_copy' }),
    ]));

    expect(validateGavanDay1AuthoringDisplayModel({
      ...display,
      cards: display.cards.map((card) =>
        card.id === 'release'
          ? { ...card, issueCodes: [] }
          : card,
      ),
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'release_card_hides_blockers' }),
    ]));
  });

  it('stays outside UI storage live catalog and live quiz registries', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'app', 'personal_plan_gavan_day1_authoring_display_adapter.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toContain("from './personal_plan_catalog'");
    expect(source).not.toContain("from './personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
