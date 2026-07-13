import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin v2 Voice & Research Center', () => {
  test('groups all five legacy capabilities into one native route', () => {
    const capabilities = read('admin/v2/scripts/admin-capabilities.js');
    for (const id of ['ideas', 'ideas-decided', 'surveys', 'onboarding-sources', 'cancel-surveys']) {
      expect(capabilities).toContain(`'${id}': 'voice-research'`);
    }
    const router = read('admin/v2/scripts/admin-router.js');
    expect(router).toContain("'voice-research'");
  });

  test('uses separate state/view/controller modules and protected callables', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const state = read('admin/v2/scripts/admin-voice-research-state.js');
    const view = read('admin/v2/scripts/admin-voice-research-view.js');
    const controller = read('admin/v2/scripts/admin-voice-research-controller.js');
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    expect(core).toContain("from './admin-voice-research-controller.js'");
    expect(core).toContain('renderVoiceResearchCenter');
    expect(state).toContain('createVoiceResearchState');
    expect(view).toContain('voice-research-tabs');
    expect(view).toContain('snapshotCursor');
    expect(controller).toContain('previewVoiceResearchMutation');
    expect(controller).toContain('applyVoiceResearchMutation');
    expect(controller).toContain("preview('survey_create'");
    expect(controller).toContain("preview('survey_toggle'");
    expect(controller).toContain("preview('survey_restore'");
    expect(controller).toContain('draftIdeaDecision');
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetVoiceResearchWorkspace')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminPreviewVoiceResearchMutation')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminApplyVoiceResearchMutation')");
  });

  test('contains no direct Firestore access in the native modules', () => {
    const source = ['admin-voice-research-state.js', 'admin-voice-research-view.js', 'admin-voice-research-controller.js']
      .map((file) => read(`admin/v2/scripts/${file}`)).join('\n');
    expect(source).not.toMatch(/collection\(|getDocs\(|setDoc\(|updateDoc\(|deleteDoc\(/);
    expect(source).toContain('loading');
    expect(source).toContain('partial');
    expect(source).toContain('error');
    expect(source).toContain('data-user-profile-uid');
  });
});
