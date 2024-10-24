-- CreateEnum
CREATE TYPE "Voice" AS ENUM ('temporary');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'nonbinary');

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "voice" "Voice" NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_user_id_key" ON "settings"("user_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "settings"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
