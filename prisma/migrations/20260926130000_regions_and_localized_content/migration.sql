-- Regions (EU / BD) and localized content.
--
-- Hand-written rather than generated: Prisma would drop and re-add every
-- String -> Json column, losing the existing copy. Instead each value is
-- wrapped in place as {"en": <old value>}, and existing settings,
-- availability rules and blackout dates are copied so the BD site starts
-- with the same configuration as the EU one.

CREATE TYPE "Region" AS ENUM ('EU', 'BD');

-- Localized content ----------------------------------------------------------

ALTER TABLE "Service"
  ALTER COLUMN "title" TYPE JSONB USING jsonb_build_object('en', "title"),
  ALTER COLUMN "description" TYPE JSONB USING jsonb_build_object('en', "description"),
  ADD COLUMN "regions" "Region"[] DEFAULT ARRAY['EU', 'BD']::"Region"[];

ALTER TABLE "PortfolioItem"
  ALTER COLUMN "title" TYPE JSONB USING jsonb_build_object('en', "title"),
  ALTER COLUMN "description" TYPE JSONB USING jsonb_build_object('en', "description"),
  ADD COLUMN "regions" "Region"[] DEFAULT ARRAY['EU', 'BD']::"Region"[];

ALTER TABLE "Testimonial"
  ALTER COLUMN "quote" TYPE JSONB USING jsonb_build_object('en', "quote"),
  ADD COLUMN "regions" "Region"[] DEFAULT ARRAY['EU', 'BD']::"Region"[];

ALTER TABLE "Faq"
  ALTER COLUMN "question" TYPE JSONB USING jsonb_build_object('en', "question"),
  ALTER COLUMN "answer" TYPE JSONB USING jsonb_build_object('en', "answer"),
  ADD COLUMN "regions" "Region"[] DEFAULT ARRAY['EU', 'BD']::"Region"[];

ALTER TABLE "TeamMember"
  ALTER COLUMN "role" TYPE JSONB USING jsonb_build_object('en', "role"),
  ALTER COLUMN "bio" TYPE JSONB USING jsonb_build_object('en', "bio");

-- Settings: one row per region -------------------------------------------------

ALTER TABLE "SiteSettings"
  ALTER COLUMN "tagline" TYPE JSONB USING jsonb_build_object('en', "tagline"),
  ALTER COLUMN "heroEyebrow" TYPE JSONB
    USING CASE WHEN "heroEyebrow" IS NULL THEN NULL ELSE jsonb_build_object('en', "heroEyebrow") END,
  ALTER COLUMN "heroHeadline" TYPE JSONB
    USING CASE WHEN "heroHeadline" IS NULL THEN NULL ELSE jsonb_build_object('en', "heroHeadline") END,
  ALTER COLUMN "heroHeadlineAccent" TYPE JSONB
    USING CASE WHEN "heroHeadlineAccent" IS NULL THEN NULL ELSE jsonb_build_object('en', "heroHeadlineAccent") END,
  ALTER COLUMN "heroSubtitle" TYPE JSONB
    USING CASE WHEN "heroSubtitle" IS NULL THEN NULL ELSE jsonb_build_object('en', "heroSubtitle") END,
  ALTER COLUMN "heroPrimaryLabel" TYPE JSONB
    USING CASE WHEN "heroPrimaryLabel" IS NULL THEN NULL ELSE jsonb_build_object('en', "heroPrimaryLabel") END,
  ALTER COLUMN "heroSecondaryLabel" TYPE JSONB
    USING CASE WHEN "heroSecondaryLabel" IS NULL THEN NULL ELSE jsonb_build_object('en', "heroSecondaryLabel") END,
  ADD COLUMN "region" "Region",
  ADD COLUMN "whatsapp" TEXT;

-- The existing singleton becomes the EU row (if there are somehow several,
-- the oldest wins and the rest are removed — only one was ever read).
DELETE FROM "SiteSettings"
WHERE "id" NOT IN (SELECT "id" FROM "SiteSettings" ORDER BY "createdAt" ASC LIMIT 1);
UPDATE "SiteSettings" SET "region" = 'EU';

INSERT INTO "SiteSettings" (
  "id", "region", "agencyName", "tagline", "heroEyebrow", "heroHeadline",
  "heroHeadlineAccent", "heroSubtitle", "heroPrimaryLabel", "heroPrimaryHref",
  "heroSecondaryLabel", "heroSecondaryHref", "budgetRanges", "contactEmail",
  "contactPhone", "whatsapp", "socialLinks", "smtpSenderName", "businessTimezone",
  "slotDurationMinutes", "minNoticeHours", "bookingWindowDays", "createdAt", "updatedAt"
)
SELECT
  'settings_bd', 'BD', "agencyName", "tagline", "heroEyebrow", "heroHeadline",
  "heroHeadlineAccent", "heroSubtitle", "heroPrimaryLabel", "heroPrimaryHref",
  "heroSecondaryLabel", "heroSecondaryHref", "budgetRanges", "contactEmail",
  "contactPhone", NULL, "socialLinks", "smtpSenderName", 'Asia/Dhaka',
  "slotDurationMinutes", "minNoticeHours", "bookingWindowDays", NOW(), NOW()
FROM "SiteSettings"
WHERE "region" = 'EU';

ALTER TABLE "SiteSettings" ALTER COLUMN "region" SET NOT NULL;
CREATE UNIQUE INDEX "SiteSettings_region_key" ON "SiteSettings"("region");

-- Leads and meetings remember which site and language they came from ----------

ALTER TABLE "Lead"
  ADD COLUMN "region" "Region" NOT NULL DEFAULT 'EU',
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "country" TEXT;

ALTER TABLE "Meeting"
  ADD COLUMN "region" "Region" NOT NULL DEFAULT 'EU',
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "country" TEXT;

-- Availability is per region (different working hours / timezone) -------------

ALTER TABLE "AvailabilityRule" ADD COLUMN "region" "Region" NOT NULL DEFAULT 'EU';

INSERT INTO "AvailabilityRule" ("id", "region", "dayOfWeek", "startTime", "endTime", "active")
SELECT "id" || '_bd', 'BD', "dayOfWeek", "startTime", "endTime", "active"
FROM "AvailabilityRule";

DROP INDEX "BlackoutDate_date_key";
ALTER TABLE "BlackoutDate" ADD COLUMN "region" "Region" NOT NULL DEFAULT 'EU';

INSERT INTO "BlackoutDate" ("id", "region", "date", "reason")
SELECT "id" || '_bd', 'BD', "date", "reason"
FROM "BlackoutDate";

CREATE UNIQUE INDEX "BlackoutDate_region_date_key" ON "BlackoutDate"("region", "date");
