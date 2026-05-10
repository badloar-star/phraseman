// Разрешение незащищённого HTTP к Metro для dev-client (adb reverse → 127.0.0.1, LAN).
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

const writeXml = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, 'phraseman_network_security_config.xml'),
        NETWORK_SECURITY_CONFIG_XML,
        'utf8',
      );
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
    application.$['android:usesCleartextTraffic'] = 'true';
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
