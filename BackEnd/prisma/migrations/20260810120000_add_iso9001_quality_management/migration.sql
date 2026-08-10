CREATE TABLE "registros_calidad" (
  "id_registro" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tipo" VARCHAR(40) NOT NULL,
  "codigo" VARCHAR(40) NOT NULL,
  "titulo" VARCHAR(200) NOT NULL,
  "descripcion" TEXT,
  "estado" VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
  "responsable_id" UUID,
  "responsable" VARCHAR(150),
  "fecha_objetivo" TIMESTAMPTZ,
  "fecha_cierre" TIMESTAMPTZ,
  "clausula_iso" VARCHAR(30),
  "indicador" VARCHAR(150),
  "meta" DECIMAL(14,4),
  "valor_actual" DECIMAL(14,4),
  "unidad" VARCHAR(30),
  "datos" JSONB,
  "evidencia" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "creado_por" UUID,
  "actualizado_por" UUID,
  "fecha_creacion" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizar" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registros_calidad_pkey" PRIMARY KEY ("id_registro"),
  CONSTRAINT "registros_calidad_codigo_key" UNIQUE ("codigo")
);

CREATE TABLE "historial_calidad" (
  "id_historial" UUID NOT NULL DEFAULT gen_random_uuid(),
  "id_registro" UUID NOT NULL,
  "accion" VARCHAR(30) NOT NULL,
  "version" INTEGER NOT NULL,
  "actor_id" UUID,
  "actor" VARCHAR(100),
  "detalle" JSONB,
  "fecha" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "historial_calidad_pkey" PRIMARY KEY ("id_historial"),
  CONSTRAINT "historial_calidad_registro_fkey" FOREIGN KEY ("id_registro") REFERENCES "registros_calidad"("id_registro") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "registros_calidad_tipo_estado_idx" ON "registros_calidad"("tipo", "estado");
CREATE INDEX "registros_calidad_fecha_objetivo_idx" ON "registros_calidad"("fecha_objetivo");
CREATE INDEX "registros_calidad_responsable_id_idx" ON "registros_calidad"("responsable_id");
CREATE INDEX "historial_calidad_id_registro_fecha_idx" ON "historial_calidad"("id_registro", "fecha");
CREATE INDEX "historial_calidad_fecha_idx" ON "historial_calidad"("fecha");
