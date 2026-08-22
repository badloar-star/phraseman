import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('MAX call is a Home-owned preloaded experience', () => {
  const home = read(path.join('app', '(tabs)', 'home.tsx'));
  const dialogs = read(path.join('components', 'DialogsTabContent.tsx'));
  const prestart = read(path.join('app', 'max_call_prestart.tsx'));
  const session = read(path.join('app', 'max_call_session.tsx'));
  const uiState = read(path.join('app', 'max_call_ui_state.ts'));
  const captionView = read(path.join('app', 'max_call_live_caption_view.tsx'));
  const review = read(path.join('app', 'max_voice_review.tsx'));

  it('opens the premint preparation screen from Home before the live call', () => {
    const maxEntry = home.slice(home.indexOf("key: 'max'"), home.indexOf("key: 'flashcards'"));

    expect(maxEntry).toContain("pathname: '/max_call_prestart'");
    expect(maxEntry).toContain('nav.push({');
    expect(maxEntry).not.toContain('router.push({');
    expect(maxEntry).not.toContain("pathname: '/max_call_session'");
    expect(prestart).toContain('beginPremint(');
    expect(prestart).toContain('markPremintHandoff(key)');
    expect(prestart).toContain("pathname: '/max_call_session'");
    expect(prestart).toContain("type PreparationState = 'preparing' | 'ready' | 'failed'");
    expect(prestart).toContain('disabled={!startReady}');
    expect(prestart).toContain("busy: prepState === 'preparing'");
    expect(prestart).toContain('setPrepAttempt((attempt) => attempt + 1)');
    expect(session).toContain('claimPremint(key)');
    for (const earlyCallToken of ['getUserMedia', 'RTCPeerConnection', 'sendHeartbeat', 'client.start']) {
      expect(prestart).not.toContain(earlyCallToken);
    }
  });

  it('prefetches a read-only tutor preview only after consent and never premints before navigation', () => {
    expect(home).toContain('prefetchMaxTutorPreview(maxTutorCallParams)');
    expect(home).toContain('if (!homeRuntimeActive || !maxVoiceVisible || !isAiVoiceConsentGranted()) return;');
    expect(home).toContain('isAiVoiceConsentGranted()');
    expect(home).not.toContain('beginMaxTutorEntry();');
    expect(home).not.toContain('beginPremint(');
    expect(home).not.toContain('setInterval(prefetchMaxTutorPreview');
    const paramsStart = home.indexOf('const maxTutorCallParams');
    const paramsEnd = home.indexOf('useEffect(() =>', paramsStart);
    expect(home.slice(paramsStart, paramsEnd)).toContain("studyTarget: 'en'");
    expect(home).toContain("ru: 'Учитель английского'");
    expect(home).toContain("uk: 'Учитель англійської'");
    expect(home).toContain("es: 'Profesor de inglés'");
    expect(home).toContain("'pt-BR': 'Professor de inglês'");
    expect(home).toContain("vi: 'Giáo viên tiếng Anh'");
    expect(home).toContain("id: 'Guru bahasa Inggris'");
    expect(home).toContain("tr: 'İngilizce öğretmeni'");
    expect(home).toContain("pl: 'Nauczyciel angielskiego'");
    expect(home).toContain("accessibilityLabel={item.key === 'max' ? maxTeacherA11yLabel : item.label}");
  });

  it('mounts preparation behind the MAX consent gate', () => {
    expect(prestart).toContain("import MaxVoiceConsentGate from './max_voice_consent_gate'");
    expect(prestart).toContain('<MaxVoiceConsentGate>');
    expect(prestart.indexOf('<MaxVoiceConsentGate>')).toBeLessThan(prestart.indexOf('<MaxCallPrestartContent'));
  });

  it('does not expose MAX anywhere in the Dialogs catalogue', () => {
    expect(dialogs).not.toContain('max-voice-entry-card');
    expect(dialogs).not.toContain('isMaxVoiceEntryVisible');
    expect(dialogs).not.toContain("pathname: '/max_call_prestart'");
    expect(dialogs).not.toContain("pathname: '/max_call_session'");
  });

  it('returns both the live call and its terminal review to Home', () => {
    expect(session).toContain("router.replace('/(tabs)/home' as any)");
    expect(review).toContain("router.replace('/(tabs)/home' as any)");
    expect(review).not.toContain("router.replace('/ai_dialog_home' as any)");
  });

  it('localizes primary screen-reader controls and announces changing call status politely', () => {
    for (const rawLabel of ['accessibilityLabel="Mute"', 'accessibilityLabel="End call"', 'accessibilityLabel="Close"']) {
      expect(session).not.toContain(rawLabel);
    }
    expect(prestart).not.toContain('accessibilityLabel="Back"');
    expect(review).not.toContain('accessibilityLabel="Back"');
    expect(session).toContain('accessibilityLiveRegion="polite"');
    expect(session).toContain("ru: 'Завершить разговор'");
  });

  it('keeps a visible Home exit in the empty deep-link review state', () => {
    expect(review).toContain('testID="max-voice-review-empty-home-button"');
  });

  it('never exposes a failed call as a UI state or a "could not call" screen', () => {
    expect(uiState).not.toContain("| 'failed'");
    expect(uiState).not.toContain("phase: 'failed'");
    expect(uiState).not.toContain('failReason');
    expect(session).not.toContain("phase === 'failed'");
    expect(session).not.toContain('max-call-failure-home-button');
    expect(session).not.toContain('Не получилось дозвониться');
    expect(session).not.toContain('maxVoiceFailureMessage');
    expect(session).toContain('function exitFailedCallForHome(): void');
    expect(session).toContain("endReasonRef.current = 'failed'");
    expect(session).toContain("router.replace('/(tabs)/home' as any)");
  });

  it('pins controls below a stable MAX-only caption and scrolls only the tutor board', () => {
    expect(session).toContain('testID="max-call-dynamic-content"');
    expect(session).toContain("maxHeight: '32%'");
    expect(session).toContain('<MaxCallLiveCaptionView visibleAssistantText={visibleAssistantText} lang={lang} />');
    expect(session).toContain("event.type === 'audio_out_started'");
    expect(session).toContain("type: 'audio_started'");
    expect(session).toContain('liveCaptionChunkDelayMs');
    expect(session).toContain("if (previousCaptionItemId !== event.itemId) setVisibleAssistantText('')");
    expect(session).not.toContain('const lastTwo = turns.slice(-2)');
    expect(session).not.toContain('{lastTwo.map((turn, i) => (');
    expect(captionView).toContain('visibleAssistantText');
    expect(captionView).toContain('minHeight:');
    expect(captionView).toContain('captionRailTail(visibleAssistantText)');
    expect(captionView).toContain('FlowText');
    expect(captionView).not.toContain('latestUserText');
    expect(captionView).not.toContain('onOpenTranscript');
    expect(session.indexOf('<MaxCallLiveCaptionView'))
      .toBeLessThan(session.indexOf('testID="max-call-dynamic-content"'));
    expect(session.indexOf('testID="max-call-dynamic-content"'))
      .toBeLessThan(session.indexOf('testID="max-call-end-button"'));
  });

  it('keeps diagnostic retry direct while routing a normal call-again through preparation', () => {
    expect(session).not.toContain("pathname: '/max_call_prestart'");
    expect(review).toContain("pathname: '/max_call_prestart'");
  });
});
