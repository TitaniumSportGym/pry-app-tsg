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
src/app/          Pantallas y layouts de Expo Router
src/components/   Componentes reutilizables
src/constants/    Constantes de la aplicacion
src/hooks/        Hooks personalizados
assets/           Imagenes, iconos y recursos visuales
```

## Notas

- No edites carpetas nativas `ios/` o `android/` si no existen; Expo las genera cuando se necesitan.
- Para instalar paquetes compatibles con esta version de Expo, usa:

```bash
npx expo install nombre-del-paquete
```
