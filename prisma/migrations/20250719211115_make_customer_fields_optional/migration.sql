-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "customerStreetAddress" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "zipCode" DROP NOT NULL;
