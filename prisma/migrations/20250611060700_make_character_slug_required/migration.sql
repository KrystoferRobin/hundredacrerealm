/*
  Warnings:

  - Made the column `slug` on table `Character` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconFolder" TEXT,
    "characterChit" TEXT,
    "stage" INTEGER,
    "characterPortrait" TEXT,
    "characterSymbol" TEXT,
    "vulnerability" TEXT,
    "startLocation" TEXT,
    "pronoun" TEXT,
    "facing" TEXT,
    "meaning" TEXT,
    "creator" TEXT,
    "artCredit" TEXT,
    "advantages" TEXT,
    "startingItems" TEXT,
    "relationships" TEXT
);
INSERT INTO "new_Character" ("advantages", "artCredit", "characterChit", "characterPortrait", "characterSymbol", "creator", "description", "facing", "iconFolder", "id", "meaning", "name", "pronoun", "relationships", "slug", "stage", "startLocation", "startingItems", "vulnerability") SELECT "advantages", "artCredit", "characterChit", "characterPortrait", "characterSymbol", "creator", "description", "facing", "iconFolder", "id", "meaning", "name", "pronoun", "relationships", "slug", "stage", "startLocation", "startingItems", "vulnerability" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE UNIQUE INDEX "Character_slug_key" ON "Character"("slug");
CREATE UNIQUE INDEX "Character_name_key" ON "Character"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
