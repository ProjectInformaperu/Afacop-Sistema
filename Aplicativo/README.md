# Mi Radar 360 Mobile

Aplicación React Native/Expo conectada al backend de Radar 360.

## Configuración

1. Copie `.env.example` a `.env`.
2. Emulador Android: `EXPO_PUBLIC_API_URL=http://10.0.2.2:4001`.
3. Teléfono físico: reemplace `10.0.2.2` por la IP LAN del equipo que ejecuta el backend.
4. Inicie el backend en el puerto 4001 y luego ejecute `npm start`.

## APK

El proyecto incluye `eas.json`. Para una compilación APK de prueba:

```powershell
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

La compilación local requiere JDK 17 y Android SDK, que no están instalados actualmente en este equipo.

## Seguridad

- Token JWT almacenado con `expo-secure-store`.
- MFA compatible con el backend.
- Cierre de sesión revocable.
- La URL HTTP local sólo se admite para desarrollo; en producción configure una API HTTPS.
