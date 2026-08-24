const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SPLASH_BG = '#101214';

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

function patchColors(colorsPath) {
  if (!fs.existsSync(colorsPath)) return;
  let xml = fs.readFileSync(colorsPath, 'utf8');
  xml = upsertColor(xml, 'splashscreen_background', SPLASH_BG);
  fs.writeFileSync(colorsPath, xml, 'utf8');
}

module.exports = function withAndroidSplashWindowBackground(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const resRoot = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      patchStyles(path.join(resRoot, 'values', 'styles.xml'));
      patchColors(path.join(resRoot, 'values', 'colors.xml'));
      patchColors(path.join(resRoot, 'values-night', 'colors.xml'));
      return cfg;
    },
  ]);
};
