import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8');

const APPROVED_MODES = [
  'guess_phrase',
  'fill_gap',
  'find_oddity',
  'translate_build',
  'speed_match',
] as const;

const RETIRED_MODES = [
  'time_attack',
  'listen_choose',
  'sound_contrast',
  'listen_build',
] as const;

describe('owner-approved tournament surfaces', () => {
  test('the player renders only the five approved modes', () => {
    const round = read('app/tournament_round.tsx');

    for (const mode of APPROVED_MODES) expect(round).toContain(`'${mode}'`);
    for (const mode of RETIRED_MODES) expect(round).not.toContain(mode);

    expect(round).not.toContain('TournamentAudioButton');
    expect(round).not.toMatch(/kind:\s*'[^']*listen|kind:\s*'[^']*dictate|kind:\s*'[^']*timeattack/);
    expect(round).toContain("kind: 'choice' | 'translate' | 'match'");
  });

  test('round timing comes only from the server-authored task schedule', () => {
    const client = read('app/tournament_client.ts');
    const round = read('app/tournament_round.tsx');

    expect(client).toContain('export type RoomTaskTiming =');
    expect(client).toMatch(/taskSchedule\?:\s*RoomTaskTiming\[\]/);
    expect(round).toContain('activeRound?.taskSchedule');
    expect(round).toContain('questionTiming?.durationMs');
    expect(round).toContain('questionTiming.deadlineAtMs');
    expect(round).toContain('tournamentNow()');
    expect(round).not.toContain('SECONDS_PER_QUESTION');
    expect(round).not.toContain('SECONDS_PER_MATCH');
    expect(round).not.toContain('questionDeadlineRef');
    expect(round).not.toContain('Date.now()');
  });

  test('the round selects the server-active round instead of the first historical payload', () => {
    const round = read('app/tournament_round.tsx');

    expect(round).toMatch(/\^round\(\[1-4\]\)\$/);
    expect(round).toContain('round.roundNo === activeRoundNo');
    expect(round).not.toContain('find((round) => round.tasks && round.tasks.length > 0)');
  });

  test('the live admin pool exposes exactly the five approved modes', () => {
    const admin = read('admin/v2/legacy.html');
    const activeStart = admin.indexOf('const TN_ACTIVE_MODE_LABEL =');
    const activeEnd = admin.indexOf('const TN_RETIRED_MODES =', activeStart);
    const foldersStart = admin.indexOf('const TN_FOLDERS =');
    const foldersEnd = admin.indexOf('window.tnOpenFolder', foldersStart);

    expect(activeStart).toBeGreaterThan(-1);
    expect(activeEnd).toBeGreaterThan(activeStart);
    expect(foldersStart).toBeGreaterThan(-1);
    expect(foldersEnd).toBeGreaterThan(foldersStart);

    const activeModes = admin.slice(activeStart, activeEnd);
    const liveFolders = admin.slice(foldersStart, foldersEnd);
    for (const mode of APPROVED_MODES) {
      expect(activeModes).toContain(mode);
      expect(liveFolders).toContain(`mode: '${mode}'`);
    }
    for (const mode of RETIRED_MODES) {
      expect(activeModes).not.toContain(mode);
      expect(liveFolders).not.toContain(`mode: '${mode}'`);
    }

    expect(admin).not.toContain('TN_AUDIO_MODES');
    expect(liveFolders).toContain('data-tooltip=');
  });

  test('retired task data remains reviewable without becoming a live mode', () => {
    const admin = read('admin/v2/legacy.html');
    const retiredStart = admin.indexOf('const TN_RETIRED_MODES =');
    const retiredEnd = admin.indexOf('const tnModeLabel =', retiredStart);
    const retiredModes = admin.slice(retiredStart, retiredEnd);

    expect(retiredStart).toBeGreaterThan(-1);
    expect(retiredEnd).toBeGreaterThan(retiredStart);
    for (const mode of RETIRED_MODES) expect(retiredModes).toContain(mode);
    expect(admin).toContain('TN_RETIRED_MODES.has(mode)');
    expect(admin).toContain('function tnRenderTask(task)');
  });

  test('the lobby visibly exposes exit, player count, and the authoritative pot', () => {
    const lobby = read('app/tournament_lobby.tsx');

    expect(lobby).toContain('onPress={leaveLobby}');
    expect(lobby).toContain('accessibilityLabel=');
    expect(lobby).toContain('closeTournamentFlow(router)');
    // зачем 2026-08-04 (владелец: «в лобби ещё ни бота ни юзера, а счётчик
    // сразу набрался 75»): сторож требовал `bankGems = room.potGems` дословно —
    // ровно ту строку, которая и показывала полный банк над пустой сеткой.
    // Сервер кладёт взносы всех 15 ботов в комнату при её создании, поэтому
    // сырой potGems НЕ является тем, что игрок должен видеть на первой секунде.
    // Охраняем суть, а не механику: банк считается по времени прихода, теми же
    // часами, что и места, и остаётся ограничен авторитетной суммой комнаты.
    expect(lobby).toContain('lobbyPotGemsAtTime(');
    expect(lobby).toMatch(/lobbyPotGemsAtTime\([\s\S]{0,160}room\?\.potGems/);
    expect(lobby).toMatch(/lobbyPotGemsAtTime\([\s\S]{0,160}room\?\.lobbyEvents \?\? \[\]/);
    expect(lobby).toMatch(/lobbyPotGemsAtTime\([\s\S]{0,160}tournamentNow\(\)/);
    // зачем 2026-08-03: сверялась ОДНА строка JSX целиком, поэтому обычное
    // переформатирование в несколько строк (и новый проп
    // onDisplayAmountChange) роняло сторож, хотя банк на экране не менялся.
    expect(lobby).toMatch(/<AnimatedBankAmount[\s\S]{0,200}amount=\{bankGems\}/);
    expect(lobby).toContain('value={`${joined}/${SEATS}`}');
  });
});
