-- DropForeignKey
ALTER TABLE "Sales" DROP CONSTRAINT "Sales_fileUploadSalesId_fkey";

-- AlterTable
ALTER TABLE "Sales" ALTER COLUMN "fileUploadSalesId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_fileUploadSalesId_fkey" FOREIGN KEY ("fileUploadSalesId") REFERENCES "FileUploadSales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
