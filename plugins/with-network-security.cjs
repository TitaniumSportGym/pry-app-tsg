const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { AndroidConfig, withAndroidManifest, withDangerousMod, withMainApplication } = require('expo/config-plugins');
const { assertEnvironment, getSettings, readConfig, PACKAGE } = require('../config/alpha-pinning.cjs');
const { certificatePinnerSource } = require('./alpha-certificate-pinner.cjs');

// Android system TLS validation and HTTP policy stay in force alongside pinning.
const releasePolicy = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors><certificates src="system" /></trust-anchors>
  </base-config>
</network-security-config>
`;
// Metro/API debugging uses adb reverse, or the Android emulator host bridge.
// No LAN wildcard, user CA, trust-all validator or global Debug exception.
const localDebugDomains = `  <domain-config cleartextTrafficPermitted="true">
    <domain>localhost</domain>
    <domain>127.0.0.1</domain>
    <domain>10.0.2.2</domain>
  </domain-config>
</network-security-config>`;

function policiesForAlpha(settings = readConfig()) {
  const active = getSettings(settings);
  const main = releasePolicy.replace('</network-security-config>', `  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="false">${active.host}</domain>
    <pin-set>
${active.pins.map(pin => `      <pin digest="SHA-256">${pin}</pin>`).join('\n')}
    </pin-set>
  </domain-config>
</network-security-config>`);
  // Keep only the existing local Metro exceptions; remote pins remain identical.
  return { main, debug: main.replace('</network-security-config>', localDebugDomains) };
}

module.exports = function withNetworkSecurity(config, options = {}) {
  assertEnvironment();
  assert.deepEqual(options, {}, 'No se admiten overrides del pinning por opciones.');
  assert.equal(config.android?.package, PACKAGE);
  assert.equal(config.extra?.pinningLab, undefined);
  const snapshot = readConfig();
  const policies = policiesForAlpha(snapshot);
  config = withMainApplication(config, mod => {
    assert.equal(mod.modResults.language, 'kt', 'Revisar integración al cambiar la plantilla Kotlin.');
    const installation = 'TitaniumCertificatePinning.install(this)';
    let contents = mod.modResults.contents;
    if (!contents.includes(installation)) {
      assert.doesNotMatch(contents, /setOkHttpClientFactory/, 'Revisar fábrica HTTP existente antes de reemplazarla.');
      assert.match(contents, /super\.onCreate\(\)/);
      contents = contents.replace('super.onCreate()', `super.onCreate()\n    ${installation}`);
    }
    assert.equal(contents.split(installation).length - 1, 1);
    assert.ok(contents.indexOf(installation) < contents.indexOf('loadReactNative(this)'), 'Instalar pinning antes del arranque de React Native.');
    mod.modResults.contents = contents;
    return mod;
  });
  config = withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.$['android:usesCleartextTraffic'] = 'false';
    application.$['android:networkSecurityConfig'] = '@xml/titanium_network_security';
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    for (const [variant, content] of Object.entries(policies)) {
      const directory = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', variant, 'res', 'xml');
      await fs.promises.mkdir(directory, { recursive: true });
      await fs.promises.writeFile(path.join(directory, 'titanium_network_security.xml'), content, 'utf8');
    }
    const sourceDirectory = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', ...PACKAGE.split('.'));
    await fs.promises.mkdir(sourceDirectory, { recursive: true });
    await fs.promises.writeFile(path.join(sourceDirectory, 'TitaniumCertificatePinning.kt'), certificatePinnerSource(snapshot), 'utf8');
    return mod;
  }]);
};

module.exports.policiesForAlpha = policiesForAlpha;
