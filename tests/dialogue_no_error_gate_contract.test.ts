import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

// 18.10 (владелец на эмуляторе: «Los diálogos no están disponibles» + «Volver» — «такого не должно быть»; правило 01.10):
// сессия, брифинг и свободный разговор не показывают экран-ошибку — тихо уходят в хаб Диалогов, причина в журнале.
describe('Dialogs never show an error gate — they quietly return to the hub', () => {
  it('the redirect shows the loading gate, replaces to the hub once and logs the reason', () => {
    const redirect = read('components/dialogs/DialogueHubRedirect.tsx');
    expect(redirect).toContain("export const DIALOGUE_HUB_ROUTE = '/ai_dialog_home';");
    expect(redirect).toContain('router.replace(DIALOGUE_HUB_ROUTE as never);');
    expect(redirect).toContain('[DIALOGUE-V2] ${screen} → redirect hub');
    expect(redirect).toContain('loading title={loadingLabel}');
    expect(redirect).not.toContain('cloud-offline-outline');
  });

  it('session: paused and unavailable go to the hub', () => {
    const session = read('app/dialogue_v2_session.tsx');
    expect(session).toMatch(/<DialogueHubRedirect\s+screen="session"\s+reason="paused"/);
    expect(session).toMatch(/<DialogueHubRedirect\s+screen="session"\s+reason=\{!model \?/);
    expect(session).not.toContain('title={labels.unavailable}');
    expect(session).not.toContain('title={coachingLabels.pausedTitle}');
  });

  it('briefing and freeform: no unavailable gate', () => {
    const briefing = read('app/dialogue_v2_briefing.tsx');
    expect(briefing).toMatch(/<DialogueHubRedirect\s+screen="briefing"/);
    expect(briefing).not.toContain('testID="dialogue-v2-briefing-unavailable" message={labels.unavailable}');
    const freeform = read('app/dialogue_v2_freeform.tsx');
    expect(freeform).toMatch(/<DialogueHubRedirect\s+screen="freeform"\s+reason="start_failed"/);
    // замок Plus — не ошибка, остаётся
    expect(freeform).toContain('testID="dialogue-v2-freeform-plus"');
  });
});
