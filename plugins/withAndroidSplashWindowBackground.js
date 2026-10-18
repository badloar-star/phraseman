const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// зачем (Ревизор 18.10 по 18a4b2ad1): плагин стоит в app.json ПОСЛЕ expo-splash-screen и писал #101214 в values И values-night —
// светлая заставка (#EDF0F4) затиралась. Светлое оформление → values, тёмное → values-night; те же цвета, что в app.json
// expo-splash-screen и constants/startup_splash_palette.ts (сторож android_window_background_contract сверяет с app.json).
const SPLASH_BG_LIGHT = '#EDF0F4';
const SPLASH_BG_DARK = '#101214';

function upsertStyleItem(styleXml, styleName, itemName, value, attrs = '') {
  const styleRe = new RegExp(`(<style[^>]*name="${styleName}"[^>]*>)([\\s\\S]*?)(</style>)`);
  return styleXml.replace(styleRe, (match, open, body, close) => {
    const itemRe = new RegExp(`\\s*<item\\s+name="${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>[^<]*</item>`);
    const item = `\n    <item name="${itemName}"${attrs}>${value}</item>`;
    if (itemRe.test(body)) {
      return `${open}${body.replace(itemRe, item)}\n  ${close}`;
    }
    return `${open}${body}${item}\n  ${close}`;
  });
}

function upsertColor(colorsXml, name, value) {
  const colorRe = new RegExp(`(<color\\s+name="${name}"[^>]*>)([^<]*)(</color>)`);
  if (colorRe.test(colorsXml)) {
    return colorsXml.replace(colorRe, `$1${value}$3`);
  }
  return colorsXml.replace('</resources>', `  <color name="${name}">${value}</color>\n</resources>`);
}

function patchStyles(stylesPath) {
  if (!fs.existsSync(stylesPath)) return;
  let xml = fs.readFileSync(stylesPath, 'utf8');
  xml = upsertStyleItem(xml, 'AppTheme', 'android:windowBackground', '@color/splashscreen_background');
  xml = upsertStyleItem(xml, 'AppTheme', 'android:statusBarColor', '@android:color/transparent');
  xml = upsertStyleItem(xml, 'AppTheme', 'android:windowLightStatusBar', 'false');
  xml = upsertStyleItem(xml, 'AppTheme', 'android:windowLightNavigationBar', 'false');
  xml = upsertStyleItem(xml, 'AppTheme', 'android:enforceStatusBarContrast', 'false', ' tools:targetApi="29"');
  xml = upsertStyleItem(xml, 'AppTheme', 'android:enforceNavigationBarContrast', 'false', ' tools:targetApi="29"');
  xml = upsertStyleItem(xml, 'AppTheme', 'android:windowLayoutInDisplayCutoutMode', 'shortEdges', ' tools:targetApi="28"');
  xml = upsertStyleItem(xml, 'AppTheme', 'android:navigationBarColor', '@android:color/transparent');
  xml = upsertStyleItem(xml, 'Theme.App.SplashScreen', 'windowSplashScreenBackground', '@color/splashscreen_background');
  xml = upsertStyleItem(xml, 'Theme.App.SplashScreen', 'windowSplashScreenAnimatedIcon', '@drawable/splashscreen_logo');
  xml = upsertStyleItem(xml, 'Theme.App.SplashScreen', 'postSplashScreenTheme', '@style/AppTheme');
  fs.writeFileSync(stylesPath, xml, 'utf8');
}

function patchColors(colorsPath, color) {
  if (!fs.existsSync(colorsPath)) {
    console.warn(`[SPLASH-PLUGIN] colors.xml нет, цвет ${color} не записан: ${colorsPath}`);
    return;
  }
  let xml = fs.readFileSync(colorsPath, 'utf8');
  const before = (xml.match(/<color\s+name="splashscreen_background"[^>]*>([^<]*)<\/color>/) || [])[1] || null;
  xml = upsertColor(xml, 'splashscreen_background', color);
  console.log(`[SPLASH-PLUGIN] splashscreen_background ${path.basename(path.dirname(colorsPath))}: ${before} → ${color}`);
  fs.writeFileSync(colorsPath, xml, 'utf8');
}

module.exports = function withAndroidSplashWindowBackground(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const resRoot = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      patchStyles(path.join(resRoot, 'values', 'styles.xml'));
      patchColors(path.join(resRoot, 'values', 'colors.xml'), SPLASH_BG_LIGHT);
      patchColors(path.join(resRoot, 'values-night', 'colors.xml'), SPLASH_BG_DARK);
      return cfg;
    },
  ]);
};
