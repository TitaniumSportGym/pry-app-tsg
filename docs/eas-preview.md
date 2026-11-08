# Actividad 4: APK Android preview mediante GitHub Actions

El workflow independiente [`eas-preview.yml`](../.github/workflows/eas-preview.yml)
solo se inicia con `workflow_dispatch`. No consume compilaciones por push,
Pull Request ni por ejecutar el CI principal. No se ha solicitado una nueva
compilación durante esta implementación.

## Configuración comprobada

- Expo SDK 58 (`expo ^58.0.0`), Expo Router y npm con `package-lock.json`.
- Proyecto EAS existente: `e2d585a9-0d83-4bcb-ac53-d1a240ed6e74`.
- Identificador Android: `com.titaniumsportgym.app`.
- Perfil `preview`: distribución `internal`, entorno EAS `preview` y
  `android.buildType: apk`. El perfil `production` sigue generando AAB.
- Selección por `GITHUB_REF`: únicamente `refs/heads/feature/actividad6-seguridad-api`
  usa `arco-release`; `develop` y las demás referencias conservan `preview`.
  No existe entrada manual que permita elegir un perfil de producción.
- `arco-release` usa Render sin `/api` y ARCO en `true`; el perfil habitual
  `preview` conserva ARCO en `false`. Se comprueban minify/shrink y artefactos R8.
- El workflow usa Node.js 24, `npm ci` y `expo/expo-github-action@v8` con EAS CLI
  `latest`, sujeto al mínimo de `eas.json` (`>=25.2.0`).

La configuración pública de preview en `eas.json` incluye:

```json
{
  "environment": "preview",
  "env": {
    "EXPO_PUBLIC_API_URL": "https://server-titanium.onrender.com"
  }
}
```

[`src/config/env.ts`](../src/config/env.ts) lee esa variable y elimina barras
finales. [`apiClient.ts`](../src/services/apiClient.ts) concatena el origen y la
ruta. Las rutas existentes ya contienen `/api`, por ejemplo:

```text
https://server-titanium.onrender.com + /api/auth/login
https://server-titanium.onrender.com + /api/memberships/plans
```

Por eso la variable contiene exclusivamente el origen HTTPS, sin `/api`,
parámetros, credenciales ni claves. Es información pública que Expo incorpora
al JavaScript de la APK; **nunca colocar secretos en `EXPO_PUBLIC_*`**.
No se cambia el cliente HTTP ni se consulta el backend para validar la URL.

El valor está declarado en el perfil para llegar tanto a la resolución local
de configuración como al builder remoto, sin depender del `.env` local ni de
un secreto de GitHub. Si existe la misma variable en el entorno EAS `preview`,
revisar que coincida; la configuración `env` del perfil prevalece sobre las
variables remotas del mismo nombre. No se han leído ni modificado variables
remotas. `scripts/eas-preview.cjs validate` comprueba localmente el perfil seleccionado, formato APK,
el origen, el entorno, el projectId y el identificador Android.
Exporta URL y `EAS_BUILD_PROFILE` mediante `GITHUB_ENV` para los pasos siguientes
del mismo job. El flag se valida en el perfil y EAS lo incorpora al build desde
`eas.json`; no se fuerza globalmente durante los tests, que cubren ambos modos.
Cada job vuelve a validar; no depende del `.env` local.
`/aviso-publicado.pdf` queda ignorado por Git y por la subida estándar de EAS;
el PDF descargado no se incorpora al workflow ni a sus artefactos.

## Preparación manual: EXPO_TOKEN y firma

1. Acceder a Expo con una cuenta que tenga permisos sobre el proyecto EAS
   indicado en `app.json`.
2. Crear un token desde [Expo → Access tokens](https://expo.dev/settings/access-tokens).
3. En GitHub abrir el repositorio → Settings → Secrets and variables → Actions
   → New repository secret. Nombre: **`EXPO_TOKEN`**. Pegar el token únicamente
   en ese campo. No agregarlo al código, `.env` versionado, `eas.json`, capturas
   o mensajes de chat.
4. Verificar en Expo que el proyecto está configurado y que existen las
   credenciales Android de firma para ese identificador. El modo no interactivo
   no puede responder preguntas para crear o reparar un keystore. Si falta esa
   preparación, debe realizarla el responsable antes de probar la automatización;
   no guardar el keystore ni `credentials.json` en este repositorio.
5. Confirmar la cuota disponible de EAS Build antes de autorizar una ejecución.

El token solo se entrega al job de compilación mediante el secreto y la acción
oficial. El job de calidad no lo necesita. La existencia de `projectId` y del
perfil no demuestra acceso remoto, firma o cuota: eso queda pendiente de
comprobación con la cuenta autorizada. No se solicita aquí la compilación
inicial que la documentación oficial recomienda para completar la preparación.

## Flujo y condiciones de calidad

1. El job `calidad` obtiene el commit seleccionado, usa Node.js 24 e instala
   dependencias con `npm ci`.
2. Valida el perfil de la referencia seleccionada y genera los tipos de Expo Router mediante
   `npx expo customize tsconfig.json`, igual que el CI existente.
3. Exige éxito de todos estos pasos:

   | Verificación | Comando |
   | --- | --- |
   | ESLint | `npm run lint` |
   | TypeScript | `npx tsc --noEmit` |
   | Unitarias | `npm run test:unit -- --ci --runInBand` |
   | Integración | `npm run test:integration -- --ci --runInBand` |
   | Aceptación | `npm run test:acceptance -- --ci --runInBand` |
   | Regresión existente | `npm test -- --ci --runInBand` |

4. El job `build` tiene `needs: [calidad]`. Si cualquier paso falla, se cancela
   o no se completa, no comienza este job y no se solicita una APK. No hay
   `continue-on-error`, selección de un build anterior ni omisión de pruebas.
5. Obtiene el mismo commit del evento manual, reinstala con `npm ci`, revalida
   el perfil y comprueba que `EXPO_TOKEN` esté definido sin imprimirlo.
6. Configura `expo/expo-github-action@v8` y ejecuta este comando **solo durante
   una ejecución manual autorizada del workflow**:

   ```bash
   npx eas-cli@latest build --platform android --profile "$EAS_BUILD_PROFILE" --non-interactive --wait --json
   ```

   `--wait` espera el resultado real. No se usa `--no-wait`, compilación local,
   auto-submit ni publicación en Google Play. La salida JSON se captura aparte
   de los logs; el código distinto de cero de EAS hace fallar el paso.

7. El validador del resultado exige un único build Android del perfil seleccionado,
   del proyecto y commit esperados, con estado **`FINISHED`** y un artefacto
   HTTPS cuyo nombre termine en **`.apk`**. Una respuesta AAB, cancelada,
   incompleta o sin resultado verificable hace fallar el job, incluso si la CLI
   devolviera código cero. Para `preview` se conserva la comprobación de metadatos
   existente. Para `arco-release`, además descarga el artefacto por HTTPS sin
   reenviar el token, comprueba cabecera ZIP, analiza el manifiesto con `aapt dump
   badging` (paquete correcto y sin debuggable), y ejecuta `apksigner verify` usando
   Android SDK Build Tools del runner Linux. Calcula SHA-256 y tamaño. Un HTML
   renombrado, un paquete incorrecto o una firma inválida hacen fallar el job.
   Se limita el tamaño a 512 MiB, las redirecciones a cinco sin descenso a HTTP
   y el tiempo de descarga a diez minutos. No imprime URLs firmadas ni trazas
   del transporte. Borra únicamente la descarga temporal tras comprobarla.
   Conserva `apk-verification.json` como artifact de GitHub durante 14 días con
   Build ID, perfil, commit, paquete, SHA-256, tamaño y resultado, sin secretos.
8. El job `resumen`, con `if: always()`, registra calidad, resultado del job,
   estado remoto disponible, commit, perfil, plataforma y enlace del build.
   Para ARCO incluye estado de inspección del binario y hash si se verificó.
   Si la calidad falla, indica el bloqueo; no presenta una APK como aprobada.

El enlace se conserva también para builds remotos fallidos o cancelados cuando
EAS devuelve su identidad. Si no llega a devolver JSON, se intenta recuperar el
enlace de sus logs. Un fallo previo a crear la solicitud puede no tener enlace.
El resumen no imprime `EXPO_TOKEN`, el entorno completo ni URLs firmadas de
descarga; enlaza a la página del build en Expo.

La concurrencia global de este workflow evita compilar simultáneamente desde
dos ramas; no cancela automáticamente una compilación en curso. El job espera
hasta 120 minutos, incluyendo colas. Cancelar o agotar el job de GitHub **no
garantiza cancelar una compilación ya enviada a EAS**: revisar su estado en
Expo antes de relanzar para evitar consumir otra compilación innecesariamente.

## Ejecutar manualmente y descargar la APK

Estos pasos quedan pendientes; no se ha ejecutado el workflow:

1. Revisar los cambios y, cuando se autorice su publicación, hacer disponible
   el workflow en GitHub. Para habilitar `workflow_dispatch` debe existir en la
   rama predeterminada; después se puede seleccionar otra rama que contenga
   este archivo.
2. Completar la preparación de token, acceso al proyecto, firma y cuota.
3. Abrir Actions → **EAS preview Android APK** → Run workflow → Use workflow from:
   **feature/actividad6-seguridad-api**. Verificar el commit que se compilará.
   El perfil será `arco-release` automáticamente. Si se elige `develop`, será
   `preview`, manteniendo el comportamiento habitual.
4. Iniciar la ejecución. Primero deben aprobarse todas las verificaciones de
   calidad; después EAS compilará y GitHub esperará el resultado.
5. Abrir el resumen de la ejecución y seguir **Compilación y descarga → Abrir
   en Expo**. Allí se consultan el estado y los logs del build específico.
6. Cuando esté `FINISHED`, usar el botón de descarga/instalación de Expo para
   obtener la APK. Descargar en un dispositivo Android o instalarla siguiendo
   el proceso habitual de distribución interna. La APK se obtiene de EAS;
   no se sube una copia a los artifacts de GitHub en este workflow.

El perfil genera una APK real solo cuando se solicite el build. Que Jest/RNTL
aprueben no equivale a haber ejecutado una E2E en esa APK. Tampoco se ejecutan
k6 ni consultas reales al backend como parte de la calidad de este workflow.

## Validación local sin solicitar builds

```powershell
node --check scripts/eas-preview.cjs
node scripts/eas-preview.cjs validate
npm.cmd run lint
npx.cmd tsc --noEmit
# Validar la selección ARCO localmente sin HTTP ni build:
$env:GITHUB_REF='refs/heads/feature/actividad6-seguridad-api'
node scripts/eas-preview.cjs validate
Remove-Item Env:GITHUB_REF
```

En shells sin la restricción de scripts PowerShell, se pueden usar `npm` y
`npx`. También pueden ejecutarse las suites Jest de la tabla anterior sin
invocar EAS Build. `validate` y `summary` no realizan HTTP ni importan EAS CLI.
Solo `result` para ARCO descarga la APK terminada y ejecuta las herramientas
nativas; no usarlo localmente si solo se desea validar configuración. Los tests
de `tests/security/eas-preview.test.ts` simulan HTTP y herramientas nativas,
comprueban los errores y no solicitan builds ni descargan APK reales.

En esta preparación se consultó la API pública de GitHub: la rama predeterminada
es `develop` y contiene `.github/workflows/eas-preview.yml` con `workflow_dispatch`
(blob `8747b2a4f26dd42e56e1c6da51c119ea4dffad8b`). Evidencia local en
`coverage/arco-actions/github-workflow-availability.json`. No se inició el workflow.
Los cambios locales todavía deben publicarse mediante una operación posterior
autorizada para que GitHub use esta versión al seleccionar la rama.

El YAML se comprueba con un parser y aserciones sobre el evento manual,
dependencias, pasos de calidad, autenticación y espera del build. Estas
validaciones no comprueban token, configuración remota, credenciales de firma,
compatibilidad del builder ni éxito de una futura compilación.

Resultados ejecutados en esta adaptación (evidencia local en
`coverage/arco-actions/`, sin builds ni solicitudes ARCO):

| Comprobación | Resultado |
| --- | --- |
| TypeScript `npx.cmd tsc --noEmit` | Aprobado. |
| ESLint directo sobre `src tests scripts plugins --no-cache` | 0 errores; 10 advertencias existentes. |
| Unitarias | 555 pruebas, 57 suites aprobadas. |
| Integración | 171 pruebas, 17 suites aprobadas. |
| Aceptación simulada | 29 pruebas, 7 suites aprobadas. |
| Regresión completa | 726 pruebas, 74 suites aprobadas. |
| Validador CLI `validate` | preview/false y arco-release/true aprobados; exportación de URL y perfil comprobada. |
| Sintaxis CJS / YAML y dependencia de calidad | Aprobadas. |
| PDF local | Ignorado por Git; no seguido, subido ni agregado a artefactos. |

Son **755 pruebas distintas** (regresión incluye unitarias e integración), sin
fallos ni casos omitidos. Los 26 casos nuevos prueban selección por referencia,
configuración, resultados incompletos/incorrectos, resumen y errores de descarga,
manifiesto, modo Debug y firma. HTTP y las herramientas Android están simulados
en estas pruebas; no son evidencia de una APK real compilada o instalada.
La descarga y comprobación nativa real se ejecutarán únicamente al iniciar el
workflow manual y terminar EAS Build. El secreto remoto y la firma disponible
siguen sin comprobarse; no se leyeron ni modificaron secretos.

Referencias oficiales:
[EAS Build desde CI](https://docs.expo.dev/build/building-on-ci/),
[acción Expo v8](https://github.com/expo/expo-github-action/tree/v8),
[APK Android](https://docs.expo.dev/build-reference/apk/),
[variables de EAS](https://docs.expo.dev/eas/environment-variables/usage/),
[variables públicas de Expo](https://docs.expo.dev/guides/environment-variables/),
[tokens de acceso](https://docs.expo.dev/accounts/programmatic-access/),
[referencia CLI](https://docs.expo.dev/eas/cli/).
La selección de rama manual sigue la
[documentación de GitHub](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
