/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Character` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Character" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Character_slug_key" ON "Character"("slug");
