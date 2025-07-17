/*
  Warnings:

  - You are about to drop the column `packQuantity` on the `SaleItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_packId_fkey";

-- AlterTable
ALTER TABLE "SaleItem" DROP COLUMN "packQuantity";
