# Dependabot #26: corrección de minimatch

Informe del 16 de noviembre de 2026. Rama `fix/dependabot-26-minimatch`, creada
desde `fix/android-release-camera-validation` en
`6e38fef36b9d9ecf5cbdb937f192fb1b003a7a8d`, que ya contiene la corrección de CAMERA.
Las referencias de esa rama y de `develop` (`e35ad56`) permanecen intactas.
No se hicieron commits, push ni merge.

## Causa comprobada

La alerta [GHSA-g3hv-75wg-m249 / CVE-2026-118764](https://github.com/advisories/GHSA-g3hv-75wg-m249)
afecta a minimatch `>=7.0.0 <11.0.1` por amplificación de patrones durante el
procesamiento de globs y consumo excesivo de CPU/memoria.

El override `minimatch@>=7.0.0 <11.0.1: 11.0.8` expresa el rango correcto, pero
el lockfile de develop contenía resoluciones transitivas incompatibles con esa
política. Comprobar solamente package.json o la instalación raíz no las detectaba.

La comparación de los archivos históricos precisa dónde se produjo la regresión:

| Revisión del lockfile | 11.0.8 | 10.2.6 vulnerable | 9.0.9 vulnerable | 3.1.5 fuera de esta alerta |
| --- | ---: | ---: | ---: | ---: |
| PR #92, commit `088241d` | 10 | 0 | 0 | 1 |
| Commit posterior `1e48782`, incorporación de expo-image-picker | 10 | 5 | 2 | 1 |
| Base de esta corrección, `6e38fef` | 10 | 5 | 2 | 1 |
| Resultado final | 10 | 0 | 0 | 1 |

Por tanto, PR #92 dejó ese rango corregido y el cambio posterior reintrodujo las
siete entradas bajo test-exclude/Jest. Git no permite determinar el comando npm
exacto utilizado entonces; no se atribuye la regresión a un comando no observado.

El node_modules inicial también difería del lockfile: las siete rutas vulnerables
no existían físicamente y sus consumidores resolvían copias seguras por herencia.
Por eso `npm ls minimatch --all` inicial terminaba con salida 0 mientras
`npm audit` encontraba las siete entradas del lockfile y 20 entradas de riesgo
moderado, incluidas las cadenas transitivas de glob/Jest. Una comprobación del
árbol instalado por sí sola no probaba que el lockfile estuviera corregido.

## Modificaciones exactas y compatibilidad

Se modifican cuatro archivos:

1. `package.json`: conserva los overrides existentes de glob, minimatch y el
   deepmerge local de Jest; añade únicamente este override acotado:

   ```json
   "test-exclude@^7.0.0": {
     ".": "8.0.0",
     "glob": "14.0.6",
     "minimatch": "11.0.8"
   }
   ```

2. `package-lock.json`: regenerado por npm, sin editar sus entradas manualmente.
   Las siete copias de test-exclude 7.0.2 pasan a 8.0.0 bajo `@jest/core`,
   `@jest/reporters`, `jest-config`, `jest-expo`, `jest-runner`, `jest-runtime`
   y `jest-snapshot`. Se eliminan 48 nodos obsoletos, incluidas las siete copias
   vulnerables de minimatch y las ramas antiguas de glob 10/13. npm normaliza
   además el indicador `dev` de 40 entradas conservadas. No hay paquetes nuevos
   ni otros cambios de versión entre las entradas que permanecen; sus URLs e
   integridades tampoco cambian.
3. `tests/security/dependency-security.test.ts`: amplía las regresiones de
   seguridad y los contratos de compatibilidad descritos más abajo.
4. Este informe.

test-exclude 8 conserva la clase y las operaciones de filtrado y búsqueda de la
rama 7. Su [cambio mayor documentado](https://github.com/istanbuljs/test-exclude/blob/master/CHANGELOG.md)
eleva el requisito de Node a `20 || >=22` por las dependencias. Se verificó con
Node **24.21.0**, npm **11.19.0** y los workflows existentes que usan Node 24.

Se revisaron las llamadas reales de test-exclude: usa la función nombrada
`minimatch()` con opciones de filtrado y `glob()`/`glob.sync()`. Las pruebas
ejercitan esas operaciones en cada copia instalada. glob 14.0.6 declara
minimatch `^11.0.5`, de modo que la pareja glob 14/minimatch 11 coincide con su
contrato declarado. No se dejan glob 10/13 consumiendo minimatch 11.

La rama antigua `test-exclude@6.0.0` permanece con `glob@7.2.3` y
`minimatch@3.1.5`, cuya exportación callable necesita esa cadena de Babel/Jest.
No se sustituye globalmente minimatch por la versión 11 en los consumidores antiguos.

El lockfile final se produjo desde la base conservada con:

```sh
npm install --package-lock-only --ignore-scripts --no-audit --no-fund --prefer-offline
npm ci --no-fund
```

Los intentos provisionales de recalcular/deduplicar se descartaron antes de
generar este resultado: no forman parte del diff final. Se verificaron todas
las versiones directas y las restantes versiones transitivas frente al lockfile
de la base.

## Inventario final real

El recorrido recursivo de node_modules coincidió exactamente con las once
instalaciones de minimatch registradas en el lockfile:

| Paquete | Versión | Instalaciones físicas / entradas del lockfile |
| --- | --- | ---: |
| minimatch | 11.0.8 | 10 |
| minimatch | 3.1.5 | 1 |
| minimatch dentro de `>=7.0.0 <11.0.1` | Ninguna | 0 |
| test-exclude | 8.0.0 | 7 |
| test-exclude | 6.0.0 | 1 |
| glob | 14.0.6 | 1 |
| glob | 7.2.3 | 1 |

Las diez rutas seguras son minimatch bajo `@expo/fingerprint`, `@jest/core`,
`@jest/reporters`, `@typescript-eslint/typescript-estree`, `glob`, `jest-config`,
`jest-expo`, `jest-runner`, `jest-runtime` y `jest-snapshot`. La instalación raíz
de minimatch sigue siendo 3.1.5. Las ubicaciones completas y versiones constan en
`coverage/dependabot-26/minimatch-inventory.json`.

Las versiones de herramientas se conservan: Expo **58.0.23**, React Native
**0.88.1**, Expo Router **58.0.30**, Jest **30.5.2**, jest-expo **58.0.14**,
TypeScript **6.0.3** y ESLint **9.39.5**.

## Pruebas y verificaciones ejecutadas

Todos los comandos siguientes finalizaron con salida 0, salvo la comprobación
online de parches de Expo, cuyo resultado esperado se detalla después.

| Comando / comprobación | Resultado |
| --- | --- |
| `npm ci --no-fund` | Instalación limpia, 1326 paquetes añadidos; auditoría de instalación: 0 vulnerabilidades |
| `npm ls minimatch --all` | Árbol completo correcto, sin dependencias invalid/extraneous |
| `npm ls glob test-exclude --all` | Resolución de ambos contratos coherente, sin dependencias invalid/extraneous |
| `npm audit --json` | 0 vulnerabilidades en todas las severidades; incluye desarrollo |
| Recorrido recursivo de node_modules y contraste con lockfile | 11 copias, ninguna vulnerable, todas coinciden con el lockfile |
| `npm run lint`, offline y sin telemetría | Aprobado; ejecutado fuera del sandbox por la limitación de finalización de ESLint observada en esta máquina |
| ESLint directo de `tests/security/dependency-security.test.ts`, sin caché y con max-warnings=0 | Aprobado, sin advertencias |
| `node node_modules/typescript/bin/tsc --noEmit` | Aprobado |
| Seguridad de dependencias | 1 suite, 41/41 pruebas |
| `npm run test:unit -- --ci --runInBand --watchman=false` | 76 suites, 787/787 pruebas |
| `npm run test:integration -- --ci --runInBand --watchman=false` | 22 suites, 225/225 pruebas |
| `npm run test:acceptance -- --ci --runInBand --watchman=false` | 7 suites, 29/29 pruebas |
| `npm test -- --ci --runInBand --watchman=false` | Regresión completa: 98 suites, 1012/1012 pruebas |
| `expo export --platform android --output-dir .expo/dependabot-26-export --max-workers 2` usando CLI local | Metro y Expo Router: 1940 módulos, 42 assets y bundle Hermes Android de 4.7 MB exportados correctamente |
| `node scripts/verify-android-release.cjs`, production, preview y arco-release | Tres prebuilds aislados aprobados; CAMERA/INTERNET, siete bloqueos, Certificate Pinning XML/Kotlin, R8/shrink y target 36 conservados |
| `git diff --check` | Aprobado |

Los comandos Jest también usaron `--json --outputFile=coverage/dependabot-26/<nombre>.json`.
Los reportes se guardan en `dependency-security.json`, `unit.json`,
`integration.json`, `acceptance.json` y `regression.json`. Las 41 pruebas de
seguridad están incluidas en unitarias; las 1012 de regresión ya incluyen las
787 unitarias y las 225 de integración. No se suman como pruebas diferentes.
Las pruebas de UI/integración/aceptación usan los fixtures y simulaciones del
repositorio; no equivalen a ensayos en dispositivo o servicios productivos.

La nueva regresión de minimatch se ejecutó primero contra el lockfile original:
falló e identificó exactamente las siete entradas vulnerables. Después pasó
con la instalación limpia. Escanea todas las rutas de paquetes del lockfile,
incluidas las anidadas; valida versiones SemVer y compara cada instalación
con su entrada bloqueada. Rechaza 7.0.0, 8.0.0, 9.0.9, 10.2.6 y 11.0.0;
acepta las versiones fuera del rango de esta alerta, incluida 3.1.5 y la frontera
corregida 11.0.1. Las pruebas de cada test-exclude verifican inclusión, exclusión,
negaciones, rutas Router con corchetes/paréntesis, archivos fuera del proyecto,
node_modules y búsquedas sync/async.

npm ci emitió avisos de obsolescencia de paquetes existentes y avisó de dos scripts
no cubiertos por allowScripts (`@parcel/watcher` y `unrs-resolver`). No se cambió
esa política. El proceso terminó con salida 0; las verificaciones reales de
ESLint y Metro descritas arriba funcionaron con la instalación resultante.

## Los 13 parches de Expo permanecen pendientes

La comprobación **online** `expo install --check`, con CI habilitado para no
instalar nada, terminó con salida **1** y los mismos trece paquetes pendientes.
No se ejecutó `expo install --fix`. La comprobación offline no permite certificar
ese inventario remoto y no se usa como prueba de compatibilidad actualizada.

| Paquete | Instalado, sin cambios | Esperado por la comprobación online |
| --- | --- | --- |
| expo | 58.0.23 | ~58.0.25 |
| expo-constants | 58.0.15 | ~58.0.16 |
| expo-crypto | 58.0.7 | ~58.0.8 |
| expo-dev-client | 58.0.18 | ~58.0.20 |
| expo-font | 58.0.11 | ~58.0.12 |
| expo-linking | 58.0.16 | ~58.0.17 |
| expo-router | 58.0.30 | ~58.0.31 |
| expo-secure-store | 58.0.2 | ~58.0.3 |
| expo-splash-screen | 58.0.13 | ~58.0.14 |
| expo-status-bar | 58.0.4 | ~58.0.5 |
| expo-symbols | 58.0.4 | ~58.0.5 |
| expo-video | 58.0.13 | ~58.0.14 |
| expo-web-browser | 58.0.7 | ~58.0.8 |

Las comparaciones con la base prueban que ninguna dependencia directa cambió
de versión ni de rango. Esta corrección no declara aprobada la comprobación
de parches pendientes.

## Evidencia y alcance

`coverage/dependabot-26/summary.json` reúne resultados, auditoría e inventario.
`lock-diff.json` contiene las siete actualizaciones, los 48 nodos eliminados y
las 40 normalizaciones de metadatos. Las capturas históricas y la auditoría
inicial también están en ese directorio, ignorado por Git.

Los prebuilds guardados corresponden a:

- production: `.expo/android-release-NE6316`.
- preview: `.expo/android-release-p8Dkb7`.
- arco-release: `.expo/android-release-h8ZEin`.

Sus verification.json conservan `mergedBinaryPermissionsVerified: false`,
`nativeRuntimePinningVerified: false`, `gradleBuildExecuted: false` y
`easBuildExecuted: false`. La exportación de Metro genera bundle y assets,
no un APK/AAB. Compilación nativa, firma, empaquetado final y ejecución en
dispositivo no se presentan como comprobados.

`app.json`, `app.config.js`, `eas.json`, `plugins/`, `config/`, `scripts/` y
`src/` no tienen diferencias frente a la rama CAMERA conservada. No se alteró
Certificate Pinning, R8, perfiles EAS, permisos CAMERA ni funcionalidad de la app.

La remediación queda preparada localmente para revisión. No se solicitó cerrar
la alerta en GitHub ni se cambió su estado remoto; Dependabot deberá reevaluar
el lockfile cuando se integre con autorización.

## Fuentes consultadas

- [Aviso oficial de minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249).
- [Overrides de npm](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides).
- [Cambios de test-exclude](https://github.com/istanbuljs/test-exclude/blob/master/CHANGELOG.md).
- [Cambios de minimatch 11](https://github.com/isaacs/minimatch/blob/v11.0.8/changelog.md).
- Metadatos públicos de npm de test-exclude 7.0.2/8.0.0, glob 14.0.6 y minimatch 11.0.8.
- [Referencia de Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/) y [Expo CLI](https://docs.expo.dev/more/expo-cli/).
