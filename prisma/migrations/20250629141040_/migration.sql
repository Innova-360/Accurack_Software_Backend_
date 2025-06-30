/*
  Warnings:

  - Added the required column `pluUpc` to the `SaleItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pluUpc` to the `SaleReturn` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "SaleReturn" DROP CONSTRAINT "SaleReturn_productId_fkey";

-- DropIndex
DROP INDEX "Products_pluUpc_key";

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "pluUpc" TEXT NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SaleReturn" ADD COLUMN     "pluUpc" TEXT NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
