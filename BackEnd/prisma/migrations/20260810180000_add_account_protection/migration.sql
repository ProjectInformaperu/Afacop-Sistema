ALTER TABLE "usuarios"
ADD COLUMN "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "bloqueado_hasta" TIMESTAMPTZ,
ADD COLUMN "ultimo_acceso" TIMESTAMPTZ,
ADD COLUMN "password_cambio" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "usuarios_bloqueado_hasta_idx" ON "usuarios"("bloqueado_hasta");
