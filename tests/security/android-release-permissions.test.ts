import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import app from '../../app.json';

const load = createRequire(__filename);
const { readManifest, verifyPrebuildPermissions, verifyMergedPermissions } = load('../../scripts/android-permissions.cjs');
const CAMERA = 'android.permission.CAMERA';
const INTERNET = 'android.permission.INTERNET';
const blocked = app.expo.android.blockedPermissions;
const permission = (name: string, attributes: Record<string, string> = {}): { $: Record<string, string> } =>
  ({ $: { 'android:name': name, ...attributes } });
const document = (entries: ReturnType<typeof permission>[]) => ({ manifest: { 'uses-permission': entries } });
const prebuild = (entries = [permission(INTERNET)]) => document([
  ...entries, ...blocked.map(name => permission(name, { 'tools:node': 'remove' })),
]);
const dependency = document([permission(CAMERA)]);
const merged = document([permission(INTERNET), permission(CAMERA)]);

it('accepts CAMERA from the library without claiming the sources were merged', () => {
  expect(verifyPrebuildPermissions(prebuild(), dependency, blocked)).toEqual({
    prebuildPermissions: [INTERNET],
    cameraDependencyPermissions: [CAMERA],
    cameraPermissionDeclaredInDependency: true,
    cameraPermissionBlockedInPrebuild: false,
  });
});

it('also accepts CAMERA explicitly declared in main', () => {
  expect(verifyPrebuildPermissions(prebuild([permission(CAMERA), permission(INTERNET)]), dependency, blocked)
    .prebuildPermissions).toEqual([CAMERA, INTERNET]);
});

it.each([CAMERA, INTERNET])('rejects a required permission blocked in app.json: %s', name => {
  expect(() => verifyPrebuildPermissions(prebuild(), dependency, [...blocked, name])).toThrow('No bloquear');
});

it.each([CAMERA, INTERNET])('rejects a global plugin removal even when the dependency supplies %s', name => {
  expect(() => verifyPrebuildPermissions(prebuild([permission(INTERNET), permission(name, { 'tools:node': 'remove' })]),
    dependency, blocked)).toThrow('prebuild bloquea');
});

it('rejects removeAll and selector-scoped CAMERA removals conservatively', () => {
  for (const entry of [{ $: { 'tools:node': 'removeAll' } },
    permission(CAMERA, { 'tools:node': 'remove', 'tools:selector': 'expo.modules.camera' })]) {
    const manifest = prebuild();
    manifest.manifest['uses-permission'].push(entry as ReturnType<typeof permission>);
    expect(() => verifyPrebuildPermissions(manifest, dependency, blocked)).toThrow('prebuild bloquea');
  }
});

it('still requires INTERNET in main', () => {
  expect(() => verifyPrebuildPermissions(prebuild([]), dependency, blocked)).toThrow('prebuild debe declarar');
});

it('requires CAMERA in the actual dependency even when main declares it', () => {
  expect(() => verifyPrebuildPermissions(prebuild([permission(CAMERA), permission(INTERNET)]), document([]), blocked))
    .toThrow('expo-camera instalado debe declarar');
});

it.each(['remove', 'removeAll'])('rejects CAMERA removal in the dependency: %s', operation => {
  expect(() => verifyPrebuildPermissions(prebuild(), document([permission(CAMERA, { 'tools:node': operation })]), blocked))
    .toThrow('no debe eliminar');
});

it.each([CAMERA, INTERNET])('rejects SDK limits in main for %s', name => {
  expect(() => verifyPrebuildPermissions(prebuild([permission(INTERNET), permission(name, { 'android:maxSdkVersion': '32' })]),
    dependency, blocked)).toThrow('no debe eliminar ni limitar');
});

it('rejects SDK limits and sdk-23-only declarations in the dependency', () => {
  expect(() => verifyPrebuildPermissions(prebuild(), document([permission(CAMERA, { 'android:maxSdkVersion': '32' })]), blocked))
    .toThrow('no debe eliminar ni limitar');
  expect(() => verifyPrebuildPermissions(prebuild(), { manifest: { 'uses-permission-sdk-23': [permission(CAMERA)] } }, blocked))
    .toThrow('debe declarar');
});

it.each(['android.permission.ACCESS_FINE_LOCATION', 'android.permission.RECORD_AUDIO'])('rejects unexpected main permissions: %s', name => {
  expect(() => verifyPrebuildPermissions(prebuild([permission(INTERNET), permission(name)]), dependency, blocked))
    .toThrow('Permisos inesperados');
});

it.each(blocked)('preserves the global removal of %s', name => {
  const manifest = prebuild();
  manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'].filter(entry => entry.$['android:name'] !== name);
  expect(() => verifyPrebuildPermissions(manifest, dependency, blocked)).toThrow(`Conservar bloqueo global de ${name}`);
});

it('does not accept a selector-scoped block as a global restriction', () => {
  const manifest = prebuild();
  manifest.manifest['uses-permission'][1].$['tools:selector'] = 'one.library';
  expect(() => verifyPrebuildPermissions(manifest, dependency, blocked)).toThrow('Conservar bloqueo global');
});

it('checks the installed expo-camera manifest with the real XML parser', async () => {
  const file = path.join(path.dirname(load.resolve('expo-camera/package.json')), 'android/src/main/AndroidManifest.xml');
  expect(verifyPrebuildPermissions(prebuild(), await readManifest(file), blocked).cameraDependencyPermissions).toContain(CAMERA);
});

it('parses comments, single quotes, reordered attributes and malformed XML correctly', async () => {
  const folder = mkdtempSync(path.join(tmpdir(), 'tsg-permissions-'));
  const file = path.join(folder, 'AndroidManifest.xml');
  try {
    writeFileSync(file, `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
      <!-- <uses-permission android:name="${CAMERA}"/> -->
      <uses-permission tools:node='remove' android:name='${CAMERA}'/>
    </manifest>`);
    const parsed = await readManifest(file);
    expect(() => verifyPrebuildPermissions(parsed, dependency, blocked)).toThrow('prebuild bloquea');
    expect(() => verifyPrebuildPermissions(prebuild(), parsed, blocked)).toThrow('no debe eliminar');
    writeFileSync(file, `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
      <!-- <uses-permission android:name="${CAMERA}"/> -->
    </manifest>`);
    const commented = await readManifest(file);
    expect(() => verifyPrebuildPermissions(prebuild(), commented, blocked)).toThrow('debe declarar');
    writeFileSync(file, '<manifest><uses-permission></manifest>');
    await expect(readManifest(file)).rejects.toThrow();
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

it('validates supplied merged contents independently of dependency declarations', () => {
  expect(verifyMergedPermissions(merged, blocked)).toEqual([CAMERA, INTERNET]);
  expect(() => verifyMergedPermissions(document([permission(INTERNET)]), blocked)).toThrow('fusionado debe declarar');
  expect(() => verifyMergedPermissions(prebuild(), blocked)).toThrow('reglas de eliminación');
});

it.each(blocked)('rejects blocked permission %s in merged XML', name => {
  expect(() => verifyMergedPermissions(document([...merged.manifest['uses-permission'], permission(name)]), blocked))
    .toThrow('permiso bloqueado');
});

it('rejects extra permissions and SDK restrictions in merged XML', () => {
  expect(() => verifyMergedPermissions(document([...merged.manifest['uses-permission'], permission('android.permission.ACCESS_FINE_LOCATION')]), blocked))
    .toThrow('permisos adicionales');
  expect(() => verifyMergedPermissions(document([permission(INTERNET), permission(CAMERA, { 'android:maxSdkVersion': '32' })]), blocked))
    .toThrow('no debe eliminar ni limitar');
});

it('keeps QR camera enabled and all seven unrelated permission restrictions', () => {
  const options = (name: string) => (app.expo.plugins.find(entry => Array.isArray(entry) && entry[0] === name) as [string, Record<string, unknown>])[1];
  expect(options('expo-image-picker').cameraPermission).toBe(options('expo-camera').cameraPermission);
  expect(options('expo-image-picker').cameraPermission).toEqual(expect.any(String));
  expect(options('expo-camera').recordAudioAndroid).toBe(false);
  expect(options('expo-camera').barcodeScannerEnabled).not.toBe(false);
  expect(options('expo-image-picker').microphonePermission).toBe(false);
  expect(blocked).toEqual([
    'android.permission.RECORD_AUDIO', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.VIBRATE', 'android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO',
  ]);
});
