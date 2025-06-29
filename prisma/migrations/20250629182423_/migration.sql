-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "businessId" TEXT;

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
