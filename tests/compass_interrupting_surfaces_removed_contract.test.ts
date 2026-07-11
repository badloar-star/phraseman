import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const REMOVED_RUNTIME_FILES = [
  'app/compass/compass_briefing_host.tsx',
  'app/compass/compass_briefing_modal.tsx',
  'app/compass/compass_day_closing_panel.tsx',
  'app/compass/compass_sheet_kit.tsx',
  'app/compass/compass_user_prefs.ts',
  'app/compass/compass_voice_client.ts',
  'app/compass/day_closing_reward.ts',
  'app/compass/day_closing_reward_rules.ts',
  'app/compass/day_closing_ritual.ts',
  'app/compass/use_compass_voice.ts',
  'app/compass_settings.tsx',
  'app/admin_compass_lab.tsx',
  'app/_admin_compass_lab.tsx',
  'components/admin_panel/CompassStackPreviewModal.tsx',
  'components/admin_panel/sections/CompassSection.tsx',
  'functions/src/compass.ts',
  'functions/src/compass/compass_cache.ts',
  'functions/src/compass/compass_judge.ts',
  'functions/src/compass/compass_prompts.ts',
];

describe('Compass interrupting surfaces removal', () => {
  it('removes briefing, first-entry and day-closing runtime files', () => {
    for (const relativePath of REMOVED_RUNTIME_FILES) {
      expect(fs.existsSync(path.join(root, relativePath))).toBe(false);
    }
  });

  it('disconnects Home, Settings, public exports and the overlay queue', () => {
    expect(read('app/(tabs)/home.tsx')).not.toContain('CompassBriefingHost');
    expect(read('app/(tabs)/settings.tsx')).not.toContain('settings-compass');
    expect(read('app/(tabs)/settings.tsx')).not.toContain('/compass_settings');
    expect(read('app/compass/index.ts')).not.toMatch(/Briefing|useCompassVoice/);
    expect(read('components/overlay_arbiter_core.ts')).not.toContain('compassBriefing');
  });

  it('removes the dedicated voice backend and admin preview controls', () => {
    expect(read('app/remote_flags.ts')).not.toContain('compass_ai_voice_enabled');
    expect(read('app/remote_flags.ts')).not.toContain('compass_voice_fallback');
    expect(read('app/remote_flags.ts')).not.toContain('compass_copy_overrides');
    expect(read('functions/src/index.ts')).not.toContain('compassGenerate');
    expect(read('functions/package.json')).not.toContain('functions:compassGenerate');
    expect(read('firestore.rules')).not.toContain('compass_briefings');
    expect(read('admin/index.html')).not.toMatch(/compass_briefings|compass_ai_voice_enabled|compass_voice_fallback/);
    expect(read('components/admin_panel/sections/LabsSection.tsx')).not.toMatch(/CompassStackPreview|day-closing-ritual|admin_compass_lab/);
    expect(read('app/_admin_settings_testers.tsx')).not.toContain('CompassSection');
    expect(read('components/admin_panel/ui.tsx')).not.toMatch(/SECTION_META\.compass|briefing|day closing/);
    expect(read('metro.config.js')).not.toContain('_admin_compass_lab');
    expect(read('router.ctx.js')).not.toContain('admin_compass_lab');
    expect(read('scripts/gustav_build_fr_ai_prompt_parity_gate.mjs')).not.toContain('compassPrompt');
    expect(read('scripts/gustav_french_dev_surface_navigation_guard_v2_packet.ts')).not.toContain('compassBriefingHost');
    expect(read('scripts/gustav_french_app_surface_parity_v2_packet.ts')).not.toContain('compassNavigationGuardsReady');
    expect(read('scripts/gustav_build_fr_non_lesson_surface_backlog_gate.mjs')).not.toContain('functions/src/compass/compass_prompts.ts');
    expect(read('scripts/gustav_storage_inventory.ts')).not.toContain('compass_day_closing_free_used_v1');
    expect(read('scripts/gustav_storage_inventory.ts')).not.toContain('compass_briefing_seen_');
    expect(read('CLASS_REGISTRY_EVENTS_TOASTS.md')).not.toContain('compassBriefing');
  });

  it('preserves non-interrupting Compass and social notification behavior', () => {
    expect(read('app/_layout.tsx')).toContain('<GlobalCompassSocialHost />');
    expect(read('app/compass/index.ts')).toContain('collectCompassSocialNews');
    expect(read('app/compass/index.ts')).toContain('canActivatePlan');
    expect(read('app/compass/index.ts')).toContain('computeCompassDayWeight');
    expect(read('app/compass/index.ts')).toContain('decideRetentionPush');
    expect(read('app/compass/index.ts')).toContain('buildTopicMap');
    expect(read('app/compass/index.ts')).toContain('CompassStatsBlock');
    expect(read('firestore.rules')).toContain('match /compass_billing/{docId}');
  });
});
