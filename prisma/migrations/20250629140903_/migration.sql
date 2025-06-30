/*
  Warnings:

  - You are about to drop the column `pluUpc` on the `SaleItem` table. All the data in the column will be lost.
  - You are about to drop the column `pluUpc` on the `SaleReturn` table. All the data in the column will be lost.
  - The `role` column on the `Users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[pluUpc]` on the table `Products` will be added. If there are existing duplicate values, this will fail.
  - Made the column `productId` on table `SaleItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `productId` on table `SaleReturn` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "SaleReturn" DROP CONSTRAINT "SaleReturn_productId_fkey";

-- AlterTable
ALTER TABLE "SaleItem" DROP COLUMN "pluUpc",
ALTER COLUMN "productId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SaleReturn" DROP COLUMN "pluUpc",
ALTER COLUMN "productId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Users" DROP COLUMN "role",
ADD COLUMN     "role" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Products_pluUpc_key" ON "Products"("pluUpc");

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
