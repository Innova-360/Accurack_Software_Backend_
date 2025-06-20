/*
  Warnings:

  - Changed the type of `action` on the `permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "action",
ADD COLUMN     "action" "Action" NOT NULL;

-- CreateIndex
CREATE INDEX "permissions_resource_action_idx" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_userId_storeId_resource_action_resourceId_key" ON "permissions"("userId", "storeId", "resource", "action", "resourceId");
