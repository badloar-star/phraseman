// Since 2026-06-22 the 2730 generated listen-audio clips stream from Firebase
// Storage and are disk-cached on device — see
//   app/plan_audio_url_map.generated.ts               (uri -> Storage download URL)
//   app/personal_plan_listening_playback_contract.ts  (resolver: remote-first)
// Five original Gavan day-1 short replies do not belong to that generated URL
// catalog, so they remain bundled as the exact local fallback used by the plan.
const RUNTIME_AUDIO_ASSET_MODULES: Record<string, number> = {
  'assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-1.mp3': require('../assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-1.mp3'),
  'assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-2.mp3': require('../assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-2.mp3'),
  'assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-3.mp3': require('../assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-3.mp3'),
  'assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-4.mp3': require('../assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-4.mp3'),
  'assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-5.mp3': require('../assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-5.mp3'),
};

export function getPersonalPlanRuntimeAudioAssetModule(uri: string): number | undefined {
  return RUNTIME_AUDIO_ASSET_MODULES[uri.trim().replace(/\\/g, '/')];
}
