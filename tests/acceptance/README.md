# Actividad 4: aceptación automatizada simulada

Los escenarios ejecutan componentes, ViewModels, validaciones, `AuthProvider` y `CartProvider`
reales con Jest y React Native Testing Library. Usan los mismos contratos de mocks
que `tests/integration/`: Expo Router, servicios de autenticación, almacenamiento
de sesión, gateway de Google, áreas seguras y APIs de membresías/productos.
`jest-expo` simula los módulos nativos. Todos los datos son ficticios.

Son pruebas de aceptación **simuladas en Node.js**, con criterios observables
desde la perspectiva del usuario. No ejecutan la APK, un dispositivo, una red real
ni un backend. No prueban persistencia segura, autenticación del servidor,
protección real de rutas, renderizado nativo, gestos ni rendimiento de la APK.
Una E2E de la APK requeriría instalarla en dispositivo/emulador y automatizar esos
recorridos con su infraestructura de pruebas.

La navegación se verifica como una solicitud a `router.push/replace`. Para
consultar la pantalla siguiente, `rerender` cambia explícitamente la vista y
conserva los proveedores de sesión y carrito; el catálogo recibe `category`/`q`
y los detalles reciben el ID de la solicitud de
navegación capturada. Esto no ejecuta los layouts ni el navegador de Expo Router.
SDK 57 usa un helper `expo-router/testing-library` compatible con RNTL 13, mientras
este proyecto ya usa RNTL 14; no se cambian versiones para incorporar esta suite.
Consulta la [nota de compatibilidad de Expo](https://docs.expo.dev/router/reference/testing/).

## Criterios y trazabilidad

Los identificadores `CA-*` aparecen en los nombres de Jest y en el informe JSON.
Cada escenario se organiza como dado/cuando/entonces. Las pruebas existentes de
integración conservan sus nombres, archivos y objetivos.

| Criterio | Dado / cuando | Resultado funcional exigido |
| --- | --- | --- |
| CA-LOGIN-01 | Formulario vacío; corregir y enviar | Se eliminan errores de campos, se normaliza el correo y Más muestra correo, rol Cliente y accesos de la cuenta autenticada. |
| CA-LOGIN-02 | Credenciales rechazadas; corregir contraseña | Se conserva el correo, se permite reintentar y desaparece el error al acceder a la cuenta. |
| CA-LOGIN-03 | Cuenta con doble factor; enviar contraseña | Se solicita verificar OTP y la cuenta permanece como visitante. |
| CA-ROL-01 | Cliente; iniciar, consultar accesos y confirmar cierre de sesión | Solicita `/`; Mi membresía y Membresías Titanium abren `/memberships`. Solo después de confirmar CERRAR SESIÓN desaparecen perfil y accesos privados. |
| CA-ROL-02 | Entrenador; iniciar, abrir membresías/clientes y confirmar salida | Solicita `/trainer`; Membresías del gimnasio abre `/trainer/account/memberships` y Mis clientes abre `/trainer/clients`. Al confirmar salida desaparecen sus opciones. |
| CA-ROL-03 | Administrador; iniciar, consultar administración y confirmar salida | Solicita `/admin`, ofrece Usuarios/Pagos con sus rutas y no ofrece opciones de membresía de cliente o entrenador; al confirmar salida elimina el perfil. |
| CA-ROL-04 | Rol desconocido; iniciar sesión | Explica la denegación, revoca la sesión y mantiene la cuenta como visitante. |
| CA-MEM-01 | Visitante; comparar y abrir plan grupal | Cambia la selección accesible, quita precio/beneficios previos y conserva precio, duración y cobertura en `/memberships/[id]`. La acción Comprar está visible. |
| CA-MEM-02 | Entrenador; comparar y abrir plan grupal | Conserva los mismos datos en `/trainer/account/memberships/[id]`; no ofrece compra ni en lista ni en detalle. |
| CA-MEM-03 | Elegir tarifa estudiantil y abrir detalle | Expone el precio elegido y el requisito de credencial vigente antes de decidir. |
| CA-MEM-04 | Falla de conexión; reintentar y abrir plan | Sustituye el error por planes utilizables y permite continuar al detalle. |
| CA-MEM-05 | No hay planes | Orienta a volver más tarde y no ofrece detalles inexistentes. |
| CA-CAT-01 | Visitante; abrir categoría desde Tienda y combinar filtros en Catálogo | Tienda muestra categorías con cantidades y Nuevos ordenados por fecha sin agotados; transmite `category` a `/store/catalog`. El catálogo conserva búsqueda al cambiar categoría y permite recuperar todos los productos. |
| CA-CAT-02 | Ver todo; abrir producto disponible | Abre `/store/catalog` y después `/store/[id]`, conserva identidad, precio, marca, categoría, especificaciones y disponibilidad; indica que el carrito requiere sesión. |
| CA-CAT-03 | Ver todo; abrir producto agotado | El agotado está ausente de Nuevos pero disponible para consulta en Catálogo y detalle; conserva identidad/precio y deshabilita AGOTADO/COMPRAR. |
| CA-CAT-04 | Falla de conexión; reintentar y enviar búsqueda por marca | El error desaparece; Buscar transmite `q` a `/store/catalog` y se muestran solo las coincidencias de marca. |
| CA-CAT-05 | Tienda y catálogo vacíos | Tienda orienta a volver pronto; buscar lleva al catálogo, que informa ausencia de inventario sin confundirla con filtros sin coincidencias o un error de red. |

Estos recorridos agregan validaciones respecto de las pruebas de integración:
recuperación del formulario y sesión visible, cierre de sesión por rol,
consistencia entre selección y detalle, requisitos estudiantiles, filtros
combinados y continuidad del recorrido tras recuperarse de errores.

## Adaptación tras integrar develop

Se conservan **17 pruebas con los mismos 17 identificadores**, sin `.skip`,
`.only` ni mocks de los ViewModels o modelos. Los cambios funcionales integrados
requieren reformular estas expectativas anteriores:

- La pantalla Cuenta ahora es **Más**. Para un visitante se verifica el encabezado
  `Inicia sesión` y las acciones Iniciar sesión/Crear cuenta. Para una sesión
  autenticada se comprueban correo, rol y opciones reales, reemplazando el texto
  eliminado `Sesión segura` por evidencia funcional del perfil.
- Cerrar sesión requiere **confirmación nativa**. CA-ROL-01/02/03 verifican el
  diálogo, que no haya logout anticipado y que el callback real de confirmación
  cierre la sesión. Se simula solo `Alert.alert`; no se invoca directamente
  `signOut` ni se omite la lógica del ViewModel. Los mocks del diálogo se restauran.
- El cliente tiene botones de membresía propios; no debe exigirse la ausencia
  de todos los accesos a membresías. Los accesos de entrenador y administrador
  se verifican por separado. Las rutas de cliente usan `/memberships`; las del
  entrenador siguen bajo `/trainer/account/memberships`.
- La búsqueda y los chips filtran en **Catálogo**. Tienda muestra categorías y
  Nuevos, y navega a `/store/catalog` con `category` o `q`; escribir en Tienda
  ya no filtra sus tarjetas al instante. Los agotados se consultan en Catálogo,
  no en Nuevos. Estos criterios se prueban como recorridos entre las vistas reales,
  pasando los parámetros capturados de la solicitud de navegación.
- Las especificaciones del detalle ahora se presentan como `Presentación: 300 g`
  o `Talla: M`. Se verifica la información completa, no se elimina la validación.

Los fixtures satisfacen el contrato `Product.createdAt: Date | null`: se conserva
el `null` existente y se añade una fecha fija a proteína para comprobar el orden
de Nuevos sin depender del reloj. El wrapper monta el carrito real igual que la
app. El mock de `useSafeAreaInsets` usa una función estable, como integración,
para que `resetAllMocks` no borre las métricas nativas simuladas; no altera lógica
de autenticación, filtrado, navegación ni carrito. No se modifican pantallas,
ViewModels, rutas, suites de integración, workflows, EAS Build o k6.

## Ejecución y separación de suites

```bash
npm run test:acceptance -- --ci --runInBand
npm run lint
npx tsc --noEmit
npm test -- --ci --runInBand # regresión de las suites existentes
```

En PowerShell con scripts `.ps1` deshabilitados, usar `npm.cmd` y `npx.cmd`.

Los archivos `*.acceptance.tsx` se descubren exclusivamente con
`tests/acceptance/jest.config.cjs`, que reutiliza el preset y timeout del proyecto.
El sufijo no coincide con el descubrimiento predeterminado de Jest ni con las
pruebas `*.perf-test.tsx` de Reassure. Así, `test:unit`, `test:integration`, `test`
(regresión existente) y `test:perf` mantienen su alcance y sus scripts intactos.
La aceptación se ejecuta adicionalmente, en un job independiente.

Se puede comprobar la separación sin ejecutar pruebas:

```bash
npm run test:unit -- --listTests --runInBand
npm run test:integration -- --listTests --runInBand
npm run test:acceptance -- --listTests --runInBand
```

## Evidencia en GitHub Actions

El job `pruebas-aceptacion` requiere éxito de `analisis-estatico`,
`pruebas-unitarias` y `pruebas-integracion` mediante `needs`. Una prueba fallida
produce salida distinta de cero; `set -o pipefail` conserva ese resultado al
capturar el log con `tee`. No hay `continue-on-error` ni `--passWithNoTests`.

El resumen de Actions reutiliza `scripts/ci-summary.cjs`. El artifact
`pruebas-aceptacion-<run_id>-<run_attempt>` conserva durante 14 días:

- `jest-aceptacion.json`: suites, criterios `CA-*`, resultados y fallos de Jest.
- `aceptacion.log`: salida de la ejecución.
- `aceptacion-instalacion.log`: diagnóstico de instalación, incluso si falla `npm ci`.
- `coverage/aceptacion/coverage-summary.json`: cobertura cuantitativa.
- `coverage/aceptacion/index.html` y recursos: informe navegable de cobertura.

El resumen y `actions/upload-artifact@v4` tienen `if: always()`: se intentan
publicar incluso si fallan las pruebas. Si la instalación impide arrancar Jest,
el resumen indica que no existe JSON y el job conserva el fallo; el artifact
incluye el log de instalación y los archivos que hayan llegado a generarse. No se considera
aprobada una ejecución sin resultados. La cobertura mide código ejecutado en
este entorno simulado, no cobertura de la APK ni cumplimiento de todos los
criterios del sistema.

Para generar los mismos informes localmente, con rutas ignoradas por Git:

```bash
npm run test:acceptance -- --ci --runInBand --coverage --coverageDirectory=coverage/aceptacion --coverageReporters=text --coverageReporters=json-summary --coverageReporters=html --json --outputFile=coverage/aceptacion/jest-aceptacion.json
```
