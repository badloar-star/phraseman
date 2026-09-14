import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('approved Cards hub entry', () => {
  test('Cards root renders the dedicated hub instead of Saved', () => {
    const entry = read('app', 'flashcards.tsx');
    expect(entry).toContain("import FlashcardsHubScreen from './flashcards/FlashcardsHubScreen'");
    expect(entry).toContain('<FlashcardsHubScreen />');
    expect(entry).not.toContain('FlashcardsCollectionScreen');
  });

  test('hub implements option C destinations and the single create-pack action', () => {
    const hubPath = path.join(ROOT, 'app', 'flashcards', 'FlashcardsHubScreen.tsx');
    const exists = fs.existsSync(hubPath);
    expect(exists).toBe(true);
    if (!exists) return;

    const hub = fs.readFileSync(hubPath, 'utf8');
    expect(hub).toContain('SavedTopCommunityPacks');
    expect(hub).toContain("pathname: '/flashcards_collection'");
    expect(hub).toContain("router.push('/flashcards_my_packs'");
    expect(hub).toContain("router.push('/flashcards_packs'");
    expect(hub).toContain("buildFcCreateRoute('pack')");
    expect(hub).toContain('fc-cards-hub-create-pack');
    expect(hub).toContain('fc-cards-hub-library-saved');
    expect(hub).toContain('fc-cards-hub-library-mine');
    expect(hub).toContain('fc-cards-hub-library-community');
    expect(hub).toContain('fc-cards-hub-train');
    expect(hub).not.toContain('<Ionicons name="barbell-outline"');
    expect(hub).not.toContain('FlashcardsTabBar');
  });

  test('hub header has an accessible Back button to the main screen', () => {
    const hub = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');
    expect(hub).toContain("safeRouterBack(router, '/(tabs)/home' as never)");
    expect(hub).toContain('testID="fc-cards-hub-back"');
    expect(hub).toContain('name="arrow-back"');
    expect(hub).toContain('accessibilityLabel={copy.back}');
  });

  test('Cards hub uses the Statistics-style adaptive typography hierarchy', () => {
    const hub = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');
    const topPacks = read('app', 'flashcards', 'SavedTopCommunityPacks.tsx');

    expect(hub).toContain('const { theme: t, f } = useTheme();');
    expect(hub).toContain('const { theme: t, f, statusBarLight } = useTheme();');
    expect(hub).toContain('color: t.textPrimary, fontSize: f.h2');
    expect(hub).toContain('color: t.textSecond, fontSize: f.sub');
    expect(hub).toContain('fontSize: f.bodyLg');
    expect(topPacks).toContain("import { useTheme } from '../../components/ThemeContext';");
    expect(topPacks).toContain('const { f } = useTheme();');
    expect(topPacks).toContain('f.h2');
    expect(topPacks).toContain('color: t.textSecond');
    expect(topPacks).toContain("import { AdaptiveLabel } from '../../components/text-integrity/AdaptiveLabel';");
    expect(topPacks).not.toContain('numberOfLines={');
  });

  test('mode choice is a bottom sheet and setup is a normal full screen', () => {
    const sheetPath = path.join(ROOT, 'app', 'flashcards', 'FlashcardsTrainingModeSheet.tsx');
    const setupPath = path.join(ROOT, 'app', 'flashcards_training_setup.tsx');
    expect(fs.existsSync(sheetPath)).toBe(true);
    expect(fs.existsSync(setupPath)).toBe(true);
    if (!fs.existsSync(sheetPath) || !fs.existsSync(setupPath)) return;

    const sheet = fs.readFileSync(sheetPath, 'utf8');
    const setup = fs.readFileSync(setupPath, 'utf8');
    const layout = read('app', '_layout.tsx');
    const hub = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');

    expect(sheet).toContain('HybridSheetShell');
    expect(sheet).toContain("mode: 'blitz'");
    expect(sheet).toContain("mode: 'speaking'");
    expect(sheet).toContain("mode: 'truefalse'");
    expect(sheet).toContain("mode: 'recall'");
    expect(sheet).not.toContain("mode: 'listening'");
    expect(sheet).toContain('isSpeakingEnabled()');
    expect(sheet).toContain('PlusBadge');
    expect(hub).toContain('useFlashcardTrainingQuotaPreview()');
    expect(hub).toContain("quotaPreview.status === 'exhausted'");
    expect(hub).toContain("quotaPreview.status === 'allowed'");
    expect(hub).not.toContain('consumeFlashcardTrainingQuota');
    expect(hub).not.toContain('useFeatureAccess(');
    expect(hub).toContain("openTrainingPaywall('flashcard_training'");
    expect(hub).toContain("openTrainingPaywall('flashcard_training', 'flashcards_hub_speaking')");
    expect(hub).not.toContain("openTrainingPaywall('speaking'");
    expect(setup).toContain('loadFcDeckOptions');
    expect(setup).toContain('useFlashcardTrainingQuotaPreview()');
    expect(setup).toContain("quotaPreview.status !== 'exhausted'");
    expect(setup).toContain("quotaPreview.status === 'allowed'");
    expect(setup).not.toContain('consumeFlashcardTrainingQuota');
    expect(setup).not.toContain('useFeatureAccess(');
    expect(setup).toContain("context: 'flashcard_training'");
    expect(setup).toContain('summarizeDeckSelection');
    expect(setup).toContain('toggleDeckSelection');
    expect(setup).not.toContain('FC_SESSION_SIZES');
    expect(layout).toContain('<Stack.Screen name="flashcards_training_setup" />');
    expect(layout).toContain('<Stack.Screen name="flashcards_recall_session" />');
    expect(hub).toContain('enabled={accessResolved && !modeSheetVisible');
    expect(setup).toContain("enabled={accessResolved && quotaPreview.status === 'allowed'");
  });

  // зачем (владелец 2026-09-14, «удали навсегда»): раздел «Сегодня слабое»
  // удалён целиком. Тест сторожит ОТСУТСТВИЕ, а не наличие — раньше он требовал
  // плитку, и её возврат прошёл бы незамеченным.
  test('the removed "Today’s weak cards" entry never comes back', () => {
    const hub = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');
    expect(hub).not.toContain('fc-cards-hub-daily-practice');
    expect(hub).not.toContain('FC_DAILY_PRACTICE');
    expect(hub).not.toContain('Сегодня слабое');
    expect(hub).not.toContain("daily: '1'");
  });

  test('no live Cards root mounts the obsolete internal tab bar', () => {
    for (const file of [
      'app/flashcards.tsx',
      'app/flashcards_collection.tsx',
      'app/flashcards_my_packs.tsx',
      'app/flashcards_packs.tsx',
    ]) {
      expect({ file, hasTabBar: read(...file.split('/')).includes('FlashcardsTabBar') })
        .toEqual({ file, hasTabBar: false });
    }
  });

  test('a pack opened from the hub returns to the hub', () => {
    const collection = read('app', 'flashcards_collection.tsx');
    expect(collection).toContain("if (raw === 'hub') return '/flashcards';");
    expect(collection.indexOf("if (raw === 'hub') return '/flashcards';"))
      .toBeLessThan(collection.indexOf('if (!packDeeplink) return null;'));
    expect(collection).toContain('packBackOrigin ??');
  });

  test('all three library screens use the Cards hub as their Back fallback', () => {
    const collection = read('app', 'flashcards_collection.tsx');
    const mine = read('app', 'flashcards_my_packs.tsx');
    const community = read('app', 'flashcards_packs.tsx');

    expect(collection).toContain("packDeeplink ? FC_MY_PACKS_ROUTE : '/flashcards'");
    expect(mine).toContain("safeRouterBack(router, '/flashcards' as any)");
    expect(community).toContain("safeRouterBack(router, '/flashcards' as any)");
  });

  test('oral setup supports the whole selected pool while old numeric sizes remain', () => {
    const speaking = read('app', 'flashcards_speaking_session.tsx');
    expect(speaking).toContain("raw === 'all'");
    expect(speaking).toContain('Number.MAX_SAFE_INTEGER');
    expect(speaking).toContain('isValidSessionSize');
  });

});
