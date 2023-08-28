-- CreateTable
CREATE TABLE "RestaurantCategory" (
    "id" SERIAL NOT NULL,
    "names" JSONB,
    "iconName" TEXT NOT NULL,

    CONSTRAINT "RestaurantCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RestaurantCategories" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_RestaurantCategories_AB_unique" ON "_RestaurantCategories"("A", "B");

-- CreateIndex
CREATE INDEX "_RestaurantCategories_B_index" ON "_RestaurantCategories"("B");

-- AddForeignKey
ALTER TABLE "_RestaurantCategories" ADD CONSTRAINT "_RestaurantCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RestaurantCategories" ADD CONSTRAINT "_RestaurantCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "RestaurantCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
