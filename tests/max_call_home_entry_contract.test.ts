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

  it('prefetches and premints only after consent while keeping navigation available to the consent gate', () => {
    const maxEntry = home.slice(home.indexOf("key: 'max'"), home.indexOf("key: 'flashcards'"));

    expect(home).toContain('prefetchMaxTutorPreview(maxTutorCallParams)');
    expect(home).toContain('if (!homeRuntimeActive || !maxVoiceVisible || !isAiVoiceConsentGranted()) return;');
    expect(home).toContain('isAiVoiceConsentGranted()');
    expect(home).not.toContain('beginMaxTutorEntry();');
    expect(maxEntry).toContain('if (isAiVoiceConsentGranted()) {');
    expect(maxEntry).toContain('beginPremint(');
    expect(maxEntry.indexOf('if (isAiVoiceConsentGranted()) {'))
      .toBeLessThan(maxEntry.indexOf('beginPremint('));
    const consentChecks = [...maxEntry.matchAll(/isAiVoiceConsentGranted\(\)/g)]
      .map((match) => match.index);
    expect(consentChecks.length).toBeGreaterThanOrEqual(2);
    expect(consentChecks[1]).toBeLessThan(maxEntry.indexOf('beginPremint('));
    expect(maxEntry).toContain('nav.push({');
    expect(home).not.toContain('setInterval(prefetchMaxTutorPreview');
    const paramsStart = home.indexOf('const maxTutorCallParams');
    const paramsEnd = home.indexOf('useEffect(() =>', paramsStart);
    expect(home.slice(paramsStart, paramsEnd)).toContain('studyTarget,');
    expect(home.slice(paramsStart, paramsEnd)).not.toContain("studyTarget: 'en'");
    // Видимая подпись-расшифровка по-прежнему не нужна, но screen reader
    // обязан назвать учителя текущего курса, а не всегда английского.
    expect(home).not.toContain('maxTeacherSubtitle');
    expect(home).toContain('maxVoiceTeacherAccessibilityLabel(lang, studyTarget)');
    expect(home).toContain("accessibilityLabel={item.key === 'max' ? maxTeacherA11yLabel : item.label}");
  });

  it('keeps MAX visible and openable for every current course while preserving its target through routes', () => {
    expect(home).toContain('const maxVoiceVisible = useMemo(() => isMaxVoiceEntryVisible(), []);');
    expect(home).not.toContain('isMaxVoiceEntryVisible() && maxVoiceContentAvailableForTarget');
    expect(home).toContain("params: { format: 'tutor', cefr: maxTutorCallParams.cefr, studyTarget }");

    for (const route of [prestart, session]) {
      expect(route).not.toContain('maxVoiceContentAvailableForTarget');
      expect(route).not.toContain('maxTargetSupported');
    }

    expect(prestart).toContain('studyTarget: callStudyTarget');
    expect(session).toContain('studyTarget: callStudyTarget');
    expect(review).toContain('nextParams.studyTarget = activeStudyTarget');
    expect(prestart).not.toContain("studyTarget: format === 'tutor' ? 'en' : studyTarget");
    expect(session).not.toContain("studyTarget: isTutor ? 'en' : studyTarget");
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
    expect(session).toContain('<MaxCallLiveCaptionView');
    expect(session).toContain("event.type === 'audio_out_started'");
    expect(session).toContain("type: 'audio_started'");
    // зачем (владелец 2026-08-23): пословная догонялка субтитров снята — она
    // перерисовывала строку десятки раз за реплику и текст «прыгал туда сюда».
    // Реплика показывается целиком, поэтому liveCaptionChunkDelayMs больше нет.
    expect(session).not.toContain('liveCaptionChunkDelayMs');
    // Смена реплики по-прежнему сбрасывает подпись, но публикацией нового
    // состояния целиком, а не затиранием «уже произнесённой» части.
    expect(session).toContain('if (previousCaptionItemId !== event.itemId) publishCaption()');
    expect(session).not.toContain('const lastTwo = turns.slice(-2)');
    expect(session).not.toContain('{lastTwo.map((turn, i) => (');
    expect(captionView).toContain('visibleAssistantText');
    // Высота блока субтитров ФИКСИРОВАННАЯ (height), а не минимальная: раньше
    // блок рос под содержимое и экран «прыгал ниже выше из-за текста».
    expect(captionView).toContain('height: CAPTION_BOX_HEIGHT');
    expect(captionView).not.toContain('minHeight: 132');
    expect(captionView).toContain('FlowText');
    expect(captionView).not.toContain('latestUserText');
    expect(captionView).not.toContain('onOpenTranscript');
    expect(session.indexOf('<MaxCallLiveCaptionView'))
      .toBeLessThan(session.indexOf('testID="max-call-dynamic-content"'));
    expect(session.indexOf('testID="max-call-dynamic-content"'))
      .toBeLessThan(session.indexOf('testID="max-call-end-button"'));
  });

  it('субтитры показывают реплику целиком, без пословной догонялки', () => {
    // Владелец 2026-08-23: «сделай так чтобы его реплики появлялись сразу целиком
    // на экране и не были лаганые, то есть не прыгали туда сюда». Пословный
    // таймер (scheduleCaptionTick) перерисовывал строку десятки раз за реплику —
    // от этого текст дёргался. Он снят; окно по-прежнему считается по ПОЛНОЙ
    // реплике, иначе текст уезжал бы влево на каждом новом куске.
    const captionView = read('app/max_call_live_caption_view.tsx');
    const session = read('app/max_call_session.tsx');
    expect(captionView).toContain('captionRailTail(source, wordLimit)');
    // Подсветки «сказано / ещё нет» больше нет: реплика рисуется одним куском.
    expect(captionView).not.toContain('splitSpokenTail');
    expect(session).toContain('fullAssistantText={fullAssistantText}');
    expect(session).toContain('setFullAssistantText(liveCaptionRef.current.fullText)');
    // Догонялка снята, а публикация идёт по росту полного текста.
    expect(session).not.toContain('scheduleCaptionTick()');
    expect(session).toContain('liveCaptionRef.current.fullText !== previousFullCaption');
  });

  it('keeps diagnostic retry direct while routing a normal call-again through preparation', () => {
    expect(session).not.toContain("pathname: '/max_call_prestart'");
    expect(review).toContain("pathname: '/max_call_prestart'");
  });
});
