-- CreateTable
CREATE TABLE "CharacterType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconFolder" TEXT,
    "characterChit" TEXT,
    "stage" INTEGER
);

-- CreateTable
CREATE TABLE "ItemType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "ChitType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "CharacterTypeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterTypeId" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    CONSTRAINT "CharacterTypeItem_characterTypeId_fkey" FOREIGN KEY ("characterTypeId") REFERENCES "CharacterType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CharacterTypeItem_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "ItemType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CharacterTypeChit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterTypeId" TEXT NOT NULL,
    "chitTypeId" TEXT NOT NULL,
    CONSTRAINT "CharacterTypeChit_characterTypeId_fkey" FOREIGN KEY ("characterTypeId") REFERENCES "CharacterType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CharacterTypeChit_chitTypeId_fkey" FOREIGN KEY ("chitTypeId") REFERENCES "ChitType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterType_name_key" ON "CharacterType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ItemType_name_key" ON "ItemType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ChitType_name_key" ON "ChitType"("name");
