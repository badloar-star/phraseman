// зачем ([SCROLL-RESTORE] / [HOME-CHILD-COST] / [BACK-BTN] 18.10, журналы Сверки e2ae1be72): после смены языка Настройки и Главная не должны оставаться прокрученными вниз;
// рендер детей Главной измеряется поштучно; возврат с «Сегодня» пишет решение и «прибыли».
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const home = read('app/(tabs)/home.tsx');
const settings = read('app/(tabs)/settings.tsx');
const today = read('app/today_tasks.tsx');
const probe = read('app/home_focus_cost_probe.ts');

test('Настройки: сохранённое положение сбрасывается только при реальной смене языка', () => {
  const effect = settings.slice(settings.indexOf('const settingsPrevLangRef = useRef(lang);'), settings.indexOf("noteScrollEvent('settings', 'lang_change'") + 120);
  assert.ok(effect.includes('const changed = settingsPrevLangRef.current !== lang;'));
  const ifAt = effect.indexOf('if (changed) {');
  assert.ok(ifAt > 0 && effect.indexOf('settingsScrollYRef.current = 0;') > ifAt, 'сброс внутри if (changed), не на монтировании');
  assert.ok(effect.includes('savedYBefore'), 'журнал показывает, что было до сброса');
});

test('Главная: после смены языка один раз возвращается верх, если не было жеста пальцем', () => {
  const fn = home.slice(home.indexOf('const correctHomeScrollAfterLang = useCallback('), home.indexOf('const notifyHomeScrollY = useCallback('));
  assert.ok(fn.includes('sinceLangMs > 2500'), 'окно 2,5 с');
  assert.ok(fn.includes('homeDraggedAfterLangRef.current || homeLangCorrectedRef.current'), 'жест пальцем и повтор отключают коррекцию');
  assert.ok(fn.includes('if (y <= 0) return;'));
  assert.ok(fn.includes('homeScrollRef.current?.scrollTo({ y: 0, animated: false });'));
  assert.ok(fn.includes('[SCROLL-RESTORE] home:correct_to_top'), 'коррекция пишет строку в журнал');
  // refs взводятся только на реальной смене языка
  const lang = home.slice(home.indexOf('if (homePrevLangRef.current !== lang) {'), home.indexOf("noteScrollEvent('home', 'lang_change'"));
  for (const needle of ['homeLangChangedAtRef.current = Date.now();', 'homeDraggedAfterLangRef.current = false;', 'homeLangCorrectedRef.current = false;']) assert.ok(lang.includes(needle), needle);
  assert.ok(home.includes("onScrollBeginDrag={() => { homeDraggedAfterLangRef.current = true; noteScrollDrag('home', true); }}"), 'палец отключает коррекцию');
  assert.ok(home.includes("correctHomeScrollAfterLang('content_height')") && home.includes("correctHomeScrollAfterLang('scroll_y')"), 'коррекция на росте высоты и на рывке');
});

test('Главная: дети под измерением (dev), в релизе исходный компонент', () => {
  for (const [name, id] of [['HomeV2Header', 'header'], ['HomeV2ContinueCard', 'continue_card'], ['HomeV2FeatureTiles', 'feature_tiles'], ['HomeV2VideoRail', 'video_rail'], ['HomeV2TodayCard', 'today_card']]) {
    assert.ok(home.includes(`const ${name} = withHomeChildCost('${id}', ${name}Base);`), name);
    assert.ok(home.includes(`import ${name}Base from`), `${name}Base импортируется`);
  }
  assert.ok(probe.includes('if (!ENABLED) return Component;'), 'релиз: без обёртки');
  assert.ok(probe.includes('HOME_CHILD_COST_THRESHOLD_MS = 8'));
  assert.ok(probe.includes('[HOME-CHILD-COST]'));
});

test('«Сегодня» → «назад»: решение пишется перед выходом, «прибыли» — на фокусе Главной', () => {
  const press = today.indexOf("noteBackDecision('today_tasks → home')");
  assert.ok(press > 0 && press < today.indexOf("safeRouterBack(router, '/(tabs)/home' as never);"));
  assert.ok(home.includes("noteBackArrived('home', 'focus_tick');"));
});
