-- CreateTable
CREATE TABLE "_MenuToMenuCategory" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_MenuToMenuCategory_AB_unique" ON "_MenuToMenuCategory"("A", "B");

-- CreateIndex
CREATE INDEX "_MenuToMenuCategory_B_index" ON "_MenuToMenuCategory"("B");

-- AddForeignKey
ALTER TABLE "_MenuToMenuCategory" ADD CONSTRAINT "_MenuToMenuCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MenuToMenuCategory" ADD CONSTRAINT "_MenuToMenuCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
