/*
  Warnings:

  - You are about to drop the column `contactName` on the `Suppliers` table. All the data in the column will be lost.
  - You are about to drop the `EmployeePermissionGroups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeePermissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PermissionGroupItems` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PermissionGroups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Permissions` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `phone` on table `Suppliers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "EmployeePermissionGroups" DROP CONSTRAINT "EmployeePermissionGroups_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeePermissionGroups" DROP CONSTRAINT "EmployeePermissionGroups_permissionGroupId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeePermissions" DROP CONSTRAINT "EmployeePermissions_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "PermissionGroupItems" DROP CONSTRAINT "PermissionGroupItems_permissionGroupId_fkey";

-- DropForeignKey
ALTER TABLE "Permissions" DROP CONSTRAINT "Permissions_userId_fkey";

-- AlterTable
ALTER TABLE "Suppliers" DROP COLUMN "contactName",
ALTER COLUMN "phone" SET NOT NULL;

-- DropTable
DROP TABLE "EmployeePermissionGroups";

-- DropTable
DROP TABLE "EmployeePermissions";

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
    "action" TEXT NOT NULL,
    "resourceId" TEXT,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "isInherited" BOOLEAN NOT NULL DEFAULT false,
    "inheritedFrom" TEXT,
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
CREATE INDEX "permissions_resource_action_idx" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_userId_storeId_resource_action_resourceId_key" ON "permissions"("userId", "storeId", "resource", "action", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "role_templates_name_key" ON "role_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleTemplateId_storeId_key" ON "user_roles"("userId", "roleTemplateId", "storeId");

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
