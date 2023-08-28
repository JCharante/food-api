-- CreateTable
CREATE TABLE "FoodAddon" (
    "id" SERIAL NOT NULL,
    "names" JSONB,
    "descriptions" JSONB,
    "inStock" BOOLEAN NOT NULL,
    "price" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL,
    "restaurantID" INTEGER NOT NULL,

    CONSTRAINT "FoodAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodAddonCategory" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "restaurantID" INTEGER NOT NULL,

    CONSTRAINT "FoodAddonCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Food" (
    "id" SERIAL NOT NULL,
    "names" JSONB,
    "descriptions" JSONB,
    "inStock" BOOLEAN NOT NULL,
    "visible" BOOLEAN NOT NULL,
    "price" INTEGER NOT NULL,
    "restaurantID" INTEGER NOT NULL,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" SERIAL NOT NULL,
    "names" JSONB,
    "descriptions" JSONB,
    "restaurantID" INTEGER NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityZone" (
    "id" SERIAL NOT NULL,
    "daysOfWeek" JSONB,
    "endHour" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "restaurantOpeningHourID" INTEGER,
    "restaurantOwnerID" INTEGER NOT NULL,

    CONSTRAINT "AvailabilityZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantPosition" (
    "id" SERIAL NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "restaurantID" INTEGER,

    CONSTRAINT "RestaurantPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "descriptions" JSONB,
    "hiddenByAdmin" BOOLEAN NOT NULL,
    "isVerified" BOOLEAN NOT NULL,
    "isVisible" BOOLEAN NOT NULL,
    "names" JSONB,
    "menuID" INTEGER NOT NULL,
    "ownerID" INTEGER NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionKey" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "SessionKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL,
    "isMerchant" BOOLEAN NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FoodAddonToFoodAddonCategory" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_FoodToFoodAddonCategory" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_FoodToMenuCategory" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_AvailabilityZoneToMenuCategory" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_RestaurantManager" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantPosition_restaurantID_key" ON "RestaurantPosition"("restaurantID");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_menuID_key" ON "Restaurant"("menuID");

-- CreateIndex
CREATE UNIQUE INDEX "SessionKey_key_key" ON "SessionKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "_FoodAddonToFoodAddonCategory_AB_unique" ON "_FoodAddonToFoodAddonCategory"("A", "B");

-- CreateIndex
CREATE INDEX "_FoodAddonToFoodAddonCategory_B_index" ON "_FoodAddonToFoodAddonCategory"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_FoodToFoodAddonCategory_AB_unique" ON "_FoodToFoodAddonCategory"("A", "B");

-- CreateIndex
CREATE INDEX "_FoodToFoodAddonCategory_B_index" ON "_FoodToFoodAddonCategory"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_FoodToMenuCategory_AB_unique" ON "_FoodToMenuCategory"("A", "B");

-- CreateIndex
CREATE INDEX "_FoodToMenuCategory_B_index" ON "_FoodToMenuCategory"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AvailabilityZoneToMenuCategory_AB_unique" ON "_AvailabilityZoneToMenuCategory"("A", "B");

-- CreateIndex
CREATE INDEX "_AvailabilityZoneToMenuCategory_B_index" ON "_AvailabilityZoneToMenuCategory"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_RestaurantManager_AB_unique" ON "_RestaurantManager"("A", "B");

-- CreateIndex
CREATE INDEX "_RestaurantManager_B_index" ON "_RestaurantManager"("B");

-- AddForeignKey
ALTER TABLE "FoodAddon" ADD CONSTRAINT "FoodAddon_restaurantID_fkey" FOREIGN KEY ("restaurantID") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodAddonCategory" ADD CONSTRAINT "FoodAddonCategory_restaurantID_fkey" FOREIGN KEY ("restaurantID") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_restaurantID_fkey" FOREIGN KEY ("restaurantID") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_restaurantID_fkey" FOREIGN KEY ("restaurantID") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityZone" ADD CONSTRAINT "AvailabilityZone_restaurantOpeningHourID_fkey" FOREIGN KEY ("restaurantOpeningHourID") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityZone" ADD CONSTRAINT "AvailabilityZone_restaurantOwnerID_fkey" FOREIGN KEY ("restaurantOwnerID") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantPosition" ADD CONSTRAINT "RestaurantPosition_restaurantID_fkey" FOREIGN KEY ("restaurantID") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_menuID_fkey" FOREIGN KEY ("menuID") REFERENCES "Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_ownerID_fkey" FOREIGN KEY ("ownerID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionKey" ADD CONSTRAINT "SessionKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodAddonToFoodAddonCategory" ADD CONSTRAINT "_FoodAddonToFoodAddonCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "FoodAddon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodAddonToFoodAddonCategory" ADD CONSTRAINT "_FoodAddonToFoodAddonCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "FoodAddonCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodToFoodAddonCategory" ADD CONSTRAINT "_FoodToFoodAddonCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodToFoodAddonCategory" ADD CONSTRAINT "_FoodToFoodAddonCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "FoodAddonCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodToMenuCategory" ADD CONSTRAINT "_FoodToMenuCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodToMenuCategory" ADD CONSTRAINT "_FoodToMenuCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AvailabilityZoneToMenuCategory" ADD CONSTRAINT "_AvailabilityZoneToMenuCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "AvailabilityZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AvailabilityZoneToMenuCategory" ADD CONSTRAINT "_AvailabilityZoneToMenuCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RestaurantManager" ADD CONSTRAINT "_RestaurantManager_A_fkey" FOREIGN KEY ("A") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RestaurantManager" ADD CONSTRAINT "_RestaurantManager_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
