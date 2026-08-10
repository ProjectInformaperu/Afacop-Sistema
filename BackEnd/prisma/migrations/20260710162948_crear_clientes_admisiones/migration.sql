-- CreateTable
CREATE TABLE "clientes" (
    "id_cliente" SERIAL NOT NULL,
    "dni" VARCHAR(20) NOT NULL,
    "telefono" VARCHAR(20),
    "nombres" VARCHAR(150) NOT NULL,
    "apellido_paterno" VARCHAR(100) NOT NULL,
    "apellido_materno" VARCHAR(100) NOT NULL,
    "direccion" VARCHAR(255),
    "distrito" VARCHAR(100),
    "deuda_actual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    "ultima_gestion" TIMESTAMP(3),
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "admisiones" (
    "id_admision" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "producto" VARCHAR(150) NOT NULL,
    "linea_credito" DECIMAL(12,2) NOT NULL,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,

    CONSTRAINT "admisiones_pkey" PRIMARY KEY ("id_admision")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_dni_key" ON "clientes"("dni");

-- AddForeignKey
ALTER TABLE "admisiones" ADD CONSTRAINT "admisiones_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;
