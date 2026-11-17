# Consistencia de instalación npm entre EAS y GitHub Actions

Corrección local del 16 de noviembre de 2026 en `fix/eas-lockfile-consistency`,
creada desde `origin/develop`, commit
`9595869dc5a1fba8c2b3b475eaa66fe23905ec11`. No se modificó develop ni las ramas
anteriores. No se ejecutaron commit, push, merge ni nuevos builds nativos.

## Causa identificada

El [build EAS fallido](https://expo.dev/accounts/rogelios-team/projects/pry-app-tsg/builds/56e6bcfe-5120-4344-b890-e03652dced3d)
corresponde a ese commit y al perfil preview. Sus logs confirman:

| Entorno observado | Sistema | Node | npm | Instalación original |
| --- | --- | --- | --- | --- |
| EAS SDK 58 | Ubuntu 26.04, imagen ubuntu-26.04-jdk-17-ndk-r27b-sdk-58 | 22.23.2 | 10.9.9 | `npm ci --include=dev`: EUSAGE |
| [Actions aprobado de PR #95](https://github.com/TitaniumSportGym/pry-app-tsg/actions/runs/43988960035/job/133724311579) | Ubuntu 26.04.1 | 24.22.2 | 11.19.1 | `npm ci`: salida 0 |

El fallo es una diferencia de resolución de overrides en Arborist, no una
necesidad de añadir glob 13 al proyecto. La implementación de
[npm 10.9.9](https://github.com/npm/cli/blob/v10.9.9/workspaces/arborist/lib/override-set.js)
elige la regla comparando `edge.spec`, que puede contener ya la versión
sustituida. [npm 11.19.1](https://github.com/npm/cli/blob/v11.19.1/workspaces/arborist/lib/override-set.js)
usa primero `edge.rawSpec`, la especificación original.

Los selectores anteriores excluían sus propios reemplazos: glob 14.0.6 quedaba
fuera de `<14.0.2`; minimatch 11.0.8 fuera de `<11.0.1`; test-exclude 8.0.0 fuera
de `^7.0.0`. Al reevaluar dependencias ya sustituidas, npm 10 podía perder la
regla. Jest-config y jest-runtime declaran glob `^13.0.6`, y el árbol ideal de npm
10 volvía a solicitar glob 13.0.7, path-scurry 2.0.2 y lru-cache 11.5.3 en dos
ramas. Esas copias no estaban en el lockfile seguro generado con npm 11, por lo
que la comprobación estricta de npm ci fallaba.

Se reprodujeron los seis mensajes originales con el manifiesto y lockfile de
9595869 en una copia limpia y con Node 22.23.2/npm 10.9.9, antes de editar los
archivos fuente. Se compararon además los resolvedores reales de npm 10 y 11:
con las reglas anteriores npm 10 no encontraba la regla para las versiones ya
sustituidas; con las reglas corregidas ambos encuentran el mismo reemplazo.
La evidencia está en `coverage/eas-lockfile/resolver-proof.json`.

## Diff de la corrección

Los overrides quedan planos, acotados a las ramas modernas revisadas y aplicables
tanto a las versiones solicitadas como a las de reemplazo:

```diff
- "glob@>=9.0.0 <14.0.2": "14.0.6",
- "minimatch@>=7.0.0 <11.0.1": "11.0.8",
- "test-exclude@^7.0.0": {
-   ".": "8.0.0",
-   "glob": "14.0.6",
-   "minimatch": "11.0.8"
- },
+ "glob@>=9.0.0 <15.0.0": "14.0.6",
+ "minimatch@>=7.0.0 <12.0.0": "11.0.8",
+ "test-exclude@>=7.0.0 <9.0.0": "8.0.0",
```

El override de deepmerge local de Jest permanece intacto. Las ramas antiguas
glob 7, minimatch 3 y test-exclude 6 quedan fuera de los selectores y conservan
sus APIs. No se añadieron las copias glob 13 reclamadas por el resolvedor anterior.

`package-lock.json` se regeneró con **npm 10.9.9**:

```sh
npm install --package-lock-only --ignore-scripts --no-audit --no-fund --prefer-offline
```

El diff del lockfile contiene únicamente 40 marcas `dev: true` normalizadas por
npm. No hay paquetes añadidos o eliminados, ni cambios de versiones, URLs,
integridades o rangos directos. Esas marcas son metadatos generados; la solución
del error es mantener la resolución de overrides consistente. No se editó el
lockfile manualmente. Los flags de ese comando se usaron solo para regenerarlo;
las instalaciones finales usaron `npm ci --include=dev` sin omitir scripts ni
desactivar ninguna validación.

Los ocho archivos del cambio son:

- `package.json` y `package-lock.json`.
- `tests/security/dependency-security.test.ts`.
- `.github/workflows/dependency-install.yml` (nuevo).
- `.github/workflows/ci.yml`.
- `.github/workflows/eas-preview.yml`.
- `.github/workflows/eas-production.yml`.
- Este informe.

## Instalaciones limpias reproducidas

Se descargaron runtimes portátiles oficiales de Node con SHA-256 verificado.
El ZIP de Node 22 incluye npm 10.9.8; para igualar EAS se descargó adicionalmente
npm 10.9.9 del registro oficial y se verificó su integridad SHA-512. Node/npm
globales del equipo no se sustituyeron.

| Prueba local | Sistema | Node / npm | Comando | Resultado |
| --- | --- | --- | --- | --- |
| Base original, copia sin node_modules | Windows | 22.23.2 / 10.9.9 | `npm ci --include=dev` | Salida 1; mismos dos glob, dos path-scurry y dos lru-cache faltantes |
| Candidato corregido, copia sin node_modules | Windows | 22.23.2 / 10.9.9 | `npm ci --include=dev` | Salida 0; 1326 paquetes; 0 vulnerabilidades |
| Repositorio corregido, reinstalación completa | Windows | 22.23.2 / 10.9.9 | `npm ci --include=dev` | Salida 0; 1326 paquetes; 0 vulnerabilidades |
| Resultado final, otra copia limpia | Windows | 24.22.2 / 11.19.1 | `npm ci --include=dev` | Salida 0; 1326 paquetes; 0 vulnerabilidades |

Las versiones de Node/npm y el comando coinciden con los entornos observados.
**La reproducción local se realiza directamente en Windows y no reproduce el
sistema Ubuntu completo de EAS.** No requiere Docker, WSL ni imágenes de
contenedores. Por indicación del usuario, la continuación de esta corrección
se limita a Node.js/npm en Windows. El preflight propuesto utiliza un runner
Ubuntu de GitHub Actions sin contenedores; su ejecución remota queda pendiente
de autorizar la publicación de estos cambios. No se solicitó otro build EAS.

## Seguridad y pruebas

Las suites completas se ejecutaron sobre la instalación de npm 10.9.9 y con
Node 22.23.2. Todos los comandos finales siguientes terminaron con salida 0:

| Comprobación | Resultado |
| --- | --- |
| `npm audit --json`, npm 10.9.9 | 0 vulnerabilidades en todas las severidades |
| `npm ls minimatch glob test-exclude --all`, npm 10.9.9 | Resoluciones válidas, sin invalid/extraneous |
| Inventario recursivo y contraste con lockfile | 10 copias minimatch 11.0.8, 1 copia 3.1.5; 0 en `>=7.0.0 <11.0.1` |
| `npm run lint` | Aprobado, offline y sin telemetría, fuera del sandbox por su limitación con el proceso del resolvedor nativo |
| ESLint directo de la prueba modificada, sin caché y con max-warnings=0 | Aprobado, sin advertencias |
| TypeScript `--noEmit` | Aprobado |
| Unitarias | 76 suites, 794/794 pruebas |
| Integración | 22 suites, 225/225 pruebas |
| Aceptación | 7 suites, 29/29 pruebas |
| Regresión completa | 98 suites, 1019/1019 pruebas |
| Seguridad de dependencias también con Node 24.22.2 | 1 suite, 48/48 pruebas |
| Android preview, con Node 22.23.2 | Prebuild aislado aprobado, snapshot `.expo/android-release-rOqOGw` |
| Certificate Pinning `--check` y `--negative-control` | TLS público autorizado, hostname/cadena válidos, mismo SPKI; pin distinto rechazado en Node |
| `git diff --check` y hashes de archivos protegidos | Aprobados |

La ampliación agrega siete regresiones: tres verifican que los selectores
continúen aplicándose a sus reemplazos y excluyan las APIs antiguas; cuatro
comprueban la instalación estricta en la matriz y sus gates en CI/preview/production.
Se conservan las pruebas de inventario completo del lockfile y los contratos
de filtrado/globs de las dependencias.

En la primera fase, Jest emitió una advertencia temporal por el package.json del
prebuild aislado ejecutado concurrentemente; ese script lo retiró al terminar.
La revalidación final en Windows, descrita abajo, ejecutó la regresión sin un
prebuild concurrente y terminó aprobada sin esa advertencia. No se modificaron
reglas de descubrimiento ni se omitieron suites para obtener el resultado.

Las pruebas de UI/integración/aceptación utilizan los fixtures del repositorio.
El prebuild conserva CAMERA/INTERNET, los siete bloqueos, pinning XML/Kotlin,
R8/shrinkResources y target SDK 36. No ejecuta Gradle/EAS ni prueba el APK final;
`mergedBinaryPermissionsVerified` y `nativeRuntimePinningVerified` siguen en false.
La captura de pinning se conserva byte por byte; no se renovó ni se cambió el pin.

## Revalidación final directamente en Windows

Después de la aclaración del usuario se repitieron las comprobaciones con el
runtime portátil ya disponible de Node 22.23.2 y npm 10.9.9. En esta continuación
no se ejecutó Docker, WSL ni se descargaron imágenes de contenedores.

- La regeneración con npm fue idempotente: package.json y package-lock.json
  conservaron sus hashes de la corrección preparada.
- `npm ci --include=dev` reinstaló el proyecto, con scripts habilitados y validación
  estricta: salida 0, 1326 paquetes añadidos y 0 vulnerabilidades.
- `npm audit --json` y `npm ls minimatch glob test-exclude --all`: salida 0.
  El inventario recursivo coincide con el lockfile: diez minimatch 11.0.8 y un
  minimatch 3.1.5, ninguno en el rango vulnerable.
- ESLint general, ESLint directo de la prueba modificada y TypeScript: salida 0.
- `npm test`: 98 suites y 1019 pruebas aprobadas, incluyendo unitarias e integración.
- `npm run test:acceptance`: 7 suites y 29 pruebas aprobadas.
- Los hashes de los archivos protegidos y el diff de src/configuración nativa
  permanecen intactos. No se aplicó ningún parche de Expo.

Los reportes nuevos están en `coverage/eas-lockfile/windows-validation/`.
El preflight Ubuntu se verificó estructuralmente como runner sin container ni
services; no se ejecutó remotamente. Se igualaron las versiones de Node/npm y el
comando de instalación de EAS, no su sistema operativo Ubuntu completo.

## Prevención antes de solicitar EAS

El workflow reutilizable `dependency-install.yml` ejecuta en `ubuntu-latest` una
matriz con los dos toolchains observados. Selecciona la versión exacta de npm
en el runner, registra versiones y ejecuta:

```sh
npm ci --include=dev
git diff --exit-code -- package.json package-lock.json
npm ls minimatch glob test-exclude --all
npm test -- --ci --runInBand --watchman=false --runTestsByPath tests/security/dependency-security.test.ts
```

La instalación global de npm en el runner solo selecciona la herramienta; la
instalación de la aplicación sigue siendo npm ci. No se restauran node_modules
ni se utiliza npm install como sustituto del paso de EAS.

CI llama al workflow. En preview y production, `calidad` depende del preflight
y el build sigue dependiendo de `calidad`; ambos miembros de la matriz deben
pasar antes de solicitar la compilación remota. Los perfiles, comandos de build,
credenciales, validaciones de API/pinning y controles anteriores permanecen.
Las versiones fijadas reflejan estos logs; deberán revisarse si cambia la imagen
de EAS. La sintaxis y las dependencias de los jobs se validaron localmente en las
pruebas, pero el workflow remoto nuevo no se ejecutó porque no hubo commit/push.

## Alcance y evidencia

Todos los paquetes conservan las versiones del lockfile de 9595869. Expo sigue
en 58.0.23 y React Native en 0.88.1. Los 13 parches pendientes no se aplicaron.
`eas.json`, `app.json`, `app.config.js`, `src/`, `plugins/`, `config/` y los
validadores Android/pinning no tienen cambios respecto a la base.

Los logs, inventarios, comparación de resolvedores, diff de metadatos y reportes
JSON están en `coverage/eas-lockfile/`, ignorado por Git. Los runtimes y las copias
aisladas están en `.expo/`, también ignorado; no se incluyen en el diff propuesto.

No se generó APK/AAB, no se reintentó el build fallido y no se hicieron commit,
push o merge. La instalación corregida está validada localmente con ambos
Node/npm exactos; la comprobación Linux del preflight y un build nativo posterior
no se declaran ejecutados.
