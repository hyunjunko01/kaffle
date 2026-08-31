-- Give every user one nickname change after onboarding.
ALTER TABLE "User"
ADD COLUMN "postSignupNicknameChanged" BOOLEAN NOT NULL DEFAULT false;
