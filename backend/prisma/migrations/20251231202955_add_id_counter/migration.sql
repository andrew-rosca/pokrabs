-- CreateTable
CREATE TABLE "id_counter" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "counter" INTEGER NOT NULL DEFAULT 0,
    "length" INTEGER NOT NULL DEFAULT 2
);
