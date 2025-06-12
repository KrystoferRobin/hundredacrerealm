/*
  Warnings:

  - You are about to drop the column `attributes` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `states` on the `Item` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ItemState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "strength" TEXT,
    "sharpness" TEXT,
    "color" TEXT,
    "attackSpeed" TEXT,
    "basePrice" INTEGER,
    "vulnerability" TEXT,
    CONSTRAINT "ItemState_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "vulnerability" TEXT,
    "weight" TEXT,
    "magic" TEXT,
    "length" TEXT,
    "basePrice" INTEGER,
    "sharpness" TEXT,
    "iconType" TEXT
);
INSERT INTO "new_Item" ("id", "name") SELECT "id", "name" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
