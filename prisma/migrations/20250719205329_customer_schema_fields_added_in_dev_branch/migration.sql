/*
  Warnings:

  - Made the column `city` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `country` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `customerStreetAddress` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `state` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `zipCode` on table `Customer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "customerStreetAddress" SET NOT NULL,
ALTER COLUMN "state" SET NOT NULL,
ALTER COLUMN "zipCode" SET NOT NULL;
