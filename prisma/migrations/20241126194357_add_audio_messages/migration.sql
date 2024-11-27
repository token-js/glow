/*
  Warnings:

  - A unique constraint covering the columns `[audio_id]` on the table `chat_messages` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `display_type` to the `chat_messages` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DisplayType" AS ENUM ('text', 'audio');

-- Add new columns, with "display_type" initially nullable
ALTER TABLE "chat_messages"
    ADD COLUMN "audio_id" TEXT,
    ADD COLUMN "display_type" "DisplayType";

-- Update existing records to set "display_type" to 'text'
UPDATE "chat_messages"
    SET "display_type" = 'text'
    WHERE "display_type" IS NULL;

-- Alter "display_type" column to be NOT NULL
ALTER TABLE "chat_messages"
    ALTER COLUMN "display_type" SET NOT NULL;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "audio_messages_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_audio_id_key" ON "chat_messages"("audio_id");
