import { readFileSync } from 'fs';
import { join } from 'path';

// Contract for the DEV-only `previewHoldMode` prop: it lets the admin Speaking
// Lab show the Android "press-and-hold" LOOK from any platform (e.g. an iPhone)
// WITHOUT arming the microphone. This guards two things an adversarial review
// flagged: (1) the two preview visuals (ready hold button vs "preparing model")
// must be driven by DISTINCT values of the three-valued prop so neither shadows
// the other; (2) the real mic-arming guard must stay on the BEHAVIORAL flag.
const panel = readFileSync(join(__dirname, '..', 'components', 'SpeakingPanel.tsx'), 'utf8');
const lab = readFileSync(join(__dirname, '..', 'app', '_admin_speaking_lab.tsx'), 'utf8');

describe('SpeakingPanel previewHoldMode — display flags', () => {
  it('accepts a three-valued dev prop (boolean | "preparing")', () => {
    expect(panel).toContain("previewHoldMode?: boolean | 'preparing'");
  });

  it('derives holdModeView from previewHoldMode === true in preview', () => {
    expect(panel).toContain('const holdModeView = isPreview ? previewHoldMode === true : holdMode');
  });

  it('derives preparingModelView from the EXCLUSIVE "preparing" value', () => {
    // Distinct from holdModeView so the ready-hold and preparing previews never shadow each other.
    expect(panel).toContain(
      "const preparingModelView = isPreview ? previewHoldMode === 'preparing' : preparingModel",
    );
  });

  it('routes hold-mode STATUS text and mic-disabled through the display flags', () => {
    expect(panel).toContain('if (preparingModelView && (status');
    expect(panel).toContain('|| preparingModelView;');
    expect(panel).toContain('return holdModeView');
  });

  it('routes the mic button gesture + retry through the display flag', () => {
    expect(panel).toContain('{...(holdModeView');
    expect(panel).toContain('onPress={holdModeView ? resetForRetry : startListening}');
  });
});

describe('SpeakingPanel previewHoldMode — behavioral safety (no mic arming in preview)', () => {
  it('keeps the startHold recording guard on the BEHAVIORAL holdMode flag', () => {
    // The single most dangerous switch: this guard must NOT read holdModeView,
    // or a press in preview would open the real microphone.
    expect(panel).toContain('if (!holdMode) return;');
    // holdSupported stays gated on !isPreview so the behavioral flags are false in preview.
    expect(panel).toContain('!isPreview && Platform.OS === \'android\'');
  });

  it('keeps the system-recognizer start inert in preview', () => {
    expect(panel).toContain('if (isPreview) return;');
  });
});

describe('admin speaking lab wiring', () => {
  it('has a toggle for the Android hold look and passes previewHoldMode', () => {
    expect(lab).toContain('setHoldModeView');
    expect(lab).toContain('previewHoldMode={preview.holdPreparing ? \'preparing\' : holdModeView}');
  });

  it('offers a dedicated preparing-state preview row', () => {
    expect(lab).toContain('holdPreparing: true');
  });
});
