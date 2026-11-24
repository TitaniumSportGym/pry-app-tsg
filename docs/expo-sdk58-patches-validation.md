# Actualización de parches de Expo SDK 58

Validación local completada el 16 de noviembre de 2026 (America/Mexico_City).
Rama: `fix/expo-sdk58-patches`. Base verificada mediante fetch de
`origin/develop`: `5876f5467e727e3c120565baa63fd546ee994fa9`.
La rama ya estaba creada al comenzar; se conservó el cambio local previo de
`expo` en package.json y se completó la actualización. `develop` no se modificó.

## Causa y alcance

El control de compatibilidad del workflow de producción detectaba 13 paquetes
directos por debajo de los parches recomendados para SDK 58. La corrección
actualiza sus rangos y regenera el árbol mediante Expo CLI y npm. React Native
permanece en `0.88.1`, React en `19.3.0` y Expo en SDK 58.

Las versiones anteriores de esta tabla son las resueltas en el lockfile de la
base; los rangos anteriores de expo-constants y expo-font eran, respectivamente,
`~58.0.13` y `~58.0.10`.

| Paquete | Instalado antes | Instalado después / nuevo rango |
| --- | --- | --- |
| expo | 58.0.23 | 58.0.25 / ~58.0.25 |
| expo-constants | 58.0.15 | 58.0.16 / ~58.0.16 |
| expo-crypto | 58.0.7 | 58.0.8 / ~58.0.8 |
| expo-dev-client | 58.0.18 | 58.0.20 / ~58.0.20 |
| expo-font | 58.0.11 | 58.0.12 / ~58.0.12 |
| expo-linking | 58.0.16 | 58.0.17 / ~58.0.17 |
| expo-router | 58.0.30 | 58.0.31 / ~58.0.31 |
| expo-secure-store | 58.0.2 | 58.0.3 / ~58.0.3 |
| expo-splash-screen | 58.0.13 | 58.0.14 / ~58.0.14 |
| expo-status-bar | 58.0.4 | 58.0.5 / ~58.0.5 |
| expo-symbols | 58.0.4 | 58.0.5 / ~58.0.5 |
| expo-video | 58.0.13 | 58.0.14 / ~58.0.14 |
| expo-web-browser | 58.0.7 | 58.0.8 / ~58.0.8 |

Solo cambian `package.json`, `package-lock.json` y este informe. No cambian otros
rangos directos, devDependencies, scripts ni overrides. Se verificaron también
las versiones instaladas de las demás dependencias directas y de desarrollo.
Los archivos de aplicación, pruebas, workflows, app.json, app.config.js, eas.json,
plugins de seguridad y configuración/captura de pinning permanecen intactos.

## Instalación y lockfile

Se consultaron la [documentación de SDK 58](https://docs.expo.dev/versions/v58.0.0/)
y la [referencia de Expo CLI](https://docs.expo.dev/more/expo-cli/) antes de actuar.
Con Node 22.23.2/npm 10.9.9 portátiles se ejecutó el CLI oficial instalado:

```sh
node node_modules/expo/bin/cli install expo@~58.0.25 expo-constants@~58.0.16 expo-crypto@~58.0.8 expo-dev-client@~58.0.20 expo-font@~58.0.12 expo-linking@~58.0.17 expo-router@~58.0.31 expo-secure-store@~58.0.3 expo-splash-screen@~58.0.14 expo-status-bar@~58.0.5 expo-symbols@~58.0.5 expo-video@~58.0.14 expo-web-browser@~58.0.8 --npm
npm install --package-lock-only --ignore-scripts --no-audit --no-fund --prefer-offline
```

Expo completó las instalaciones npm, pero su comando terminó con código 1 al
intentar escribir automáticamente los plugins expo-font y expo-status-bar en la
configuración dinámica app.config.js. Se revisaron ambos plugins instalados:
sin opciones de fuentes o de estilo/visibilidad no agregan modificaciones
nativas. La aplicación mantiene la carga existente con useFonts; la
[documentación de expo-font](https://docs.expo.dev/versions/v58.0.0/sdk/font/)
admite esta carga en ejecución. Se conservó la configuración existente. Las
validaciones finales online de compatibilidad y Doctor pasaron sin exclusiones.

El segundo comando normalizó el lockfile con npm 10.9.9. No se editó manualmente.
Sus flags corresponden solo a esa regeneración; las instalaciones limpias
posteriores utilizaron `npm ci --include=dev`, sin desactivar la validación.

El diff contiene 63 entradas de paquetes cuya versión cambia, ninguna entrada
nueva y la eliminación de `node_modules/getenv@2.0.0`. Todas las entradas con
versiones actualizadas pertenecen al cierre de dependencias de los 13 paquetes
solicitados. Incluye los módulos internos expo-modules-core y
expo-modules-autolinking `58.1.0`, requeridos explícitamente por expo 58.0.25
mediante `~58.1.0`; esto conserva el SDK mayor 58. El detalle completo está en
`coverage/expo-sdk58-patches/lock-diff.json`.

Se conservan exactamente estas reglas:

```json
{
  "glob@>=9.0.0 <15.0.0": "14.0.6",
  "minimatch@>=7.0.0 <12.0.0": "11.0.8",
  "test-exclude@>=7.0.0 <9.0.0": "8.0.0",
  "jest-config": { "deepmerge": "$deepmerge" }
}
```

## Resultados

Todos los resultados finales siguientes terminaron con código 0:

| Comprobación | Resultado |
| --- | --- |
| npm ci --include=dev, Node 22.23.2/npm 10.9.9 | Instalación limpia en Windows: 1.325 paquetes; 0 vulnerabilidades |
| npm ci --include=dev, Node 24.22.2/npm 11.19.1 | Instalación limpia aislada en Windows: 1.325 paquetes; 0 vulnerabilidades; manifiestos idénticos a los finales |
| npx expo install --check | Dependencies are up to date; consulta online |
| npx expo-doctor --verbose | 20/20; versión 1.21.8; consulta online |
| npm audit | 0 vulnerabilidades en todos los niveles |
| npm ls minimatch glob test-exclude --all | Árbol válido, sin errores |
| Inventario recursivo de minimatch, lockfile y disco | 10 copias 11.0.8; 1 copia 3.1.5; 0 en >=7.0.0 y <11.0.1 |
| npm run lint | ESLint aprobado |
| npx tsc --noEmit | TypeScript aprobado |
| npm run test:unit -- --ci --runInBand --watchman=false | 76 suites, 794 pruebas aprobadas |
| npm run test:integration -- --ci --runInBand --watchman=false | 22 suites, 225 pruebas aprobadas |
| npm run test:acceptance -- --ci --runInBand --watchman=false | 7 suites, 29 pruebas aprobadas |
| npm test -- --ci --runInBand --watchman=false | Regresión completa: 98 suites, 1.019 pruebas aprobadas |
| Prueba dependency-security con Node 24/npm 11 | 1 suite, 48 pruebas aprobadas |
| node scripts/verify-android-release.cjs --profile preview | Prebuild y controles aprobados |
| node scripts/verify-android-release.cjs --profile production | Prebuild y controles aprobados |
| node scripts/verify-android-release.cjs --profile arco-release | Prebuild y controles aprobados |
| Exportación Expo Android | Metro/Router y bundle Hermes de 4,7 MB generados correctamente |
| node scripts/eas-production.cjs validate | Configuración AAB válida; sin ejecutar EAS |
| node scripts/eas-production.cjs backend | Contrato público HTTPS/ARCO aprobado, solo lecturas |
| node scripts/verify-alpha-pinning.cjs --check | TLS autorizado, hostname y SPKI esperados |
| node scripts/verify-alpha-pinning.cjs --negative-control | Control negativo aprobado |
| git diff --check y revisión de archivos protegidos | Sin errores ni cambios accidentales |

La regresión completa incluye las suites unitarias y de integración; sus cifras
no representan pruebas adicionales independientes. La aceptación usa su propia
configuración. Los comandos de npm/npx se ejecutaron con los runtimes portátiles
indicados; para Expo CLI y TypeScript se invocaron también sus entrypoints
locales directamente con ese Node.

La primera consulta del script de backend terminó con su mensaje genérico de
error. Una consulta diagnóstica posterior y la repetición del comando estándar
pasaron. La repetición obtuvo /health 200, /api/privacy/notice 200,
/api/privacy/capabilities 200 y /api/user/account-cancellation-requests 401,
conforme a lo esperado para acceso sin credenciales. No se atribuye una causa
concreta al primer fallo ni se realizaron escrituras en el backend.

Los logs, JSON de Jest, inventario y resumen quedan localmente en
`coverage/expo-sdk58-patches/` (ignorado por Git). Las instalaciones aisladas,
prebuilds y exportación están en `.expo/` (ignorado por Git).

## Android, CAMERA y seguridad

Los tres prebuilds aislados verificaron R8, minifyEnabled y shrinkResources
activados, targetSdk configurado en 36, bloqueo de cleartext, autoridades del
sistema y CertificatePinner generado. CAMERA e INTERNET están declarados en
las fuentes del prebuild; además se comprobó CAMERA en el manifiesto real de
expo-camera 58.0.14 y que no se bloquea en el manifiesto del prebuild.

Esto valida la configuración y las fuentes para la fusión. No se ejecutó
Gradle, no se suministró un manifiesto final fusionado ni se inspeccionó un
binario: `mergedBinaryPermissionsVerified`, `binaryTargetSdkVerified` y
`nativeRuntimePinningVerified` siguen siendo false. La exportación de JavaScript
tampoco acredita esas propiedades del AAB final.

Se comprobaron hashes de los archivos protegidos y se revisó el diff contra
origin/develop: CAMERA, R8, perfiles EAS, ARCO, pagos, entrenadores, rutinas y
el código de la aplicación no cambian.

## GitHub Actions y EAS

El preflight existente `.github/workflows/dependency-install.yml` sigue intacto.
Usa Ubuntu y una matriz Node 22.23.2/npm 10.9.9 (toolchain EAS observado) y
Node 24.22.2/npm 11.19.1 (CI), instala con npm ci --include=dev, comprueba que los
manifiestos no cambian, inspecciona el árbol y ejecuta las pruebas de seguridad.
Los workflows de EAS preview y producción dependen de este gate.

Se probaron ambas combinaciones de Node/npm directamente en Windows. No se
ejecutó el job remoto Ubuntu ni se reprodujo exactamente el sistema operativo
de EAS. El preflight Ubuntu deberá pasar al publicar los cambios autorizados;
su configuración no requiere ajustes para estos parches. No se ejecutó Docker.

## Captura TLS y preparación del AAB

La captura guardada permanece idéntica: `2026-11-16T22:42:01.409Z`. La consulta
TLS en vivo y el control negativo pasaron con el mismo SPKI esperado. No requiere
renovación en el momento de esta validación. Su ventana de frescura de 24 horas
vence el **17 de noviembre de 2026 a las 16:42:01, America/Mexico_City**
(`2026-11-17T22:42:01.409Z`). Si la solicitud del build ocurre después, debe
renovarse y verificarse antes de solicitarlo. La ventana corresponde a la
evidencia del build, no a una caducidad automática del pin instalado.

La corrección queda lista localmente para revisión y, con autorización, commit,
publicación y ejecución del workflow de producción. No se hicieron commit,
push, merge, APK, AAB ni solicitudes EAS. La compilación nativa, firma y
verificación del artefacto final siguen pendientes de esa ejecución autorizada.
