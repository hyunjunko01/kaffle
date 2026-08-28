-- Add nickname fields while preserving existing users.
ALTER TABLE "User" ADD COLUMN "nickname" TEXT;
ALTER TABLE "User" ADD COLUMN "nicknameChangeCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "User"
SET "nickname" = 'user-' || substr(md5("id"), 1, 8)
WHERE "nickname" IS NULL;

ALTER TABLE "User" ALTER COLUMN "nickname" SET NOT NULL;
