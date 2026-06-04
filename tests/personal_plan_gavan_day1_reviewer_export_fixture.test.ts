import { readFileSync } from 'fs';
import path from 'path';
import {
  buildGavanDay1ReviewerExportFixture,
  validateGavanDay1ReviewerExportFixture,
} from '../app/personal_plan_gavan_day1_reviewer_export_fixture';

const UNSAFE_SNIPPET_RE =
  /[\u00d0\u00d1\u00c2\u00e2\ufffd]|DEV|debug|draft|placeholder|TODO|sourcePhraseId|contentUnit|renderer|selected option|You chose/i;

describe('Gavan day 1 reviewer export fixture', () => {
  it('exports display cards and release decision without live integration', () => {
    const fixture = buildGavanDay1ReviewerExportFixture();

    expect(fixture.kind).toBe('gavan_day1_reviewer_export_fixture');
    expect(fixture.dayId).toBe('gavan-week1-day1');
    expect(fixture.liveIntegration).toBe(false);
    expect(fixture.display.cards.map((card) => card.id)).toEqual([
      'content',
      'package',
      'quiz',
      'explanations',
      'listening',
      'pronunciation',
      'release',
    ]);
    expect(fixture.releaseDecision).toEqual({
      canRelease: fixture.display.summary.canRelease,
      blockedSections: fixture.display.summary.blockedSections,
    });
    expect(validateGavanDay1ReviewerExportFixture(fixture).valid).toBe(true);
  });

  it('exports exact phrase explanation snippets for manual review', () => {
    const fixture = buildGavanDay1ReviewerExportFixture();

    expect(fixture.phraseExplanationSnippets).toHaveLength(5);
    expect(fixture.phraseExplanationSnippets[0]).toEqual(expect.objectContaining({
      id: 'phrase:gavan-day1-final-p1:explanation-1',
      phraseId: 'gavan-day1-final-p1',
      english: "I'm here.",
      reviewStatus: 'needs_manual_review',
      coveredTargets: ['here', "I'm"],
    }));

    for (const snippet of fixture.phraseExplanationSnippets) {
      expect(snippet.reviewStatus).toBe('needs_manual_review');
      expect(snippet.explanationBody.length).toBeGreaterThanOrEqual(95);
      expect(snippet.explanationBody).not.toMatch(UNSAFE_SNIPPET_RE);
    }
  });

  it('exports exact quiz prompts and choice notes for manual review', () => {
    const fixture = buildGavanDay1ReviewerExportFixture();

    expect(fixture.quizPromptSnippets).toHaveLength(10);
    expect(fixture.quizNoteSnippets).toHaveLength(30);
    expect(fixture.quizPromptSnippets[0]).toEqual(expect.objectContaining({
      id: 'quiz:gavan-week1-day1-quiz:item-1:prompt',
      itemId: 'gavan-week1-day1-quiz:item-1',
      reviewStatus: 'needs_manual_review',
    }));

    for (const snippet of fixture.quizPromptSnippets) {
      expect(snippet.reviewStatus).toBe('needs_manual_review');
      expect(snippet.prompt.length).toBeGreaterThanOrEqual(12);
      expect(snippet.prompt).not.toMatch(UNSAFE_SNIPPET_RE);
    }

    for (const snippet of fixture.quizNoteSnippets) {
      expect(snippet.reviewStatus).toBe('needs_manual_review');
      expect(snippet.note.length).toBeGreaterThanOrEqual(45);
      expect(snippet.note).not.toMatch(/^Да[:.,\s]/i);
      expect(snippet.note).not.toMatch(UNSAFE_SNIPPET_RE);
    }
  });

  it('summarizes the manual review workload without approving content', () => {
    const fixture = buildGavanDay1ReviewerExportFixture();

    expect(fixture.summary).toEqual({
      displayCards: 7,
      phraseExplanations: 5,
      quizPrompts: 10,
      quizNotes: 30,
      snippetsNeedingManualReview: 45,
      approvedSnippets: 0,
    });
  });

  it('fails validation when snippets hide manual review or contain unsafe text', () => {
    const fixture = buildGavanDay1ReviewerExportFixture();

    expect(validateGavanDay1ReviewerExportFixture({
      ...fixture,
      phraseExplanationSnippets: fixture.phraseExplanationSnippets.map((snippet, index) =>
        index === 0
          ? { ...snippet, reviewStatus: 'approved' as 'needs_manual_review' }
          : snippet,
      ),
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'snippet_not_marked_for_manual_review' }),
    ]));

    expect(validateGavanDay1ReviewerExportFixture({
      ...fixture,
      quizNoteSnippets: fixture.quizNoteSnippets.map((snippet, index) =>
        index === 0
          ? { ...snippet, note: 'DEV placeholder selected option feedback.' }
          : snippet,
      ),
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unsafe_snippet_copy' }),
    ]));
  });

  it('stays outside UI storage live catalog and live quiz registries', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'app', 'personal_plan_gavan_day1_reviewer_export_fixture.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toContain("from './personal_plan_catalog'");
    expect(source).not.toContain("from './personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
