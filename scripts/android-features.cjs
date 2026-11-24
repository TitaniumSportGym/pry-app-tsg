'use strict';

const assert = require('node:assert/strict');

function verifyOptionalPortraitFeature(document) {
  assert.ok(document?.manifest, 'Se requiere un AndroidManifest.xml válido.');
  const name = 'android.hardware.screen.portrait';
  const features = (document.manifest['uses-feature'] || []).filter(entry => entry.$?.['android:name'] === name);
  assert.equal(features.length, 1, `El manifiesto debe declarar ${name} exactamente una vez.`);
  const attributes = features[0].$;
  assert.equal(attributes['android:required'], 'false', `${name} debe tener android:required="false" explícito.`);
  assert.ok(!attributes['tools:node'] && !attributes['tools:selector'], `${name} debe ser una declaración global sin reglas de eliminación.`);
  return { name, required: false };
}

module.exports = { verifyOptionalPortraitFeature };
