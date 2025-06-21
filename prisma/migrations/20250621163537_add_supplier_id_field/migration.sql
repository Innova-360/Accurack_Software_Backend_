/*
  Warnings:

  - A unique constraint covering the columns `[supplier_id]` on the table `Suppliers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `supplier_id` to the `Suppliers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Suppliers" ADD COLUMN     "supplier_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Suppliers_supplier_id_key" ON "Suppliers"("supplier_id");
