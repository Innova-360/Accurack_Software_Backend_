-- AlterTable
ALTER TABLE "Clients" ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "databaseName" TEXT,
ALTER COLUMN "databaseUrl" DROP NOT NULL;
