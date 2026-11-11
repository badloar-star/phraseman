import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('retired surveys', () => {
  it('has no survey route, startup cache, or Home and Today entry points', () => {
    expect(fs.existsSync(path.join(root, 'app/survey_screen.tsx'))).toBe(false);
    expect(read('app/_layout.tsx')).not.toMatch(/survey_screen|primeSurveyOfferCacheFromStorage/);
    for (const screen of ['app/(tabs)/home.tsx', 'app/today_tasks.tsx', 'app/(tabs)/friends.tsx']) {
      expect(read(screen)).not.toMatch(/useHomeSurveyEntry|useHomePollV2|DailyPollCard|HomePollV2Card|SurveySheetModal/);
    }
  });

  it('removes survey tabs from the active admin, including direct hash navigation', () => {
    const admin = read('admin/v2/legacy.html');
    const registry = admin.split('const ADMIN_TAB_KEYS = [')[1]?.split(']')[0];
    expect(registry).toContain("'app-messages'");
    for (const tab of ['surveys', 'review-promo', 'daily-polls', 'cancel-surveys']) {
      expect(registry).not.toContain("'" + tab + "'");
      expect(admin).not.toContain('id="tab-' + tab + '"');
      expect(admin).not.toContain("switchTab('" + tab + "')");
    }
    expect(admin).not.toMatch(/adminWriteShardSurvey|adminLaunchVipSurveyCampaign|SHARD_SURVEY_PRESETS/);
  });

  it('drops poll stories at both the cache and network boundaries', () => {
    const stories = read('modules/story_events/use_announcement_stories.ts');
    expect(stories).toContain("liveAnnouncements(cache.items, Date.now() + offset).filter((item) => item.design !== 'poll')");
    expect(stories).toContain("liveAnnouncements(response.data.items, response.data.nowMs).filter((item) => item.design !== 'poll')");
    expect(read('components/stories/templates/StoryAnnouncementV2Layer.tsx')).not.toContain('useStoryPoll');
  });

  it('opens the store cancellation page directly from the subscription screen', () => {
    const subscription = read('app/manage_subscription.tsx');
    expect(subscription).toContain('Linking.openURL(getStoreManageUrl())');
    const cancelButton = subscription.split('testID="manage-subscription-cancel"')[1]?.split('</PressableHybrid>')[0];
    expect(cancelButton).toContain('onPress={() => { hapticTap(); openStoreCancel(); }}');
    expect(subscription).not.toMatch(/CANCEL_REASONS|logCancelSurvey|showCancelSheet/);
  });
});
