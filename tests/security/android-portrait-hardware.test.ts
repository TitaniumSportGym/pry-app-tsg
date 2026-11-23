import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import app from '../../app.json';

const load = createRequire(__filename);
const withOptionalPortraitHardware = load('../../plugins/with-optional-portrait-hardware.cjs');
const { verifyOptionalPortraitFeature } = load('../../scripts/android-features.cjs');
const { AndroidConfig } = load('expo/config-plugins');
const PORTRAIT = 'android.hardware.screen.portrait';
const feature = (name: string, attributes: Record<string, string> = {}) => ({ $: { 'android:name': name, ...attributes } });
type Feature = ReturnType<typeof feature>;
const document = (features?: Feature[]) => ({
  manifest: {
    $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
    ...(features ? { 'uses-feature': features } : {}),
    'uses-permission': [feature('android.permission.CAMERA'), feature('android.permission.INTERNET')],
    application: [{
      $: { 'android:usesCleartextTraffic': 'false', 'android:networkSecurityConfig': '@xml/titanium_network_security' },
      activity: [{ $: { 'android:name': '.MainActivity', 'android:screenOrientation': 'portrait' } }],
    }],
  },
});

// Exercise the real Expo mod wrapper, without mocking the config-plugins API.
async function applyPlugin(manifest: ReturnType<typeof document>) {
  const config = withOptionalPortraitHardware({ name: 'portrait-test', slug: 'portrait-test', orientation: 'portrait' });
  const result = await config.mods.android.manifest({ ...config, modResults: manifest, modRequest: {} });
  expect(result.orientation).toBe('portrait');
  return result.modResults;
}

it('registers the plugin once and retains portrait orientation in the app config', () => {
  expect(app.expo.orientation).toBe('portrait');
  expect(app.expo.plugins.filter(entry => entry === './plugins/with-optional-portrait-hardware.cjs')).toHaveLength(1);
});

it.each([undefined, [], [feature(PORTRAIT)], [feature(PORTRAIT, { 'android:required': 'true' })]].map(features => ({ features })))(
  'makes missing or required portrait hardware optional: $features', async ({ features }) => {
    const result = await applyPlugin(document(features));
    expect(verifyOptionalPortraitFeature(result)).toEqual({ name: PORTRAIT, required: false });
    expect(result.manifest['uses-feature'][0].$['tools:replace']).toBe('android:required');
    expect(result.manifest.$['xmlns:tools']).toBe('http://schemas.android.com/tools');
  },
);

it('deduplicates portrait, is idempotent, and preserves other features, permissions and security attributes', async () => {
  const camera = feature('android.hardware.camera', { 'android:required': 'true' });
  const original = document([
    camera,
    feature(PORTRAIT, { 'android:required': 'true' }),
    feature(PORTRAIT, { 'tools:node': 'remove', 'tools:selector': 'one.library' }),
  ]);
  const before = structuredClone(original);
  const result = await applyPlugin(original);
  expect(verifyOptionalPortraitFeature(result)).toEqual({ name: PORTRAIT, required: false });
  expect(result.manifest['uses-feature'].filter((entry: Feature) => entry.$['android:name'] !== PORTRAIT)).toEqual([camera]);
  expect(result.manifest.application).toEqual(before.manifest.application);
  expect(result.manifest['uses-permission']).toEqual(before.manifest['uses-permission']);
  const once = structuredClone(result);
  expect(await applyPlugin(result)).toEqual(once);
});

it.each([
  [],
  [feature(PORTRAIT)],
  [feature(PORTRAIT, { 'android:required': 'true' })],
  [feature(PORTRAIT, { 'android:required': 'false' }), feature(PORTRAIT, { 'android:required': 'false' })],
  [feature(PORTRAIT, { 'android:required': 'false', 'tools:node': 'remove' })],
  [feature(PORTRAIT, { 'android:required': 'false', 'tools:selector': 'one.library' })],
].map(features => ({ features })))('rejects missing, required, duplicate or ineffective declarations in generated or merged XML: $features', ({ features }) => {
  expect(() => verifyOptionalPortraitFeature(document(features))).toThrow();
});

it('checks real serialized plugin output and supplied merged XML with the Expo XML parser', async () => {
  const folder = mkdtempSync(path.join(tmpdir(), 'tsg-portrait-'));
  const file = path.join(folder, 'AndroidManifest.xml');
  try {
    await AndroidConfig.Manifest.writeAndroidManifestAsync(file, await applyPlugin(document()));
    expect(verifyOptionalPortraitFeature(await AndroidConfig.Manifest.readAndroidManifestAsync(file)))
      .toEqual({ name: PORTRAIT, required: false });
    // A supplied merged manifest has no tools marker; attribute order and quotes do not matter.
    writeFileSync(file, `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
      <uses-feature android:required='false' android:name='${PORTRAIT}'/>
    </manifest>`);
    expect(verifyOptionalPortraitFeature(await AndroidConfig.Manifest.readAndroidManifestAsync(file)).required).toBe(false);
    writeFileSync(file, `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
      <!-- <uses-feature android:name="${PORTRAIT}" android:required="false"/> -->
      <uses-feature android:name="${PORTRAIT}" android:required="true"/>
    </manifest>`);
    const required = await AndroidConfig.Manifest.readAndroidManifestAsync(file);
    expect(() => verifyOptionalPortraitFeature(required)).toThrow('android:required="false"');
    writeFileSync(file, '<manifest><uses-feature></manifest>');
    await expect(AndroidConfig.Manifest.readAndroidManifestAsync(file)).rejects.toThrow();
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
