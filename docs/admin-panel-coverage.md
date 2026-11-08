# Cobertura del panel administrador — PR #85

Verificación local del 7 de noviembre de 2026 en `feature/admin-panel`, sobre
`8b65355246d3b9a2c2e7af1ff02b86f88b73a7fb`. No se hicieron commit, push ni merge.
No se modificaron archivos de producción, dependencias, configuración de CI,
SonarQube, Jest, backend, R8 ni EAS.

**Resultado remoto comprobado:** el último análisis de la
[PR #85](https://github.com/TitaniumSportGym/pry-app-tsg/pull/85), del 7 de noviembre
a las 20:03 de Ciudad de México, continúa en **ERROR**. La única condición fallida
es `new_coverage`: **24.3%**, con umbral **80%**. Las condiciones de confiabilidad,
seguridad, mantenibilidad, duplicación y revisión de hotspots están aprobadas en
ese análisis. No se afirma que los cambios locales hayan aprobado SonarQube.

**Causa de los ceros**

La regresión inicial pasó 526 pruebas y reprodujo los ceros en el API,
repositorio, siete ViewModels y vistas del administrador. Las pruebas anteriores
del panel ejecutaban principalmente los modelos. La navegación simulada
comprobaba llamadas a `router.push/replace`, sin montar la pantalla destino.
La prueba existente del escáner sustituye `AppTabs`, por lo que no ejecuta
`app-tab-bar.tsx`.

`ci.yml` entrega exclusivamente `coverage/regresion/lcov.info` al job SonarQube,
que lo descarga como `coverage/lcov.info`, coincidiendo con
`sonar.javascript.lcov.reportPaths`. Las ejecuciones de unitarias e integración
son independientes, y aceptación utiliza un `testMatch` propio; su cobertura
no se fusiona con el LCOV de regresión. Pasar esas suites no implica cubrir
el panel en el reporte consumido por SonarQube.

Se validaron los 264 archivos `SF` del LCOV contra el árbol de trabajo y los
números de línea `DA`/`BRDA` contra sus fuentes TypeScript/TSX. No faltan archivos
del código nuevo. Los reportes locales anteriores eran de otras fechas y no
debían utilizarse como evidencia de esta PR. No fue posible descargar el
artefacto LCOV de GitHub Actions: la API exige autenticación y devolvió HTTP 401.
Sí se consultaron las métricas y líneas nuevas del análisis público de SonarQube.

**Pruebas añadidas: 70 casos**

| Archivo | Casos | Validación |
| --- | ---: | --- |
| `src/features/admin/api/admin-api.test.ts` | 14 | Seis endpoints, límite de pedidos/pagos, extracción de colecciones, respuestas sin colección, fallos de red y errores 401/403. |
| `src/features/admin/repositories/admin-repository.test.ts` | 9 | Parsers reales, exclusión de compras de membresía y roles ajenos, contadores, TTL de un minuto, deduplicación, force refresh, expiración, invalidación y Observer, reintento y datos malformados. |
| `src/features/admin/models/admin-edge-cases.test.ts` | 14 | Contratos incompletos, fechas/importes inválidos, estados futuros autorizados, transiciones de incidencia/cancelación, ordenamiento y valores opcionales. |
| `tests/integration/admin-screens.test.tsx` | 27 | Vistas, ViewModels, repositorio, caché y adaptador API reales: carga, skeleton, vacío, errores, búsqueda, filtros, paginación, refresco, Observer, remontaje con caché, permisos/sesión, formularios, botones deshabilitados y cierre de sesión. |
| `tests/integration/admin-navigation.test.tsx` | 2 | Expo Router y barra reales: pestañas del administrador, pedido/detalle/regreso, socios, Más/tarifas/recogida/pagos, escáner sin pestañas; barra del cliente y badges singular/plural. |
| `tests/acceptance/admin-panel.acceptance.tsx` | 4 | Recorridos de envío autorizado, tarifas y formulario local, búsqueda de socios y recuperación de un error de permisos sin inventar ventas. |

Las vistas se renderizan con React Native Testing Library 14. Los límites
simulados son las respuestas de `apiRequest`, autenticación/almacenamiento y
módulos nativos. No se sustituyen los ViewModels, parsers, RepositoryCache,
Observer ni las vistas bajo prueba. No se envían solicitudes al backend.
El control nativo de refresco simulado conserva sus props/evento, que el preset
de React Native descarta por defecto. Los datos son sintéticos.

La aceptación sigue solicitudes de navegación con `rerender`, conservando el
proveedor real. La nueva integración de navegación usa `renderRouter`, compatible
con el SDK 58 y RNTL 14 instalados. Solo sustituye el destino de cámara por un
marcador; el escáner real tiene su suite existente independiente.

**Verificaciones**

| Verificación | Resultado |
| --- | --- |
| ESLint, `npx.cmd eslint src tests scripts --no-cache` | 0 errores; 10 advertencias existentes en archivos no modificados. |
| TypeScript, `npx.cmd tsc --noEmit` | Sin errores. |
| Unitarias, opciones de CI | 438 pruebas, 51 suites aprobadas. |
| Integración, opciones de CI | 154 pruebas, 16 suites aprobadas. |
| Aceptación, opciones de CI | 29 pruebas, 7 suites aprobadas. |
| Regresión completa con LCOV, opciones de CI | 592 pruebas, 67 suites aprobadas. |

Son **621 pruebas distintas**: las 592 de regresión ya incluyen las 438 unitarias
y 154 de integración; las 29 de aceptación se ejecutan por separado. La regresión
agrega 66 casos a la línea base, y aceptación agrega cuatro. Reassure no se
volvió a medir: esta tarea no modificó implementación de producción.

El wrapper `expo lint` no terminó en esta sesión local; se detuvieron sus procesos
y se ejecutó ESLint directamente sobre `src`, `tests` y `scripts`, incluyendo
todo el código modificado. No se cambió su configuración ni se excluyeron fuentes.

**Cobertura medida**

| Alcance | Líneas | Ramas |
| --- | ---: | ---: |
| Todo `src`, regresión | 2362/2932 = 80.55% | 2420/2991 = 80.90% |
| Todo `src/features/admin` | 332/332 = 100% | 418/428 = 97.66% |
| Código nuevo de la PR, contadores LCOV | 341/341 = 100% | 422/432 = 97.69% |

La combinación local de líneas y ramas nuevas es **98.71%**. El diff contra el
merge-base de `origin/develop` y las marcas `isNew` de SonarQube dan los mismos
341 contadores de línea y 432 caminos de rama nuevos.

SonarQube contabilizó 468 líneas ejecutables nuevas en el análisis anterior,
127 más que los contadores `DA` locales. La correspondencia de rutas y rangos
de línea es válida; la diferencia de líneas contabilizadas entre analizadores/
ejecuciones no permite prometer que SonarQube publicará exactamente el porcentaje
de Jest. Sin el artefacto remoto no se atribuye esa diferencia a una causa exacta.

Una estimación conservadora mantiene las 468 líneas de SonarQube y considera
las 127 sin contador local como descubiertas. Con 341 líneas y 422 caminos de rama
cubiertos, resulta `(341 + 422) / (468 + 432) = 84.78%`. Incluso ese cálculo
supera el umbral combinado de 80%; su cobertura de líneas sería 72.86%.
El Quality Gate consultado exige `new_coverage` combinado, no un umbral
independiente de líneas. **El resultado remoto de estos cambios sigue pendiente.**

**Cobertura final por archivo**

Porcentajes del archivo completo en el LCOV de regresión. `—` significa que
Jest no contabiliza ramas en ese archivo. Se incluyen todas las vistas y
ViewModels del administrador, sus modelos/API/repositorio, las rutas de
administración y los componentes compartidos afectados. Las dos rutas legales
con 0% son anteriores a esta PR y no tienen líneas nuevas en el diff revisado.

| Archivo | Líneas | Ramas |
| --- | ---: | ---: |
| `src/app/admin/_layout.tsx` | 100% | — |
| `src/app/admin/pickup-point.tsx` | 100% | — |
| `src/app/admin/scan.tsx` | 100% | — |
| `src/app/admin/shipping-rates.tsx` | 100% | — |
| `src/app/admin/(tabs)/_layout.tsx` | 100% | — |
| `src/app/admin/(tabs)/index.tsx` | 100% | — |
| `src/app/admin/(tabs)/orders.tsx` | 100% | — |
| `src/app/admin/(tabs)/users.tsx` | 100% | — |
| `src/app/admin/(tabs)/account/_layout.tsx` | 100% | — |
| `src/app/admin/(tabs)/account/index.tsx` | 100% | — |
| `src/app/admin/(tabs)/account/payments.tsx` | 100% | — |
| `src/app/admin/(tabs)/account/personal-data.tsx` | 100% | — |
| `src/app/admin/(tabs)/account/privacy.tsx` | 0% | — |
| `src/app/admin/(tabs)/account/terms.tsx` | 0% | — |
| `src/app/admin/delivery/[id].tsx` | 100% | — |
| `src/components/navigation/app-tab-bar.tsx` | 100% | 100% |
| `src/features/account/models/account-menu.ts` | 100% | — |
| `src/features/admin/api/admin-api.ts` | 100% | — |
| `src/features/admin/models/admin-dashboard.ts` | 100% | 94.73% |
| `src/features/admin/models/admin-format.ts` | 100% | 96.29% |
| `src/features/admin/models/admin-member.ts` | 100% | 95.65% |
| `src/features/admin/models/admin-more-menu.ts` | 100% | 100% |
| `src/features/admin/models/admin-order.ts` | 100% | 98.21% |
| `src/features/admin/models/pickup-point.ts` | 100% | — |
| `src/features/admin/models/shipping-rate.ts` | 100% | 100% |
| `src/features/admin/repositories/admin-repository.ts` | 100% | 100% |
| `src/features/admin/viewmodels/use-admin-home-view-model.ts` | 100% | 100% |
| `src/features/admin/viewmodels/use-admin-members-view-model.ts` | 100% | 100% |
| `src/features/admin/viewmodels/use-admin-more-view-model.ts` | 100% | 100% |
| `src/features/admin/viewmodels/use-admin-orders-view-model.ts` | 100% | 100% |
| `src/features/admin/viewmodels/use-pickup-point-view-model.ts` | 100% | 100% |
| `src/features/admin/viewmodels/use-shipping-rates-view-model.ts` | 100% | 92.30% |
| `src/features/admin/viewmodels/use-update-delivery-view-model.ts` | 100% | 100% |
| `src/features/admin/views/admin-home-view.tsx` | 100% | 100% |
| `src/features/admin/views/admin-members-view.tsx` | 100% | 100% |
| `src/features/admin/views/admin-more-view.tsx` | 100% | 95% |
| `src/features/admin/views/admin-orders-view.tsx` | 100% | 100% |
| `src/features/admin/views/admin-payments-view.tsx` | 100% | — |
| `src/features/admin/views/admin-ui.tsx` | 100% | 100% |
| `src/features/admin/views/admin-users-view.tsx` | 100% | — |
| `src/features/admin/views/order-status-badge.tsx` | 100% | 100% |
| `src/features/admin/views/pickup-point-view.tsx` | 100% | 75% |
| `src/features/admin/views/shipping-rates-view.tsx` | 100% | 100% |
| `src/features/admin/views/update-delivery-view.tsx` | 100% | 90% |
| `src/features/navigation/models/role-tabs.ts` | 100% | — |

**Reproducción y evidencias**

En PowerShell se usan los ejecutables `.cmd` porque la política local impide
ejecutar `npm.ps1`/`npx.ps1`. Las opciones de cobertura reproducen `ci.yml`:

```powershell
npx.cmd eslint src tests scripts --no-cache
npx.cmd tsc --noEmit
npm.cmd run test:unit -- --ci --runInBand --coverage --coverageDirectory=coverage/unitarias --coverageReporters=text --coverageReporters=json-summary
npm.cmd run test:integration -- --ci --runInBand --coverage --coverageDirectory=coverage/integracion --coverageReporters=text --coverageReporters=json-summary
npm.cmd run test:acceptance -- --ci --runInBand --coverage --coverageDirectory=coverage/aceptacion --coverageReporters=text --coverageReporters=json-summary --coverageReporters=html
npm.cmd test -- --ci --runInBand --coverage --collectCoverageFrom='src/**/*.{ts,tsx}' --coverageDirectory=coverage/regresion --coverageReporters=text --coverageReporters=json-summary --coverageReporters=lcov
git diff --no-ext-diff --no-renames --unified=0 origin/develop...HEAD -- src | Out-File -Encoding utf8 coverage/admin-new-code.diff
node scripts/report-new-code-coverage.cjs
```

El script de diagnóstico valida archivos/rangos y calcula cobertura en líneas
añadidas, incluyendo archivos movidos. También puede recibir un snapshot local
de líneas nuevas de SonarQube:

```powershell
node scripts/report-new-code-coverage.cjs coverage/regresion/lcov.info coverage/admin-new-code.diff coverage/admin-sonar-new-lines.json
```

Evidencias locales en `coverage/` (ignorado por Git):

- `admin-baseline/lcov.info`: regresión inicial, 526 pruebas.
- `regresion/lcov.info`, `regresion/coverage-summary.json`, `regresion/new-code-estimate.json`: medición final y estimación.
- `jest-unitarias-admin.json`, `jest-integracion-admin.json`, `jest-aceptacion-admin.json`, `jest-regresion-admin.json`: resultados detallados.
- `admin-remote-gate.json`, `admin-remote-files.json`, `admin-sonar-new-lines.json`, `admin-remote-gate-final.json`: métricas públicas y segunda comprobación del gate remoto.
- `admin-eslint-all.log`, `admin-typescript.log` y `admin-*.log`: salidas de verificación.

**Límites de la validación**

- Guardar estado de entrega, editar/crear tarifas y guardar el punto de recogida
  siguen pendientes del backend. Se prueba que los controles están deshabilitados
  y que el formulario es local; no se afirma persistencia ni notificación al cliente.
- Accesos, gráfica y vencimientos del tablero, así como los horarios de recogida,
  continúan siendo datos de ejemplo; las pruebas exigen sus distintivos.
- El panel de pagos y la vista antigua de usuarios son placeholders. Los socios
  muestran correo, verificación y alta; no hay ficha navegable ni membresía por
  socio disponible en estos contratos. La navegación real a la pestaña Socios sí
  está probada.
- No se validan servidor real, autorizaciones del backend, almacenamiento seguro,
  APK/dispositivo, gestos o animaciones nativas, rendimiento ni todas las ramas
  de plataforma. Las ramas residuales constan en el LCOV; el 100% de líneas no
  sustituye una prueba E2E en dispositivo.
- Las rutas legales anteriores de administrador requieren una prueba de sus
  wrappers para dejar de figurar con 0%; sus componentes compartidos tienen otras
  pruebas existentes, y esos wrappers no forman parte del código nuevo de la PR.
