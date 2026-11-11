import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

describe('Super Sunday live earn source wiring', () => {

  // зачем (владелец 11.11, пересмотр обрезанных тестов): случай был вырезан целиком вместе с курсом занятий; живая часть возвращена
  it('covers every live gameplay award boundary without multiplying practice twice on the server', () => {
    const spin = read('app/level_spin_star_grants.ts');
    const practiceClient = read('app/practice_rune_settlement.ts');
    const practiceServer = read('functions/src/practice_rune_grant.ts');
    const reportCompensation = read('app/report_reward_bundle.ts');

    expect(spin).toContain('applySuperSundayRuneMultiplier(baseAmount, input.createdAtMs)');
    expect(spin).toContain('levelSpinStarOperationAmountV1({ requestId, giftId, promotionEligibility, createdAtMs })');
    expect(practiceClient).toContain('applySuperSundayRuneMultiplier(input.earnings.pendingRunes, createdAtMs)');
    expect(practiceServer).not.toContain('applySuperSundayRuneMultiplier');
    expect(reportCompensation).toContain("promotionEligibility: 'excluded_compensation'");
  });

  // зачем (01.10): награды «Вместе» монетами сняты вместе с подарками; сторож — что удвоение не вернулось.
  it('Friends together no longer awards doubled runes (D147)', () => {
    // зачем: D78 — серверная Арена (arena_v2.ts/arena_expansion.ts) удалена; её рунные награды больше не начисляются.
    const friends = read('functions/src/friends_together.ts');

    // D147: «Супер-воскресенье» снято — награды «Вместе» без удвоения.
    expect(friends).not.toContain('applySuperSundayRuneMultiplier');

  });

  it('server video-watch rune claim is deleted (D78/PM-080, Q109)', () => {
    expect(fs.existsSync(path.resolve(__dirname, '..', 'functions', 'src', 'video_watch_runes.ts'))).toBe(false);
    expect(read('functions/src/index.ts')).not.toMatch(/export \{ videoWatchRunesClaim \}/);
  });

  it('has no client video-watch rune source left (Q9)', () => {
    // зачем: Q9 — видео не источник монет (список D104/D105/D109)
    for (const removed of [
      'hooks/use_video_watch_energy_boost.ts',
      'app/video_watch_runes_client.ts',
      'app/energy_video_watch_credit.ts',
    ]) {
      expect(fs.existsSync(path.resolve(__dirname, '..', removed))).toBe(false);
    }
    const player = read('components/youtube/YoutubeInlinePlayer.tsx');
    expect(player).not.toMatch(/from ['"][^'"]*(use_video_watch_energy_boost|video_watch_runes_client|energy_video_watch_credit)['"]/);
  });
});
