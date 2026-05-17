// Release должен оставаться HTTPS-only. Cleartext нужен только dev-client для Metro
// (adb reverse -> 127.0.0.1, LAN), поэтому пишем debug/debugOptimized overlays.
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RELEASE_NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

const DEV_NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

const DEV_ANDROID_MANIFEST_XML = `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
    <application android:usesCleartextTraffic="true" tools:targetApi="28" tools:ignore="GoogleAppIndexingWarning" tools:replace="android:usesCleartextTraffic" />
</manifest>
`;

const writeXml = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const mainXmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      if (!fs.existsSync(mainXmlDir)) fs.mkdirSync(mainXmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(mainXmlDir, 'phraseman_network_security_config.xml'),
        RELEASE_NETWORK_SECURITY_CONFIG_XML,
        'utf8',
      );
      for (const sourceSet of ['debug', 'debugOptimized']) {
        const srcRoot = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', sourceSet);
        const xmlDir = path.join(srcRoot, 'res', 'xml');
        if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir, { recursive: true });
        fs.writeFileSync(
          path.join(xmlDir, 'phraseman_network_security_config.xml'),
          DEV_NETWORK_SECURITY_CONFIG_XML,
          'utf8',
        );
        fs.writeFileSync(path.join(srcRoot, 'AndroidManifest.xml'), DEV_ANDROID_MANIFEST_XML, 'utf8');
      }
      return cfg;
    },
  ]);

const patchManifest = (config) =>
  withAndroidManifest(config, async (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (manifest.$ && !manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    const application = manifest.application?.[0];
    if (!application) return cfg;
    application.$ = application.$ || {};
    application.$['android:usesCleartextTraffic'] = 'false';
    application.$['android:networkSecurityConfig'] = '@xml/phraseman_network_security_config';

    const existing = application.$['tools:replace'];
    const additions = ['android:networkSecurityConfig', 'android:usesCleartextTraffic'];
    if (existing) {
      const current = existing.split(',').map((s) => s.trim()).filter(Boolean);
      for (const a of additions) if (!current.includes(a)) current.push(a);
      application.$['tools:replace'] = current.join(',');
    } else {
      application.$['tools:replace'] = additions.join(',');
    }
    return cfg;
  });

module.exports = function withAndroidDevCleartext(config) {
  config = writeXml(config);
  config = patchManifest(config);
  return config;
};
