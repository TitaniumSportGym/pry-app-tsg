const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { AndroidConfig, withAndroidManifest, withDangerousMod, withMainApplication } = require('expo/config-plugins');
const { assertPin, getLabSettings, HOST, LAB_VARIANTS } = require('../config/pinning-lab.cjs');
const { labDiagnosticsSource } = require('./pinning-lab-diagnostics.cjs');

// The existing profiles retain these exact policies; only lab variants add pins.
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

function policiesForLab(lab) {
  if (!lab) return { main: releasePolicy, debug: debugPolicy };
  assertPin(lab.pin);
  assert.equal(lab.host, HOST);
  const main = releasePolicy.replace('</network-security-config>', `  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="false">${HOST}</domain>
    <pin-set>
      <pin digest="SHA-256">${lab.pin}</pin>
    </pin-set>
  </domain-config>
</network-security-config>`);
  // Lab profiles build Release; even an accidental Debug build keeps remote pins.
  return { main, debug: main };
}

module.exports = function withNetworkSecurity(config, options = {}) {
  const lab = getLabSettings();
  assert.equal(options.labVariant, lab?.variant, 'Opciones nativas de laboratorio incompatibles con el perfil efectivo.');
  if (lab) {
    assert.equal(config.android?.package, lab.package);
    assert.equal(config.name, lab.name);
    assert.equal(config.scheme, lab.scheme);
    assert.equal(config.extra?.pinningLab?.variant, lab.variant);
    config = withMainApplication(config, (mod) => {
      assert.equal(mod.modResults.language, 'kt', 'Revisar diagnóstico de laboratorio si cambia la plantilla Kotlin.');
      const installation = 'TitaniumPinningLabDiagnostics.install(this)';
      if (!mod.modResults.contents.includes(installation)) {
        assert.match(mod.modResults.contents, /super\.onCreate\(\)/);
        mod.modResults.contents = mod.modResults.contents.replace('super.onCreate()', `super.onCreate()\n    ${installation}`);
      }
      return mod;
    });
  } else {
    assert.equal(config.extra?.pinningLab, undefined);
    assert.ok(!Object.values(LAB_VARIANTS).some(value => value.package === config.android?.package));
  }
  const policies = policiesForLab(lab);
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
    if (lab) {
      const sourceDirectory = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', ...lab.package.split('.'));
      await fs.promises.mkdir(sourceDirectory, { recursive: true });
      await fs.promises.writeFile(path.join(sourceDirectory, 'TitaniumPinningLabDiagnostics.kt'), labDiagnosticsSource(lab), 'utf8');
    }
    return mod;
  }]);
};

module.exports.policiesForLab = policiesForLab;
