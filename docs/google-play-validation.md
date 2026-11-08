# Validación y archivos: preparación Google Play

Resultados finales locales del **8 de noviembre de 2026**. Rama `feature/google-play-release-ready` desde `origin/develop` (`6babca4cd0981c064465bd54b531f076e9082bc0`). Sin commits o push.

## Resultados exactos

| Comando / verificación | Resultado |
| --- | --- |
| `npm.cmd run test:unit -- --ci --runInBand --json --outputFile=coverage/google-play/unit.json` | **563/563**, 58 suites, 0 fallos, 0 pendientes. |
| `npm.cmd run test:integration -- --ci --runInBand --json --outputFile=coverage/google-play/integration.json` | **172/172**, 17 suites, 0 fallos, 0 pendientes. |
| `npm.cmd run test:acceptance -- --ci --runInBand --json --outputFile=coverage/google-play/acceptance.json` | **29/29**, 7 suites, 0 fallos, 0 pendientes. |
| Regresión completa con cobertura de `src/**/*.{ts,tsx}` y LCOV | **735/735**, 75 suites, 0 fallos. Líneas **81.87%**, ramas **81.89%**, sentencias **80.80%**, funciones **80.97%**. |
| `npm.cmd run lint` | Exit 0, sin errores. |
| `node node_modules/eslint/bin/eslint.js src tests scripts plugins --no-cache` | Exit 0; **0 errores y 9 advertencias** de imports require en archivos de pruebas existentes. No se relajaron reglas ni umbrales. |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0, sin errores. |
| `expo install --check` | Dependencias actualizadas y compatibles. |
| `npx.cmd --yes expo-doctor` | **20/20 comprobaciones aprobadas**. |
| `node scripts/verify-android-release.cjs` | Prebuild aislado aprobado: target 36, R8/shrink, HTTPS, CAs del sistema y permisos main CAMERA/INTERNET. Sin Gradle ni EAS. |
| `node scripts/eas-production.cjs validate` | Aprobado: proyecto/paquete, AAB, API HTTPS, ARCO, versión remota e incremento. |
| `node scripts/eas-preview.cjs validate` | Aprobado para preview APK. Workflow preview y CI sin diff. |
| `git diff --check` | Aprobado. Git avisa conversión de LF a CRLF en algunos archivos; no errores de whitespace. |
| `node scripts/eas-production.cjs backend` | **Preflight bloqueado:** health 200, aviso 200, capabilities 404. No se ejecutó compilación. |
| npm audit | **31 avisos: 30 moderados, 1 bajo, 0 altos, 0 críticos**; revisión pendiente descrita abajo. |

Las tres suites suman **764 pruebas distintas**, en 82 suites. Los reportes JSON se guardaron en `coverage/google-play/`, ignorado por Git, y se comprobaron `success=true`, `numFailedTests=0`, `numPendingTests=0`. Crear el directorio antes de repetir comandos con outputFile.

Regresión reúne las mismas 563 unitarias y 172 de integración, por lo que no se suma otra vez al total. Evidencia adicional en `coverage/google-play/regression.json`, `regression/coverage-summary.json` y `regression/lcov.info`. Se mantuvieron umbrales y exclusiones; este resultado local no certifica el Quality Gate remoto de SonarQube.

El código Google de integración usa contratos y HTTP simulados: confirma factor nuevo y enlace web sin secretos en la URL. No llama a Google, Brevo, Render o Neon. Las pruebas también mantienen los recorridos existentes de registro, login, OTP/TOTP, consentimiento, preferencias, membresías, catálogo, pedidos, rutinas y QR según sus fixtures. No equivalen a pruebas físicas o a verificar datos de producción.

Último Prebuild: `.expo/android-release-BXxZRo/verification.json` y `prebuild.log`, ignorados por Git. Expo **58.0.23**, React Native **0.88.1**, expo-build-properties **58.0.12**. Los permisos del manifiesto fusionado, firma, ABI y páginas de memoria aún requieren el binario real.

## Auditoría final antes de commits

Se revisaron los 23 archivos nuevos/modificados y el diff completo. Se contrastaron las 83 entradas modificadas del lockfile con las versiones declaradas: URLs HTTPS del registro npm, sin credenciales ni cambios de integridad para una misma versión. No se añadieron dependencias durante la auditoría.

Se corrigió un falso positivo del preflight: ahora exige `databaseReady=true` en `/api/privacy/capabilities`. El backend comprueba mediante lectura de metadatos las columnas nuevas, el índice único de folios abiertos y el trigger de auditoría habilitado; responde 503 si falta alguno. El workflow revalida el backend después de calidad e inmediatamente antes de solicitar el AAB. La prueba del contrato cubre también `databaseReady=false`. No se ejecutó el workflow ni se solicitó una compilación remota.

Se repitieron las suites: **563/563 unitarias**, **172/172 de integración** y **29/29 de aceptación**, sin fallos ni pendientes. Los reportes nuevos están en `coverage/google-play/audit-{unit,integration,acceptance}.json`, ignorados. `npm.cmd run lint` terminó con exit 0; ESLint completo: 0 errores y las 9 advertencias previas de imports require; TypeScript sin errores. La cobertura, Doctor, Prebuild, npm audit y diagnóstico remoto de la tabla anterior son evidencia de la implementación previa; no se presentan como nuevas ejecuciones de esta auditoría.

Se confirmó `production=app-bundle`, origen Render correcto y ARCO activo. El workflow sigue siendo manual, sin submit a Play, sin impresión de secretos ni subida de logs crudos. CI y preview existentes permanecen sin diff. Los archivos modificados/nuevos no incluyen `.env`, credenciales, tokens reales, claves de firma o artefactos. `git diff --check` aprobado; índice Git vacío y misma rama/HEAD, sin commits, push, merge, despliegues o migraciones.

El código puede pasar a un commit y PR independiente hacia develop. La publicación sigue bloqueada por aprobación de conservación/alcance/procedimiento, despliegue compatible, validación del esquema completo y pruebas del binario real. El contrato nuevo de metadatos aún necesita una comprobación PostgreSQL en el entorno aislado autorizado. Las pruebas usan fixtures y no acreditan entrega real de códigos Google, backend desplegado o Android físico.

## Compatibilidad corregida

Doctor encontró inicialmente 14 desajustes. Se ejecutó `expo install --fix`, conservando SDK 58 y actualizando package.json/lockfile. Se alinearon las dependencias recomendadas de Expo/Router/Jest Expo, React Native 0.88.1 y Safe Area 5.11.1, entre otras. El instalador registró los config plugins de expo-image y expo-web-browser; se verificó de nuevo el manifiesto generado. No cambió el icono ni se generó un proyecto Android en la raíz.

La instalación informó que los scripts opcionales de @parcel/watcher y unrs-resolver no estaban aprobados en la política npm del entorno. No se modificaron políticas globales; las validaciones anteriores se completaron igualmente.

## Dependencias y seguridad pendientes

El audit identifica propagación de avisos a Expo CLI/fingerprint y al toolchain Jest/ESLint. Los advisories directos observados incluyen [glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249) y [deepmerge](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).

No se ejecutó `npm audit fix --force`: sus propuestas incluyen retroceder Expo a 52 y Jest a 29, incompatibles con conservar la configuración SDK 58 solicitada. Hace falta evaluar alcanzabilidad y una remediación compatible; no se afirma que los 31 avisos sean 31 vulnerabilidades distintas explotables en el AAB, ni que el binario esté libre de riesgos.

## Estado del workflow y pendientes manuales

`.github/workflows/eas-production.yml` está preparado, con su YAML y validadores cubiertos por pruebas unitarias. **No se ejecutó GitHub Actions ni EAS**, y no existe un AAB nuevo generado en esta tarea.

Antes de ejecutarlo: revisar/publicar el código mediante autorización separada, disponer del workflow en la rama predeterminada de GitHub para `workflow_dispatch`, configurar EXPO_TOKEN y comprobar acceso a credenciales existentes. [GitHub documenta ese requisito de rama](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow). No se añadieron claves de firma o credenciales de Play.

El preflight remoto confirma TLS y aviso disponibles, pero requiere desplegar el backend v2 y la página `/eliminar-cuenta` antes de usar el cliente de producción. No se desplegaron aquí. La política de conservación, el alcance del ejecutor, notificación final y procedimiento operativo siguen pendientes de aprobación/ensayo; la ejecución destructiva está cerrada por defecto.

Consultar [guía de release](google-play-release.md) y [Seguridad de datos](google-play-data-safety.md). Faltan pruebas del AAB firmado, dispositivo físico, permisos fusionados, 64 bits/16 KB, Quality Gate remoto, prueba interna/cerrada y revisión de Play Console. No se certifica publicación ni cumplimiento legal.

## Archivos de este repositorio (23)

- `.github/workflows/eas-production.yml`
- `app.json`
- `docs/google-play-data-safety.md`
- `docs/google-play-release.md`
- `docs/google-play-validation.md`
- `eas.json`
- `package-lock.json`
- `package.json`
- `scripts/eas-production.cjs`
- `scripts/verify-android-release.cjs`
- `src/features/privacy/api/arco-api.test.ts`
- `src/features/privacy/api/arco-api.ts`
- `src/features/privacy/models/account-deletion.ts`
- `src/features/privacy/models/arco-config.ts`
- `src/features/privacy/models/arco-contracts.test.ts`
- `src/features/privacy/models/arco-contracts.ts`
- `src/features/privacy/viewmodels/use-arco-center-view-model.test.ts`
- `src/features/privacy/viewmodels/use-arco-center-view-model.ts`
- `src/features/privacy/views/arco-center-view.tsx`
- `tests/acceptance/arco-connected.acceptance.tsx`
- `tests/integration/arco-backend.test.tsx`
- `tests/security/arco-environments.test.ts`
- `tests/security/eas-production.test.ts`

Los 23 archivos pertenecen al móvil. Backend, migración y frontend están exclusivamente en el otro repositorio: `pry_TinaniumSportGymWeb/docs/google-play-implementation.md` incluye sus archivos, resultados y comandos para revisar, confirmar y subir **después de autorización**. No se tocó el otro worktree móvil ni se usó el repositorio padre para Git.

## Repetir validación local

```powershell
# Desde pry-app-tsg
New-Item -ItemType Directory -Path coverage/google-play -Force | Out-Null
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run test:unit -- --ci --runInBand --json --outputFile=coverage/google-play/unit.json
npm.cmd run test:integration -- --ci --runInBand --json --outputFile=coverage/google-play/integration.json
npm.cmd run test:acceptance -- --ci --runInBand --json --outputFile=coverage/google-play/acceptance.json
node scripts/eas-production.cjs validate
node scripts/eas-preview.cjs validate
node scripts/verify-android-release.cjs
```

Prebuild solo escribe su copia bajo .expo. El comando `node scripts/eas-production.cjs backend` realiza GET públicos y falla hasta que exista el contrato compatible. Si este entorno necesita certificados del sistema para herramientas Node, usar `NODE_USE_SYSTEM_CA=1`; no desactivar la validación TLS. Ninguno de esos comandos solicita un build remoto.
