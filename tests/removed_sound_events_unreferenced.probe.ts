import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// зачем (PM-206-A2): удалённые sound event ID (XP-счётчик, лиги, MAX, спин, уровни, VIP-финалы и др.)
// не должны вызываться в коде — иначе арбитр звука получит неизвестный ключ. Упоминание в комментарии допустимо.
const root = path.resolve(__dirname, '..');
const REMOVED = [
  'pm.cards.swipe_know', 'pm.cards.swipe_learn', 'pm.celebration.max_awaken', 'pm.celebration.streak_shield',
  'pm.complete.xp_counter_complete', 'pm.complete.xp_counter_start', 'pm.complete.xp_counter_tick',
  'pm.dialog.reply_in', 'pm.dialog.reply_sent', 'pm.league.demoted', 'pm.league.promoted',
  'pm.max.call_connect', 'pm.max.call_end', 'pm.max.consent_granted', 'pm.max.prestart_ready', 'pm.max.review_open',
  'pm.reward.achievement', 'pm.reward.level_up', 'pm.reward.premium_finale', 'pm.reward.vip_finale', 'pm.reward.vip_open',
  'pm.shards.earned', 'pm.shop.open', 'pm.social.friend_request', 'pm.social.gift_received', 'pm.social.quest_complete',
  'pm.spin.button_press', 'pm.spin.reel_loop', 'pm.spin.reel_start', 'pm.spin.reel_stop_rollback', 'pm.spin.reward_lock',
  'pm.spin.reward_premium', 'pm.spin.reward_rare', 'pm.spin.reward_win',
];
const registry = fs.readFileSync(path.join(root, 'modules/audio/sound_events.ts'), 'utf8');
for (const id of REMOVED) assert.equal(registry.includes(`'${id}': event(`), false, `registry still defines ${id}`);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}
const offenders: string[] = [];
let scanned = 0;
for (const dir of ['app', 'components', 'modules', 'hooks']) {
  for (const file of walk(path.join(root, dir))) {
    scanned += 1;
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
      const code = line.replace(/\/\/.*$/, '');
      for (const id of REMOVED) {
        if (code.includes(`'${id}'`) || code.includes(`"${id}"`)) offenders.push(`${path.relative(root, file)}:${index + 1} ${id}`);
      }
    });
  }
}
assert.ok(scanned > 500, `scanned only ${scanned} files`);
assert.deepEqual(offenders, [], `removed sound events still referenced: ${offenders.join('; ')}`);
console.log(`removed_sound_events_unreferenced: PASS (${REMOVED.length} ids, ${scanned} files)`);
