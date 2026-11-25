-- Add employee specialization to User model (separate from workspace role)
ALTER TABLE "User" ADD COLUMN "specialization" TEXT NOT NULL DEFAULT 'OTHER';
