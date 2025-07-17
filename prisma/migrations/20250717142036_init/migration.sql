-- CreateEnum
CREATE TYPE "PackType" AS ENUM ('ITEM', 'BOX');

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "packId" TEXT,
ADD COLUMN     "packType" "PackType" NOT NULL DEFAULT 'ITEM';
