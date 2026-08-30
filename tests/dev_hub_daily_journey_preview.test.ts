import fs from 'node:fs';
import path from 'node:path';
import {
  DAILY_JOURNEY_CHAPTER_SIZE,
  DAILY_JOURNEY_REWARDS,
  dailyJourneyChapterForDay,
  dailyJourneyRewardPayloadForDay,
} from '../components/dev/dailyJourneyRewardPreviewModel';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('Dev Hub daily journey preview', () => {
  test('registers one safe preview entry and mounts the real modal after the sheet closes', () => {
    const registry = read('components/dev/devToolRegistry.ts');
    const sheet = read('components/dev/DevHubSheet.tsx');

    expect(registry).toContain("| 'preview-daily-journey'");
    expect(registry).toContain("id: 'daily-journey'");
    expect(registry).toContain("action: 'preview-daily-journey'");
    expect(registry).toContain("testID: 'dev-preview-daily-journey'");
    expect(sheet).toContain("import DailyJourneyRewardPreviewModal from './DailyJourneyRewardPreviewModal'");
    expect(sheet).toContain("case 'preview-daily-journey':");
    expect(sheet).toContain('openDailyJourneyPreview()');
    expect(sheet).toContain("type: 'daily-journey'");
    expect(sheet).toContain('<DailyJourneyRewardPreviewModal');
    expect(sheet).toContain("visible={!visible && preview?.type === 'daily-journey'}");
    // Новый контракт: единственный колбэк — завершение доставки.
    expect(sheet).toContain('onDelivered={()');
    expect(sheet).not.toMatch(/onApply=|onLater=/);
  });

  test('defines five ten-day chapters without forbidden rewards or one-rune grants', () => {
    const modelPath = path.join(ROOT, 'components', 'dev', 'dailyJourneyRewardPreviewModel.ts');
    expect(fs.existsSync(modelPath)).toBe(true);
    if (!fs.existsSync(modelPath)) return;

    expect(DAILY_JOURNEY_REWARDS).toHaveLength(50);
    expect(DAILY_JOURNEY_CHAPTER_SIZE).toBe(10);
    expect(dailyJourneyChapterForDay(1).map((reward) => reward.day)).toEqual([1,2,3,4,5,6,7,8,9,10]);
    expect(dailyJourneyChapterForDay(50).map((reward) => reward.day)).toEqual([41,42,43,44,45,46,47,48,49,50]);
    expect(DAILY_JOURNEY_REWARDS.filter((reward) => reward.kind === 'runes')
      .every((reward: { amount: number }) => reward.amount >= 100)).toBe(true);
    expect(DAILY_JOURNEY_REWARDS.some((reward) => /aura|avatar/.test(reward.kind))).toBe(false);
    expect(dailyJourneyRewardPayloadForDay(1)).toEqual({ kind: 'pearls', amount: 10 });
  });

  // зачем: по спеке 2026-08-30 модалка — только Modal-хост сцены
  // DailyJourneyRevealScene: без кнопок решения, описаний и собственного
  // звука; back и accessibility dismiss ведут себя как «Пропустить».
  test('wraps the reveal scene in a bare Modal: back/dismiss skip, no decision buttons', () => {
    const componentPath = path.join(ROOT, 'components', 'dev', 'DailyJourneyRewardPreviewModal.tsx');
    expect(fs.existsSync(componentPath)).toBe(true);
    if (!fs.existsSync(componentPath)) return;

    const component = read('components/dev/DailyJourneyRewardPreviewModal.tsx');
    expect(component).toContain("from '../daily_journey/DailyJourneyRevealScene'");
    expect(component).toContain('animationType="none"');
    expect(component).toContain('statusBarTranslucent');
    expect(component).toContain('onRequestClose={skipToDelivery}');
    expect(component).toContain('onAccessibilityEscape={skipToDelivery}');
    expect(component).toContain('measureDailyJourneyRevealTarget');
    expect(component).toContain("emitAppEvent('daily_journey_delivered'");
    expect(component).not.toMatch(/daily-journey-apply|daily-journey-later|rewardCopy/);
    expect(component).not.toMatch(/Применить|Позже/);
    expect(component).not.toMatch(/AsyncStorage|firebase|firestore|grant|debit|increment\(|wallet|applyReward/i);
  });

  test('accepts a committed occurrence and target rect, then acknowledges one landing and completion', () => {
    const component = read('components/dev/DailyJourneyRewardPreviewModal.tsx');
    const scene = read('components/daily_journey/DailyJourneyRevealScene.tsx');

    expect(component).toContain("import type { DailyJourneyGiftOccurrenceV1 } from '../../app/daily_journey_gift_inbox'");
    expect(component).toContain('occurrence?: DailyJourneyGiftOccurrenceV1');
    expect(component).toContain('targetRect?: DailyJourneyRewardDeliveryTargetRect | null');
    expect(component).toContain('onLanded?: (occurrenceId: string) => void');
    expect(component).toContain('onDeliveryComplete?: () => void');
    expect(component).toContain('targetRectToPoint(targetRect)');
    expect(component).toContain("emitAppEvent('daily_journey_delivered'");
    expect(component).toContain('landedOccurrenceRef.current');
    expect(component).toContain('completedRunRef.current');

    // The shared scene owns the hot path: square tiles, 78% asset art, one
    // Skip control, native transform/opacity flight and deterministic
    // reduced-motion delivery. The wrapper only adapts durable delivery data.
    expect(scene).toContain("tileClip: { position: 'relative', aspectRatio: 1");
    expect(scene).toContain("tileArt: { width: '78%', height: '78%' }");
    expect(scene.match(/<Text[^>]*>Пропустить<\/Text>/g)).toHaveLength(1);
    expect(scene).toContain('useNativeDriver: true');
    expect(scene).toContain('startReducedMotion');
    expect(scene).not.toMatch(/rewardCopy|detailCard|Применить|Позже/);
  });

  test('keeps the single arcade intro cue, owned by the scene rather than the wrapper', () => {
    const component = read('components/dev/DailyJourneyRewardPreviewModal.tsx');
    const scene = read('components/daily_journey/DailyJourneyRevealScene.tsx');
    const soundEvents = read('modules/audio/sound_events.ts');
    const soundMotion = read('modules/audio/sound_motion.ts');
    const introAsset = path.join(ROOT, 'assets', 'audio', 'sfx', 'v1', 'reward', 'pm_reward_daily_journey_intro_v1.m4a');

    expect(fs.existsSync(introAsset)).toBe(true);
    expect(soundEvents).toContain("'pm.reward.daily_journey_intro': event(require('../../assets/audio/sfx/v1/reward/pm_reward_daily_journey_intro_v1.m4a')");
    expect(soundEvents.match(/pm\.reward\.daily_journey_intro/g)).toHaveLength(1);
    expect(soundMotion).toContain("'pm.reward.daily_journey_intro': { audibleMs: 1087, attackMs: 81, hits: [81, 282, 362]");
    expect(component).not.toMatch(/soundDirector/);
    expect(scene.match(/soundDirector\.request\(/g)).toHaveLength(1);
    expect(scene).toContain("soundDirector.request('pm.reward.daily_journey_intro'");
    expect(scene).toContain("soundDirector.stopActiveEvent('pm.reward.daily_journey_intro'");
  });

  // зачем: спека, пп. 5.6, 5.9 и 6 — главная отдаёт цель полёта, пульсирует
  // карточку один раз и держит «Подарок» в независимом правом слоте с прямым
  // маршрутом в существующий инвентарь подарков.
  test('home delivers the landing: target measurer, one pulse, Gift in the right slot', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain('registerDailyJourneyRevealTargetMeasurer');
    expect(home).toContain('readDailyJourneyGiftProjection');
    expect(home).toContain("onAppEvent('daily_journey_delivered'");
    expect(home).toContain("onAppEvent('daily_journey_gifts_changed'");
    expect(home).toContain('toValue: 1.035');
    expect(home).toContain('testID="home-gift-entry"');
    expect(home).toContain("nav.push('/level_gifts_inventory')");

    const giftEntry = home.slice(
      home.indexOf('testID="home-gift-entry"'),
      home.indexOf('testID="home-gift-entry-button"'),
    );
    expect(giftEntry).toContain("position: 'absolute'");
    expect(giftEntry).toContain('right: 0');
  });
});
