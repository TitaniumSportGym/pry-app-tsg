# Verificación de CAMERA en Android Release

Corrección del 16 de noviembre de 2026 en `fix/android-release-camera-validation`,
desde `develop` (`e35ad563671205eab9da150cecbc84b3604b5167`).

## Causa y revisión del historial

- `60bf238` creó el verificador de R8; `5c4eaca` añadió la igualdad exacta
  CAMERA/INTERNET en main. `bd37bd7` añadió target SDK y `c6cc40e` los controles
  de Certificate Pinning y los bloqueos de permisos. Esa igualdad solo inspeccionaba
  el manifiesto fuente de la app, no los permisos fusionados.
- `expo-camera` 58.0.14 declara CAMERA en su manifiesto Android instalado. Su
  plugin también solicita CAMERA en la configuración; `recordAudioAndroid: false`
  conserva el escáner sin grabación de audio.
- `1e48782` añadió `expo-image-picker` con `cameraPermission: false`. En esta
  versión esa opción genera un bloqueo global, no una preferencia exclusiva del
  selector de imágenes. El prebuild reproducido tenía
  `<uses-permission android:name="android.permission.CAMERA" tools:node="remove"/>`.
  La regla de mayor prioridad elimina también el permiso aportado por expo-camera.
  Por tanto, aceptar solo la presencia del permiso en node_modules habría ocultado
  una regresión real del escáner QR.

Se reemplaza ese `false` por la misma explicación en español usada por
`expo-camera`. Se mantiene `microphonePermission: false`, las restricciones de
lectura de medios y todas las funciones de selección y carga de fotos/video.
No se cambian versiones ni lockfile, pinning, R8, perfiles EAS o código de UI.

## Qué comprueba cada etapa

| Fuente | Comprobación | Límite de la evidencia |
| --- | --- | --- |
| Main del prebuild aislado | INTERNET obligatorio; CAMERA opcional; ningún permiso activo fuera de CAMERA/INTERNET; siete eliminaciones globales obligatorias; ningún bloqueo ni límite de SDK de permisos necesarios | Configuración generada, sin fusión de Gradle |
| Manifiesto del expo-camera instalado | CAMERA activo como uses-permission, sin maxSdkVersion; registra versión, ruta y SHA-256 | Fuente de una dependencia, no prueba de autolinking ni de empaquetado |
| XML fusionado Release suministrado explícitamente | CAMERA e INTERNET obligatorios sin límites de SDK; sin reglas de eliminación ni permisos bloqueados o adicionales | Comprueba el contenido suministrado; no autentica su origen ni lo vincula a un APK/AAB |
| APK/AAB final y dispositivo | Pendientes tras autorización de compilación e inspección del artefacto | Ningún prebuild ni fixture sustituye esta evidencia |

El parser XML de Expo evita interpretar comentarios como permisos y no depende
del orden de atributos ni de las comillas. También se inspecciona
`uses-permission-sdk-23` para detectar permisos adicionales; esa etiqueta por sí
sola no satisface la declaración general requerida.

```sh
node scripts/verify-android-release.cjs
node scripts/verify-android-release.cjs --profile preview
node scripts/verify-android-release.cjs --profile arco-release
```

Sin `--merged-manifest`, `verification.json` incluye los permisos reales de cada
fuente, `cameraPermissionDeclaredInDependency: true`,
`cameraPermissionBlockedInPrebuild: false`, `mergedManifest: null`,
`suppliedMergedManifestPermissionsVerified: false` y
`mergedBinaryPermissionsVerified: false`. Los indicadores de Gradle/EAS, target
SDK del binario y pinning nativo en ejecución siguen siendo `false`.

Cuando exista un XML obtenido de la fusión Release autorizada, puede comprobarse
su contenido sin compilar desde este script:

```sh
node scripts/verify-android-release.cjs --profile production --merged-manifest /ruta/al/manifest-fusionado-release/AndroidManifest.xml
```

Se registra ruta absoluta, SHA-256 y permisos del XML. Solo
`suppliedMergedManifestPermissionsVerified` pasa a `true`; `provenanceVerified`
y `mergedBinaryPermissionsVerified` permanecen en `false`. Se rechazan los
manifiestos fuente con reglas de eliminación y el manifiesto de expo-camera.
No hay búsqueda automática de archivos antiguos ni fusión simulada de permisos.

Después de autorizar un build, hay que relacionar ese XML y el informe del merger
con la variante y revisión compiladas, inspeccionar los permisos empaquetados con
las herramientas Android del APK/AAB y probar solicitud, denegación y escaneo QR
en dispositivo. Esta corrección no genera artefactos ni declara esa etapa aprobada.

## Pruebas ejecutadas

- Suite principal: **98 suites y 982 pruebas aprobadas**, incluidas 22 suites y
  225 pruebas de integración, y 36 regresiones de permisos nuevas. Reporte local:
  `coverage/android-release-fix/jest.json`.
- Aceptación: **7 suites y 29 pruebas aprobadas**, con simulaciones. Reporte:
  `coverage/android-release-fix/acceptance.json`. Los dos comandos finales terminaron
  con salida 0. La primera ejecución pasó las pruebas pero no pudo escribir los
  reportes porque faltaba el directorio; se creó y se repitieron ambos comandos.
- TypeScript: `node node_modules/typescript/bin/tsc --noEmit`, salida 0 tras
  regenerar los tipos locales de Expo Router con Expo Start offline. No se
  modificaron rutas ni configuración de TypeScript.
- ESLint directo de los dos scripts y la prueba nueva: salida 0, sin advertencias.
- `npm.cmd run lint`: salida 0, con telemetría deshabilitada y modo offline. Se
  ejecutó fuera del sandbox porque dentro ESLint guardaba sus resultados sin
  finalizar el proceso. No se alteraron reglas ni se aplicaron correcciones automáticas.
- Prebuild aislado: `production`, `preview` y `arco-release`, salida 0. Evidencia
  local en `.expo/android-release-5tp6LH`, `.expo/android-release-6hl2hR` y
  `.expo/android-release-cETCqZ`, respectivamente. Los tres conservan pinning
  XML/Kotlin, R8, shrinkResources, target 36 y las restricciones de permisos.
- CLI con un XML **sintético**: acepta CAMERA/INTERNET y mantiene origen y binario
  sin verificar. Control negativo: rechaza main del prebuild como XML fusionado.
  Esto prueba el verificador, no un artefacto Release real.
- `git diff --check`: aprobado. `package.json`, `package-lock.json`, `eas.json`,
  `app.config.js` y la implementación de pinning no tienen cambios respecto a
  develop. Se conserva intacto el cambio local previo de fecha en
  `config/alpha-pinning-public-chain.json`.

No se ejecutó Gradle ni EAS Build, ni se generó APK/AAB, commit, push o merge.

## Archivos de la corrección

- `app.json`: elimina el conflicto global de CAMERA del selector de medios.
- `scripts/verify-android-release.cjs`: conecta las comprobaciones por fuente,
  registra evidencia separada y permite inspeccionar un XML suministrado.
- `scripts/android-permissions.cjs`: lectura XML y validaciones de permisos.
- `tests/security/android-release-permissions.test.ts`: regresiones positivas y
  negativas, incluida lectura real del manifiesto instalado.
- Este informe, `docs/certificate-pinning-alpha.md`, `docs/google-play-validation.md`
  y `docs/google-play-data-safety.md`: corrigen el alcance atribuido al prebuild.

## Fuentes

- [Expo SDK 58: ImagePicker](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/#configurable-properties): efecto global de cameraPermission false.
- [Expo SDK 58: Camera](https://docs.expo.dev/versions/v58.0.0/sdk/camera/): configuración de cámara y audio.
- [Expo: permisos](https://docs.expo.dev/guides/permissions/): permisos aportados por plugins y manifiestos de paquetes.
- [Android: fusión de manifiestos](https://developer.android.com/build/manage-manifests): prioridades y tools:node remove.
