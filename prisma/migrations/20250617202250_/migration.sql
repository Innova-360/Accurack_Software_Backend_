-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "isOtpUsed" BOOLEAN DEFAULT false,
ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3);
