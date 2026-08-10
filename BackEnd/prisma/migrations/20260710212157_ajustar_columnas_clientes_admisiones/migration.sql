/*
  Warnings:

  - You are about to drop the column `observaciones` on the `admisiones` table. All the data in the column will be lost.
  - You are about to drop the column `deuda_actual` on the `clientes` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_registro` on the `clientes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "admisiones" DROP COLUMN "observaciones",
ALTER COLUMN "producto" DROP NOT NULL,
ALTER COLUMN "linea_credito" DROP NOT NULL,
ALTER COLUMN "fecha" DROP NOT NULL,
ALTER COLUMN "fecha" DROP DEFAULT;

-- AlterTable
ALTER TABLE "clientes" DROP COLUMN "deuda_actual",
DROP COLUMN "fecha_registro",
ADD COLUMN     "deuda_castigada" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "deuda_vigente" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otras_deudas" DECIMAL(12,2) NOT NULL DEFAULT 0;
