# Backend Docker

El backend dispone de una imagen reproducible basada en Node.js 24.19.0. La
imagen ejecuta la API como el usuario sin privilegios `node`, incluye Prisma y
expone un health check interno en `/health/live`.

## Construcción local

Desde la raíz del repositorio:

```powershell
docker build -t afacop-backend:local .\BackEnd
```

Para iniciar la API utilizando un archivo local de variables que no esté
versionado:

```powershell
docker run --rm --init -p 4001:4000 --env-file .\BackEnd\.env -e PORT=4000 afacop-backend:local
```

Las migraciones no se ejecutan dentro de cada réplica. Antes de iniciar una
versión nueva deben ejecutarse una sola vez:

```powershell
docker run --rm --env-file .\BackEnd\.env afacop-backend:local npm run deploy:prepare
```

## Render

El servicio productivo actual usa el runtime nativo de Node. Render no permite
cambiar el runtime de un servicio existente, por lo que `render.yaml` permanece
sin modificaciones. `render.docker.yaml` crea el servicio paralelo
`afacop-backend-docker` para probar la imagen sin interrumpir producción.

1. Crear un Blueprint nuevo y seleccionar `render.docker.yaml`.
2. Para la validación inicial, utilizar una base PostgreSQL de staging. No
   ejecutar simultáneamente el servicio nativo y el servicio Docker sobre la
   base productiva, porque ambos pueden reanudar trabajos masivos pendientes.
3. Las migraciones se ejecutan una sola vez mediante `preDeployCommand`.
4. Probar `/health/ready`, inicio de sesión, MFA, CORS, importación y WebSocket.
5. Para el corte final, detener el backend anterior, copiar los secretos
   productivos (`DATABASE_URL`, `JWT_SECRET`, `MFA_ENCRYPTION_KEY` y demás),
   desplegar Docker y verificar `/health/ready`.
6. Solo después actualizar `VITE_API_URL` del frontend al nuevo dominio. Con un
   dominio propio para la API, el cambio puede hacerse sin modificar el frontend.

El contenedor no incorpora `.env`, archivos Excel, logs, dependencias locales ni
el cliente Prisma generado en la máquina del desarrollador.
