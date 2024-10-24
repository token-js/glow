-- CreateEnum
CREATE TYPE "Voice" AS ENUM ('voice_1', 'voice_2', 'voice_3');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'nonbinary');

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "gender" "Gender",
    "voice" "Voice"
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_id_key" ON "settings"("id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
