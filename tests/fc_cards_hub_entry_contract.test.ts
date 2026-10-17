import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

// зачем: приказ владельца 11.10 — вернуть хаб утра (шапка со счётчиком N/30 и «+», стопка, мятная кнопка, 4 крупные плитки 2×2; без героя «Продолжить», «Твои карточки», ленты и чарта)
describe('approved Cards hub entry', () => {
  test('Cards root renders the dedicated hub instead of Saved', () => {
    const entry = read('app', 'flashcards.tsx');
    expect(entry).toContain("import FlashcardsHubScreen from './flashcards/FlashcardsHubScreen'");
    expect(entry).toContain('<FlashcardsHubScreen />');
    expect(entry).not.toContain('FlashcardsCollectionScreen');
  });

  test('hub implements latest four library destinations and training entry', () => {
    const hubPath = path.join(ROOT, 'app', 'flashcards', 'FlashcardsHubScreen.tsx');
    const exists = fs.existsSync(hubPath);
    expect(exists).toBe(true);
    if (!exists) return;

    const hub = fs.readFileSync(hubPath, 'utf8');
    // зачем (владелец 04.10, хаб А утверждён): хаб — стопка, главная кнопка и четыре равные плитки (CardsHubV2); блока «Лучшее у сообщества» и сегментов больше нет.
    expect(hub).toContain('CardsHubV2');
    expect(hub).not.toContain('SavedTopCommunityPacks');
    expect(hub).toContain("pathname: '/flashcards_collection'");
    expect(hub).toContain("router.push('/flashcards_my_packs'");
    expect(hub).toContain("router.push('/flashcards_packs'");
    const view = fs.readFileSync(path.join(ROOT, 'app', 'flashcards', 'CardsHubV2.tsx'), 'utf8');
    for (const id of ['saved', 'mine', 'video', 'community']) expect(hub).toContain(`id: '${id}'`);
    expect(view).toContain('fc-cards-hub-tile-');
    expect(view).toContain('fc-cards-hub-train');
    expect(hub).not.toContain('<Ionicons name="barbell-outline"');
    expect(hub).not.toContain('FlashcardsTabBar');
  });

  test('hub header has an accessible Back button to the main screen', () => {
    const hub = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');
    expect(hub).toContain("safeRouterBack(router, '/(tabs)/home' as never)");
    const view = read('app', 'flashcards', 'CardsHubV2.tsx');
    expect(view).toContain('testID="fc-cards-hub-back"');
    // 17.10 (слово владельца): «назад» — общий значок BackGlyph вместо системной стрелки
    expect(view).toContain('<BackGlyph');
    expect(view).toContain('accessibilityLabel={labels.back}');
    expect(hub).toContain('back: copy.back');
  });

  test('Cards hub uses the approved Liquid Glass theme and legible text hierarchy', () => {
    const hub = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');
    const view = read('app', 'flashcards', 'CardsHubV2.tsx');

    expect(hub).toContain('liquidGlassTokens(liquidGlassThemeId)');
    expect(view).toContain('g.text');
    expect(view).toContain('g.secondary');
    expect(view).toContain('g.accent');
  });

  test('mode choice is a bottom sheet (owner 01.10) and setup is a normal full screen', () => {
    const sheetPath = path.join(ROOT, 'app', 'flashcards', 'FlashcardsTrainingModeSheet.tsx');
    const setupPath = path.join(ROOT, 'app', 'flashcards_training_setup.tsx');
    expect(fs.existsSync(sheetPath)).toBe(true);
    expect(fs.existsSync(setupPath)).toBe(true);
    if (!fs.existsSync(sheetPath) || !fs.existsSync(setupPath)) return;

    const sheet = fs.readFileSync(sheetPath, 'utf8');
    const setup = fs.readFileSync(setupPath, 'utf8');
    const layout = read('app', '_layout.tsx');
    const hub = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');

    expect(sheet).toContain('<Modal');
    expect(sheet).toContain('styles.sheet');
    expect(sheet).toContain('styles.close');
    expect(sheet).toContain("mode: 'blitz'");
    expect(sheet).toContain("mode: 'speaking'");
    expect(sheet).toContain("mode: 'truefalse'");
    expect(sheet).toContain("mode: 'recall'");
    expect(sheet).not.toContain("mode: 'listening'");
    // зачем: удалённый выключатель речи ушёл вместе с remote_config_client (fb9d8d8e6) —
    // isSpeakingEnabled() больше нет в коде, строка «Устно» доступна всегда.
    expect(sheet).not.toContain('isSpeakingEnabled()');
    expect(sheet).toContain("row.mode === 'speaking' && !speakingEnabled");
    expect(hub).toContain('useFlashcardTrainingQuotaPreview()');
    expect(hub).toContain("quotaPreview.status === 'exhausted'");
    expect(hub).toContain("quotaPreview.status === 'allowed'");
    expect(hub).not.toContain('consumeFlashcardTrainingQuota');
    expect(hub).not.toContain('useFeatureAccess(');
    expect(hub).toContain('limitLabel');
    expect(hub).toContain('quotaPreview.limit');
    // D152 (координатор 01.10, «ни одной неработающей кнопки»): при исчерпании кнопка
    // НЕ гаснет — тап ведёт в покупку; замок показывает лимит; двойной тап защёлкнут.
    // §90 (02.10): кнопка не отключается и на ожидании квоты — ранний тап открывает окно и ждёт.
    expect(hub).not.toContain('disabled={!trainingLocked && !trainingEntryReady}');
    expect(hub).toContain("setEarlyTap('waiting');");
    expect(hub).not.toContain('disabled={trainingLocked || !trainingEntryReady}');
    expect(hub).toContain("openTrainingPaywall('flashcard_training', 'flashcards_hub_train')");
    expect(hub).toContain("pathname: '/premium_modal', params: { context, source }");
    expect(read('app', 'flashcards', 'CardsHubV2.tsx')).toContain("trainLocked ? 'lock-closed' : 'arrow-forward'");
    expect(hub).toContain('if (paywallOpeningRef.current)');
    expect(setup).toContain('loadFcDeckOptions');
    expect(setup).toContain('useFlashcardTrainingQuotaPreview()');
    expect(setup).toContain("quotaPreview.status !== 'exhausted'");
    // зачем (владелец 2026-09-13): квоту не прочитали (unavailable/stale) — не наказываем
    // человека, старт держит только «исчерпано», а не строгое 'allowed'.
    expect(setup).toContain("const quotaAllowsStart = quotaPreview.status !== 'exhausted';");
    expect(setup).not.toContain('consumeFlashcardTrainingQuota');
    expect(setup).not.toContain('useFeatureAccess(');
    // зачем: лимит тренировок по cards-v2, решение владельца 11.10 — при исчерпанном месячном лимите настройка остаётся обычной,
    // а вместо «Начать» стоит «Безлимит с Plus», которая открывает окно покупки с контекстом flashcard_training (не тупик).
    expect(setup).toContain("context: 'flashcard_training'");
    expect(setup).toContain("source: 'flashcards_training_setup'");
    expect(setup).toContain('onUpgrade={openUpgrade}');
    expect(setup).toContain('summarizeDeckSelection');
    expect(setup).toContain('toggleDeckSelection');
    expect(setup).not.toContain('FC_SESSION_SIZES');
    expect(layout).toContain('<Stack.Screen name="flashcards_training_setup" />');
    expect(layout).toContain('<Stack.Screen name="flashcards_recall_session" />');
    expect(hub).toContain('enabled={accessResolved && !modeSheetVisible');
    expect(setup).toContain("enabled={accessResolved && quotaPreview.status !== 'exhausted'");
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
