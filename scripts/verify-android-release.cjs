'use strict';

// Generates an isolated Android project and checks its R8 wiring. No Gradle or EAS build.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(path.dirname(module.filename), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(projectRoot, file), 'utf8'));

function verifyAndroidRelease() {
  const app = readJson('app.json');
  const eas = readJson('eas.json');
  const plugin = app.expo.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'expo-build-properties');
  assert.equal(plugin?.[1]?.android?.enableMinifyInReleaseBuilds, true);
  assert.equal(plugin?.[1]?.android?.enableShrinkResourcesInReleaseBuilds, true);
  for (const [profile, buildType] of [['preview', 'apk'], ['production', 'app-bundle'], ['arco-release', 'apk']]) {
    const build = eas.build[profile];
    assert.equal(build.android.buildType, buildType);
    assert.notEqual(build.developmentClient, true, `${profile} debe usar Release.`);
    assert.notEqual(build.android.developmentClient, true);
    assert.equal(build.android.gradleCommand, undefined, 'Revisar cualquier override de Gradle.');
    assert.ok(build.android.buildArtifactPaths.includes('android/app/build/outputs/mapping/release/**'));
  }
  const arco = eas.build['arco-release'];
  assert.equal(arco.extends, undefined);
  assert.equal(arco.distribution, 'internal');
  assert.equal(arco.env.EXPO_PUBLIC_API_URL, 'https://server-titanium.onrender.com');
  assert.equal(arco.env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED, 'true');
  assert.notEqual(arco.environment, 'production');

  const stagingRoot = path.join(projectRoot, '.expo');
  fs.mkdirSync(stagingRoot, { recursive: true });
  const snapshot = fs.mkdtempSync(path.join(stagingRoot, 'android-release-'));
  for (const file of ['app.json', 'package.json', 'assets', 'plugins']) {
    fs.cpSync(path.join(projectRoot, file), path.join(snapshot, file), { recursive: true });
  }
  // Prebuild only needs the Router directory, not a second copy of the app or its tests.
  fs.mkdirSync(path.join(snapshot, 'src', 'app'), { recursive: true });
  const expoRoot = path.dirname(require.resolve('expo/package.json'));
  const args = [
    path.join(expoRoot, 'bin', 'cli'),
    'prebuild', '--platform', 'android', '--no-install',
    '--template', path.join(expoRoot, 'template.tgz'),
  ];
  let generated;
  try {
    generated = spawnSync(process.execPath, args, {
      cwd: snapshot,
      encoding: 'utf8',
      timeout: 120000,
      env: {
        ...process.env,
        CI: '1',
        EXPO_OFFLINE: '1',
        EXPO_NO_TELEMETRY: '1',
        EXPO_NO_DOTENV: '1',
      },
    });
  } finally {
    // Jest indexes package names even under .expo; the temporary manifest must not remain.
    fs.unlinkSync(path.join(snapshot, 'package.json'));
  }
  fs.writeFileSync(path.join(snapshot, 'prebuild.log'), `${generated.stdout || ''}\n${generated.stderr || ''}`);
  if (generated.error) throw generated.error;
  assert.equal(generated.status, 0, `Prebuild falló. Consulta ${path.join(snapshot, 'prebuild.log')}`);

  const nativeRoot = path.join(snapshot, 'android');
  const properties = fs.readFileSync(path.join(nativeRoot, 'gradle.properties'), 'utf8');
  const gradle = fs.readFileSync(path.join(nativeRoot, 'app', 'build.gradle'), 'utf8');
  const proguard = fs.readFileSync(path.join(nativeRoot, 'app', 'proguard-rules.pro'), 'utf8');
  for (const property of ['android.enableMinifyInReleaseBuilds', 'android.enableShrinkResourcesInReleaseBuilds']) {
    const values = properties.split(/\r?\n/).filter((line) => line.startsWith(`${property}=`));
    assert.deepEqual(values, [`${property}=true`], `${property} debe estar habilitado una sola vez.`);
  }
  assert.match(gradle, /findProperty\('android\.enableMinifyInReleaseBuilds'\)/);
  assert.match(gradle, /release\s*\{[\s\S]*?minifyEnabled enableMinifyInReleaseBuilds/);
  assert.match(gradle, /release\s*\{[\s\S]*?findProperty\('android\.enableShrinkResourcesInReleaseBuilds'\)[\s\S]*?shrinkResources enableShrinkResources\.toBoolean\(\)/);
  assert.match(gradle, /proguardFiles getDefaultProguardFile\("proguard-android-optimize\.txt"\), "proguard-rules\.pro"/);
  assert.doesNotMatch(proguard, /^\s*-dont(?:obfuscate|shrink|optimize)\b/m);
  const manifest = fs.readFileSync(path.join(nativeRoot, 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(manifest, /android:networkSecurityConfig="@xml\/titanium_network_security"/);
  const policy = (variant) => fs.readFileSync(path.join(nativeRoot, 'app', 'src', variant, 'res', 'xml', 'titanium_network_security.xml'), 'utf8');
  for (const variant of ['main', 'debug']) {
    assert.match(policy(variant), /base-config cleartextTrafficPermitted="false"/);
    assert.match(policy(variant), /certificates src="system"/);
    assert.doesNotMatch(policy(variant), /src="user"|debug-overrides|pin-set/);
  }
  assert.doesNotMatch(policy('main'), /cleartextTrafficPermitted="true"/);
  assert.deepEqual([...policy('debug').matchAll(/<domain>(.*?)<\/domain>/g)].map(match => match[1]), ['localhost', '127.0.0.1', '10.0.2.2']);
  const declaredPermissions = [...manifest.matchAll(/<uses-permission\b[^>]*>/g)]
    .map(match => match[0]).filter(entry => !/tools:node="remove"/.test(entry))
    .map(entry => entry.match(/android:name="([^"]+)"/)[1]).sort();
  assert.deepEqual(declaredPermissions, ['android.permission.CAMERA', 'android.permission.INTERNET']);

  const evidence = {
    verifiedAt: new Date().toISOString(),
    expo: require('expo/package.json').version,
    reactNative: require('react-native/package.json').version,
    buildProperties: require('expo-build-properties/package.json').version,
    sourceHashes: Object.fromEntries(['app.json', 'eas.json', 'package.json', 'package-lock.json'].map((file) => [
      file, createHash('sha256').update(fs.readFileSync(path.join(projectRoot, file))).digest('hex'),
    ])),
    snapshot: path.relative(projectRoot, snapshot),
    minifyEnabled: true,
    shrinkResources: true,
    releaseCleartextBlocked: true,
    systemCertificateAuthoritiesOnly: true,
    certificatePinning: false,
    prebuildPermissions: declaredPermissions,
    mergedBinaryPermissionsVerified: false,
    proguardPreset: 'proguard-android-optimize.txt',
    appProguardRules: 'android/app/proguard-rules.pro',
    gradleBuildExecuted: false,
    easBuildExecuted: false,
    arcoRelease: { apiOrigin: arco.env.EXPO_PUBLIC_API_URL, enabled: true, buildType: 'apk', distribution: arco.distribution },
  };
  fs.writeFileSync(path.join(snapshot, 'verification.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
}

try {
  verifyAndroidRelease();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
