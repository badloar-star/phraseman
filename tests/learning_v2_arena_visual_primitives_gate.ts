import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const findings: string[] = [];

const modeFiles = [
  "phrase_builder_mode_v1.tsx",
  "listen_choose_mode_v1.tsx",
  "sound_contrast_mode_v1.tsx",
  "listen_build_dictation_mode_v1.tsx",
  "context_gap_grammar_mode_v1.tsx",
  "speed_match_mode_v1.tsx",
  "scripted_repeat_compare_mode_v1.tsx",
] as const;

for (const file of modeFiles) {
  const path = `modules/learning-v2/modes/${file}`;
  const source = read(path);
  if (
    file !== "scripted_repeat_compare_mode_v1.tsx" &&
    !source.includes("components/ui/v2_ui")
  )
    findings.push(`arena_primitives_not_imported:${path}`);
  if (!source.includes("useTournamentPalette"))
    findings.push(`arena_palette_not_used:${path}`);
}

for (const file of [
  "phrase_builder_mode_v1.tsx",
  "listen_choose_mode_v1.tsx",
  "sound_contrast_mode_v1.tsx",
  "listen_build_dictation_mode_v1.tsx",
  "context_gap_grammar_mode_v1.tsx",
  "speed_match_mode_v1.tsx",
] as const) {
  const path = `modules/learning-v2/modes/${file}`;
  if (!read(path).includes("V2Chip")) findings.push(`v2_chip_missing:${path}`);
}

const player = read("app/learning_v2_direct_session_player_v1.tsx");
if (!player.includes("SpeakingPanel")) findings.push("shared_oral_engine_missing");
if (!player.includes("SpeakHoldButton")) findings.push("onscreen_hold_target_missing");
if (player.includes('testID="learning-v2-footer-hold-to-talk"'))
  findings.push("voice_target_still_hidden_in_footer");
if (player.includes("copy.skip")) findings.push("global_skip_control_still_visible");
if (player.includes("copy.check")) findings.push("global_check_control_still_visible");

if (findings.length) {
  throw new Error(
    [
      "LEARNING V2 ARENA VISUAL PRIMITIVES GATE: HOLD",
      `total_findings=${findings.length}`,
      ...findings,
    ].join("\n"),
  );
}

process.stdout.write("LEARNING V2 ARENA VISUAL PRIMITIVES GATE: PASS\n");
