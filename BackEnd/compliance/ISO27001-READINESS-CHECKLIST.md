# Checklist de preparación ISO/IEC 27001:2022

Un elemento solo puede marcarse cumplido con responsable, fecha y evidencia verificable.

## Evidencia técnica implementada

- [x] JWT breve y revocación de sesiones.
- [x] MFA TOTP obligatorio configurable, secreto cifrado, protección contra reutilización y recuperación administrativa auditada.
- [x] RBAC centralizado y segregación de módulos.
- [x] Restricción de cartera activa para cuentas de asesor.
- [x] Validación, rate limiting, CORS allowlist, Helmet y errores seguros.
- [x] Auditoría JSON y persistencia con IP seudonimizada.
- [x] Dependencias productivas sin vulnerabilidades conocidas al 6 de agosto de 2026.
- [x] Health checks, timeouts y cierre ordenado.

## Evidencia organizacional pendiente

- [ ] Alcance formal del SGSI aprobado por dirección.
- [ ] Inventario y propietarios de activos.
- [ ] Evaluación y tratamiento de riesgos aprobados.
- [ ] Declaración de Aplicabilidad con justificación por control.
- [ ] Políticas de acceso, proveedores, backup, retención y clasificación.
- [ ] Proceso de altas, cambios, bajas y revisión de privilegios.
- [ ] Plan de incidentes probado y obligaciones legales identificadas.
- [ ] BCP/DR con RTO/RPO y restauración probada.
- [ ] Capacitación de seguridad.
- [ ] SAST/DAST, pentest independiente y remediación registrada.
- [ ] Auditoría interna y revisión de dirección.
- [ ] Auditoría de certificación por organismo acreditado.

## Evidencia de infraestructura pendiente

- [ ] TLS 1.2+ en entrada y PostgreSQL, probado externamente.
- [ ] Gestor de secretos y rotación demostrable.
- [ ] Cifrado de discos y backups.
- [ ] SIEM inmutable con alertas y retención aprobada.
- [ ] Segmentación de red y hardening del host.
- [ ] Monitoreo, parcheo y gestión de vulnerabilidades con SLA.
