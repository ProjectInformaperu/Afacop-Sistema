# Política técnica de seguridad

Este repositorio implementa controles técnicos de apoyo a un SGSI basado en ISO/IEC 27001:2022. No constituye por sí solo una certificación.

## Reporte de vulnerabilidades

No publique vulnerabilidades en incidencias abiertas. Repórtelas al responsable de seguridad designado, incluyendo impacto, reproducción mínima y versión afectada.

## Despliegue obligatorio

- TLS 1.2 o superior en el proxy y PostgreSQL.
- Secretos obtenidos desde un gestor; nunca incluidos en código, imágenes o repositorio.
- `JWT_SECRET` y `MFA_ENCRYPTION_KEY` distintos, aleatorios y de 32 caracteres como mínimo.
- `FRONTEND_URL` con orígenes exactos, sin comodines.
- Usuario de ejecución sin privilegios, filesystem de solo lectura y red mínima.
- Logs JSON enviados a almacenamiento inmutable con retención y acceso restringido.
- Aplicar migraciones antes de activar MFA y comprobar la tabla `auditoria_seguridad`.
- Ejecutar `npm test`, `npm run security:audit` y pruebas de integración en CI.
- Backups cifrados con restauración periódicamente probada.

## Respuesta a incidentes

Ante exposición de credenciales: revocar sesiones, rotar secretos, preservar logs, evaluar alcance, notificar conforme a las obligaciones aplicables y registrar acciones correctivas.
