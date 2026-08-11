# Despliegue de Radar 360 en Render

El archivo `render.yaml` despliega el backend y el frontend como un Blueprint.

## Procedimiento

1. Subir este repositorio a GitHub.
2. En Render elegir **New > Blueprint** y seleccionar el repositorio.
3. Render solicitará `DATABASE_URL` e `INITIAL_ADMIN_PASSWORD`. Pegar la URL externa de PostgreSQL incluyendo `?sslmode=require`, y definir una contraseña administrativa robusta.
4. Crear los dos servicios. Render generará automáticamente `JWT_SECRET` y `MFA_ENCRYPTION_KEY`.
5. Esperar a que el pre-deploy aplique las migraciones Prisma y verificar:
   - Backend: `https://afacop-backend.onrender.com/health/ready`
   - Frontend: `https://afacop-frontend.onrender.com`

El primer acceso usa el usuario `Afacop` y la contraseña secreta configurada en `INITIAL_ADMIN_PASSWORD`. `Afacop` es el nombre de acceso; su rol independiente es `ADMINISTRADOR`. El inicio de sesión no distingue mayúsculas de minúsculas. Si la base ya contiene un administrador, el bootstrap no modifica la cuenta salvo durante la inicialización segura o cuando `RESET_INITIAL_ADMIN=true`. Con MFA obligatorio, el primer inicio solicitará vincular Google Authenticator o cualquier aplicación TOTP compatible.

La cuenta inicial `Afacop` está exceptuada de MFA mediante `MFA_EXEMPT_USERNAMES=Afacop`. La excepción se aplica por nombre de usuario, no por rol: los demás administradores y asesores continúan sujetos a `REQUIRE_MFA=true`.

Para recuperar un administrador existente, establezca temporalmente `RESET_INITIAL_ADMIN=true` y una nueva `INITIAL_ADMIN_PASSWORD`, despliegue una vez y vuelva inmediatamente `RESET_INITIAL_ADMIN=false`. El proceso desbloquea la cuenta, invalida sesiones y exige enrolar MFA de nuevo.

Si PostgreSQL ya contiene el esquema pero todavía no tiene historial de Prisma, el despliegue valida tablas, columnas e índices críticos y registra automáticamente el baseline sin eliminar ni reemplazar datos. Si la estructura no es compatible, el despliegue se detiene de forma segura e informa los elementos faltantes.

## Si Render cambia los nombres o dominios

- En el backend actualizar `FRONTEND_URL` con la URL HTTPS exacta del frontend, sin `/` al final.
- En el frontend actualizar `VITE_API_URL` con la URL HTTPS exacta del backend, sin `/` al final, y ejecutar un nuevo deploy.
- Nunca habilitar `CORS_ALLOW_ALL=true` en producción.

## Seguridad

No guardar `DATABASE_URL`, contraseñas, JWT ni claves MFA en Git. Rotar inmediatamente cualquier credencial publicada en chats, capturas, commits o registros.
