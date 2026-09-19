import fs from 'node:fs';
import path from 'node:path';

const html = fs.readFileSync(path.join(process.cwd(), 'admin/v2/legacy.html'), 'utf8');

describe('admin ratings dashboard', () => {
  it('uses the user-facing name Оценки and keeps the legacy route', () => {
    expect(html).toContain("switchTab('max-feedback')");
    expect(html).toContain("'max-feedback': 'Оценки'");
    expect(html).not.toContain("'max-feedback': 'Отзывы MAX'");
    expect(html).toContain('<h2 class="pm-v4-section-title">Оценки</h2>');
  });

  it('offers seven one-click sources and three comment modes', () => {
    for (const kind of ['max_call', 'lesson', 'learning_v2', 'vocab', 'dialogue', 'arena_blitz', 'arena_rating']) {
      expect(html).toContain(`data-feedback-kind="${kind}"`);
    }
    for (const mode of ['all', 'with', 'without']) {
      expect(html).toContain(`data-feedback-comments="${mode}"`);
    }
    for (const period of ['7', '30', '90', '0']) {
      expect(html).toContain(`data-feedback-period="${period}"`);
    }
    expect(html).toContain('aria-label="Раздел оценок"');
    expect(html).toContain('aria-label="Комментарии"');
  });

  it('renders aggregate fields and calls the exact statistics endpoint', () => {
    for (const id of [
      'feedback-stat-average',
      'feedback-stat-total',
      'feedback-stat-comments',
      'feedback-rating-breakdown',
      'feedback-stats-status',
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("httpsCallable(functionsUs, 'adminGetFeedbackStats')");
  });

  it('renders percentage fills as block boxes so their widths are visible', () => {
    expect(html).toMatch(/\.feedback-rating-fill\s*\{[^}]*display:\s*block/);
  });

  it('forces ratings to the visible first navigation position', () => {
    expect(html).toContain("const ADMIN_REQUIRED_FIRST_TAB = 'max-feedback'");
    expect(html).toContain('hiddenSet.delete(ADMIN_REQUIRED_FIRST_TAB)');
    expect(html).toContain('requiredFirst ? [requiredFirst, ...withoutRequiredFirst]');
  });

  it('guards asynchronous filter changes from stale responses', () => {
    expect(html).toContain('generation: 0');
    expect(html).toContain('generation !== feedbackViewState.generation');
  });

  it('keeps the AI summary manual and reads the new filter state', () => {
    expect(html).toContain('loadFeedbackSummary(true)');
    expect(html).toContain('feedbackViewState.periodDays || 3650');
    expect(html).toContain('feedbackViewState.kind');
  });
});
