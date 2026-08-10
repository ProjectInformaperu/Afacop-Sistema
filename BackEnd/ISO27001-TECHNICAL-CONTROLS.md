# Matriz técnica ISO/IEC 27001:2022

Esta matriz registra evidencia técnica del backend. La aplicabilidad definitiva proviene de la evaluación de riesgos y la Declaración de Aplicabilidad del SGSI.

| Tema | Evidencia implementada | Evidencia externa requerida |
|---|---|---|
| Identidad | JWT con algoritmo, emisor, audiencia, tipo, expiración, versión revocable y usuario activo en BD | Ciclo formal de altas/bajas y revisiones |
| MFA | TOTP, desafío de 5 minutos, AES-256-GCM y prevención de reutilización | Enrolamiento obligatorio y soporte operativo |
| Autorización | RBAC en rutas y cartera del asesor limitada a asignaciones activas | Matriz aprobada y revisiones periódicas |
| Desarrollo seguro | Zod, errores seguros, límites y pruebas automatizadas | SDLC, revisión independiente, SAST/DAST y pentest |
| Configuración | Helmet, CORS exacto, timeouts y validación fail-fast | Baseline de infraestructura y gestión de cambios |
| Auditoría | JSON correlacionado y persistencia en BD con IP seudonimizada | Exportación a SIEM inmutable, alertas y retención |
| Vulnerabilidades | `npm audit` sin vulnerabilidades productivas conocidas al 2026-08-06; parser vulnerable retirado y reemplazado por ExcelJS con `uuid` corregido | Escaneo continuo y SLA de remediación |
| Carga masiva | XLSX por streaming, trabajos persistentes, lotes, límites, firma ZIP, RBAC, progreso y limpieza temporal | Antivirus/CDR corporativo y política de retención aprobada |
| Continuidad | Health checks y cierre ordenado | Backups, RTO/RPO y restauraciones probadas |
| Datos | Hash de contraseñas, cifrado de secretos MFA y redacción de secretos | Clasificación, cifrado de infraestructura, DLP y retención |

## Estado verificable

- Los controles técnicos implementables en este repositorio tienen pruebas y compilación satisfactoria.
- La base local fue sincronizada de forma no destructiva con los campos MFA, revocación y auditoría.
- El archivo `test_asesores.xlsx` permanece intacto. La carga masiva fue restaurada con un parser mantenido y procesamiento desacoplado.
- El entorno real debe proporcionar secretos independientes y aleatorios mediante un gestor de secretos.
- Ningún repositorio puede demostrar por sí solo conformidad o certificación ISO/IEC 27001 completa.

Consulte `compliance/ISO27001-READINESS-CHECKLIST.md` para la evidencia organizacional e infraestructura pendiente.
