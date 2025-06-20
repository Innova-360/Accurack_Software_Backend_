/*
  Warnings:

  - A unique constraint covering the columns `[sku]` on the table `Products` will be added. If there are existing duplicate values, this will fail.
  - Made the column `supplierId` on table `Products` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sku` on table `Products` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Products" DROP CONSTRAINT "Products_supplierId_fkey";

-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "packIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "supplierId" SET NOT NULL,
ALTER COLUMN "sku" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Products_sku_key" ON "Products"("sku");

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
