import fs from 'fs';
import path from 'path';

describe('MAX tutor live-board call integration', () => {
  const session = fs.readFileSync(path.join(__dirname, '../app/max_call_session.tsx'), 'utf8');
  const analytics = fs.readFileSync(path.join(__dirname, '../app/analytics.ts'), 'utf8');

  it('renders one tutor context strip plus the temporary teaching board', () => {
    expect(session).toContain('MaxTutorGoalStrip');
    expect(session).toContain('MaxTutorLiveBoard');
    expect(session).not.toContain('<MaxTutorTopicNotice');
    expect(session).toMatch(/isTutor\s*&&[\s\S]{0,500}MaxTutorGoalStrip/);
    expect(session).toMatch(/isTutor\s*&&[\s\S]{0,900}MaxTutorLiveBoard/);
    expect(session).toContain('currentTopic={tutorUi.currentTopic}');
    expect(session).toContain('sceneTitle={tutorSceneLabel}');
    expect(session).toContain("if (isTutor) return '';");
    expect(session).not.toContain("ru: 'Учитель'");
  });

  it('derives visible turn status from the real audio owner without a thinking label', () => {
    const copy = fs.readFileSync(path.join(__dirname, '../app/max_voice_copy.ts'), 'utf8');
    expect(copy).toContain("eqOwner: MaxCallUiState['eqOwner']");
    expect(copy).toContain("maxSpeaking: 'MAX говорит'");
    expect(copy).toContain("speak: 'Говори'");
    expect(session).not.toContain("ru: 'Собеседник думает…'");
    expect(session).toContain('maxVoicePhaseLabel(phase, uiState.eqOwner, lang)');
    expect(session).not.toContain('reconnectShown');
    expect(session).not.toContain("phase === 'reconnecting' && !reconnectShown ? 'thinking' : phase");
  });

  it('honours an explicit completed stop request with one goodbye and a hard guard', () => {
    expect(session).toContain('isMaxEndIntent(event.text)');
    expect(session).toContain("handleUiEvent({ type: 'learner_end_requested' })");
    expect(session).toContain('MAX_LEARNER_END_INSTRUCTION');
    expect(session).toContain('LEARNER_END_HARD_GUARD_MS');
    expect(session).toContain("clientRef.current?.end('completed')");
  });

  it('keeps retry and finish behavior independent of the reconnect screen layout', () => {
    expect(session).toContain("client?.phase() === 'reconnect_failed'");
    expect(session).toContain('client.retryReconnect()');
    expect(session).toContain("void client.end('failed')");
    expect(session).toContain("reduceMaxCallUi(prev, { type: 'end' })");
  });

  it('connects validated tools and clears transient UI across lifecycle boundaries', () => {
    expect(session).toContain('onLiveBoard:');
    expect(session).toContain('normalizeTutorBoard');
    expect(session).toContain('onLiveTopic:');
    expect(session).toContain("type: 'speech_started'");
    expect(session).toContain("type: 'reconnecting'");
    expect(session).toContain("type: 'background'");
    expect(session).toContain("type: 'ended'");
  });

  it('tracks interaction metadata without tutor text or transcript content', () => {
    for (const event of [
      'max_tutor_board_shown',
      'max_tutor_board_listened',
      'max_tutor_board_dismissed',
      'max_tutor_topic_changed',
    ]) {
      expect(analytics).toContain(`'${event}'`);
      expect(session).toContain(`'${event}'`);
    }
    const trackedCalls = session.match(/trackEvent\([\s\S]{0,220}?\);/g)?.join('\n') ?? '';
    expect(trackedCalls).not.toMatch(/targetText|meaning|transcript|topic:\s*topic/);
  });

  it('only requests phrase replay while MAX is listening and exposes button state', () => {
    expect(session).toContain("uiPhaseRef.current !== 'listening'");
    expect(session).toContain('boardListenPendingRef.current');
    expect(session).toContain('listenState={boardListenState}');
  });

  it('drops replay state and transient teaching UI as soon as reconnect begins', () => {
    expect(session).toContain("if (event.type === 'reconnect_started') {");
    expect(session).toContain("dispatchTutorUi({ type: 'reconnecting' });");
    expect(session).toMatch(/event\.type === 'response_done'[\s\S]{0,180}event\.type === 'reconnect_started'/);
  });

  // Согласованный вариант сохраняет числовой остаток, но дополняет его постоянно
  // видимой убывающей полосой в компактном варианте дневного meter-компонента.
  it('shows the decreasing daily MAX allowance while preserving the hard call deadline', () => {
    expect(session).toContain('dailyQuotaFromLimits(mint.limits)');
    expect(session).toContain('setHardAtMs(deadlines.hardAtMs)');
    expect(session).toContain("import MaxDailyQuotaMeter from '../components/max/MaxDailyQuotaMeter'");
    expect(session).toContain('<MaxDailyQuotaMeter');
    expect(session).toContain('variant="compact"');
    expect(session).toContain('runningSinceMs={startedAtMs}');
  });

  it('keeps the full daily allowance meter on the call pre-screen', () => {
    const prestart = fs.readFileSync(path.join(__dirname, '../app/max_call_prestart.tsx'), 'utf8');
    expect(prestart).toContain('<MaxDailyQuotaMeter');
    expect(prestart).toContain('variant="hero"');
  });

  it('routes tutor audio levels to the full MAX sphere without removing other call personas', () => {
    expect(session).toContain('callOrbRef.current?.setAudioLevel(sample.remote)');
    expect(session).toContain('<MaxCallOrb');
    expect(session).toContain('<MaxCallHalo');
  });

  it('keeps the live subtitle stable and opens the full transcript from the CC control', () => {
    expect(session).toContain('visibleAssistantText={visibleAssistantText}');
    expect(session).toContain('completedAssistantText={completedAssistantText}');
    expect(session).toContain('testID="max-call-caption-visibility-toggle"');
    const buttonStart = session.indexOf('testID="max-call-captions-button"');
    const buttonEnd = session.indexOf('</TouchableOpacity>', buttonStart);
    expect(buttonStart).toBeGreaterThan(-1);
    expect(session.slice(buttonStart, buttonEnd)).toContain('setSheetOpen(true)');
  });
});
