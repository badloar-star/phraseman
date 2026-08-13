import fs from 'fs';
import path from 'path';

describe('admin app messages poll contract', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'admin', 'legacy.html'), 'utf8');
  const functionsSource = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'app_messages.ts'), 'utf8');

  it('lets admins choose a poll option count from 2 to 6', () => {
    expect(html).toContain('id="am-poll-option-count"');
    expect(html).toContain('APP_MESSAGE_POLL_MIN_OPTIONS = 2');
    expect(html).toContain('APP_MESSAGE_POLL_MAX_OPTIONS = 6');
    expect(html).toMatch(/<option value="2"[^>]*>2 варианта<\/option>/);
    expect(html).toMatch(/<option value="6"[^>]*>6 вариантов<\/option>/);
  });

  it('renders six reusable option rows but only saves the selected count', () => {
    const optionRows = html.match(/<div class="app-msg-field app-msg-poll-option-row" data-am-poll-option-row="[1-6]"/g) || [];
    const optionInputs = html.match(/id="am-poll-option-\d"/g) || [];

    expect(optionRows).toHaveLength(6);
    expect(optionInputs).toHaveLength(6);
    expect(html).toContain('function appMessageGetPollOptionCount()');
    expect(html).toMatch(/APP_MESSAGE_POLL_OPTION_NUMBERS\s*\.slice\(0,\s*appMessageGetPollOptionCount\(\)\)/);
    expect(html).toContain('optionTexts.some((text) => !text)');
  });

  it('keeps poll rows synchronized during preview, reset, and edit', () => {
    expect(html).toContain('function updateAppMessagePollOptionRows()');
    expect(html).toMatch(/row\.poll\?\.options\?\.length\s*\|\|\s*APP_MESSAGE_POLL_MIN_OPTIONS/);
    expect(html).toMatch(/document\.getElementById\('am-poll-option-count'\)\.value = String\(APP_MESSAGE_POLL_MIN_OPTIONS\)/);
    expect(html).toMatch(/setAttribute\('aria-hidden', String\(!visible\)\)/);
  });

  it('resets stale poll engagement when an existing poll structure changes', () => {
    expect(html).toContain('function appMessagePollStructureChanged(previousPoll, nextPoll)');
    expect(html).toContain('async function resetAppMessagePollEngagement(messageId)');
    expect(html).toMatch(/payload\.pollCounts = appMessageEmptyPollCounts\(poll\)/);
    expect(html).toMatch(/payload\.pollVoteCount = 0/);
    expect(html).toMatch(/payload\.pollResetAtMs = nowMs/);
    expect(html).toContain('getAdminUpdateAppMessageCallable()');
    expect(html).toContain('resetPollEngagement: shouldResetPollEngagement');
    expect(html).not.toMatch(/await resetAppMessagePollEngagement\(editId\)/);
    expect(html).toMatch(/pollOptionId: deleteField\(\)/);
  });

  it('keeps the Cloud Function counter safe during admin poll resets', () => {
    expect(functionsSource).toContain('pollResetAtMs');
    expect(functionsSource).toContain('countedBeforeOptionId');
    expect(functionsSource).toMatch(/pollResetAtMs >= beforeUpdatedAtMs/);
    expect(functionsSource).toMatch(/pollVoteCount: admin\.firestore\.FieldValue\.increment\(\(afterOptionId \? 1 : 0\) - \(countedBeforeOptionId \? 1 : 0\)\)/);
  });
});
