-- AlterTable
ALTER TABLE "user" ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessPhone" TEXT,
ADD COLUMN     "businessWebsite" TEXT,
ADD COLUMN     "defaultTaxRate" DECIMAL(5,2),
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
ADD COLUMN     "logoUrl" TEXT, AND
ADD COLUMN     "onboardingDone" BOOLEAN NOT NULL DEFAULT false;
