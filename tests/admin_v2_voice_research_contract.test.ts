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
    expect(controller).toContain("requestId: context.id('voice-idea-draft')");
    const ideaBackend = read('functions/src/user_ideas.ts');
    expect(ideaBackend).toContain("hasPermission(role, 'users.research.write')");
    expect(ideaBackend).toContain('enforceAppCheck: true');
    expect(ideaBackend).toContain('admin_voice_research_drafts');
    expect(read('firestore.rules')).toContain('match /admin_voice_research_drafts/{document=**} { allow read, write: if false; }');
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

  test('redirects legacy entry points while preserving a disabled emergency archive', () => {
    const legacy = read('admin/index.html');
    expect(legacy).toContain('installNativeVoiceResearchRedirects');
    expect(legacy).toContain("legacyArchive') === '1'");
    expect(legacy).toContain("'ideas', 'ideas-decided', 'surveys', 'onboarding-sources', 'cancel-surveys'");
    expect(legacy).toContain('data-voice-research-archive');
    expect(legacy).toContain('pointer-events:none!important');
  });

  test('routes the in-app dev survey editor through preview and apply', () => {
    const client = read('app/survey_client.ts');
    const lab = read('app/_admin_tasks_lab.tsx');
    expect(client).toContain("'adminPreviewVoiceResearchMutation'");
    expect(client).toContain("'adminApplyVoiceResearchMutation'");
    expect(client).not.toContain("'adminWriteShardSurvey'");
    expect(client).not.toContain("'adminDeleteShardSurvey'");
    expect(lab).toContain('confirmSurveyMutation');
    expect(lab).toContain('adminPreviewShardSurveyMutation');
    expect(lab).toContain('adminApplyShardSurveyMutation');
    expect(read('functions/src/user_ideas.ts')).toContain('legacy_idea_decision_disabled_use_voice_research_preview');
    expect(read('functions/src/shard_survey.ts')).toContain('legacy_survey_mutation_disabled_use_voice_research_preview');
  });
});
