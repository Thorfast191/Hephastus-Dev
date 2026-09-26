-- Super admins and region admins.
--
-- Existing admins become super admins, so nobody loses access. The role no
-- longer has a default: every account is created with an explicit role.
--
-- The enum is rebuilt as a new type rather than `ALTER TYPE … ADD VALUE`:
-- Postgres forbids using a freshly added value in the same transaction, and
-- the CHECK constraint below needs 'REGION_ADMIN'.

CREATE TYPE "AdminRole_new" AS ENUM ('SUPER_ADMIN', 'REGION_ADMIN');

ALTER TABLE "AdminUser" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "AdminUser" ALTER COLUMN "role" TYPE "AdminRole_new"
  USING (CASE "role"::text WHEN 'ADMIN' THEN 'SUPER_ADMIN' ELSE "role"::text END)::"AdminRole_new";

DROP TYPE "AdminRole";
ALTER TYPE "AdminRole_new" RENAME TO "AdminRole";

ALTER TABLE "AdminUser" ADD COLUMN "region" "Region";

-- A region admin without a region would be locked out of everything, or,
-- worse, read as unrestricted by careless code. Make it impossible.
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_region_admin_has_region"
  CHECK ("role" <> 'REGION_ADMIN' OR "region" IS NOT NULL);
