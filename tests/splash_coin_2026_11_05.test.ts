// Заставка «Г · Монета» (слово владельца 05.11: «ДЕЛАЙ Г монета! Можно сделать так, чтобы она сразу была при запуске, без статичной картинки вначале?»;
// макет docs/work/release/mockups/splash_variants_2026-11-05.html): нативной картинки нет, экранная анимация конечная, тайминги макета повторены, холодный старт не тяжелее.
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string): string => fs.readFileSync(path.join(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/^\s*\/\/.*$/gm, '');

describe('нативная заставка: только тёмный фон без картинки', () => {
  const appJson = JSON.parse(read('app.json')) as { expo: { plugins: unknown[] } };
  const plugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen') as [string, Record<string, unknown> & { dark?: Record<string, unknown> }];

  it('фон #101214 и у светлой, и у тёмной; картинка — пустая прозрачная, не знак и не иконка приложения', () => {
    expect(plugin).toBeDefined();
    const props = plugin[1];
    expect(props.backgroundColor).toBe('#101214');
    expect(props.dark?.backgroundColor).toBe('#101214');
    expect(String(props.image)).toContain('splash-empty.png');
    expect(String(props.dark?.image)).toContain('splash-empty.png');
    expect(String(props.image)).not.toMatch(/splash-icon|splash-glyph|icon\.png/);
  });
  it('splash-empty.png — маленький файл (прозрачный лист), а не картинка со знаком', () => {
    expect(fs.statSync(path.join(__dirname, '..', 'assets/images/splash-empty.png')).size).toBeLessThan(2048);
  });
});

describe('экранная заставка: конечная анимация «Г · Монета»', () => {
  const coin = read('components/startup/SplashCoin.tsx');
  const layout = read('app/_layout.tsx');
  const hold = layout.slice(layout.indexOf('function StartupSplashHold'), layout.indexOf('async function preloadVectorIconFonts'));

  it('нет зацикливания: ни Animated.loop, ни бесконечного повтора, ни пульса', () => {
    expect(code(coin)).not.toMatch(/Animated\.loop|iterations|Infinity/);
    expect(code(hold)).not.toMatch(/Animated\.loop|pulseLoop|glyphPulseScale/);
  });
  it('тайминги и кривые макета: монета 574+126 мс, переворот 230 мс в 700 мс, знак 364+196 мс в 930 мс, искра в 1300 мс, надпись в 1080, подзаголовок в 1240', () => {
    expect(coin).toContain('seq(v.rollX, 7, 0, 574, 126, B_ROLL, SYM)');
    expect(coin).toContain('t(v.flip, 1, 230, FLIP, 700)');
    expect(coin).toContain('seq(v.gRY, 8, 0, 364, 196, OUT, OUT, 930)');
    expect(coin).toContain('seq(v.gScale, 1.03, 1, 364, 196, OUT, OUT, 930)');
    expect(coin).toContain('seq(v.sOp, 1, 0, 207, 253, OUT, OUT, 1300)');
    expect(coin).toContain('t(v.wOp, 1, 460, OUT, 1080)');
    expect(coin).toContain('t(v.subOp, 1, 400, OUT, 1240)');
    expect(coin).toContain('Easing.bezier(0.3, 0.6, 0.35, 1)');
    expect(coin).toContain('Easing.bezier(0.55, 0, 0.85, 0.35)');
    expect(coin).toContain('Easing.bezier(0.23, 1, 0.32, 1)');
    expect(coin).toContain('perspective: 800');
  });
  it('всё на нативном драйвере, без Animated.add, анимируются только transform и opacity', () => {
    expect(coin).toContain('useNativeDriver: true');
    expect(coin).not.toContain('useNativeDriver: false');
    expect(code(coin)).not.toContain('Animated.add(');
  });
  it('Reduce Motion — растворение 280 мс; удержание не короче 1,8 с; журнал [SPLASH-COIN] start/end/ms/reducedMotion', () => {
    expect(coin).toContain('SPLASH_COIN_REDUCED_MS = 280');
    expect(coin).toContain('SPLASH_COIN_TOTAL_MS = 1800');
    expect(coin).toContain("'[SPLASH-COIN] start'");
    expect(coin).toContain("'[SPLASH-COIN] end', { ms,");
    expect(hold).toContain('<SplashCoin');
    expect(hold).toContain('minHoldDone');
    expect(layout).toContain('splashMinHold');
  });
  it('старт с первого кадра JS: никаких ожиданий сети/диска перед анимацией, картинки — локальные require', () => {
    expect(coin).not.toMatch(/await |fetch\(|AsyncStorage/);
    expect(coin).toContain("require('../../assets/images/splash-coin.webp')");
  });
  it('фон заставки всегда #101214', () => {
    expect(read('constants/startup_splash_palette.ts')).toContain("STARTUP_SPLASH_DARK_BG = '#101214'");
  });
});
