'use strict';

const { withAndroidManifest } = require('expo/config-plugins');

const PORTRAIT = 'android.hardware.screen.portrait';

module.exports = function withOptionalPortraitHardware(config) {
  return withAndroidManifest(config, mod => {
    const manifest = mod.modResults.manifest;
    manifest.$ = { ...manifest.$, 'xmlns:tools': 'http://schemas.android.com/tools' };
    // Canonicalize this feature only, including existing required or duplicate entries.
    const otherFeatures = (manifest['uses-feature'] || []).filter(entry => entry.$?.['android:name'] !== PORTRAIT);
    manifest['uses-feature'] = [...otherFeatures, {
      $: {
        'android:name': PORTRAIT,
        'android:required': 'false',
        // required uses OR merging; keep false even if a library requires portrait.
        'tools:replace': 'android:required',
      },
    }];
    return mod;
  });
};
