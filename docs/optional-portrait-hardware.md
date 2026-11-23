# Hardware portrait opcional en Google Play

Corrección preparada sobre `origin/develop` (`ea70c2c`), en la rama
`fix/optional-portrait-hardware`. Expo instalado: **58.0.26**.

## Cambios

- `app.json`: registra `./plugins/with-optional-portrait-hardware.cjs` y conserva
  `"orientation": "portrait"`.
- `plugins/with-optional-portrait-hardware.cjs`: usa `withAndroidManifest` de
  `expo/config-plugins`. Sustituye las declaraciones de
  `android.hardware.screen.portrait` por una sola con `android:required="false"`.
  Conserva las demás características, los permisos y la actividad.
- `scripts/android-features.cjs`: comprueba mediante el documento XML parseado
  que la característica aparece exactamente una vez y es explícitamente opcional.
- `scripts/verify-android-release.cjs`: aplica esa comprobación al prebuild real
  y al manifiesto fusionado suministrado mediante `--merged-manifest`. También
  verifica la orientación vertical de la actividad generada y registra evidencia.
- `tests/security/android-portrait-hardware.test.ts`: cubre altas, corrección de
  valores obligatorios/implícitos, deduplicación, idempotencia, conservación de
  permisos y seguridad, y lectura/escritura XML con la API real de Expo.

La declaración generada es:

```xml
<uses-feature
    android:name="android.hardware.screen.portrait"
    android:required="false"
    tools:replace="android:required" />
```

El plugin añade `xmlns:tools` al manifiesto. Android fusiona `android:required`
con una operación OR: una biblioteca puede volver a exigir la característica.
`tools:replace` conserva el valor opcional exclusivamente para ese atributo.
Referencias: [plugins Expo](https://docs.expo.dev/config-plugins/plugins/),
[fusión Android](https://developer.android.com/build/manage-manifests).

`app.config.js`, los plugins de seguridad, el pinning y su captura, las
restricciones HTTPS, los permisos de cámara y bloqueos existentes, R8, la firma,
`eas.json`, las dependencias y el código funcional permanecen sin cambios.
EAS aplicará el plugin durante su prebuild CNG habitual; no requiere editar
carpetas nativas ni cambiar los perfiles de compilación.
Los workflows existentes de producción y preview ya ejecutan
`verify-android-release.cjs`: la nueva comprobación queda incluida en ese gate.

## Verificaciones locales (23 de noviembre de 2026)

- ESLint (`npm run lint`) y ESLint directo de los scripts/plugin/prueba: aprobados.
- TypeScript (`node node_modules/typescript/bin/tsc --noEmit`): aprobado.
- Regresión Jest: **99 suites, 1032 pruebas**, incluidas **13** de portrait.
- Aceptación simulada: **7 suites, 29 pruebas**.
- `npx expo install --check`: dependencias compatibles, sin cambios.
- Expo Doctor 1.21.8: **20/20** comprobaciones aprobadas.
- Prebuild Android aislado: `production`, `preview` y `arco-release` aprobados.
  Se comprueban portrait opcional, orientación vertical, cámara/INTERNET,
  bloqueos de permisos, HTTPS, pinning, R8 y reducción de recursos.

Evidencia local ignorada por Git:

- `.expo/optional-portrait-jest.json` y `.expo/optional-portrait-acceptance.json`.
- `.expo/android-release-bUvk2Y/verification.json` (`production`).
- `.expo/android-release-s9YopS/verification.json` (`preview`).
- `.expo/android-release-zpnRBe/verification.json` (`arco-release`).

El primer intento de prebuild fue bloqueado por el sandbox al crear un
subproceso; pasó al ejecutarse fuera de él. Lint también se repitió fuera del
sandbox. Las primeras ejecuciones de Jest aprobaron las pruebas, pero PowerShell
devolvió error al redirigir stderr; se repitieron con salida directa.

No había un manifiesto fusionado de Release disponible. Los informes registran
`suppliedMergedManifestPortraitVerified: false`; no se ha simulado esa fusión.
No se ejecutó Gradle, EAS Build, ni se generaron APK/AAB. No se hicieron commit,
push ni Pull Request.

## Verificar la próxima compilación autorizada

Antes de compilar, el preflight existente puede ejecutarse sin generar binarios:

```sh
node scripts/verify-android-release.cjs --profile production
```

Cuando exista el XML fusionado de la variante Release de esa revisión, ejecutar:

```sh
node scripts/verify-android-release.cjs --profile production --merged-manifest "ruta/al/AndroidManifest.xml"
```

Debe finalizar con salida 0 y registrar
`suppliedMergedManifestPortraitVerified: true`, así como ruta y SHA-256 del XML.
El script sigue exigiendo la evidencia vigente de pinning conforme a la política
existente. La procedencia del XML debe corresponder a esa compilación Release;
el script comprueba el contenido, no autentica su procedencia.

Para comprobar el **AAB final descargado de esa compilación**, decodificar su
manifiesto base con [bundletool](https://developer.android.com/tools/bundletool)
y validar ese XML con el mismo comando. Ejemplo en PowerShell:

```powershell
java -jar bundletool.jar dump manifest --bundle="app.aab" --module=base | Set-Content -Encoding utf8 .expo/aab-manifest.xml
if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer el AAB' }
node scripts/verify-android-release.cjs --profile production --merged-manifest .expo/aab-manifest.xml
```

Debe existir exactamente una característica `android.hardware.screen.portrait`
con `android:required="false"`. La actividad conserva su orientación portrait.
`dump manifest` solo inspecciona el AAB existente, sin construir APK/AAB. Tras
subir ese AAB con autorización, comprobar en Play Console que portrait ya no
figure como hardware obligatorio para esa versión. Las demás restricciones de
compatibilidad de la aplicación siguen siendo independientes de esta corrección.
