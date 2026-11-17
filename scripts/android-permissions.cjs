'use strict';

const assert = require('node:assert/strict');
const { AndroidConfig } = require('expo/config-plugins');

const CAMERA = 'android.permission.CAMERA';
const INTERNET = 'android.permission.INTERNET';
const ALLOWED_PERMISSIONS = [CAMERA, INTERNET];

// Use Expo's XML parser: comments and attribute order must not change security checks.
const readManifest = (file) => AndroidConfig.Manifest.readAndroidManifestAsync(file);

function permissionEntries(document) {
  assert.ok(document?.manifest, 'Se requiere un AndroidManifest.xml válido.');
  return ['uses-permission', 'uses-permission-sdk-23'].flatMap(tag =>
    (document.manifest[tag] || []).map(entry => ({ tag, ...entry.$ })));
}

const isRemoval = (entry) => ['remove', 'removeAll'].includes(entry['tools:node']);
const declaredPermissions = (entries) => [...new Set(entries.filter(entry => !isRemoval(entry))
  .map(entry => entry['android:name']))].sort();

function assertRequiredPermission(entries, permission, source) {
  assert.ok(!entries.some(entry => entry['android:name'] === permission &&
    (isRemoval(entry) || entry['android:maxSdkVersion'] !== undefined)),
  `${source} no debe eliminar ni limitar ${permission}.`);
  assert.ok(entries.some(entry => entry.tag === 'uses-permission' && entry['android:name'] === permission &&
    !isRemoval(entry) && entry['android:maxSdkVersion'] === undefined),
  `${source} debe declarar ${permission} sin límite de SDK.`);
}

function verifyPrebuildPermissions(prebuild, cameraDependency, blockedPermissions) {
  const entries = permissionEntries(prebuild);
  const dependencyEntries = permissionEntries(cameraDependency);
  for (const permission of ALLOWED_PERMISSIONS) {
    assert.ok(!blockedPermissions.includes(permission), `No bloquear ${permission} en app.json.`);
    assert.ok(!entries.some(entry => isRemoval(entry) &&
      (!entry['android:name'] || entry['android:name'] === permission)),
    `El prebuild bloquea ${permission}; revisar los plugins (incluido expo-image-picker).`);
  }
  const permissions = declaredPermissions(entries);
  assertRequiredPermission(entries, INTERNET, 'El prebuild');
  if (permissions.includes(CAMERA)) assertRequiredPermission(entries, CAMERA, 'El prebuild');
  assert.ok(permissions.every(permission => ALLOWED_PERMISSIONS.includes(permission)),
    `Permisos inesperados en el prebuild: ${permissions.join(', ')}.`);
  // CAMERA can be in main or arrive from expo-camera during the Gradle merge.
  // Check the actual installed library even if main also declares CAMERA.
  assertRequiredPermission(dependencyEntries, CAMERA, 'El manifiesto de expo-camera instalado');
  for (const permission of blockedPermissions) {
    assert.ok(entries.some(entry => entry.tag === 'uses-permission' &&
      entry['android:name'] === permission && entry['tools:node'] === 'remove' &&
      entry['tools:selector'] === undefined), `Conservar bloqueo global de ${permission}.`);
  }
  return {
    prebuildPermissions: permissions,
    cameraDependencyPermissions: declaredPermissions(dependencyEntries),
    cameraPermissionDeclaredInDependency: true,
    cameraPermissionBlockedInPrebuild: false,
  };
}

// Validate a supplied Release merged XML, never infer it by unioning source manifests.
// This checks its contents; provenance and the packaged APK/AAB still need inspection.
function verifyMergedPermissions(document, blockedPermissions) {
  const entries = permissionEntries(document);
  assert.ok(!entries.some(isRemoval), 'El manifiesto fusionado no debe contener reglas de eliminación.');
  for (const permission of ALLOWED_PERMISSIONS) assertRequiredPermission(entries, permission, 'El manifiesto fusionado');
  const permissions = declaredPermissions(entries);
  for (const permission of blockedPermissions) {
    assert.ok(!permissions.includes(permission), `El manifiesto fusionado conserva el permiso bloqueado ${permission}.`);
  }
  assert.deepEqual(permissions, ALLOWED_PERMISSIONS, 'Revisar permisos adicionales en el manifiesto fusionado.');
  return permissions;
}

module.exports = { readManifest, verifyPrebuildPermissions, verifyMergedPermissions };
