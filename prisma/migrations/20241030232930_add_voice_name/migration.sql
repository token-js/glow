-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Voice" ADD VALUE 'voice_4';
ALTER TYPE "Voice" ADD VALUE 'voice_5';
ALTER TYPE "Voice" ADD VALUE 'voice_6';

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "ai_name" TEXT;
