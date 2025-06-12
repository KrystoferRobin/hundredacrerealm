-- CreateTable
CREATE TABLE "Monster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monsterId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "group" TEXT,
    "native" TEXT,
    "move" TEXT,
    "lightMoveSpeed" TEXT,
    "lightAttackSpeed" TEXT,
    "lightStrength" TEXT,
    "lightChitColor" TEXT,
    "lightPins" TEXT,
    "darkMoveSpeed" TEXT,
    "darkAttackSpeed" TEXT,
    "darkStrength" TEXT,
    "darkChitColor" TEXT,
    "darkPins" TEXT,
    "warning" TEXT,
    "weight" TEXT,
    "fame" INTEGER,
    "notoriety" INTEGER,
    "gold" INTEGER,
    "treasure" TEXT,
    "containsIds" TEXT,
    "portrait" TEXT,
    "killCount" INTEGER
);

-- CreateIndex
CREATE UNIQUE INDEX "Monster_monsterId_key" ON "Monster"("monsterId");

-- CreateIndex
CREATE UNIQUE INDEX "Monster_name_key" ON "Monster"("name");
