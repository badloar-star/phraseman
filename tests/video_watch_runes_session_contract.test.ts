import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8');

describe('video-watch rune session authority', () => {
  // зачем (PM-115, владелец): «убрать начисление рун и энергии за просмотр
  // видео» — старый тест сторожил ЖИВУЮ выдачу рун (start реально открывал
  // серверную сессию). Это и есть отменённое правило: startVideoWatchRuneSession
  // теперь безусловно отказывает до сети, поэтому claim/progress с реальным
  // sessionId из хука больше не вызываются. Проверяем именно отключение, а не
  // прежний протокол авторитетности.
  test('start no-ops before any network call, so a real session never begins', () => {
    const client = read('app', 'video_watch_runes_client.ts');
    const hook = read('hooks', 'use_video_watch_energy_boost.ts');
    expect(client).toContain('PM-115_video_rewards_disabled');

    const startStart = client.indexOf('export async function startVideoWatchRuneSession');
    const startEnd = client.indexOf('export async function claimVideoWatchRuneSession', startStart);
    const startBlock = client.slice(startStart, startEnd);
    expect(startBlock).toContain("return { ok: false, reason: 'PM-115_video_rewards_disabled' };");
    expect(startBlock).not.toContain('callable()(');

    // Хук не переписан (сигнатуры сохранены по образцу local_level_spins.ts),
    // поэтому имена функций в нём по-прежнему есть — реального начисления это
    // больше не производит.
    expect(hook).toContain('startVideoWatchRuneSession');
    expect(hook).toContain('claimVideoWatchRuneSession');
  });

  test('server grants only verified progress and protects every authority field from clients', () => {
    const server = read('functions', 'src', 'video_watch_runes.ts');
    const rules = read('firestore.rules');
    expect(server).toContain("action === 'progress'");
    expect(server).toContain('session.verifiedMs');
    expect(server).toContain('maxCreditedPositionMs');
    expect(server).not.toContain('observedVideoWatchDuration(session.startedAt, now');
    expect(server).not.toMatch(/Number\(request\.data\?\.minutes\)/);
    for (const field of [
      'videoWatchRunesDaily',
      'videoWatchRuneSessionV1',
      'videoWatchRuneCarryMsV1',
    ]) {
      const occurrences = rules.match(new RegExp(`'${field}'`, 'g')) ?? [];
      expect(occurrences.length).toBeGreaterThanOrEqual(2);
    }
  });
});
