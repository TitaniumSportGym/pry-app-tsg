'use strict';

// Generates an isolated Android project and checks its R8 wiring. No Gradle or EAS build.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { EXISTING_PROFILES, LAB_VARIANTS, HOST, getLabSettings } = require('../config/pinning-lab.cjs');
const { profileEnvironment } = require('./eas-profile-environment.cjs');

const projectRoot = path.resolve(path.dirname(module.filename), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(projectRoot, file), 'utf8'));

function verifyAndroidRelease(profileName = 'production') {
  const app = readJson('app.json');
  const eas = readJson('eas.json');
  const environment = profileEnvironment(eas, profileName);
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
  for (const file of ['app.json', 'app.config.js', 'eas.json', 'package.json', 'assets', 'plugins', 'config']) {
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
  let resolved;
  try {
    const evaluated = spawnSync(process.execPath, [path.join(expoRoot, 'bin', 'cli'), 'config', '--type', 'prebuild', '--json'], {
      cwd: snapshot, encoding: 'utf8', timeout: 60000, env: environment,
    });
    fs.writeFileSync(path.join(snapshot, 'config.log'), evaluated.stderr || '');
    if (evaluated.error) throw evaluated.error;
    assert.equal(evaluated.status, 0, `Configuración ${profileName} rechazada antes de Prebuild: ${evaluated.stderr.trim()}`);
    resolved = JSON.parse(evaluated.stdout);
    const lab = getLabSettings(environment);
    assert.equal(resolved.android.package, lab?.package || app.expo.android.package);
    assert.equal(resolved.name, lab?.name || app.expo.name);
    assert.equal(resolved.scheme, lab?.scheme || app.expo.scheme);
    if (lab) assert.equal(resolved.extra.pinningLab.variant, profileName);
    else assert.equal(resolved.extra.pinningLab, undefined);
    generated = spawnSync(process.execPath, args, {
      cwd: snapshot,
      encoding: 'utf8',
      timeout: 120000,
      env: environment,
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
  const targetSdk = Number(properties.match(/^android\.targetSdkVersion=(\d+)$/m)?.[1]);
  assert.ok(targetSdk >= 36, 'El proyecto generado debe declarar targetSdk 36 o superior.');
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
  const lab = getLabSettings(environment);
  for (const variant of ['main', 'debug']) {
    assert.match(policy(variant), /base-config cleartextTrafficPermitted="false"/);
    assert.match(policy(variant), /certificates src="system"/);
    assert.doesNotMatch(policy(variant), /src="user"|debug-overrides|overridePins|@raw\//);
    if (lab) {
      assert.equal((policy(variant).match(/<pin-set>/g) || []).length, 1);
      assert.doesNotMatch(policy(variant), /expiration=|includeSubdomains="true"|cleartextTrafficPermitted="true"/);
      assert.deepEqual([...policy(variant).matchAll(/<domain includeSubdomains="false">(.*?)<\/domain>/g)].map(match => match[1]), [HOST]);
      assert.deepEqual([...policy(variant).matchAll(/<pin digest="(.*?)">(.*?)<\/pin>/g)].map(match => [match[1], match[2]]), [['SHA-256', lab.pin]]);
    } else assert.doesNotMatch(policy(variant), /pin-set/);
  }
  assert.doesNotMatch(policy('main'), /cleartextTrafficPermitted="true"/);
  if (!lab) assert.deepEqual([...policy('debug').matchAll(/<domain>(.*?)<\/domain>/g)].map(match => match[1]), ['localhost', '127.0.0.1', '10.0.2.2']);
  const javaDirectory = path.join(nativeRoot, 'app', 'src', 'main', 'java', ...resolved.android.package.split('.'));
  const application = fs.readFileSync(path.join(javaDirectory, 'MainApplication.kt'), 'utf8');
  const diagnosticsPath = path.join(javaDirectory, 'TitaniumPinningLabDiagnostics.kt');
  if (lab) {
    assert.match(application, /super\.onCreate\(\)\s+TitaniumPinningLabDiagnostics\.install\(this\)/);
    assert.ok(application.indexOf('TitaniumPinningLabDiagnostics.install(this)') < application.indexOf('loadReactNative(this)'));
    const diagnostics = fs.readFileSync(diagnosticsPath, 'utf8');
    assert.match(diagnostics, /OkHttpClientProvider\.createClientBuilder\(context\)/);
    assert.match(diagnostics, /PIN_VERIFICATION_FAILED/);
    assert.match(diagnostics, /url\.encodedPath != "\/health"/);
    assert.doesNotMatch(diagnostics, /sslSocketFactory|hostnameVerifier|certificatePinner|request\.headers|response\.body/);
  } else {
    assert.doesNotMatch(application, /TitaniumPinningLab/);
    assert.equal(fs.existsSync(diagnosticsPath), false);
  }
  const declaredPermissions = [...manifest.matchAll(/<uses-permission\b[^>]*>/g)]
    .map(match => match[0]).filter(entry => !/tools:node="remove"/.test(entry))
    .map(entry => entry.match(/android:name="([^"]+)"/)[1]).sort();
  assert.deepEqual(declaredPermissions, ['android.permission.CAMERA', 'android.permission.INTERNET']);

  const evidence = {
    verifiedAt: new Date().toISOString(),
    expo: require('expo/package.json').version,
    reactNative: require('react-native/package.json').version,
    buildProperties: require('expo-build-properties/package.json').version,
    profile: profileName,
    androidPackage: resolved.android.package,
    sourceHashes: Object.fromEntries(['app.json', 'app.config.js', 'eas.json', 'package.json', 'package-lock.json', 'config/pinning-lab.cjs', 'plugins/with-network-security.cjs', 'plugins/pinning-lab-diagnostics.cjs'].map((file) => [
      file, createHash('sha256').update(fs.readFileSync(path.join(projectRoot, file))).digest('hex'),
    ])),
    snapshot: path.relative(projectRoot, snapshot),
    minifyEnabled: true,
    configuredTargetSdk: targetSdk,
    binaryTargetSdkVerified: false,
    shrinkResources: true,
    releaseCleartextBlocked: true,
    systemCertificateAuthoritiesOnly: true,
    certificatePinning: Boolean(lab),
    pinning: lab ? { hostname: HOST, digest: 'SHA-256', pin: lab.pin, capturedAt: lab.capturedAt, runtimeVerified: false } : null,
    prebuildPermissions: declaredPermissions,
    mergedBinaryPermissionsVerified: false,
    proguardPreset: 'proguard-android-optimize.txt',
    appProguardRules: 'android/app/proguard-rules.pro',
    gradleBuildExecuted: false,
    easBuildExecuted: false,
    arcoRelease: { apiOrigin: arco.env.EXPO_PUBLIC_API_URL, enabled: true, buildType: 'apk', distribution: arco.distribution },
  };
  fs.writeFileSync(path.join(snapshot, 'verification.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

function main() {
  const all = process.argv.includes('--all-profiles');
  const profileIndex = process.argv.indexOf('--profile');
  const profiles = all ? [...EXISTING_PROFILES, ...Object.keys(LAB_VARIANTS)] : [profileIndex < 0 ? 'production' : process.argv[profileIndex + 1]];
  const results = [];
  for (const profile of profiles) {
    try { results.push({ profile, status: 'passed', evidence: verifyAndroidRelease(profile) }); }
    catch (error) { results.push({ profile, status: 'failed', error: error.message }); process.exitCode = 1; }
  }
  if (all) {
    fs.mkdirSync(path.join(projectRoot, '.expo'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, '.expo', 'pinning-lab-matrix.json'), `${JSON.stringify(results, null, 2)}\n`);
  }
  console.log(JSON.stringify(all ? results : results[0], null, 2));
}

if (require.main === module) main();
module.exports = { verifyAndroidRelease };
