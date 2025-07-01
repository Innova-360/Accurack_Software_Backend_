/*
  Warnings:

  - You are about to drop the column `category` on the `ProductSupplier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProductSupplier" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT;

-- AddForeignKey
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
