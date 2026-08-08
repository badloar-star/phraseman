import fs from 'fs';
import path from 'path';

const HUB_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'app', '(tabs)', 'tournaments.tsx'),
  'utf8',
);

describe('tournaments hub live refresh contract', () => {
  test('schedule refresh is driven by the real tournaments tab visibility, not retained-stack focus', () => {
    const refreshBlock = HUB_SOURCE.slice(
      HUB_SOURCE.indexOf('void loadSchedule(true)') - 120,
      HUB_SOURCE.indexOf('const { room } = useTournamentRoom'),
    );

    expect(refreshBlock).toContain('if (!tournamentsTabVisible) return;');
    expect(refreshBlock).toContain('void loadSchedule(true)');
    expect(refreshBlock).toContain('}, [tournamentsTabVisible]);');
    expect(refreshBlock).not.toContain('if (!screenFocused) return;');
    expect(refreshBlock).not.toContain('isFirstFocusRef');
  });

  test('retained hub rolls schedule slot timestamps to the current local day without a remount', () => {
    expect(HUB_SOURCE).toContain('scheduleDayKey');
    expect(HUB_SOURCE).toContain('tournamentDateKey(timezone, new Date(tournamentNow()))');
    expect(HUB_SOURCE).toContain('dateKey: addDaysToDateKey(list[0].dateKey, 1)');
    expect(HUB_SOURCE).toContain('tournamentRoomId(watchSlot.slotId, timezone, watchSlot.dateKey)');
    expect(HUB_SOURCE).toContain('tournamentRoomId(nextSlot.slotId, timezone, nextSlot.dateKey)');
    expect(HUB_SOURCE).toMatch(/enabledSlots\(schedule\?\.slots \?\? \[\],\s*scheduleDayKey\)/);
    expect(HUB_SOURCE).toMatch(/\[schedule,\s*scheduleDayKey\]/);
  });

  test('room subscriptions and timers are gated by the real tournaments tab owner', () => {
    const screenBlock = HUB_SOURCE.slice(
      HUB_SOURCE.indexOf('export default function TournamentsScreen'),
      HUB_SOURCE.indexOf('const LiveDot = memo'),
    );

    expect(screenBlock).toContain('const runtimeActive = useRuntimeActive(screenFocused && tournamentsTabVisible);');
    expect(screenBlock).not.toContain('const runtimeActive = useRuntimeActive(screenFocused);');
  });

  test('season standings revalidate when the retained tournaments tab becomes visible', () => {
    const seasonBlock = HUB_SOURCE.slice(
      HUB_SOURCE.indexOf('const [standings, setStandings]'),
      HUB_SOURCE.indexOf('const seasonTop = useMemo'),
    );

    expect(seasonBlock).toContain('if (!tournamentsTabVisible) return;');
    expect(seasonBlock).toContain('void loadSeasonStandings(true)');
    expect(seasonBlock).toContain('}, [tournamentsTabVisible]);');
  });

  test('hub rating bars are scaled by shown stars, not hidden weekly place points', () => {
    expect(HUB_SOURCE).toContain('const topStars = Math.max(1, ...seasonTop.map((entry) => entry.starsTotal));');
    expect(HUB_SOURCE).toContain('ratio={leader.starsTotal / topStars}');
    expect(HUB_SOURCE).toContain('ratio={myRowSeparate.starsTotal / topStars}');
    expect(HUB_SOURCE).not.toContain('ratio={leader.points / topStars}');
    expect(HUB_SOURCE).not.toContain('ratio={myRowSeparate.points / topStars}');
  });
});
