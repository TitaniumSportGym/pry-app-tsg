# pry-app-tsg

Aplicacion movil desarrollada con Expo, React Native y TypeScript. Usa Expo Router para la navegacion basada en archivos dentro de `src/app`.

## Requisitos

- Node.js 22.13.x o superior compatible con Expo SDK 57.
- npm.
- Expo Go instalado en el celular, o un emulador de Android/iOS configurado.

## Instalacion

Desde la raiz del proyecto, instala las dependencias:

```bash
npm install
```

## Ejecutar el proyecto

Inicia el servidor de desarrollo de Expo:

```bash
npx expo start
```

Despues de ejecutar el comando, Expo mostrara un codigo QR en la terminal.

- En un celular: escanea el QR con Expo Go.
- En Android Emulator: presiona `a` en la terminal.
- En iOS Simulator: presiona `i` en la terminal.
- En navegador web: presiona `w` o ejecuta `npm run web`.

Si el celular no logra conectarse, prueba el modo tunnel:

```bash
npx expo start --tunnel
```

## Scripts disponibles

```bash
npm run start    # inicia Expo
npm run android  # abre en Android
npm run ios      # abre en iOS
npm run web      # abre en web
npm run lint     # ejecuta el linter de Expo
```

## Verificar el proyecto

Antes de entregar cambios, ejecuta:

```bash
npm run lint
npx tsc --noEmit
```

## Estructura principal

```text
src/
|-- app/                    Rutas y layouts delgados de Expo Router
|-- components/             Componentes visuales reutilizables
|-- features/
|   |-- authentication/
|   |-- registration/
|   |-- password-recovery/
|   `-- home/
|       |-- models/         Reglas, tipos y validaciones de dominio
|       |-- viewmodels/     Estado y acciones de cada pantalla
|       |-- views/          Interfaz y composicion visual
|       |-- api/            Adaptadores HTTP, cuando la funcion los necesita
|       `-- data/           Adaptadores de infraestructura no HTTP
|-- providers/              Estado global, como la sesion autenticada
|-- services/               Cliente HTTP, sesion segura y servicios existentes
|-- theme/                  Tokens globales de diseno
`-- types/                  Contratos compartidos con el backend

assets/                     Imagenes, iconos y recursos visuales
```

## Arquitectura MVVM

Las funcionalidades de la aplicacion siguen MVVM organizado por feature:

- **Model:** valida y representa las reglas del dominio sin renderizar interfaz.
- **ViewModel:** es un hook `use-*-view-model` que administra estado, ejecuta casos de uso y decide la navegacion posterior.
- **View:** renderiza componentes y delega los eventos al ViewModel.
- **Route:** obtiene parametros de Expo Router y monta la View correspondiente.

Las Views no deben importar `services/` ni `api/` directamente. Los ViewModels pueden usar esas capas y los Models deben mantenerse independientes de React siempre que no representen estado compartido. Los componentes de `src/components` no contienen reglas de una funcionalidad concreta.

## Notas

- No edites carpetas nativas `ios/` o `android/` si no existen; Expo las genera cuando se necesitan.
- Para instalar paquetes compatibles con esta version de Expo, usa:

```bash
npx expo install nombre-del-paquete
```
