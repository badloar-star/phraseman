import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('components/OfflineBanner.tsx', 'utf8');

assert.match(source, /const AUTO_HIDE_MS = 10_000;/, 'production auto-hide timeout must remain 10 seconds');
assert.match(source, /subscribeNetStatus/, 'network subscription must remain live');
assert.match(source, /visible = offline && !dismissed/, 'online must remain hidden rather than rendered as a fake state');
assert.match(source, /if \(g\.dy < -24\)/, 'swipe-up dismissal threshold must remain intact');
assert.match(source, /useReduceMotion\(\)/, 'reduced-motion guard must remain intact');
assert.match(source, /liquidGlassTokens/, 'banner must use the active 13-theme material registry');
// 30.09: «wifi-off» нет в наборе Ionicons (пустой глиф + ошибка типов) — заменён на cloud-offline-outline в 05573985e.
assert.match(source, /name="cloud-offline-outline"/, 'both variants must use the approved offline icon');
// зачем (Макеты/владелец 15.10: без системных слов): «No connection» → «No internet»; смысл сторожа тот же — en не откатывается на ru.
assert.match(source, /en: 'No internet'/, 'English offline text must not fall back to Russian');
assert.match(source, /<OfflineBannerSurface/, 'classic and hybrid must share visual surface content');
assert.doesNotMatch(source, /hybridSpine/, 'offline banner must not retain a red status spine');
assert.match(source, /top: insets\.top \+ 4/, 'banner must remain below the status-bar safe area');
assert.match(source, /experimentalBlurMethod=\{Platform\.OS === 'android' \? 'dimezisBlurView' : 'none'\}/, 'Android has an explicit glass blur path');
assert.doesNotMatch(source, /borderWidth:/, 'banner chrome must not gain a heavy outline');
