# Integración local de CAMERA y Dependabot #26

Validación del 16 de noviembre de 2026. Rama activa:
`fix/android-release-camera-validation`. Destino previsto del único PR: `develop`.

## Estado inspeccionado y transferencia

Se revisaron status, ramas, worktrees, índice, diferencias locales y diferencias
entre las dos ramas antes de cambiar de rama.

- Ambas ramas apuntaban a `6e38fef36b9d9ecf5cbdb937f192fb1b003a7a8d`.
- Ese commit ya contiene CAMERA, sus validadores/pruebas/documentación y la
  captura renovada de Certificate Pinning. La rama CAMERA tiene una referencia
  local de seguimiento `origin/fix/android-release-camera-validation` al mismo commit.
- Minimatch estaba sin confirmar: tres archivos modificados y un documento nuevo.
  No había cambios preparados en el índice.
- El otro worktree, `pry-app-tsg-main`, permaneció en `release/sync-develop-main`
  (`b90a24e`) y no se modificó.

Se guardaron el diff binario, copias de 18 archivos y sus hashes SHA-256 en
`coverage/combined-fixes/`. Como las ramas compartían el mismo commit, se ejecutó
`git switch fix/android-release-camera-validation`, conservando los cuatro
archivos sin confirmar en el directorio de trabajo. No fue necesario resolver
conflictos ni trasladar commits. Los 18 archivos mantienen exactamente sus hashes
iniciales, incluida la captura, después de la transferencia y de las verificaciones.

Las copias de seguridad tienen sufijo `.preserved`. La primera ejecución de
unitarias encontró inicialmente las copias con sus nombres originales y las
indexó como otro proyecto; se corrigieron solo los nombres de esas copias,
sin perder bytes ni cambiar originales, reglas de Jest o configuración de
TypeScript. Las suites finales se repitieron después y pasaron.

## Archivos pendientes de confirmar

- `package.json`.
- `package-lock.json`.
- `tests/security/dependency-security.test.ts`.
- `docs/dependabot-26-minimatch.md`.
- Este informe: `docs/combined-camera-minimatch-validation.md`.

Los nueve archivos previos de CAMERA/pinning permanecen en el commit existente:
`app.json`, `config/alpha-pinning-public-chain.json`,
`scripts/android-permissions.cjs`, `scripts/verify-android-release.cjs`,
`tests/security/android-release-permissions.test.ts`,
`docs/android-release-camera-validation.md`, `docs/certificate-pinning-alpha.md`,
`docs/google-play-data-safety.md` y `docs/google-play-validation.md`.
El contenido combinado frente a develop abarca esos nueve archivos más los cinco
pendientes. No se modificaron funcionalidades de `src/`, perfiles EAS, reglas R8
ni implementación de Certificate Pinning.

## Resultados finales en la rama combinada

| Comprobación | Resultado |
| --- | --- |
| `npm ci --no-fund` | Salida 0; 1326 paquetes añadidos; auditoría de instalación: 0 vulnerabilidades |
| `npm ls minimatch --all` | Salida 0; árbol completo coherente |
| Inventario recursivo de node_modules y contraste con lockfile | 10 instalaciones de 11.0.8 y 1 de 3.1.5; 0 en `>=7.0.0 <11.0.1` |
| `npm audit --json` | Salida 0; 0 vulnerabilidades, incluyendo dependencias de desarrollo |
| `npm run lint` | Salida 0, offline y sin telemetría; fuera del sandbox por la limitación de finalización de ESLint de esta máquina |
| ESLint directo de ambos scripts Android y ambas pruebas de seguridad, sin caché y con max-warnings=0 | Salida 0; sin advertencias |
| `node node_modules/typescript/bin/tsc --noEmit` | Salida 0 |
| Unitarias | 76 suites; 787/787; salida 0 |
| Integración | 22 suites; 225/225; salida 0 |
| Aceptación | 7 suites; 29/29; salida 0 |
| Regresión completa | 98 suites; 1012/1012; salida 0 |
| Android preview | Prebuild aislado aprobado; salida 0 |
| Android production | Prebuild aislado aprobado; salida 0 |
| Android arco-release | Prebuild aislado aprobado; salida 0 |
| Pinning `--check` | Salida 0; conexión TLS pública autorizada, hostname/cadena y SPKI coincidentes |
| Pinning `--negative-control` | Salida 0; pin distinto rechazado en Node |
| `npx --yes expo-doctor --verbose`, versión 1.21.8 | 19/20; salida 1 solo por los mismos 13 parches de Expo pendientes |
| `git diff --check` y hashes de preservación | Aprobados |

Los comandos Jest fueron `npm run test:unit`, `npm run test:integration`,
`npm run test:acceptance` y `npm test`, con `--ci --runInBand --watchman=false`
y reportes JSON en `coverage/combined-fixes/{unit,integration,acceptance,regression}.json`.
Las 1012 pruebas de regresión incluyen las unitarias e integración; no se suman
como casos distintos. Aceptación usa el conjunto separado de fixtures del proyecto.
Estas suites no equivalen a pruebas en dispositivo ni servicios productivos.

Los validadores Android se ejecutaron con `node scripts/verify-android-release.cjs
--profile <perfil>`. Sus snapshots son `.expo/android-release-pEfkSF` (preview),
`.expo/android-release-ngAnlb` (production) y `.expo/android-release-M2eyGd`
(arco-release). Los tres conservan CAMERA/INTERNET, los siete bloqueos, pinning
XML/Kotlin, R8, shrinkResources y target SDK 36. Mantienen
`mergedBinaryPermissionsVerified: false`, `gradleBuildExecuted: false` y
`easBuildExecuted: false`: no se presenta el prebuild como prueba del APK/AAB final.

## Captura de Certificate Pinning

Se conservó intacto `config/alpha-pinning-public-chain.json`, SHA-256:

```text
d896cc5dd353f6697b3a1e2cd3f708432b31e36b107b8690bb03908076c02dd4
```

Su capturedAt sigue siendo `2026-11-16T22:42:01.409Z`. Los dos controles TLS
realizados no escriben la captura; el pin público actual coincide con el guardado.
No requiere renovación al cerrar esta validación. La ventana de 24 horas exigida
por los validadores termina el **17 de noviembre de 2026 a las 16:42:01 en
America/Mexico_City** (`2026-11-17T22:42:01.409Z`). Si se compila después, deberá
renovarse y validarse nuevamente. Esa ventana corresponde a la evidencia de
compilación, no a una caducidad automática de los pins instalados en Android.

El control negativo de Node no prueba el pinning nativo en ejecución; esa etapa
sigue pendiente de un build autorizado y un dispositivo.

## Expo Doctor, restricciones y revisión del diff

Doctor mantiene 19/20 frente a la referencia solicitada: no empeoró. El único
control fallido sigue siendo la compatibilidad de versiones con los 13 parches
pendientes. No se aplicaron actualizaciones, exclusiones ni omisiones de controles.
Expo sigue en 58.0.23 y React Native en 0.88.1; package.json y package-lock.json
mantienen sus hashes de antes de la transferencia y de npm ci.

Se revisó el diff completo de código y el inventario del lockfile. Respecto a
develop, la dependencia transitiva test-exclude cambia de 7.0.2 a 8.0.0 en siete
ubicaciones, desaparecen 48 nodos obsoletos y npm normaliza 40 marcas dev; no se
cambian otras versiones ni rangos directos. La rama antigua test-exclude 6 /
glob 7 / minimatch 3 permanece. Los detalles están en el informe de Dependabot.

develop sigue en `e35ad563671205eab9da150cecbc84b3604b5167`; ambas ramas de
corrección mantienen su referencia previa `6e38fef`. No se movieron esos commits
ni se descartaron cambios locales. Tampoco se usaron reset o clean. No se generó APK/AAB
ni se ejecutó Gradle, EAS Build, commit, push o merge durante esta integración.

## Preparación del commit y PR

Todo el contenido está reunido y verificado en CAMERA para un único PR hacia
develop. Los cinco archivos pendientes pueden confirmarse en un solo commit nuevo
cuando se autorice.

Hay una diferencia entre ese commit nuevo y un único commit total del PR:
CAMERA ya está en `6e38fef`, así que confirmar los pendientes agregaría un segundo
commit al PR. Tener exactamente un commit total requiere reorganizar ese historial
previo con autorización. No se realizó esa operación ni se reescribió la rama remota.

La evidencia local, respaldo, hashes y reportes están en
`coverage/combined-fixes/`, ignorado por Git.
