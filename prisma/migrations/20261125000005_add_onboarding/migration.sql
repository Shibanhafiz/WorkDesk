-- Guided onboarding progress and profile fields

ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "onboardingData" TEXT;
ALTER TABLE "User" ADD COLUMN "checklistDismissed" BOOLEAN NOT NULL DEFAULT false;

-- Accounts that predate onboarding are already onboarded.
UPDATE "User" SET "onboardingCompleted" = true, "onboardingStep" = 4;
