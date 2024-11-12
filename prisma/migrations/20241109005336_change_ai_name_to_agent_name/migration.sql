/*
  Warnings:

  - You are about to drop the column `ai_name` on the `settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "settings" DROP COLUMN "ai_name",
ADD COLUMN     "agent_name" TEXT;
