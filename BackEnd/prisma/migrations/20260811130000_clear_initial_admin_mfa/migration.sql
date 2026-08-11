-- Corrige únicamente el estado heredado de la cuenta inicial. Después de esta
-- migración, el administrador puede volver a activar MFA voluntariamente desde
-- Control de Acceso y el enrolamiento se conservará normalmente.
UPDATE "usuarios"
SET
  "mfa_requerido" = false,
  "mfa_habilitado" = false,
  "mfa_secreto" = NULL,
  "mfa_ultimo_uso" = NULL,
  "token_version" = "token_version" + 1
WHERE LOWER("username") = 'afacop';
