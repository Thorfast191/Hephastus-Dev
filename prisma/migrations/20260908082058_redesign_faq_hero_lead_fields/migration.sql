-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "budgetRange" TEXT,
ADD COLUMN     "projectType" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "heroEyebrow" TEXT,
ADD COLUMN     "heroHeadline" TEXT,
ADD COLUMN     "heroSubtitle" TEXT;

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);
