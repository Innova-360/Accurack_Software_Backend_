/*
  Warnings:

  - You are about to drop the column `employeeId` on the `Expenses` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `PurchaseOrders` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `Sales` table. All the data in the column will be lost.
  - You are about to drop the `Employees` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[employeeCode]` on the table `Users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `PurchaseOrders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Sales` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Employees" DROP CONSTRAINT "Employees_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Expenses" DROP CONSTRAINT "Expenses_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrders" DROP CONSTRAINT "PurchaseOrders_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Sales" DROP CONSTRAINT "Sales_employeeId_fkey";

-- AlterTable
ALTER TABLE "Expenses" DROP COLUMN "employeeId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseOrders" DROP COLUMN "employeeId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sales" DROP COLUMN "employeeId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "department" TEXT,
ADD COLUMN     "employeeCode" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "position" TEXT;

-- DropTable
DROP TABLE "Employees";

-- CreateIndex
CREATE UNIQUE INDEX "Users_employeeCode_key" ON "Users"("employeeCode");

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrders" ADD CONSTRAINT "PurchaseOrders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
