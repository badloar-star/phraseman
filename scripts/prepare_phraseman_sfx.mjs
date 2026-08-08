import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_SOURCE = "C:\\Users\\badlo\\OneDrive\\Desktop\\BANK\\PHRASEMAN SOUND DESIGN'";

const asset = (eventId, category, sourceNeedle, options = {}) => ({
  eventId,
  sourceNeedle,
  destination: `assets/audio/sfx/v1/${category}/${eventId.replaceAll('.', '_')}_v1.wav`,
  enabled: true,
  ...options,
});

const missing = (eventId, category) => ({
  eventId,
  sourceNeedle: '',
  destination: `assets/audio/sfx/v1/${category}/${eventId.replaceAll('.', '_')}_v1.wav`,
  enabled: false,
});

export const ASSET_SPECS = Object.freeze([
  asset('pm.learn.correct', 'learning', 'Create_a_0.38-second_premium_mobile_UI_one-shot_fo_variation1.wav'),
  asset('pm.learn.needs_work', 'learning', 'pm_learn_needs_work_glass_a_v1'),
  asset('pm.learn.hint_reveal', 'learning', 'pm_learn_hint_reveal_glass_a_v1'),
  asset('pm.learn.timer_warning', 'learning', 'pm_learn_timer_warning_tactile_b_v1'),
  asset('pm.learn.timer_expired', 'learning', 'pm_learn_timer_expired_glass_a_v1'),
  // зачем 2026-08-03: pm.learn.combo_5/combo_10 убраны — эффект серии 5/10
  // (звук+вибрация) удалён из приложения целиком (владелец: «убрать полностью»).

  asset('pm.voice.record_ready', 'voice', 'pm_voice_record_ready_tactile_b_v1'),
  asset('pm.voice.turn_ready', 'voice', 'm_voice_turn_ready_tactile_b_v1'),
  asset('pm.voice.no_speech', 'voice', 'pm_voice_no_speech_glass_a_v1'),

  asset('pm.complete.micro', 'completion', 'pm_complete_micro_glass_a_v1'),
  asset('pm.complete.session', 'completion', 'pm_complete_session_tactile_b_v1'),
  asset('pm.complete.perfect', 'completion', 'pm_complete_perfect_glass_a_v1'),
  asset('pm.complete.exam_pass', 'completion', 'pm_complete_exam_pass_glass_a_v1', { trimSeconds: 1.65 }),
  asset('pm.complete.exam_retry', 'completion', 'pm_complete_exam_retry_glass_a_v1'),
  asset('pm.complete.star_1', 'completion', 'pm_complete_star_1_glass_a_v1'),
  asset('pm.complete.star_2', 'completion', 'pm_complete_star_2_glass_a_v1'),
  asset('pm.complete.star_3', 'completion', 'pm_complete_star_3_glass_a_v1'),

  asset('pm.system.success', 'system', 'pm_system_success_glass_a_v1'),
  asset('pm.system.info', 'system', 'pm_system_info_air_c_v1'),
  asset('pm.system.warning', 'system', 'pm_system_warning_glass_a_v1'),
  asset('pm.system.error_recoverable', 'system', 'pm_system_error_recoverable_glass_a_v1'),
  asset('pm.system.destructive_done', 'system', 'pm_system_destructive_done_glass_a_v1'),

  asset('pm.energy.empty', 'energy', 'pm_energy_empty_glass_a_v1'),
  asset('pm.energy.refilled', 'energy', 'pm_energy_refilled_glass_a_v1'),
  asset('pm.streak.saved', 'streak', 'pm_streak_saved_glass_a_v1'),

  asset('pm.reward.small', 'reward', 'pm_reward_small_glass_a_v1.wav_Create_a_0.72-secon_variation4.wav'),
  asset('pm.reward.collectible', 'reward', 'pm_reward_collectible_glass_a_v1'),
  asset('pm.reward.achievement', 'reward', 'pm_reward_achievement_glass_a_v1'),
  asset('pm.reward.level_up', 'reward', 'pm_reward_level_up_air_c_v1'),
  asset('pm.reward.chest_open', 'reward', 'pm_reward_chest_open_air_c_v1'),
  asset('pm.reward.premium_open', 'reward', 'pm_reward_premium_open_glass_a_v1'),
  asset('pm.reward.premium_finale', 'reward', 'pm_reward_premium_finale_air_c_v1'),
  asset('pm.reward.vip_open', 'reward', 'pm_reward_vip_open_glass_a_v1.wav_Create_a_1.55-se_variation3.wav'),
  missing('pm.reward.vip_finale', 'reward'),

  asset('pm.league.promoted', 'league', 'pm_league_promoted_air_c_v1'),
  asset('pm.league.demoted', 'league', 'pm_league_demoted_air_c_v1'),
  asset('pm.social.gift_received', 'social', 'pm_social_gift_received_glass_a_v1'),
  asset('pm.social.friend_request', 'social', 'pm_social_friend_request_glass_a_v1'),
  asset('pm.social.quest_complete', 'social', 'pm_social_quest_complete_glass_a_v1'),
]);

function walkFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function resolveSources(sourceRoot) {
  if (!existsSync(sourceRoot)) throw new Error(`Sound source folder is missing: ${sourceRoot}`);
  const wavs = walkFiles(sourceRoot).filter((file) => file.toLowerCase().endsWith('.wav'));
  return new Map(
    ASSET_SPECS.filter((spec) => spec.enabled).map((spec) => {
      const matches = wavs.filter((file) => path.basename(file).includes(spec.sourceNeedle));
      if (matches.length !== 1) {
        throw new Error(`${spec.eventId}: expected one source matching ${spec.sourceNeedle}, found ${matches.length}`);
      }
      return [spec.eventId, matches[0]];
    }),
  );
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function probe(file) {
  const raw = run('ffprobe', [
    '-v', 'error',
    '-select_streams', 'a:0',
    '-show_entries', 'stream=sample_rate,channels,sample_fmt:format=duration',
    '-of', 'json',
    file,
  ]);
  const parsed = JSON.parse(raw);
  const stream = parsed.streams?.[0] ?? {};
  return {
    duration: Number(parsed.format?.duration ?? 0),
    sampleRate: Number(stream.sample_rate ?? 0),
    channels: Number(stream.channels ?? 0),
    sampleFormat: String(stream.sample_fmt ?? ''),
  };
}

function applyAssets(sourceRoot) {
  const sources = resolveSources(sourceRoot);
  for (const spec of ASSET_SPECS.filter((entry) => entry.enabled)) {
    const source = sources.get(spec.eventId);
    const destination = path.resolve(ROOT, spec.destination);
    mkdirSync(path.dirname(destination), { recursive: true });
    if (spec.trimSeconds) {
      run('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-i', source,
        '-af', `atrim=0:${spec.trimSeconds},afade=t=out:st=${Math.max(0, spec.trimSeconds - 0.015)}:d=0.015`,
        '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le',
        destination,
      ]);
    } else {
      cpSync(source, destination);
    }
  }
}

function checkAssets() {
  const failures = [];
  const rows = [];
  for (const spec of ASSET_SPECS.filter((entry) => entry.enabled)) {
    const destination = path.resolve(ROOT, spec.destination);
    if (!existsSync(destination)) {
      failures.push(`${spec.eventId}: missing ${spec.destination}`);
      continue;
    }
    if (!statSync(destination).isFile()) {
      failures.push(`${spec.eventId}: destination is not a file`);
      continue;
    }
    const info = probe(destination);
    if (info.sampleRate !== 48000 || info.channels !== 2 || info.sampleFormat !== 's16') {
      failures.push(`${spec.eventId}: expected 48 kHz stereo s16, got ${JSON.stringify(info)}`);
    }
    rows.push({ eventId: spec.eventId, ...info, destination: spec.destination });
  }

  if (failures.length) throw new Error(`SFX asset check failed:\n${failures.join('\n')}`);
  return rows;
}

function parseSourceArg(args) {
  const index = args.indexOf('--source');
  if (index === -1) return process.env.PHRASEMAN_SFX_SOURCE_DIR || DEFAULT_SOURCE;
  if (!args[index + 1]) throw new Error('--source requires a folder path');
  return path.resolve(args[index + 1]);
}

const args = process.argv.slice(2);
if (args.includes('--print-specs')) {
  process.stdout.write(`${JSON.stringify(ASSET_SPECS)}\n`);
} else if (args.includes('--apply')) {
  const sourceRoot = parseSourceArg(args);
  applyAssets(sourceRoot);
  const rows = checkAssets();
  process.stdout.write(`Prepared ${rows.length} canonical SFX assets from ${sourceRoot}.\n`);
} else if (args.includes('--check')) {
  const rows = checkAssets();
  process.stdout.write(`Verified ${rows.length} canonical SFX assets; 9 events remain explicitly disabled.\n`);
} else {
  process.stderr.write('Usage: node scripts/prepare_phraseman_sfx.mjs --print-specs | --check | --apply [--source PATH]\n');
  process.exitCode = 2;
}
