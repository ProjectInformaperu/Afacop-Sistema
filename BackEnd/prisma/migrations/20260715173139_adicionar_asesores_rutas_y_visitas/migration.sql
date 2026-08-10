-- CreateTable
CREATE TABLE "asesores" (
    "id_asesor" SERIAL NOT NULL,
    "dni" VARCHAR(20) NOT NULL,
    "nombres" VARCHAR(150) NOT NULL,
    "apellido_paterno" VARCHAR(100) NOT NULL,
    "apellido_materno" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(20),
    "correo" VARCHAR(150),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizar" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asesores_pkey" PRIMARY KEY ("id_asesor")
);

-- CreateTable
CREATE TABLE "asignaciones_clientes" (
    "id_asignacion" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_asesor" INTEGER NOT NULL,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMP(3),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',

    CONSTRAINT "asignaciones_clientes_pkey" PRIMARY KEY ("id_asignacion")
);

-- CreateTable
CREATE TABLE "rutas" (
    "id_ruta" SERIAL NOT NULL,
    "id_asesor" INTEGER NOT NULL,
    "fecha_programada" TIMESTAMP(3) NOT NULL,
    "fecha_inicio_real" TIMESTAMP(3),
    "fecha_fin_real" TIMESTAMP(3),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizar" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rutas_pkey" PRIMARY KEY ("id_ruta")
);

-- CreateTable
CREATE TABLE "rutas_clientes" (
    "id_ruta_cliente" SERIAL NOT NULL,
    "id_ruta" INTEGER NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "secuencia" INTEGER NOT NULL DEFAULT 0,
    "estado_visita" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "prioridad" VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizar" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rutas_clientes_pkey" PRIMARY KEY ("id_ruta_cliente")
);

-- CreateTable
CREATE TABLE "visitas" (
    "id_visita" SERIAL NOT NULL,
    "id_ruta_cliente" INTEGER,
    "id_cliente" INTEGER NOT NULL,
    "id_asesor" INTEGER NOT NULL,
    "tipo_visita" VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA',
    "fecha_hora_checkin" TIMESTAMP(3) NOT NULL,
    "fecha_hora_checkout" TIMESTAMP(3),
    "latitud" DECIMAL(10,8) NOT NULL,
    "longitud" DECIMAL(11,8) NOT NULL,
    "resultado" VARCHAR(50) NOT NULL,
    "es_efectiva" BOOLEAN NOT NULL DEFAULT false,
    "monto_recaudado" DECIMAL(12,2),
    "fecha_promesa" TIMESTAMP(3),
    "observaciones" TEXT,
    "foto_url" VARCHAR(255),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizar" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitas_pkey" PRIMARY KEY ("id_visita")
);

-- CreateIndex
CREATE UNIQUE INDEX "asesores_dni_key" ON "asesores"("dni");

-- CreateIndex
CREATE INDEX "asignaciones_clientes_id_asesor_idx" ON "asignaciones_clientes"("id_asesor");

-- CreateIndex
CREATE INDEX "asignaciones_clientes_id_cliente_idx" ON "asignaciones_clientes"("id_cliente");

-- CreateIndex
CREATE INDEX "rutas_id_asesor_fecha_programada_idx" ON "rutas"("id_asesor", "fecha_programada");

-- CreateIndex
CREATE INDEX "rutas_fecha_programada_idx" ON "rutas"("fecha_programada");

-- CreateIndex
CREATE INDEX "rutas_clientes_id_cliente_idx" ON "rutas_clientes"("id_cliente");

-- CreateIndex
CREATE UNIQUE INDEX "rutas_clientes_id_ruta_id_cliente_key" ON "rutas_clientes"("id_ruta", "id_cliente");

-- CreateIndex
CREATE INDEX "visitas_id_ruta_cliente_idx" ON "visitas"("id_ruta_cliente");

-- CreateIndex
CREATE INDEX "visitas_id_cliente_idx" ON "visitas"("id_cliente");

-- CreateIndex
CREATE INDEX "visitas_id_asesor_fecha_hora_checkin_idx" ON "visitas"("id_asesor", "fecha_hora_checkin");

-- AddForeignKey
ALTER TABLE "asignaciones_clientes" ADD CONSTRAINT "asignaciones_clientes_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_clientes" ADD CONSTRAINT "asignaciones_clientes_id_asesor_fkey" FOREIGN KEY ("id_asesor") REFERENCES "asesores"("id_asesor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutas" ADD CONSTRAINT "rutas_id_asesor_fkey" FOREIGN KEY ("id_asesor") REFERENCES "asesores"("id_asesor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutas_clientes" ADD CONSTRAINT "rutas_clientes_id_ruta_fkey" FOREIGN KEY ("id_ruta") REFERENCES "rutas"("id_ruta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutas_clientes" ADD CONSTRAINT "rutas_clientes_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_id_ruta_cliente_fkey" FOREIGN KEY ("id_ruta_cliente") REFERENCES "rutas_clientes"("id_ruta_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_id_asesor_fkey" FOREIGN KEY ("id_asesor") REFERENCES "asesores"("id_asesor") ON DELETE RESTRICT ON UPDATE CASCADE;
