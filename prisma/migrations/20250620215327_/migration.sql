/*
  Warnings:

  - You are about to drop the column `employeeId` on the `Expenses` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `PurchaseOrders` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `Sales` table. All the data in the column will be lost.
  - You are about to drop the `EmployeePermissionGroups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeePermissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Employees` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PermissionGroupItems` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PermissionGroups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Permissions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[employeeCode]` on the table `Users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountAmount` to the `Pack` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountAmount` to the `Products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `percentDiscount` to the `Products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `PurchaseOrders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Sales` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EmployeePermissionGroups" DROP CONSTRAINT "EmployeePermissionGroups_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeePermissionGroups" DROP CONSTRAINT "EmployeePermissionGroups_permissionGroupId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeePermissions" DROP CONSTRAINT "EmployeePermissions_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Employees" DROP CONSTRAINT "Employees_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Expenses" DROP CONSTRAINT "Expenses_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "PermissionGroupItems" DROP CONSTRAINT "PermissionGroupItems_permissionGroupId_fkey";

-- DropForeignKey
ALTER TABLE "Permissions" DROP CONSTRAINT "Permissions_userId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrders" DROP CONSTRAINT "PurchaseOrders_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Sales" DROP CONSTRAINT "Sales_employeeId_fkey";

-- AlterTable
ALTER TABLE "Expenses" DROP COLUMN "employeeId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Pack" ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "percentDiscount" DOUBLE PRECISION NOT NULL;

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
DROP TABLE "EmployeePermissionGroups";

-- DropTable
DROP TABLE "EmployeePermissions";

-- DropTable
DROP TABLE "Employees";

-- DropTable
DROP TABLE "PermissionGroupItems";

-- DropTable
DROP TABLE "PermissionGroups";

-- DropTable
DROP TABLE "Permissions";

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT,
    "resource" TEXT NOT NULL,
    "actions" TEXT[],
    "resourceId" TEXT,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "inheritsFrom" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleTemplateId" TEXT NOT NULL,
    "storeId" TEXT,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "permissions_userId_storeId_idx" ON "permissions"("userId", "storeId");

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_userId_storeId_resource_resourceId_key" ON "permissions"("userId", "storeId", "resource", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "role_templates_name_key" ON "role_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleTemplateId_storeId_key" ON "user_roles"("userId", "roleTemplateId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Users_employeeCode_key" ON "Users"("employeeCode");

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_templates" ADD CONSTRAINT "role_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_templates" ADD CONSTRAINT "role_templates_inheritsFrom_fkey" FOREIGN KEY ("inheritsFrom") REFERENCES "role_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "role_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrders" ADD CONSTRAINT "PurchaseOrders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
