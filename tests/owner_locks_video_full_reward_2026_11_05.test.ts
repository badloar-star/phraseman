// ЗАМОК ВЛАДЕЛЬЦА 05.11: «ЗА КАЖДОЕ ВИДЕО ЗА ФУЛЛ ПРОСМОТР ДАВАТЬ 500 МОНЕТОК! … ТАК ЖЕ ПРИ ЗАВЕРШЕНИИ ВИДЕО ИКОНКА И НАЧИСЛЕНИЕ +500 СРАЗУ»; «Что считать полным просмотром — 70% видео.
// Повторный просмотр не даёт»; без дневного предела; воскресное ×2 НЕ применяется — всегда ровно +500; макет video_reward одобрен («все остальное подтверждаю», один текст он просил убрать —
// пока не назвал, поэтому пояснительных подписей мелким шрифтом нет). Реестр docs/work/OWNER_LOCKS.md, строка 05.11. Ослабить можно только по новому слову владельца:
// правка файла + строки реестра + KNOWN_GUARDS в tests/owner_locks_registry.test.cjs.
import { VIDEO_FULL_GIFT_ID, VIDEO_FULL_REWARD_COINS, VIDEO_FULL_REQUEST_PREFIX } from '../app/video_full_reward';
import { VIDEO_FULL_WATCH_RATIO } from '../app/video_full_watch';
import { readSource } from './helpers/read_source';

const code = (rel: string): string => readSource(rel).split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n').replace(/\/\/[^\n]*/g, '');

describe('ЗАМОК ВЛАДЕЛЬЦА 05.11 — +500 монет за полный (70 %) просмотр видео, один раз на ролик', () => {
  it('сумма ровно 500 (giftId stars_500), порог 70 %, префикс requestId videofull_', () => {
    expect(VIDEO_FULL_REWARD_COINS).toBe(500);
    expect(VIDEO_FULL_GIFT_ID).toBe('stars_500');
    expect(VIDEO_FULL_WATCH_RATIO).toBe(0.7);
    expect(VIDEO_FULL_REQUEST_PREFIX).toBe('videofull_');
  });

  it('награда идёт путём экзамена главы (журнал кошелька), НЕ через руны практики: множителя «Супер-воскресенья» нет, дневного предела нет', () => {
    const reward = code('app/video_full_reward.ts');
    expect(reward).toContain('enqueueLevelSpinStarGrant');
    expect(reward).toContain("giftId: VIDEO_FULL_GIFT_ID");
    expect(reward).not.toMatch(/settleFixedReward|PRACTICE_RUNE_ACTIVITIES|applySuperSundayRuneMultiplier|dailyLimit|DAILY_/i);
    expect(code('app/video_full_watch.ts')).not.toMatch(/dailyLimit|DAILY_|perDay/i);
  });

  it('один раз навсегда на (uid, videoId): метка до записи в журнал, откат при ошибке, повтор — no-op', () => {
    const reward = code('app/video_full_reward.ts');
    expect(reward).toContain("if (set.has(videoId))");
    expect(reward).toContain("return 'repeat'");
    expect(reward).toContain('rolled.delete(videoId)');
    expect(reward).toContain('inflight');
  });

  it('событие одно: на 70 % — пометка «просмотрено» + награда + история; иконка «+500» только за выданную награду', () => {
    const hook = code('hooks/use_video_full_watch.ts');
    expect(hook).toContain('void markVideoWatched(videoId)');
    expect(hook).toContain('grantVideoFullReward(videoId)');
    expect(hook).toContain("if (outcome !== 'granted') return");
    expect(hook).toContain('queueVideoFullStory(videoId, VIDEO_FULL_REWARD_COINS)');
    expect(hook).toContain('setFlashKey');
  });

  it('под флагом video_full_reward_enabled, по умолчанию ВКЛ (владелец увидит в 150)', () => {
    const flags = code('app/remote_flags.ts');
    expect(flags).toContain('video_full_reward_enabled: true');
    expect(flags).toMatch(/allowedBools[\s\S]*'video_full_reward_enabled'/);
    expect(code('hooks/use_video_full_rewarded.ts')).toContain("getRemoteBool('video_full_reward_enabled')");
  });

  it('подключено: плеер раздела «Видео», экран ролика, история — на корне приложения', () => {
    expect(code('app/lingman_video_watch.tsx')).toContain('useVideoFullWatch(');
    expect(code('app/lingman_video_watch.tsx')).toContain('<VideoRewardFlash flashKey={rewardFlashKey} />');
    expect(code('app/lingman_videos.tsx')).toContain('useVideoFullWatch(');
    expect(code('app/lingman_videos.tsx')).toContain('<VideoRewardFlash flashKey={rewardFlashKey} />');
    expect(code('app/_layout.tsx')).toContain('<VideoRewardStoryHost />');
  });

  it('никаких пояснительных подписей мелким шрифтом: в окне и иконке только «+500», монета ранга, галочка и заголовок; без обводок', () => {
    const overlay = code('components/video/VideoRewardOverlay.tsx');
    expect(overlay).not.toMatch(/borderWidth|borderColor/);
    expect(overlay).not.toMatch(/Посмотри|Досмотри|придёт при подключении|Watch (until|to)/i);
    // тексты в окне: заголовок на 9 языках, «+N» и значки
    expect((overlay.match(/<Text /g) ?? []).length).toBe(3); // «+500» иконки, заголовок, «+N»
  });

  it('текст «Ты досмотрел видео до конца. Награда уже на счёте.» запрещён владельцем (и неверен по правилу 70 %): его нет ни в окне истории, ни в плеере, ни в хуке', () => {
    for (const rel of ['components/video/VideoRewardOverlay.tsx', 'hooks/use_video_full_watch.ts', 'app/video_full_story_state.ts', 'app/video_full_reward.ts', 'app/lingman_video_watch.tsx', 'components/home/v2/HomeV2VideoPlayerModal.tsx']) {
      expect(`${rel}: ${/досмотрел[аи]? видео до конца|Награда уже на счёте|already (on|in) your (balance|account)|Reward is already/i.test(code(rel))}`).toBe(`${rel}: false`);
    }
  });
});
