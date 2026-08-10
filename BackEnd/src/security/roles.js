export const ROLES = Object.freeze({
  ADMINISTRADOR: 'ADMINISTRADOR', GERENTE: 'GERENTE', SUPERVISOR: 'SUPERVISOR',
  ASESOR: 'ASESOR', AUDITOR: 'AUDITOR',
});

const aliases = Object.freeze({ ADMIN: ROLES.ADMINISTRADOR, WORKER: ROLES.ASESOR });
export const normalizeRole = role => aliases[role] || role;
export const ALL_ROLES = Object.freeze(Object.values(ROLES));
export const ADMIN_ROLES = Object.freeze([ROLES.ADMINISTRADOR]);
export const OPERATIONAL_MANAGERS = Object.freeze([ROLES.ADMINISTRADOR, ROLES.GERENTE, ROLES.SUPERVISOR]);
export const ADMISSION_READERS = Object.freeze([ROLES.ADMINISTRADOR, ROLES.GERENTE, ROLES.AUDITOR]);
export const AUDIT_READERS = Object.freeze([ROLES.ADMINISTRADOR, ROLES.GERENTE, ROLES.AUDITOR]);
