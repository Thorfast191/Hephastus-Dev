-- AlterTable
ALTER TABLE "PortfolioItem" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "budgetRanges" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "heroHeadlineAccent" TEXT,
ADD COLUMN     "heroPrimaryHref" TEXT,
ADD COLUMN     "heroPrimaryLabel" TEXT,
ADD COLUMN     "heroSecondaryHref" TEXT,
ADD COLUMN     "heroSecondaryLabel" TEXT;

-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- Data migration: the previous implementation encoded the hero's accent phrase
-- with a "|" delimiter inside heroHeadline, which required the client to learn
-- private syntax. Split it into the two structured columns and strip the
-- delimiter. Rows without a "|" keep their headline unchanged.
UPDATE "SiteSettings"
SET
  "heroHeadline" = btrim(split_part("heroHeadline", '|', 1)),
  "heroHeadlineAccent" = NULLIF(btrim(split_part("heroHeadline", '|', 2)), '')
WHERE "heroHeadline" LIKE '%|%';

-- Seed the budget bands that were previously hardcoded in the contact form, so
-- existing installs keep the same options and the client can now edit them.
UPDATE "SiteSettings"
SET "budgetRanges" = ARRAY['$5k – $10k', '$10k – $25k', '$25k – $50k', '$50k+']
WHERE "budgetRanges" IS NULL OR cardinality("budgetRanges") = 0;
