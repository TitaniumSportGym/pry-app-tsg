# Actividad 4: perfil de carga ligera con Grafana k6

Estado: implementación preparada; **no se ha ejecutado carga contra un backend**.
Las comprobaciones locales usan respuestas simuladas y no abren conexiones.
Titanium Sport Gym utiliza recursos limitados en Render Free. Este perfil de
**carga ligera** prepara una primera ejecución controlada: no busca saturar el
servidor ni determinar su capacidad máxima. El máximo permitido es de 3 VUs.

## Endpoint y configuración de la API

Se utiliza exclusivamente **`GET /api/memberships/plans`**, identificado en
[`getMembershipPlans`](../../src/features/memberships/api/memberships-api.ts).
La aplicación lo consulta con `auth: false` y lee un objeto con `plans` como
arreglo. El método GET predeterminado está en
[`apiRequest`](../../src/services/apiClient.ts). Se valida HTTP 200 y ese contrato;
un arreglo vacío también es válido. No se inventan endpoints de salud.

La app obtiene su origen de `EXPO_PUBLIC_API_URL` en
[`src/config/env.ts`](../../src/config/env.ts). Estas pruebas **no importan esa
configuración ni leen el `.env` de Expo**: requieren un origen independiente,
`K6_BASE_URL`. No se envían tokens ni se invocan autenticación, registro, pagos,
compras o modificaciones. Los redirects están deshabilitados para que una
redirección no envíe carga a otro destino. No se desactiva la validación TLS.

## Archivos

- `memberships.k6.js`: calentamiento, preflight, carga ligera progresiva, recuperación e informes.
- `config.mjs`: validación del destino, límites, escenarios y umbrales.
- `validate-config.mjs`: valida configuración sin importar k6 ni enviar solicitudes.
- `offline.check.mjs`: pruebas de límites y comportamiento mediante módulos k6 simulados.
- `../../.github/workflows/stress-tests.yml`: ejecución exclusivamente manual e independiente del CI.

No se agregan dependencias npm ni se modifican los scripts o suites existentes.
Los nombres `*.k6.js` y `*.check.mjs` no coinciden con el descubrimiento de las
pruebas Jest ni de Reassure del proyecto.

## Instalación

k6 es un ejecutable independiente de Node.js y Expo. No usar `npm install k6`.
El workflow fija **k6 1.6.0**; para reproducir exactamente el entorno, descargar
el binario de esa versión desde las
[publicaciones oficiales](https://github.com/grafana/k6/releases/tag/v1.6.0),
extraerlo y agregarlo al `PATH`.

También se puede instalar con un gestor de paquetes y comprobar la versión:

```powershell
winget install k6 --source winget
k6 version
```

```bash
brew install k6 # macOS
k6 version
```

Los gestores pueden instalar otra versión: confirmar compatibilidad o usar el
binario fijado antes de comparar mediciones. Para Linux, consultar la
[instalación oficial](https://grafana.com/docs/k6/latest/set-up/install-k6/).
Las pruebas offline solo necesitan Node.js 24, como el CI del repositorio.

## Bloqueo por defecto y entorno aislado

Sin estas cuatro variables, la inicialización falla **antes de la primera solicitud**:

| Variable | Configuración requerida |
| --- | --- |
| `K6_BASE_URL` | Origen del backend aislado, sin `/api`, rutas, query ni credenciales. |
| `K6_ALLOWED_ORIGIN` | El mismo origen, autorizado de forma independiente por quien administra el entorno. |
| `K6_ENVIRONMENT` | Valor exacto `isolated`. |
| `K6_CONFIRM_ISOLATED` | Valor exacto `true`, solo cuando se autorice la ejecución. |

Se requiere HTTPS fuera de loopback; HTTP se admite únicamente para
`localhost`, `127.0.0.1` y `[::1]`. No hay URL de backend predeterminada.
La coincidencia de variables evita destinos accidentales, pero **no demuestra
por sí sola aislamiento**: el responsable debe verificar que aplicación,
base de datos y dependencias no compartan recursos de producción, además de
comprobar la capacidad disponible y la accesibilidad desde el generador.

## Perfil inicial y límites

| Fase | Duración predeterminada | Usuarios virtuales |
| --- | --- | --- |
| Calentamiento | Una solicitud, timeout de 90 s | Sin escenario de carga |
| Preflight | Una solicitud; timeout de 5 s | Sin escenario de carga |
| Primera rampa | 7 s | 1 → 2 |
| Segunda rampa | 7 s | 2 → 3 |
| Permanencia al pico | 10 s | 3 |
| Retirada de carga | 7 s | 3 → 0 |
| Recuperación | Espera de 5 s y 3 solicitudes secuenciales, separadas por 3 s | Sin VUs de carga activos |

Las etapas de medición suman **31 segundos** (aproximadamente 30), además del
calentamiento, preflight, finalización de iteraciones y recuperación. La gracia
de finalización es `timeout + pausa + 1` segundos: 9 s por defecto y hasta 14 s.
El timeout del job sigue siendo de 10 minutos.
Cada iteración envía un solo GET y duerme 3 segundos por defecto (configurable
entre 2 y 3), también ante errores. Al pico de 3 VUs, con pausa de 3 s,
el ritmo es de hasta aproximadamente 1 consulta
por segundo; no es un objetivo ni una garantía de RPS constante.

Los siguientes parámetros son configurables y se rechazan valores fuera de rango:

| Variable | Predeterminado | Rango permitido |
| --- | ---: | --- |
| `K6_PEAK_VUS` | 3 | 2–3, máximo estricto 3 |
| `K6_RAMP_SECONDS` | 7 | 5–10 por rampa, incluida retirada |
| `K6_HOLD_SECONDS` | 10 | 5–10 |
| `K6_PAUSE_SECONDS` | 3 | 2–3 entre iteraciones y sondas |
| `K6_REQUEST_TIMEOUT_SECONDS` | 5 | 1–10 |
| `K6_WARMUP_TIMEOUT_SECONDS` | 90 | 15–90, solo para el calentamiento |
| `K6_RECOVERY_WAIT_SECONDS` | 5 | 1–30 |
| `K6_RECOVERY_PROBES` | 3 | Exactamente 3 |
| `K6_P95_MS` | 3000 | 100–5000 |
| `K6_RECOVERY_MAX_MS` | 3000 | 100–5000 |

La primera rampa apunta a 2 VUs y las etapas nunca superan 40 s con estos
límites. Los límites de concurrencia, duración y pausas se han restringido
para mantener el perfil ligero incluso con parámetros manuales. Para mantener las
protecciones, no reemplazar escenarios, VUs, duración o umbrales mediante otras
opciones CLI, archivos de configuración k6 o variables nativas de k6.

## Calentamiento y arranque en frío

Render Free puede detener servicios inactivos y tardar alrededor de un minuto
en volver a iniciarlos; consultar las
[limitaciones de Render Free](https://render.com/docs/free#spinning-down-on-idle).
Por eso `setup()` realiza **un solo GET de calentamiento**, etiquetado
`phase:warmup`, con un timeout independiente de 90 s. Una respuesta válida lenta
no está sujeta al p95 de la carga. Debe responder HTTP 200 y un JSON con `plans`
como arreglo; HTML de arranque, error HTTP, JSON inválido o timeout hacen fallar
el calentamiento. No hay reintentos automáticos.

El resultado se registra con prefijo `[warmup]` en `k6.log`. Si falla, se lanza
un error y no comienzan el preflight ni la carga; no se presenta como una
medición aprobada. El timeout de `setup` contempla calentamiento y preflight
con margen: 105 s por defecto. Si tiene éxito, continúa el preflight existente
con timeout normal de 5 s y límite de respuesta de 3000 ms.

El calentamiento y el preflight preceden a la medición. No se reintentan ni se
descartan las solicitudes de la fase `load`: conservan sus errores y duraciones
en métricas propias. Las tres verificaciones de recuperación siguen ejecutándose
después de retirar la carga, incluso si fallan los umbrales de esa fase.

## Métricas, umbrales y recuperación

Los umbrales son criterios iniciales propuestos para el laboratorio, **no SLOs
medidos o acordados del backend**. Deben revisarse con su responsable antes de
la primera ejecución y mantenerse estables al comparar resultados.

| Métrica | Interpretación | Umbral |
| --- | --- | --- |
| `http_req_duration{phase:load}` | p95 del tiempo de las consultas bajo carga, en ms | `p(95)<3000`, configurable con `K6_P95_MS` |
| `http_req_failed{phase:load}` | Proporción de fallos HTTP/transporte; solo se espera HTTP 200 | `rate<0.05` (menos del 5 %) |
| `checks{phase:load,kind:contract}` | Contrato JSON de las respuestas HTTP 200 | `rate==1` |
| `http_reqs{phase:load}` | Total y tasa de solicitudes de carga | `count>0` |
| `iterations` | Iteraciones completas | `count>0` |
| `vus` / `vus_max` | Usuarios activos/reservados, con sus valores mínimo/máximo | Informativas; pico limitado por el escenario |
| `recovery_ok` | Sondas finales con HTTP 200, contrato correcto y tiempo menor al límite | `rate==1` |
| `recovery_duration` | Duración de cada consulta final, en ms | `max<3000`, configurable con `K6_RECOVERY_MAX_MS` |
| `recovery_probes` | Número de comprobaciones finales completadas | `count==3`, ligado a `K6_RECOVERY_PROBES` |

`phase:warmup`, `phase:baseline`, `phase:load` y `phase:recovery` separan las
fases; el calentamiento y las sondas inicial/final no diluyen el p95 ni el
porcentaje de errores de la carga. Las métricas HTTP globales sí incluyen
esas solicitudes, por lo que para aprobar la medición se usan las series
filtradas por `phase:load`.

Los checks de estado registran todos los fallos HTTP; su aprobación se decide
con el umbral de errores menor al 5 %. Los checks `kind:contract` se aplican
solo a HTTP 200 y exigen JSON válido en todas esas respuestas. De este modo,
el contrato no reduce implícitamente la tolerancia HTTP al 0 %, y un HTTP 200
con JSON inválido sigue haciendo fallar la prueba.

El preflight cancela el escenario si el estado, contrato o duración ya fallan
sin carga. Después de terminar los VUs se espera el periodo de recuperación y
se exigen varias consultas correctas consecutivas: una sola respuesta correcta
no demuestra recuperación sostenida. Tampoco se infiere recuperación interna
de CPU, memoria, conexiones o colas; para ello se requiere observabilidad del
backend aislado. No se usa `abortOnFail` para permitir la verificación final
cuando los umbrales de carga fallen. Si falla `setup`, hay cancelación manual
o se termina el proceso, podría no haber informe o sondas finales; eso no
demuestra recuperación.

## Validaciones permitidas ahora: sin tráfico

Desde la raíz del repositorio:

```powershell
node --check tests/stress/memberships.k6.js
node --experimental-vm-modules --test tests/stress/offline.check.mjs
npm.cmd run lint
npx.cmd tsc --noEmit
```

En shells sin la restricción de scripts `.ps1`, también se pueden usar `npm` y
`npx`. La advertencia experimental de `vm` corresponde al arnés local de Node;
no se utiliza ese módulo en k6.

El arnés no expone APIs de red y sustituye `k6/http` por respuestas en memoria:
verifica bloqueos de configuración, límites de carga ligera, endpoint,
calentamiento lento válido o fallido, preflight fallido, errores de la medición,
etiquetas de fase, recuperación fallida/lenta e informes. **No ejecuta k6, no
simula capacidad real y no verifica sus códigos de salida o motor de umbrales**.

Para revisar solamente una configuración de ejemplo sin solicitudes:

```powershell
$env:K6_BASE_URL = 'http://127.0.0.1:6565'
$env:K6_ALLOWED_ORIGIN = 'http://127.0.0.1:6565'
$env:K6_ENVIRONMENT = 'isolated'
$env:K6_CONFIRM_ISOLATED = 'true'
node tests/stress/validate-config.mjs
$env:K6_CONFIRM_ISOLATED = 'false'
```

La dirección loopback anterior es un ejemplo sin servidor; validar no requiere
que exista ningún proceso escuchando. Estos comandos no lanzan carga.

## Primera ejecución controlada: pendiente de autorización del entorno

Antes de ejecutar k6 faltan: disponer del backend y datos aislados, verificar su
origen permitido y red, definir la ventana de ejecución y observación, confirmar
los umbrales con el responsable e instalar k6 si se ejecutará localmente.

El siguiente comando **sí genera tráfico**. Se documenta para una ejecución
posterior; no se ha ejecutado durante esta implementación. Una vez que las
cuatro variables obligatorias señalen al entorno real aislado autorizado:

```powershell
New-Item -ItemType Directory -Force coverage/stress | Out-Null
node tests/stress/validate-config.mjs
if ($LASTEXITCODE -ne 0) { throw 'Configuración rechazada' }
k6 run --out json=coverage/stress/metrics.json tests/stress/memberships.k6.js
if ($LASTEXITCODE -ne 0) { throw 'k6 falló: revisar logs, umbrales y recuperación' }
```

Equivalente en Bash, con las variables previamente exportadas:

```bash
mkdir -p coverage/stress
node tests/stress/validate-config.mjs && \
  k6 run --out json=coverage/stress/metrics.json tests/stress/memberships.k6.js
```

Opcionalmente establecer `K6_NO_USAGE_REPORT=true`, como hace el workflow,
para desactivar el envío de estadísticas de uso de k6.

## Workflow manual y artifacts

`stress-tests.yml` solo declara `workflow_dispatch`: no hay `push`,
`pull_request`, cron ni enlace desde `ci.yml`. Antes de poder ejecutarlo:

1. Crear/configurar el GitHub Environment **`stress-isolated`** y revisar quién
   puede usarlo; se pueden configurar revisores requeridos.
2. Definir sus variables `K6_BASE_URL`, `K6_ALLOWED_ORIGIN` y
   `K6_ENVIRONMENT=isolated`. No agregar credenciales: el endpoint es público.
3. Verificar aislamiento real y acceso desde el runner Ubuntu. Una API accesible
   solo dentro de una red privada necesitará un runner con acceso a esa red.
4. Cuando se autorice la primera ejecución, abrir Actions → este workflow →
   Run workflow, elegir la rama y marcar `confirm_isolated`. Los tres inputs
   de carga corresponden a pico, rampa y permanencia.

GitHub requiere que el workflow esté disponible en la rama predeterminada para
habilitar `workflow_dispatch`; después se puede elegir la rama a probar.
Este cambio no hace commits, push, despliegues ni configura recursos remotos.

La confirmación es `false` por defecto. Si faltan variables o son inválidas,
la validación falla antes de instalar/ejecutar k6. Crear automáticamente un
Environment vacío no habilita carga. La concurrencia por entorno evita solapar
ejecuciones de este workflow, incluso entre ramas.

`set -o pipefail` conserva el código no cero de k6 al capturar la salida con
`tee`; no hay `continue-on-error` ni opciones que desactiven umbrales. Tanto el
resumen como `actions/upload-artifact@v4` usan `if: always()`. El artifact
`stress-k6-<run_id>-<run_attempt>` conserva durante 14 días los archivos
disponibles de `coverage/stress/`:

- `config.log`: validación y perfil aplicado; disponible aunque la configuración falle.
- `k6.log`: ejecución, resultado del calentamiento y diagnóstico de errores.
- `metrics.json`: puntos de métricas en formato JSON por línea, incluyendo VUs y fases.
- `summary.json`: resumen agregado y resultados de cada umbral.
- `summary.md`: informe legible, también publicado en el resumen de Actions.

Si no llegó a arrancar k6 o se interrumpió, algunos archivos pueden faltar;
los logs disponibles se conservan y no se inventa un resultado aprobado.
`coverage/` ya está ignorado por Git. La salida cruda puede incluir el origen
del entorno aislado; revisar los permisos del artifact antes de compartirlo.

Para interpretar una ejecución futura: exigir salida 0 y todos los umbrales
aprobados; revisar p95 y error por fase, el número de solicitudes/iteraciones,
el pico de VUs alcanzado, posibles iteraciones interrumpidas y las sondas
finales. Si falla recuperación, el servicio no cumplió el criterio posterior
en la ventana observada. Aprobar este perfil solo demuestra ese resultado
con los límites, entorno y ventana elegidos. Estas pruebas HTTP del backend
no sustituyen aceptación Jest/RNTL, Reassure ni una E2E de la APK.

Referencias: [ramping-vus](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/),
[umbrales y códigos de salida](https://grafana.com/docs/k6/latest/using-k6/thresholds/),
[ciclo de vida](https://grafana.com/docs/k6/latest/using-k6/test-lifecycle/),
[informes](https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/),
[ejecución manual de Actions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
