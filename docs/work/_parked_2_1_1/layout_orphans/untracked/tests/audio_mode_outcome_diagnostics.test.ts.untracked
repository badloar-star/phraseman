const mockNoteSwallowed = jest.fn();

jest.mock('../app/swallow_log', () => ({
  noteSwallowed: mockNoteSwallowed,
}));

import type { ManagedAudioModeResult } from '../app/audio_session_coordinator';

type DiagnosticsModule = Readonly<{
  reportRootAudioModeOutcome(result: ManagedAudioModeResult): void;
  reportYoutubeAudioModeOutcome(result: ManagedAudioModeResult): void;
}>;

function loadDiagnostics(): Partial<DiagnosticsModule> {
  try {
    return require('../app/audio_mode_outcome_diagnostics') as DiagnosticsModule;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('audio_mode_outcome_diagnostics')) return {};
    throw error;
  }
}

describe('resolved audio-mode outcome diagnostics', () => {
  const nonApplied = ['failed', 'timed_out'] as const;

  beforeEach(() => {
    mockNoteSwallowed.mockReset();
  });

  it.each(nonApplied)('reports YouTube UI-mode restore outcome %s', (outcome) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    loadDiagnostics().reportYoutubeAudioModeOutcome?.({ outcome });

    expect(warn).toHaveBeenCalledWith('[VIDEO-PLAYER] режим звука не вернулся', outcome);
    warn.mockRestore();
  });

  it.each(nonApplied)('reports root UI-mode startup outcome %s', (outcome) => {
    loadDiagnostics().reportRootAudioModeOutcome?.({ outcome });

    expect(mockNoteSwallowed).toHaveBeenCalledTimes(1);
    expect(mockNoteSwallowed).toHaveBeenCalledWith(
      '_layout:useEffect.setManagedAudioMode',
      expect.objectContaining({ message: `managed audio mode outcome: ${outcome}` }),
    );
  });
});
