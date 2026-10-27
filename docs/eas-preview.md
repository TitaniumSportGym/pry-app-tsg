# Actividad 4: APK Android preview mediante GitHub Actions

El workflow independiente [`eas-preview.yml`](../.github/workflows/eas-preview.yml)
solo se inicia con `workflow_dispatch`. No consume compilaciones por push,
Pull Request ni por ejecutar el CI principal. No se ha solicitado una nueva
compilación durante esta implementación.

## Configuración comprobada

- Expo SDK 57 (`expo ~57.0.27`), Expo Router y npm con `package-lock.json`.
- Proyecto EAS existente: `e2d585a9-0d83-4bcb-ac53-d1a240ed6e74`.
- Identificador Android: `com.titaniumsportgym.app`.
- Perfil `preview`: distribución `internal`, entorno EAS `preview` y
  `android.buildType: apk`. El perfil `production` sigue generando AAB.
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
remotas. `scripts/eas-preview.cjs validate` comprueba localmente el formato APK,
el origen, el entorno, el projectId y el identificador Android.

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
2. Valida `preview` y genera los tipos de Expo Router mediante
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
   npx eas-cli@latest build --platform android --profile preview --non-interactive --wait --json
   ```

   `--wait` espera el resultado real. No se usa `--no-wait`, compilación local,
   auto-submit ni publicación en Google Play. La salida JSON se captura aparte
   de los logs; el código distinto de cero de EAS hace fallar el paso.

7. El validador del resultado exige un único build Android del perfil preview,
   del proyecto y commit esperados, con estado **`FINISHED`** y un artefacto
   HTTPS cuyo nombre termine en **`.apk`**. Una respuesta AAB, cancelada,
   incompleta o sin resultado verificable hace fallar el job, incluso si la CLI
   devolviera código cero. La comprobación usa los metadatos de EAS; no descarga
   ni inspecciona el binario dentro del workflow.
8. El job `resumen`, con `if: always()`, registra calidad, resultado del job,
   estado remoto disponible, commit, perfil, plataforma y enlace del build.
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
3. Abrir Actions → **EAS preview Android APK** → Run workflow. Elegir la rama
   deseada y verificar el commit que se compilará.
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
```

En shells sin la restricción de scripts PowerShell, se pueden usar `npm` y
`npx`. También pueden ejecutarse las suites Jest de la tabla anterior sin
invocar EAS Build. El helper solo lee archivos y escribe metadatos/resúmenes:
no importa EAS CLI ni realiza solicitudes HTTP. Sus verificaciones de resultado
y resumen se pueden probar con JSON sintético, sin APK ni credenciales.

El YAML se comprueba con un parser y aserciones sobre el evento manual,
dependencias, pasos de calidad, autenticación y espera del build. Estas
validaciones no comprueban token, configuración remota, credenciales de firma,
compatibilidad del builder ni éxito de una futura compilación.

Referencias oficiales:
[EAS Build desde CI](https://docs.expo.dev/build/building-on-ci/),
[acción Expo v8](https://github.com/expo/expo-github-action/tree/v8),
[APK Android](https://docs.expo.dev/build-reference/apk/),
[variables de EAS](https://docs.expo.dev/eas/environment-variables/usage/),
[variables públicas de Expo](https://docs.expo.dev/guides/environment-variables/),
[tokens de acceso](https://docs.expo.dev/accounts/programmatic-access/),
[referencia CLI](https://docs.expo.dev/eas/cli/).
