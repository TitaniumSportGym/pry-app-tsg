const fs = require('node:fs');
const path = require('node:path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

// Native Android TLS validation remains enabled. No certificate pin is embedded.
const releasePolicy = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors><certificates src="system" /></trust-anchors>
  </base-config>
</network-security-config>
`;
// Metro/API debugging uses adb reverse, or the Android emulator host bridge.
// No LAN wildcard, user CA, trust-all validator or global Debug exception.
const debugPolicy = releasePolicy.replace('</network-security-config>', `  <domain-config cleartextTrafficPermitted="true">
    <domain>localhost</domain>
    <domain>127.0.0.1</domain>
    <domain>10.0.2.2</domain>
  </domain-config>
</network-security-config>`);

module.exports = function withNetworkSecurity(config) {
  config = withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.$['android:usesCleartextTraffic'] = 'false';
    application.$['android:networkSecurityConfig'] = '@xml/titanium_network_security';
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    for (const [variant, content] of [['main', releasePolicy], ['debug', debugPolicy]]) {
      const directory = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', variant, 'res', 'xml');
      await fs.promises.mkdir(directory, { recursive: true });
      await fs.promises.writeFile(path.join(directory, 'titanium_network_security.xml'), content, 'utf8');
    }
    return mod;
  }]);
};
