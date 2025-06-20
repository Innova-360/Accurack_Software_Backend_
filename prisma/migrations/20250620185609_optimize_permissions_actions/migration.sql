/*
  Warnings:

  - You are about to drop the column `action` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `inheritedFrom` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `isInherited` on the `permissions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,storeId,resource,resourceId]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "permissions_resource_action_idx";

-- DropIndex
DROP INDEX "permissions_userId_storeId_resource_action_resourceId_key";

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "action",
DROP COLUMN "inheritedFrom",
DROP COLUMN "isInherited",
ADD COLUMN     "actions" TEXT[];

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_userId_storeId_resource_resourceId_key" ON "permissions"("userId", "storeId", "resource", "resourceId");
