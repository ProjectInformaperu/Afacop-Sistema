ALTER TABLE "usuarios"
ADD COLUMN "mfa_habilitado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "mfa_secreto" TEXT,
ADD COLUMN "mfa_ultimo_uso" TIMESTAMPTZ,
ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "auditoria_seguridad" (
  "id_auditoria" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fecha" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "request_id" VARCHAR(100),
  "actor_id" UUID,
  "actor" VARCHAR(50),
  "rol" VARCHAR(30),
  "metodo" VARCHAR(10) NOT NULL,
  "ruta" VARCHAR(255) NOT NULL,
  "estado_http" INTEGER NOT NULL,
  "ip_hash" VARCHAR(64),
  "user_agent" VARCHAR(255),
  CONSTRAINT "auditoria_seguridad_pkey" PRIMARY KEY ("id_auditoria")
);

CREATE INDEX "auditoria_seguridad_fecha_idx" ON "auditoria_seguridad"("fecha");
CREATE INDEX "auditoria_seguridad_actor_id_fecha_idx" ON "auditoria_seguridad"("actor_id", "fecha");

CREATE TABLE "importaciones_masivas" (
  "id_importacion" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tipo" VARCHAR(30) NOT NULL,
  "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  "archivo" VARCHAR(255) NOT NULL,
  "ruta_temporal" TEXT NOT NULL,
  "actor_id" UUID,
  "total_filas" INTEGER NOT NULL DEFAULT 0,
  "procesadas" INTEGER NOT NULL DEFAULT 0,
  "insertadas" INTEGER NOT NULL DEFAULT 0,
  "actualizadas" INTEGER NOT NULL DEFAULT 0,
  "omitidas" INTEGER NOT NULL DEFAULT 0,
  "errores" INTEGER NOT NULL DEFAULT 0,
  "detalle_error" JSONB,
  "fecha_creacion" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_inicio" TIMESTAMPTZ,
  "fecha_fin" TIMESTAMPTZ,
  CONSTRAINT "importaciones_masivas_pkey" PRIMARY KEY ("id_importacion")
);
CREATE INDEX "importaciones_masivas_estado_fecha_creacion_idx" ON "importaciones_masivas"("estado", "fecha_creacion");
CREATE INDEX "importaciones_masivas_actor_id_fecha_creacion_idx" ON "importaciones_masivas"("actor_id", "fecha_creacion");
CREATE UNIQUE INDEX "admisiones_id_cliente_key" ON "admisiones"("id_cliente");
